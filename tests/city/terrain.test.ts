import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TERRAIN_TYPES,
  TERRAIN_COLOR,
  TERRAIN_COLOR_INT,
  isTerrain,
  parseTerrainMap,
} from '../../src/city/terrain';

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');

describe('Terrain palette', () => {
  it('declares 6 terrain types (5 base + dirt_path auto-tile)', () => {
    expect(TERRAIN_TYPES).toHaveLength(6);
    expect(TERRAIN_TYPES).toEqual([
      'grass', 'stone', 'sand', 'water', 'concrete', 'dirt_path',
    ]);
  });

  it('every terrain has a hex color AND a Phaser-int color', () => {
    for (const t of TERRAIN_TYPES) {
      expect(TERRAIN_COLOR[t]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(TERRAIN_COLOR_INT[t]).toBeGreaterThanOrEqual(0);
      expect(TERRAIN_COLOR_INT[t]).toBeLessThanOrEqual(0xffffff);
    }
  });

  it('hex and int colors round-trip consistently', () => {
    for (const t of TERRAIN_TYPES) {
      const hex = TERRAIN_COLOR[t]!;
      const int = parseInt(hex.slice(1), 16);
      expect(TERRAIN_COLOR_INT[t]).toBe(int);
    }
  });
});

describe('isTerrain', () => {
  it('accepts every valid terrain', () => {
    for (const t of TERRAIN_TYPES) {
      expect(isTerrain(t)).toBe(true);
    }
  });

  it('rejects unknown strings + non-strings', () => {
    expect(isTerrain('lava')).toBe(false);
    expect(isTerrain('')).toBe(false);
    expect(isTerrain(123)).toBe(false);
    expect(isTerrain(null)).toBe(false);
    expect(isTerrain(undefined)).toBe(false);
    expect(isTerrain({ tile: 'grass' })).toBe(false);
  });
});

describe('parseTerrainMap', () => {
  it('rejects non-object input', () => {
    expect(() => parseTerrainMap(null)).toThrow(/object/);
    expect(() => parseTerrainMap('grass')).toThrow(/object/);
    expect(() => parseTerrainMap(42)).toThrow(/object/);
  });

  it('rejects unsupported version', () => {
    expect(() => parseTerrainMap({ version: 2, width: 1, height: 1, tiles: [['grass']] }))
      .toThrow(/version/);
  });

  it('rejects mismatched width / height', () => {
    expect(() => parseTerrainMap({
      version: 1,
      width: 'wide' as unknown as number,
      height: 1,
      tiles: [['grass']],
    })).toThrow(/width\/height/);
  });

  it('rejects row count not matching height', () => {
    expect(() => parseTerrainMap({
      version: 1,
      width: 1,
      height: 2,
      tiles: [['grass']],
    })).toThrow(/rows/);
  });

  it('rejects column count not matching width', () => {
    expect(() => parseTerrainMap({
      version: 1,
      width: 2,
      height: 1,
      tiles: [['grass']],
    })).toThrow(/columns/);
  });

  it('rejects unknown terrain in a tile cell', () => {
    expect(() => parseTerrainMap({
      version: 1,
      width: 1,
      height: 1,
      tiles: [['lava']],
    })).toThrow(/Invalid terrain/);
  });

  it('accepts a valid map and returns a typed object', () => {
    const parsed = parseTerrainMap({
      version: 1,
      width: 2,
      height: 2,
      tiles: [['grass', 'stone'], ['water', 'sand']],
    });
    expect(parsed.version).toBe(1);
    expect(parsed.width).toBe(2);
    expect(parsed.height).toBe(2);
    expect(parsed.tiles[0]).toEqual(['grass', 'stone']);
  });
});

describe('canonical map fixture (public/maps/stoneworld.json)', () => {
  const mapPath = path.join(REPO_ROOT, 'public', 'maps', 'stoneworld.json');

  it('exists at the locked path per design/05-map §Static map file', () => {
    expect(fs.existsSync(mapPath)).toBe(true);
  });

  it('parses cleanly via parseTerrainMap (no JSON corruption / type drift)', () => {
    const raw = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    expect(() => parseTerrainMap(raw)).not.toThrow();
  });

  it('matches the locked 32 × 24 dimensions', () => {
    const raw = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    const map = parseTerrainMap(raw);
    expect(map.width).toBe(32);
    expect(map.height).toBe(24);
    expect(map.tiles).toHaveLength(24);
    for (const row of map.tiles) {
      expect(row).toHaveLength(32);
    }
  });

  it('contains all 6 terrain types except dirt_path (auto-drawn between buildings)', () => {
    const raw = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    const map = parseTerrainMap(raw);
    const seen = new Set<string>();
    for (const row of map.tiles) for (const t of row) seen.add(t);
    expect(seen.has('grass')).toBe(true);
    expect(seen.has('stone')).toBe(true);
    expect(seen.has('sand')).toBe(true);
    expect(seen.has('water')).toBe(true);
    expect(seen.has('concrete')).toBe(true);
    // dirt_path is procedurally drawn between buildings per design/05-map §Auto-paths,
    // not baked into the base terrain — should not appear in the static map.
    expect(seen.has('dirt_path')).toBe(false);
  });

  it('places concrete pad in the south (rows 19-22, cols 16-20) for Rocket Launch Pad gate', () => {
    const raw = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    const map = parseTerrainMap(raw);
    for (let y = 19; y <= 22; y++) {
      for (let x = 16; x <= 20; x++) {
        expect(map.tiles[y]![x]!).toBe('concrete');
      }
    }
  });

  it('places eastern river (water) in cols 29-30 across most rows', () => {
    const raw = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    const map = parseTerrainMap(raw);
    for (let y = 4; y <= 22; y++) {
      expect(map.tiles[y]![29]!).toBe('water');
      expect(map.tiles[y]![30]!).toBe('water');
    }
  });
});
