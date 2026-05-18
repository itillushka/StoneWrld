import type { MilestoneKey } from '../state/schema';

/**
 * Grid math — pixel↔tile conversion, buildable area, frontier check.
 *
 * Per design/05-map:
 *   - Grid: 32 cols × 24 rows (locked)
 *   - Tile size: 128 source pixels per tile (locked)
 *   - Coordinate origin: top-left, +x right, +y down
 *   - Building footprint (x, y) = top-left tile
 *
 * Buildable area expands per milestone per design/05-map §Expansion. The
 * `BUILDABLE_AREA` table below codifies that expansion. Phase 4 renders the
 * starting Stone World 8×8 plaza; Phase 5+ updates the rectangle as
 * `state.map.buildable_area_unlocks` grows.
 */

export const GRID_WIDTH = 32;
export const GRID_HEIGHT = 24;
export const TILE_SIZE = 128; // source pixels per tile (design/05-map §Tile dimensions)

export const WORLD_WIDTH_PX = GRID_WIDTH * TILE_SIZE;   // 4096
export const WORLD_HEIGHT_PX = GRID_HEIGHT * TILE_SIZE; // 3072

/** A rectangular slice of the grid — both ends inclusive. */
export interface GridRect {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

/**
 * Buildable area at each "expansion level" (0 = starting plaza, 7 = full grid).
 * Per design/05-map §Expansion §Mechanic: ring → rectangle.
 *
 * Each entry is the buildable rectangle AFTER that level's unlock has been
 * applied. Level 0 = no unlocks applied (Stone World plaza only).
 * Indices match the position of the milestone in state.map.buildable_area_unlocks.
 */
export const BUILDABLE_AREA: readonly GridRect[] = [
  // 0 — Stone World plaza (8 × 8 centered)
  { xMin: 12, yMin: 8, xMax: 19, yMax: 15 },
  // 1 — after Stone World boss (Alchemy Lab + Sulfa Synthesis) → 12 × 12
  { xMin: 10, yMin: 6, xMax: 21, yMax: 17 },
  // 2 — after Kingdom of Science (Steel Foundry + Iron Casting) → 16 × 16
  { xMin: 8, yMin: 4, xMax: 23, yMax: 19 },
  // 3 — after Phone Era (Telephone Exchange + Telephony) → 20 × 16 (rectangle starts)
  { xMin: 6, yMin: 4, xMax: 25, yMax: 19 },
  // 4 — after Perseus Voyage → 24 × 20 (eastern coastline unlocks)
  { xMin: 4, yMin: 2, xMax: 27, yMax: 21 },
  // 5 — after World Tour → 28 × 20
  { xMin: 2, yMin: 2, xMax: 29, yMax: 21 },
  // 6 — after Whyman / Moon Signal → 30 × 22
  { xMin: 1, yMin: 1, xMax: 30, yMax: 22 },
  // 7 — after Moon Mission → full 32 × 24
  { xMin: 0, yMin: 0, xMax: 31, yMax: 23 },
] as const;

/** Pick the right buildable rectangle for a given list of applied unlocks. */
export function currentBuildableArea(unlocks: MilestoneKey[]): GridRect {
  // The unlocks array carries the milestone keys in arrival order. The
  // expansion level = number of entries (capped at the table size).
  const level = Math.min(unlocks.length, BUILDABLE_AREA.length - 1);
  return BUILDABLE_AREA[level]!;
}

/** Is the tile at (x, y) inside the given buildable rectangle? */
export function isBuildable(rect: GridRect, x: number, y: number): boolean {
  return x >= rect.xMin && x <= rect.xMax && y >= rect.yMin && y <= rect.yMax;
}

/** Is the tile FROZEN as frontier (i.e., NOT yet unlocked)? */
export function isFrontier(rect: GridRect, x: number, y: number): boolean {
  return !isBuildable(rect, x, y);
}

/** Convert tile coordinates to source-pixel coordinates (top-left of tile). */
export function tileToPixel(tx: number, ty: number): { x: number; y: number } {
  return { x: tx * TILE_SIZE, y: ty * TILE_SIZE };
}

/** Convert source-pixel coordinates to tile coordinates (floor, clamped). */
export function pixelToTile(px: number, py: number): { x: number; y: number } {
  const x = Math.max(0, Math.min(GRID_WIDTH - 1, Math.floor(px / TILE_SIZE)));
  const y = Math.max(0, Math.min(GRID_HEIGHT - 1, Math.floor(py / TILE_SIZE)));
  return { x, y };
}

/** Is the tile coordinate inside the 32 × 24 grid? */
export function inGrid(x: number, y: number): boolean {
  return x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT;
}
