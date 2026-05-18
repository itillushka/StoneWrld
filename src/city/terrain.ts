/**
 * Terrain — types, palette, JSON loader.
 *
 * Per design/05-map §Terrain (6 tile types) + design/06-style §Terrain art:
 *   - grass, stone, sand, water, concrete (decorative + Rocket Launch Pad gate)
 *   - dirt_path is auto-drawn between buildings (Phase 5+), not a base terrain.
 *
 * Phase 4 uses solid-color placeholder tiles per design/09-roadmap §Phase 4 risks:
 *   "Terrain art not ready. Mitigation: ship phase 4 with placeholder solid-color
 *    tiles (cream for grass, grey for stone, etc.); art swaps in later as the
 *    asset track delivers."
 *
 * Colors are MID-TONES from the per-terrain palette ranges in design/06-style.
 * When real tile sprites land (parallel asset track), this module's color map
 * becomes a fallback / tinting layer; the source-of-truth shifts to an atlas
 * frame per terrain type.
 */

export type Terrain =
  | 'grass'
  | 'stone'
  | 'sand'
  | 'water'
  | 'concrete'
  | 'dirt_path';

export const TERRAIN_TYPES: readonly Terrain[] = [
  'grass',
  'stone',
  'sand',
  'water',
  'concrete',
  'dirt_path',
] as const;

/**
 * Phase 4 placeholder palette — mid-tone of each terrain's design/06-style
 * range. Hex strings retained (not 0xRRGGBB int) for clarity; convert to int
 * at render time via Phaser.Display.Color.HexStringToColor.
 */
export const TERRAIN_COLOR: Record<Terrain, string> = {
  grass:    '#4A8E3E', // mid-green, design/06 range #3F6E2E → #7CD16A
  stone:    '#5C6E8E', // cool grey-blue, design/06 range #3A4868 → #7A8CA8
  sand:     '#DEC79E', // warm beige, design/06 range #D4B888 → #F0E0B8
  water:    '#1B5566', // deep cyan, design/06 range #0A1228 → #3DCBE3
  concrete: '#6E7682', // industrial grey, design/06 range #5C6E8E → #7A8CA8
  dirt_path:'#826048', // warm brown — only drawn between buildings (Phase 5+)
};

/** Phaser-numeric form of the colors above. Computed once at module load. */
export const TERRAIN_COLOR_INT: Record<Terrain, number> = {
  grass:    0x4a8e3e,
  stone:    0x5c6e8e,
  sand:     0xdec79e,
  water:    0x1b5566,
  concrete: 0x6e7682,
  dirt_path:0x826048,
};

export function isTerrain(value: unknown): value is Terrain {
  return typeof value === 'string' && (TERRAIN_TYPES as readonly string[]).includes(value);
}

/** Parsed map shape (matches public/maps/stoneworld.json). */
export interface TerrainMap {
  version: 1;
  width: number;
  height: number;
  /** tiles[y][x] — row-major. */
  tiles: Terrain[][];
}

/** Validate and narrow the raw JSON into a TerrainMap. Throws on shape errors. */
export function parseTerrainMap(raw: unknown): TerrainMap {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Terrain map must be a JSON object');
  }
  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1) {
    throw new Error(`Unsupported terrain map version: ${String(obj.version)}`);
  }
  if (typeof obj.width !== 'number' || typeof obj.height !== 'number') {
    throw new Error('Terrain map width/height must be numbers');
  }
  if (!Array.isArray(obj.tiles) || obj.tiles.length !== obj.height) {
    throw new Error(`Terrain map tiles must have ${obj.height} rows`);
  }
  const tiles: Terrain[][] = [];
  for (let y = 0; y < obj.height; y++) {
    const row = obj.tiles[y];
    if (!Array.isArray(row) || row.length !== obj.width) {
      throw new Error(`Terrain map row ${y} must have ${obj.width} columns`);
    }
    const checked: Terrain[] = [];
    for (let x = 0; x < obj.width; x++) {
      const cell = row[x];
      if (!isTerrain(cell)) {
        throw new Error(`Invalid terrain at (${x}, ${y}): ${String(cell)}`);
      }
      checked.push(cell);
    }
    tiles.push(checked);
  }
  return {
    version: 1,
    width: obj.width,
    height: obj.height,
    tiles,
  };
}

/** Fetch the canonical map JSON from /maps/stoneworld.json (Phaser asset dir). */
export async function fetchTerrainMap(): Promise<TerrainMap> {
  const res = await fetch('/maps/stoneworld.json');
  if (!res.ok) {
    throw new Error(`Failed to load terrain map: ${res.status} ${res.statusText}`);
  }
  const raw = await res.json();
  return parseTerrainMap(raw);
}
