/**
 * StoneWorld state schema — v1.
 *
 * The full shape of `state.json` per design/08-architecture §State.json schema.
 * Single source of truth for both client (browser) and server (Vite dev middleware,
 * PostToolUse hook). Pure types + `defaultState()` factory — no runtime deps,
 * safe to import anywhere.
 *
 * Consolidates the partial schemas from:
 *   - design/02-game-logic §State.json shape (resources, buildings, research, stats)
 *   - design/05-map §Map state (grid, buildable_area_unlocks; instances/map_seed dropped)
 *   - design/06-style §Factoid storage (captain_log + settings block)
 *
 * Network membership, storage caps, auto-paths, buildable-area polygon are
 * DERIVED at load, not persisted. See design/08-architecture §"What is NOT in state.json".
 */

export const CURRENT_VERSION = 1 as const;

export type ResourceKey =
  | 'knowledge'
  | 'discovery'
  | 'iron'
  | 'innovation'
  | 'completion';

export const RESOURCE_KEYS: readonly ResourceKey[] = [
  'knowledge',
  'discovery',
  'iron',
  'innovation',
  'completion',
] as const;

export type MilestoneKey =
  | 'stone_world'
  | 'kingdom_of_science'
  | 'phone_era'
  | 'perseus_voyage'
  | 'world_tour'
  | 'whyman_moon_signal'
  | 'moon_mission';

export type OverlayKey =
  | 'power'
  | 'knowledge'
  | 'discovery'
  | 'iron'
  | 'innovation'
  | 'completion'
  | 'storage';

export type BuildingTier = 1 | 2 | 3;

/** A single placed building instance on the city grid. */
export interface BuildingInstance {
  /** Catalog entry key — e.g. "iron_smelter", "wooden_pole". */
  id: string;
  tier: BuildingTier;
  /** Top-left tile of the footprint (per design/05-map §Coordinates). */
  x: number;
  y: number;
  /** Total resources spent on this instance (T1 + all upgrades) — for 50% demolish refund. */
  spent: Partial<Record<ResourceKey, number>>;
  /** ISO 8601 timestamp of placement (for chronological ordering / animations). */
  placed_at: string;
}

/** A Mecha Senku speech-bubble entry retained in the Captain's Log scrollback. */
export interface LogEntry {
  /** ISO 8601 timestamp. */
  ts: string;
  /** The operational line (e.g. "Profit. Workshop T1 on the deck — +10⚡ / hr."). */
  operational: string;
  /** Optional factoid attached to the bubble (per design/06-style §Factoid delivery). */
  factoid?: string;
  /** Trigger key — e.g. "build:workshop:1", "brownout:Main", "research:sulfa_drug". */
  trigger: string;
}

export interface MapState {
  /** Fixed in v1 at 32 × 24 per design/05-map §Grid resolution. */
  grid: { width: 32; height: 24 };
  /** Which milestone expansion rings have been applied (drives the buildable-area polygon). */
  buildable_area_unlocks: MilestoneKey[];
}

export interface SettingsState {
  /** v1 silent — chimes deferred to v1.x per design/06-style §Sound. */
  sound_enabled: boolean;
  /** Auto-path visibility toggle. */
  paths_visible: boolean;
  /** Currently-active overlay layer, if any. */
  active_overlay: OverlayKey | null;
  /** 0-1, reserved for v1.x. */
  music_volume: number;
}

export interface StatsState {
  total_active_earned: Record<ResourceKey, number>;
  total_passive_earned: Record<ResourceKey, number>;
  session_count: number;
  total_buildings_placed: number;
  total_demolished: number;
}

export interface ResearchState {
  /** Tech keys the player has researched. */
  researched: string[];
  /** Reserved — research is instant in v1, so always null. */
  in_progress: null;
}

/** Top-level shape of state.json (v1). */
export interface StoneWorldState {
  version: typeof CURRENT_VERSION;
  last_session_open_at: string;
  last_session_close_at: string;
  resources: Record<ResourceKey, number>;
  buildings: BuildingInstance[];
  research: ResearchState;
  milestone: MilestoneKey;
  map: MapState;
  /** Last ~100 Captain's Log entries (FIFO eviction). */
  captain_log: LogEntry[];
  settings: SettingsState;
  stats: StatsState;
}

/** Cap on the captain_log array — older entries evict FIFO. */
export const CAPTAIN_LOG_MAX = 100;

function zeroResources(): Record<ResourceKey, number> {
  return {
    knowledge: 0,
    discovery: 0,
    iron: 0,
    innovation: 0,
    completion: 0,
  };
}

/**
 * Factory for a fresh starting state — first-time player or test fixture.
 *
 * Used by the dev middleware when state.json is missing on first GET.
 * All resources zero, no buildings placed, milestone = stone_world,
 * settings = silent + paths visible + no overlay.
 */
export function defaultState(now: Date = new Date()): StoneWorldState {
  const ts = now.toISOString();
  return {
    version: CURRENT_VERSION,
    last_session_open_at: ts,
    last_session_close_at: ts,
    resources: zeroResources(),
    buildings: [],
    research: { researched: [], in_progress: null },
    milestone: 'stone_world',
    map: {
      grid: { width: 32, height: 24 },
      buildable_area_unlocks: [],
    },
    captain_log: [],
    settings: {
      sound_enabled: false,
      paths_visible: true,
      active_overlay: null,
      music_volume: 0,
    },
    stats: {
      total_active_earned: zeroResources(),
      total_passive_earned: zeroResources(),
      session_count: 0,
      total_buildings_placed: 0,
      total_demolished: 0,
    },
  };
}
