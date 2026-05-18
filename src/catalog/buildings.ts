import type { ResourceKey, BuildingTier } from '../state/schema';

/**
 * Building catalog — Phase 5 hardcoded subset.
 *
 * Phase 6 swaps this for a JSON file compiled from design/04-buildings.md
 * via scripts/compile-catalog.ts. Until then, we hardcode just enough to
 * exercise the placement flow.
 *
 * Shape MATCHES what compile-catalog.ts will emit so swap-in is one
 * line in this module (replace HARDCODED_CATALOG with the loaded JSON).
 */

export interface BuildingTierData {
  tier: BuildingTier;
  /** Resources required to BUILD T1 or UPGRADE to this tier. */
  cost: Partial<Record<ResourceKey, number>>;
  /** Research tech keys that must be researched first (Phase 8). */
  research_prereqs: string[];
  /** Passive resource generation per hour (mostly zero in early game). */
  passive_per_hour: Partial<Record<ResourceKey, number>>;
  power_capacity: number;
  power_demand: number;
  /** Only set for generators + poles (Phase 7). */
  coverage_radius?: number;
  /** Idle animation description — drives Phase 14 animation work. */
  idle_animation: string;
}

/** Per design/05-map terrain gate decisions §15. */
export type TerrainGate = 'naval_needs_water' | 'rocket_needs_concrete';

export interface BuildingCatalogEntry {
  /** Stable key — never changes; used in state.json `building.id`. */
  id: string;
  name: string;
  category: string;
  /** Footprint in tiles. Per design/05-map §Footprints. */
  footprint: { w: number; h: number };
  /** Tier data — exactly 3 entries (T1, T2, T3) once fully populated. */
  tiers: BuildingTierData[];
  /** Source plan per design/07-references §Sprite source strategy. */
  sprite_source: 'ai_gen' | 'cc0_placeholder' | 'hand_pixel';
  /** Optional terrain restriction; absent = no restriction. */
  terrain_gate?: TerrainGate;
}

/**
 * Phase 5 catalog — Settler Hut only.
 *
 * Per design/04-buildings §Dwellings §Settler Hut:
 *   - Category: Dwellings · Footprint: 1×1 · Milestone first: Stone World (#1)
 *   - T1: 30⛓+15⚡, prereq mud_brick, passive 0/hr (decorative), power 0/0
 *   - Idle animation: "Faint smoke rising from chimney; window-light flicker at night"
 *
 * T2 / T3 tiers + remaining ~66 buildings land in Phase 6 via the
 * compile-catalog.ts pipeline.
 */
const HARDCODED_CATALOG: readonly BuildingCatalogEntry[] = [
  {
    id: 'settler_hut',
    name: 'Settler Hut',
    category: 'Dwellings',
    footprint: { w: 1, h: 1 },
    sprite_source: 'cc0_placeholder',
    tiers: [
      {
        tier: 1,
        cost: { iron: 30, innovation: 15 },
        research_prereqs: ['mud_brick'], // Phase 8 gates on this; Phase 5 ignores
        passive_per_hour: {},
        power_capacity: 0,
        power_demand: 0,
        idle_animation: 'chimney_smoke',
      },
    ],
  },
] as const;

const CATALOG_BY_ID = new Map<string, BuildingCatalogEntry>(
  HARDCODED_CATALOG.map((e) => [e.id, e]),
);

/** Returns every entry — Phase 5 returns just Settler Hut. */
export function listBuildings(): readonly BuildingCatalogEntry[] {
  return HARDCODED_CATALOG;
}

/** Lookup by id — returns undefined if absent. */
export function getBuilding(id: string): BuildingCatalogEntry | undefined {
  return CATALOG_BY_ID.get(id);
}

/** Lookup a specific tier's data, or undefined if id/tier missing. */
export function getTier(id: string, tier: BuildingTier): BuildingTierData | undefined {
  const entry = CATALOG_BY_ID.get(id);
  return entry?.tiers.find((t) => t.tier === tier);
}
