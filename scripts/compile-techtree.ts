/**
 * Compile design/03-progression.md → public/content/tech-tree.json
 *
 * Per design/08-architecture §Catalog compilation:
 *   Markdown source stays authoritative; this script emits the structured
 *   JSON the game loads at runtime.
 *
 * Entry pattern (highly regular):
 *
 *   ### Milestone N — Name
 *
 *   - **Tech Name** *(Branch — cost-spec)*
 *     Prereqs: prereq list — Unlocks: building(s); enables tech(s)
 *
 *   - **Tech Name** *(Branch — 5⛓)* **← MILESTONE N BOSS**
 *     Prereqs: ...
 *
 * Cost-spec is parsed identically to building costs (same emoji map).
 * Prereqs and unlocks/enables are tech-name lists separated by commas.
 *
 * Run via:  npx tsx scripts/compile-techtree.ts
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');
const SOURCE = path.join(REPO_ROOT, 'design', '03-progression.md');
const OUT = path.join(REPO_ROOT, 'public', 'content', 'tech-tree.json');

type ResourceKey = 'knowledge' | 'discovery' | 'iron' | 'innovation' | 'completion';

const EMOJI_TO_KEY: Record<string, ResourceKey> = {
  '📚': 'knowledge',
  '🔭': 'discovery',
  '⛓': 'iron',
  '⚡': 'innovation',
  '🏁': 'completion',
};

interface TechEntry {
  id: string;
  name: string;
  branch: string;
  milestone: number;        // 1..7
  cost: Partial<Record<ResourceKey, number>>;
  /** Prereq tech IDs (slugs). */
  prereqs: string[];
  /** Buildings this tech unlocks — informational; the build modal also
   * gates on building.research_prereqs from the catalog (single source of truth). */
  unlocks_buildings: string[];
  /** Other techs this entry "enables" — informational only. The actual
   * dependency edge in the graph comes from the OTHER tech's prereqs list. */
  enables_techs: string[];
  /** True if marked as the milestone's boss tech. */
  is_boss: boolean;
}

interface TechTreeJson {
  version: 1;
  generated_at: string;
  branches: string[];
  milestones: string[];
  techs: TechEntry[];
}

// --- Slug / parsing helpers ---

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseResources(s: string): Partial<Record<ResourceKey, number>> {
  const trimmed = s.replace(/`/g, '').trim();
  if (!trimmed || /^free/i.test(trimmed) || trimmed === '—' || trimmed === '-') {
    return {};
  }
  const out: Partial<Record<ResourceKey, number>> = {};
  for (const rawToken of trimmed.split('+')) {
    const token = rawToken.trim();
    if (!token) continue;
    let resource: ResourceKey | null = null;
    let valueStr = token;
    for (const [emoji, key] of Object.entries(EMOJI_TO_KEY)) {
      if (token.endsWith(emoji)) {
        resource = key;
        valueStr = token.slice(0, -emoji.length).trim();
        break;
      }
    }
    if (resource === null) continue;
    const n = Number(valueStr);
    if (!Number.isFinite(n)) continue;
    out[resource] = (out[resource] ?? 0) + n;
  }
  return out;
}

/** Clean a tech-name fragment: strip bold, parentheticals, decorative arrows. */
function cleanTechName(s: string): string {
  return s
    .replace(/\*\*/g, '')
    .replace(/←.*$/, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[*←]/g, '')
    .trim();
}

/** Split a comma-separated list of tech names → ids (filtering "none" / "TBD"). */
function parseTechList(raw: string): string[] {
  const cleaned = raw.replace(/^[\s—\-]+|[\s—\-]+$/g, '');
  if (!cleaned || /^none/i.test(cleaned) || /^tbd/i.test(cleaned)) return [];
  return cleaned
    .split(/[,;]/)
    .map((t) => cleanTechName(t))
    .filter((t) => t.length > 0)
    .map((t) => slugify(t));
}

/**
 * Pull a "Unlocks: X; enables Y, Z" continuation line apart.
 * Returns the unlocked-building names + enabled-tech names.
 */
function parseUnlocksLine(raw: string): { buildings: string[]; enabled: string[] } {
  // "Prereqs: A, B — Unlocks: X; enables Y, Z"
  // We expect the segment AFTER "Unlocks:".
  const m = raw.match(/Unlocks:\s*(.+)/);
  if (!m) return { buildings: [], enabled: [] };
  const after = m[1]!;

  // Split by "; enables " — left part is buildings, right is enabled techs.
  const enablesMatch = after.match(/;\s*enables\s+(.+)/i);
  let buildingsPart: string;
  let enabledPart = '';
  if (enablesMatch) {
    enabledPart = enablesMatch[1]!;
    buildingsPart = after.slice(0, after.indexOf(';')).trim();
  } else {
    // "enables" can also appear without semicolon — find it.
    const altMatch = after.match(/^(.*?)\benables\s+(.+)$/i);
    if (altMatch) {
      buildingsPart = altMatch[1]!.replace(/\s+$/, '');
      enabledPart = altMatch[2]!;
    } else {
      buildingsPart = after.trim();
    }
  }

  const buildings = parseTechList(buildingsPart);
  const enabled = parseTechList(enabledPart);
  return { buildings, enabled };
}

// --- Main parser ---

interface ParserState {
  lines: string[];
  cursor: number;
  currentMilestone: number;
  techs: TechEntry[];
  milestoneNames: string[];
  warnings: string[];
}

/** Parse a single tech bullet line + its continuation. */
function parseTechBullet(s: ParserState, line: string): void {
  // Pattern: `- **Name** *(Branch — cost-spec)*` optionally followed by `**← BOSS**`
  const m = line.match(/^\-\s+\*\*([^*]+)\*\*\s*\*\(([^)]+)\)\*(.*)$/);
  if (!m) return;
  const name = m[1]!.trim();
  const inner = m[2]!.trim(); // "Branch — cost"
  const trailer = m[3]!;

  const dashIdx = inner.search(/—|--/);
  let branch: string;
  let costStr: string;
  if (dashIdx >= 0) {
    branch = inner.slice(0, dashIdx).trim();
    costStr = inner.slice(dashIdx).replace(/^[—\-]+\s*/, '').trim();
  } else {
    branch = inner;
    costStr = '';
  }

  const id = slugify(name);
  const cost = parseResources(costStr);
  const isBoss = /milestone\s*\d+\s*boss/i.test(trailer);

  // Look ahead for the continuation line (Prereqs: ... — Unlocks: ...).
  let prereqs: string[] = [];
  let unlocks_buildings: string[] = [];
  let enables_techs: string[] = [];

  if (s.cursor + 1 < s.lines.length) {
    const next = s.lines[s.cursor + 1]!.trim();
    if (next.startsWith('Prereqs:') || next.startsWith('  Prereqs:')) {
      // Strip leading whitespace markers.
      const cont = next.replace(/^\s*/, '');
      // "Prereqs: A, B — Unlocks: X; enables Y, Z"
      const prereqsMatch = cont.match(/Prereqs:\s*([^—\-]+?)(?=\s+(?:—|--)\s+Unlocks:|$)/);
      const prereqsText = prereqsMatch ? prereqsMatch[1]! : cont.replace(/^Prereqs:\s*/, '');
      prereqs = parseTechList(prereqsText);
      const u = parseUnlocksLine(cont);
      unlocks_buildings = u.buildings;
      enables_techs = u.enabled;
      s.cursor++; // consume the continuation
    }
  }

  s.techs.push({
    id,
    name,
    branch,
    milestone: s.currentMilestone,
    cost,
    prereqs,
    unlocks_buildings,
    enables_techs,
    is_boss: isBoss,
  });
}

async function main(): Promise<void> {
  const text = await fs.readFile(SOURCE, 'utf8');
  const lines = text.split('\n');

  const state: ParserState = {
    lines,
    cursor: 0,
    currentMilestone: 0,
    techs: [],
    milestoneNames: [],
    warnings: [],
  };

  while (state.cursor < state.lines.length) {
    const line = state.lines[state.cursor]!;

    // Milestone header: "### Milestone N — Name"
    const milestoneMatch = line.match(/^###\s+Milestone\s+(\d+)\s*[—\-]\s*(.+)$/);
    if (milestoneMatch) {
      state.currentMilestone = Number(milestoneMatch[1]!);
      const name = milestoneMatch[2]!.replace(/\*+/g, '').trim();
      state.milestoneNames[state.currentMilestone - 1] = name;
      state.cursor++;
      continue;
    }

    // Tech bullet: "- **Name** *(Branch — cost)*"
    if (state.currentMilestone > 0 && /^\-\s+\*\*/.test(line)) {
      parseTechBullet(state, line);
      state.cursor++;
      continue;
    }

    state.cursor++;
  }

  // De-duplicate by id (rarely an issue but defensive).
  const byId = new Map<string, TechEntry>();
  for (const t of state.techs) byId.set(t.id, t);
  const techs = Array.from(byId.values());

  // Collect unique branches as ordered list (preserve first-seen order).
  const branchOrder: string[] = [];
  for (const t of techs) {
    if (!branchOrder.includes(t.branch)) branchOrder.push(t.branch);
  }

  const output: TechTreeJson = {
    version: 1,
    generated_at: new Date().toISOString(),
    branches: branchOrder,
    milestones: state.milestoneNames.filter((n) => n != null),
    techs,
  };

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(output, null, 2), 'utf8');
  console.log(`Wrote ${OUT}`);
  console.log(`  ${techs.length} tech nodes parsed`);
  console.log(`  ${branchOrder.length} branches: ${branchOrder.join(', ')}`);
  console.log(`  ${output.milestones.length} milestones`);

  // Validate prereq references — any prereq that doesn't resolve to a real tech?
  const techIds = new Set(techs.map((t) => t.id));
  const danglingPrereqs: Array<[string, string]> = [];
  for (const t of techs) {
    for (const p of t.prereqs) {
      if (!techIds.has(p)) danglingPrereqs.push([t.id, p]);
    }
  }
  if (danglingPrereqs.length > 0) {
    console.log('\nWarnings: dangling prereqs (referenced but not defined):');
    for (const [t, p] of danglingPrereqs) console.log(`  ${t} → ${p}`);
  }

  if (state.warnings.length > 0) {
    console.log('\nOther warnings:');
    for (const w of state.warnings) console.log(`  ${w}`);
  }
}

main();
