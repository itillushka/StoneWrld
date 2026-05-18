import { describe, expect, it } from 'vitest';
import {
  GRID_WIDTH,
  GRID_HEIGHT,
  TILE_SIZE,
  WORLD_WIDTH_PX,
  WORLD_HEIGHT_PX,
  BUILDABLE_AREA,
  currentBuildableArea,
  isBuildable,
  isFrontier,
  tileToPixel,
  pixelToTile,
  inGrid,
} from '../../src/city/grid';
import type { MilestoneKey } from '../../src/state/schema';

describe('grid constants', () => {
  it('locks 32 × 24 grid at 32 px / tile (post co-captain revision: 64×64 default building)', () => {
    expect(GRID_WIDTH).toBe(32);
    expect(GRID_HEIGHT).toBe(24);
    expect(TILE_SIZE).toBe(32);
    expect(WORLD_WIDTH_PX).toBe(1024);
    expect(WORLD_HEIGHT_PX).toBe(768);
  });

  it('BUILDABLE_AREA has 8 expansion levels (0 through 7) matching design/05-map §Expansion', () => {
    expect(BUILDABLE_AREA).toHaveLength(8);
  });

  it('starting plaza is the 8×8 Stone World rectangle centered on cols 12-19 / rows 8-15', () => {
    const level0 = BUILDABLE_AREA[0]!;
    expect(level0).toEqual({ xMin: 12, yMin: 8, xMax: 19, yMax: 15 });
    expect(level0.xMax - level0.xMin + 1).toBe(8);
    expect(level0.yMax - level0.yMin + 1).toBe(8);
  });

  it('final unlock covers the full 32×24 grid', () => {
    const last = BUILDABLE_AREA[BUILDABLE_AREA.length - 1]!;
    expect(last).toEqual({ xMin: 0, yMin: 0, xMax: 31, yMax: 23 });
  });

  it('each expansion strictly contains the previous (monotonic growth)', () => {
    for (let i = 1; i < BUILDABLE_AREA.length; i++) {
      const prev = BUILDABLE_AREA[i - 1]!;
      const curr = BUILDABLE_AREA[i]!;
      expect(curr.xMin).toBeLessThanOrEqual(prev.xMin);
      expect(curr.yMin).toBeLessThanOrEqual(prev.yMin);
      expect(curr.xMax).toBeGreaterThanOrEqual(prev.xMax);
      expect(curr.yMax).toBeGreaterThanOrEqual(prev.yMax);
    }
  });
});

describe('currentBuildableArea()', () => {
  it('returns starting plaza for empty unlocks', () => {
    expect(currentBuildableArea([])).toBe(BUILDABLE_AREA[0]);
  });

  it('returns level-N rect after N unlocks (arrival-order)', () => {
    const u: MilestoneKey[] = ['stone_world', 'kingdom_of_science'];
    expect(currentBuildableArea(u)).toBe(BUILDABLE_AREA[2]);
  });

  it('clamps to the final level when more unlocks than levels exist (defensive)', () => {
    const tooMany: MilestoneKey[] = Array(20).fill('stone_world');
    expect(currentBuildableArea(tooMany)).toBe(BUILDABLE_AREA[BUILDABLE_AREA.length - 1]);
  });
});

describe('isBuildable / isFrontier', () => {
  it('starting plaza accepts cols 12-19 / rows 8-15', () => {
    const rect = BUILDABLE_AREA[0]!;
    expect(isBuildable(rect, 12, 8)).toBe(true);
    expect(isBuildable(rect, 19, 15)).toBe(true);
    expect(isBuildable(rect, 16, 12)).toBe(true);
  });

  it('starting plaza rejects out-of-rect tiles', () => {
    const rect = BUILDABLE_AREA[0]!;
    expect(isBuildable(rect, 11, 8)).toBe(false);
    expect(isBuildable(rect, 20, 8)).toBe(false);
    expect(isBuildable(rect, 12, 7)).toBe(false);
    expect(isBuildable(rect, 12, 16)).toBe(false);
    expect(isBuildable(rect, 0, 0)).toBe(false);
    expect(isBuildable(rect, 31, 23)).toBe(false);
  });

  it('isFrontier is the complement of isBuildable', () => {
    const rect = BUILDABLE_AREA[0]!;
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        expect(isFrontier(rect, x, y)).toBe(!isBuildable(rect, x, y));
      }
    }
  });
});

describe('tileToPixel / pixelToTile', () => {
  it('tile (0, 0) maps to pixel (0, 0)', () => {
    expect(tileToPixel(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it('tile (16, 12) maps to pixel (512, 384) at 32 px/tile', () => {
    expect(tileToPixel(16, 12)).toEqual({ x: 512, y: 384 });
  });

  it('pixel (0, 0) maps back to tile (0, 0)', () => {
    expect(pixelToTile(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it('pixel midpoint inside a tile floors to that tile (TILE_SIZE = 32)', () => {
    expect(pixelToTile(16, 16)).toEqual({ x: 0, y: 0 });
    expect(pixelToTile(31, 31)).toEqual({ x: 0, y: 0 });
    expect(pixelToTile(32, 32)).toEqual({ x: 1, y: 1 });
  });

  it('pixelToTile clamps out-of-bounds inputs to valid tile coords', () => {
    expect(pixelToTile(-100, -100)).toEqual({ x: 0, y: 0 });
    expect(pixelToTile(99999, 99999)).toEqual({ x: GRID_WIDTH - 1, y: GRID_HEIGHT - 1 });
  });

  it('tileToPixel ∘ pixelToTile is the identity for in-grid pixels (on tile origins)', () => {
    for (let ty = 0; ty < GRID_HEIGHT; ty++) {
      for (let tx = 0; tx < GRID_WIDTH; tx++) {
        const px = tileToPixel(tx, ty);
        const back = pixelToTile(px.x, px.y);
        expect(back).toEqual({ x: tx, y: ty });
      }
    }
  });
});

describe('inGrid', () => {
  it('accepts every (x, y) inside the grid', () => {
    expect(inGrid(0, 0)).toBe(true);
    expect(inGrid(GRID_WIDTH - 1, GRID_HEIGHT - 1)).toBe(true);
    expect(inGrid(16, 12)).toBe(true);
  });

  it('rejects out-of-bounds coordinates', () => {
    expect(inGrid(-1, 0)).toBe(false);
    expect(inGrid(0, -1)).toBe(false);
    expect(inGrid(GRID_WIDTH, 0)).toBe(false);
    expect(inGrid(0, GRID_HEIGHT)).toBe(false);
  });
});
