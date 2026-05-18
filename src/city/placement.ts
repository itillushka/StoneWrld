import type { ResourceKey, StoneWorldState } from '../state/schema';
import { getBuilding, getTier, type BuildingCatalogEntry } from '../catalog/buildings';
import {
  type GridRect,
  isBuildable,
  inGrid,
} from './grid';
import { wouldOverlap, type OccupancyMap } from './occupancy';
import type { Terrain, TerrainMap } from './terrain';

/**
 * Placement validation — pure functions, no Phaser, fully testable.
 *
 * Per design/05-map §Placement rules:
 *   1. No overlap with existing buildings (or off-grid).
 *   2. All footprint tiles must be inside the buildable area (no frontier).
 *   3. Terrain gates: naval needs ≤2 tiles from water; rocket needs full
 *      footprint on concrete pad.
 *   4. Player has enough resources to pay the T1 cost.
 *
 * On rejection we return the SPECIFIC reason so the UI can show a precise
 * tooltip (per design/05-map §Build UX: "Tile occupied / Outside buildable
 * area / Naval building needs water within 2 tiles / Not enough Iron").
 */

export type PlacementRejectReason =
  | 'overlap'
  | 'frontier'
  | 'needs_water'
  | 'needs_concrete'
  | 'insufficient_resources';

export interface PlacementValidation {
  valid: boolean;
  /** Set when `valid: false` — pinpoints WHY for tooltip rendering. */
  reason?: PlacementRejectReason;
  /** When 'insufficient_resources', which resource(s) are short — used by tooltip. */
  shortBy?: Partial<Record<ResourceKey, number>>;
}

/** Manhattan distance between two tiles. */
function manhattan(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

/** Is any tile within `radius` Manhattan distance of (cx, cy) a water tile? */
function hasWaterWithin(
  terrain: TerrainMap,
  cx: number,
  cy: number,
  radius: number,
): boolean {
  // Bounded scan: iterate the diamond around (cx, cy).
  for (let dy = -radius; dy <= radius; dy++) {
    const remaining = radius - Math.abs(dy);
    for (let dx = -remaining; dx <= remaining; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (!inGrid(x, y)) continue;
      if (terrain.tiles[y]![x] === 'water') return true;
    }
  }
  return false;
}

/** Does the footprint anchored at (x, y) cover ONLY the given terrain type? */
function footprintAllOf(
  terrain: TerrainMap,
  entry: BuildingCatalogEntry,
  x: number,
  y: number,
  type: Terrain,
): boolean {
  for (let dy = 0; dy < entry.footprint.h; dy++) {
    for (let dx = 0; dx < entry.footprint.w; dx++) {
      const tx = x + dx;
      const ty = y + dy;
      if (!inGrid(tx, ty)) return false;
      if (terrain.tiles[ty]![tx] !== type) return false;
    }
  }
  return true;
}

/** Does the entire footprint lie inside the buildable rectangle? */
function footprintInBuildable(
  entry: BuildingCatalogEntry,
  x: number,
  y: number,
  rect: GridRect,
): boolean {
  for (let dy = 0; dy < entry.footprint.h; dy++) {
    for (let dx = 0; dx < entry.footprint.w; dx++) {
      if (!isBuildable(rect, x + dx, y + dy)) return false;
    }
  }
  return true;
}

/** Compute resource shortfalls vs the player's purse — empty object = can afford. */
function computeShortBy(
  cost: Partial<Record<ResourceKey, number>>,
  purse: Record<ResourceKey, number>,
): Partial<Record<ResourceKey, number>> {
  const short: Partial<Record<ResourceKey, number>> = {};
  for (const [key, needed] of Object.entries(cost) as Array<[ResourceKey, number]>) {
    const have = purse[key] ?? 0;
    if (have < needed) {
      short[key] = needed - have;
    }
  }
  return short;
}

export interface ValidateOpts {
  buildingId: string;
  /** Tile coordinates of the building's top-left footprint cell. */
  x: number;
  y: number;
  state: StoneWorldState;
  occupancy: OccupancyMap;
  terrain: TerrainMap;
  buildableArea: GridRect;
}

/**
 * Validate a placement attempt — pure function over current state.
 *
 * Checks run in priority order:
 *   1. Unknown building / unknown tier → overlap (conservative).
 *   2. Overlap (and out-of-grid → counts as overlap).
 *   3. Frontier (any footprint tile outside buildable area).
 *   4. Terrain gate (naval water / rocket concrete).
 *   5. Resource cost.
 *
 * First failure wins — the player sees the most fundamental problem first.
 */
export function validatePlacement(opts: ValidateOpts): PlacementValidation {
  const { buildingId, x, y, state, occupancy, terrain, buildableArea } = opts;

  const entry = getBuilding(buildingId);
  const tier1 = getTier(buildingId, 1);
  if (!entry || !tier1) {
    return { valid: false, reason: 'overlap' };
  }

  if (wouldOverlap(occupancy, buildingId, x, y)) {
    return { valid: false, reason: 'overlap' };
  }

  if (!footprintInBuildable(entry, x, y, buildableArea)) {
    return { valid: false, reason: 'frontier' };
  }

  // Terrain gates per design/05-map §Placement rules + design/06-style §Voice rules.
  if (entry.terrain_gate === 'naval_needs_water') {
    // "≥1 footprint tile must be within 2 Manhattan tiles of a water tile"
    let anyTileNearWater = false;
    for (let dy = 0; dy < entry.footprint.h && !anyTileNearWater; dy++) {
      for (let dx = 0; dx < entry.footprint.w && !anyTileNearWater; dx++) {
        if (hasWaterWithin(terrain, x + dx, y + dy, 2)) {
          anyTileNearWater = true;
        }
      }
    }
    if (!anyTileNearWater) {
      return { valid: false, reason: 'needs_water' };
    }
  } else if (entry.terrain_gate === 'rocket_needs_concrete') {
    if (!footprintAllOf(terrain, entry, x, y, 'concrete')) {
      return { valid: false, reason: 'needs_concrete' };
    }
  }

  const short = computeShortBy(tier1.cost, state.resources);
  if (Object.keys(short).length > 0) {
    return { valid: false, reason: 'insufficient_resources', shortBy: short };
  }

  // Belt-and-suspenders: silence unused-warning on `manhattan` for tree-shaking.
  void manhattan;

  return { valid: true };
}

/** Human-readable explanation of a rejection — used by Phase 5+ tooltips. */
export function explainRejection(v: PlacementValidation): string {
  if (v.valid) return '';
  switch (v.reason) {
    case 'overlap':
      return 'Tile occupied';
    case 'frontier':
      return 'Outside buildable area';
    case 'needs_water':
      return 'Naval building needs water within 2 tiles';
    case 'needs_concrete':
      return 'Rocket Launch Pad requires concrete pad';
    case 'insufficient_resources': {
      if (!v.shortBy) return 'Not enough resources';
      const parts: string[] = [];
      const labels: Record<ResourceKey, string> = {
        knowledge: 'Knowledge',
        discovery: 'Discovery',
        iron: 'Iron',
        innovation: 'Innovation',
        completion: 'Completion',
      };
      for (const [k, v2] of Object.entries(v.shortBy) as Array<[ResourceKey, number]>) {
        parts.push(`${v2} ${labels[k]}`);
      }
      return `Need ${parts.join(' + ')}`;
    }
    default:
      return 'Cannot place here';
  }
}
