/**
 * Generate the canonical StoneWrld terrain map → public/maps/stoneworld.json.
 *
 * Per design/05-map §Terrain (static, hand-authored, single canonical map):
 *   ONE map. Same every game-open. No procedural / no seed. The shape
 *   matches the sketch from the design doc:
 *     - Stone outcrop strip across the north (rows 0-2)
 *     - Grass-and-stone transition rows 3-4
 *     - Open grass plaza area centered around rows 8-15
 *     - Eastern river (water) running north-to-south, cols 29-30, rows 4-22
 *     - Sand strip immediately west of the river (col 28)
 *     - Concrete launch pad in the south (cols 16-20, rows 19-22)
 *     - Stone scattered in the south-west to evoke Senku-village rocks
 *
 * Run via:  npx tsx scripts/generate-map.ts
 *
 * This is a HAND-AUTHORED layout pretending to be code so the file is
 * version-controlled and re-derivable. The output is the actual canonical
 * truth — once Illia is happy he can ditch this generator and edit the
 * JSON directly (or import into Tiled for visual edits per design/08).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');
const OUT_PATH = path.join(REPO_ROOT, 'public', 'maps', 'stoneworld.json');

const WIDTH = 32;
const HEIGHT = 24;

type Terrain = 'grass' | 'stone' | 'sand' | 'water' | 'concrete' | 'dirt_path';

/** Decide terrain for a single (x, y) tile per the §Terrain sketch. */
function terrainAt(x: number, y: number): Terrain {
  // Eastern river — narrow strip, with a small bay carved out for the Perseus dock.
  if (x >= 29 && y >= 4 && y <= 22) return 'water';
  if (x === 28 && y >= 4 && y <= 22) return 'sand';

  // Bay carve-out near row 16-18 for the Perseus dock (extra water tile west).
  if (x === 27 && y >= 16 && y <= 18) return 'water';

  // Southern launch pad — concrete 5×4 block where Rocket Launch Pad will sit.
  if (x >= 16 && x <= 20 && y >= 19 && y <= 22) return 'concrete';

  // Northern stone outcrop.
  if (y === 0) return 'stone';
  if (y === 1) {
    // Solid stone strip with two grass "hollows" for visual texture.
    if (x === 7 || x === 18) return 'grass';
    return 'stone';
  }
  if (y === 2) {
    // Mostly stone with grass blending in.
    if (x % 4 === 1 || x % 5 === 2) return 'grass';
    return 'stone';
  }

  // Stone scattered in the central village area — Senku's village had rocky terrain.
  // Hand-placed feature stones (NOT random — same every game open).
  const featureStones: Array<[number, number]> = [
    [5, 5], [22, 6], [10, 14], [24, 11],
    [3, 17], [13, 21], [8, 8], [19, 17],
    [27, 4], [4, 13], [21, 14], [15, 6],
  ];
  if (featureStones.some(([fx, fy]) => fx === x && fy === y)) {
    return 'stone';
  }

  // Default fill: grass.
  return 'grass';
}

async function main(): Promise<void> {
  const tiles: Terrain[][] = [];
  for (let y = 0; y < HEIGHT; y++) {
    const row: Terrain[] = [];
    for (let x = 0; x < WIDTH; x++) {
      row.push(terrainAt(x, y));
    }
    tiles.push(row);
  }

  const map = {
    version: 1,
    width: WIDTH,
    height: HEIGHT,
    tiles,
  };

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(map, null, 2), 'utf8');
  console.log(`Wrote ${OUT_PATH} — ${WIDTH}×${HEIGHT} tiles`);

  // Stats for sanity.
  const counts: Record<Terrain, number> = {
    grass: 0, stone: 0, sand: 0, water: 0, concrete: 0, dirt_path: 0,
  };
  for (const row of tiles) for (const t of row) counts[t]++;
  console.log('Terrain breakdown:');
  for (const [k, v] of Object.entries(counts)) {
    const pct = ((v / (WIDTH * HEIGHT)) * 100).toFixed(1);
    console.log(`  ${k.padEnd(10)} ${String(v).padStart(4)} (${pct}%)`);
  }
}

main();
