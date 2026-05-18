import type { ResourceKey, BuildingTier } from '../state/schema';

/**
 * Building catalog — loaded from public/content/catalog.json at runtime.
 *
 * Per design/08-architecture §Catalog compilation:
 *   scripts/compile-catalog.ts parses design/04-buildings.md → emits
 *   public/content/catalog.json. The game fetches that JSON during
 *   PreloadScene (so the catalog is loaded BEFORE any scene needs it).
 *
 * Until the fetch resolves, the catalog is "uninitialized" — listBuildings()
 * returns an empty array, getBuilding() returns undefined. Callers must
 * defer their catalog access until after PreloadScene has finished, which
 * is the natural flow (CityScene + UIScene + ModalScene all run AFTER
 * PreloadScene).
 */

export interface BuildingTierData {
  tier: BuildingTier;
  cost: Partial<Record<ResourceKey, number>>;
  research_prereqs: string[];
  passive_per_hour: Partial<Record<ResourceKey, number>>;
  power_capacity: number;
  power_demand: number;
  coverage_radius?: number;
  idle_animation: string;
}

export type TerrainGate = 'naval_needs_water' | 'rocket_needs_concrete';

export interface BuildingCatalogEntry {
  id: string;
  name: string;
  category: string;
  footprint: { w: number; h: number };
  tiers: BuildingTierData[];
  sprite_source: 'ai_gen' | 'cc0_placeholder' | 'hand_pixel';
  terrain_gate?: TerrainGate;
}

interface CatalogJson {
  version: 1;
  generated_at: string;
  entries: BuildingCatalogEntry[];
}

let CATALOG_ENTRIES: BuildingCatalogEntry[] = [];
const CATALOG_BY_ID = new Map<string, BuildingCatalogEntry>();

/**
 * Load the compiled catalog from /content/catalog.json (Vite serves
 * public/ at the URL root). Called once from PreloadScene.
 */
export async function loadCatalog(): Promise<void> {
  const res = await fetch('/content/catalog.json');
  if (!res.ok) {
    throw new Error(`Failed to load catalog: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as CatalogJson;
  if (json.version !== 1) {
    throw new Error(`Unsupported catalog version: ${String(json.version)}`);
  }
  CATALOG_ENTRIES = json.entries;
  CATALOG_BY_ID.clear();
  for (const e of CATALOG_ENTRIES) CATALOG_BY_ID.set(e.id, e);
  console.log(`[catalog] loaded ${CATALOG_ENTRIES.length} buildings`);
}

/** Test helper — inject a catalog directly without fetching. */
export function setCatalogForTesting(entries: BuildingCatalogEntry[]): void {
  CATALOG_ENTRIES = entries;
  CATALOG_BY_ID.clear();
  for (const e of CATALOG_ENTRIES) CATALOG_BY_ID.set(e.id, e);
}

/** Every catalog entry, in load order (already sorted by category+name). */
export function listBuildings(): readonly BuildingCatalogEntry[] {
  return CATALOG_ENTRIES;
}

/** Lookup by id — returns undefined if absent (or catalog not loaded yet). */
export function getBuilding(id: string): BuildingCatalogEntry | undefined {
  return CATALOG_BY_ID.get(id);
}

/** Lookup a specific tier's data, or undefined if id/tier missing. */
export function getTier(id: string, tier: BuildingTier): BuildingTierData | undefined {
  const entry = CATALOG_BY_ID.get(id);
  return entry?.tiers.find((t) => t.tier === tier);
}

/** Return a fresh map: category → entries[]. Stable order within each. */
export function buildingsByCategory(): Map<string, BuildingCatalogEntry[]> {
  const out = new Map<string, BuildingCatalogEntry[]>();
  for (const e of CATALOG_ENTRIES) {
    const arr = out.get(e.category) ?? [];
    arr.push(e);
    out.set(e.category, arr);
  }
  return out;
}
