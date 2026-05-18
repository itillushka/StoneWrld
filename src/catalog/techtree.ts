import type { ResourceKey } from '../state/schema';

/**
 * Tech tree runtime accessor — loaded from public/content/tech-tree.json
 * during PreloadScene.
 *
 * Per design/03-progression: 85 tech nodes across 10 branches × 7 milestones.
 * The tree is a DAG: each tech has zero or more prereq tech IDs, and
 * "researched" is a flat set in state.research.researched.
 *
 * A tech is `available` when all its prereqs are in the researched set.
 * Clicking an available tech spends the cost (Phase 8 enforces in
 * ResearchScene) and adds it to state.research.researched.
 */

export interface TechEntry {
  id: string;
  name: string;
  branch: string;
  milestone: number; // 1..7
  cost: Partial<Record<ResourceKey, number>>;
  prereqs: string[];
  unlocks_buildings: string[];
  enables_techs: string[];
  is_boss: boolean;
}

export interface TechTreeJson {
  version: 1;
  generated_at: string;
  branches: string[];
  milestones: string[];
  techs: TechEntry[];
}

let TECH_TREE: TechTreeJson = {
  version: 1,
  generated_at: '',
  branches: [],
  milestones: [],
  techs: [],
};
const TECH_BY_ID = new Map<string, TechEntry>();

export async function loadTechTree(): Promise<void> {
  const res = await fetch('/content/tech-tree.json');
  if (!res.ok) {
    throw new Error(`Failed to load tech tree: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as TechTreeJson;
  if (json.version !== 1) {
    throw new Error(`Unsupported tech-tree version: ${String(json.version)}`);
  }
  TECH_TREE = json;
  TECH_BY_ID.clear();
  for (const t of json.techs) TECH_BY_ID.set(t.id, t);
  console.log(`[techtree] loaded ${json.techs.length} techs, ${json.branches.length} branches`);
}

/** Test helper — inject directly without fetching. */
export function setTechTreeForTesting(json: TechTreeJson): void {
  TECH_TREE = json;
  TECH_BY_ID.clear();
  for (const t of json.techs) TECH_BY_ID.set(t.id, t);
}

export function listTechs(): readonly TechEntry[] {
  return TECH_TREE.techs;
}

export function getTech(id: string): TechEntry | undefined {
  return TECH_BY_ID.get(id);
}

export function listBranches(): readonly string[] {
  return TECH_TREE.branches;
}

export function listMilestoneNames(): readonly string[] {
  return TECH_TREE.milestones;
}

/**
 * A tech is `available` iff every prereq is in the researched set.
 * Dangling prereqs (refer to a tech that wasn't compiled — see
 * scripts/compile-techtree.ts warnings) are treated as "auto-satisfied"
 * to avoid soft-locking the tree.
 */
export function isTechAvailable(id: string, researched: ReadonlySet<string>): boolean {
  const t = TECH_BY_ID.get(id);
  if (!t) return false;
  for (const p of t.prereqs) {
    if (!TECH_BY_ID.has(p)) continue; // dangling — skip
    if (!researched.has(p)) return false;
  }
  return true;
}

export function isTechResearched(id: string, researched: ReadonlySet<string>): boolean {
  return researched.has(id);
}

/**
 * Returns true if a building's research_prereqs are all satisfied.
 * Used by the build modal to filter the catalog (Phase 8 gating).
 */
export function buildingIsResearched(
  buildingPrereqs: readonly string[],
  researched: ReadonlySet<string>,
): boolean {
  for (const p of buildingPrereqs) {
    // Dangling building prereqs (no matching tech) are auto-satisfied so
    // catalog edge-cases don't soft-lock the build modal entirely.
    if (!TECH_BY_ID.has(p)) continue;
    if (!researched.has(p)) return false;
  }
  return true;
}
