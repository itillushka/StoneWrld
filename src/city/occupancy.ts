import type { BuildingInstance } from '../state/schema';
import { getBuilding } from '../catalog/buildings';
import { GRID_WIDTH, GRID_HEIGHT, inGrid } from './grid';

/**
 * Occupancy map — which tiles are claimed by which building.
 *
 * Per design/05-map §Placement rules:
 *   - "No overlap. A building cannot be placed if any of its footprint
 *     tiles is occupied or locked."
 *   - Building footprint (x, y) = top-left tile; building of size (w, h)
 *     occupies (x, y) through (x+w-1, y+h-1).
 *
 * This is a tiny pure-data module — no Phaser. Built from `state.buildings`
 * at scene load + maintained additively when the player places / demolishes.
 */

/** Cell value: building id (catalog key) or null when free. */
export type OccupancyCell = string | null;

export interface OccupancyMap {
  /** cells[y][x] — row-major, indexed by tile coords. */
  cells: OccupancyCell[][];
}

/** Build a fresh empty grid. */
export function emptyOccupancy(): OccupancyMap {
  const cells: OccupancyCell[][] = [];
  for (let y = 0; y < GRID_HEIGHT; y++) {
    cells.push(new Array<OccupancyCell>(GRID_WIDTH).fill(null));
  }
  return { cells };
}

/** Build occupancy from a list of placed buildings (used at scene load). */
export function buildOccupancy(buildings: readonly BuildingInstance[]): OccupancyMap {
  const map = emptyOccupancy();
  for (const b of buildings) {
    addToOccupancy(map, b);
  }
  return map;
}

/** Mutate `map` to claim every tile of `building`'s footprint. */
export function addToOccupancy(map: OccupancyMap, building: BuildingInstance): void {
  const entry = getBuilding(building.id);
  if (!entry) return; // unknown id — skip rather than crash
  for (let dy = 0; dy < entry.footprint.h; dy++) {
    for (let dx = 0; dx < entry.footprint.w; dx++) {
      const x = building.x + dx;
      const y = building.y + dy;
      if (inGrid(x, y)) {
        map.cells[y]![x] = building.id;
      }
    }
  }
}

/** Mutate `map` to release every tile of `building`'s footprint (Phase 11 demolish). */
export function removeFromOccupancy(map: OccupancyMap, building: BuildingInstance): void {
  const entry = getBuilding(building.id);
  if (!entry) return;
  for (let dy = 0; dy < entry.footprint.h; dy++) {
    for (let dx = 0; dx < entry.footprint.w; dx++) {
      const x = building.x + dx;
      const y = building.y + dy;
      if (inGrid(x, y)) {
        map.cells[y]![x] = null;
      }
    }
  }
}

/**
 * Does the building footprint anchored at (x, y) overlap any occupied tile?
 *
 * Returns true if ANY tile of the footprint is already claimed OR off-grid.
 * Used by placement validation to enforce design/05-map §Placement rules.
 */
export function wouldOverlap(
  map: OccupancyMap,
  buildingId: string,
  x: number,
  y: number,
): boolean {
  const entry = getBuilding(buildingId);
  if (!entry) return true; // unknown building → conservative reject
  for (let dy = 0; dy < entry.footprint.h; dy++) {
    for (let dx = 0; dx < entry.footprint.w; dx++) {
      const tx = x + dx;
      const ty = y + dy;
      if (!inGrid(tx, ty)) return true;
      if (map.cells[ty]![tx] !== null) return true;
    }
  }
  return false;
}

/** Read-only accessor: which building (if any) owns the given tile? */
export function occupantAt(
  map: OccupancyMap,
  x: number,
  y: number,
): OccupancyCell {
  if (!inGrid(x, y)) return null;
  return map.cells[y]![x]!;
}
