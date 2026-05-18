import type { BuildingInstance } from '../state/schema';
import {
  getBuilding,
  getTier,
  type BuildingCatalogEntry,
  type BuildingTierData,
} from '../catalog/buildings';
import {
  GRID_WIDTH,
  GRID_HEIGHT,
  inGrid,
} from '../city/grid';

/**
 * Power coverage networks — pure data engine.
 *
 * Per design/02-game-logic §Power model + design/05-map §Power coverage:
 *   - Each generator emits a coverage radius (default 3 Manhattan tiles).
 *   - Power Poles (Wooden 4 / Iron 6 / Steel 8) EXTEND coverage via chain.
 *     A pole CONNECTS only if its center tile lies within an existing
 *     network's coverage. Once connected, the pole's coverage joins that
 *     network's union.
 *   - Multiple disjoint networks can coexist; each is evaluated independently.
 *   - A demander (building with power_demand > 0) needs at least one
 *     footprint tile inside SOME network's coverage to receive power.
 *     Off-grid demanders trickle at 0% regardless of brownout.
 *   - Within a network: capacity (sum gens) vs demand (sum in-coverage
 *     demanders) → ok / tight / brownout.
 *
 * This module is pure — no Phaser, no AppState. Caller passes the building
 * list and gets back the structured analysis. Recomputed on every state
 * change (placement / upgrade / demolish) per design/05-map: network
 * graph is "derived at load, not persisted".
 */

export type NetworkState = 'ok' | 'tight' | 'brownout';

export interface PowerNetwork {
  /** Human-readable label ("Main", "North", "East", etc.). */
  id: string;
  /** Generator instances contributing capacity. */
  generators: BuildingInstance[];
  /** Pole instances that chain-extended this network's coverage. */
  poles: BuildingInstance[];
  /** Demander instances whose footprint touches this network's coverage. */
  demanders: BuildingInstance[];
  /** All tiles inside this network's coverage area, encoded "x,y". */
  coveredTiles: Set<string>;
  capacity: number;
  demand: number;
  state: NetworkState;
}

export interface NetworkAnalysis {
  networks: PowerNetwork[];
  /** building.uid ("id@x,y") → network.id or 'off-grid'. */
  membership: Map<string, string>;
  /** Demanders that aren't inside any network's coverage. */
  offGrid: BuildingInstance[];
}

/** Tile key encoder — small string for Set<string> membership. */
export function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

/** Encode a building's identity for membership lookups. */
export function buildingUid(b: BuildingInstance): string {
  return `${b.id}@${b.x},${b.y}`;
}

/** True if this building's catalog id is one of the power poles. */
function isPole(b: BuildingInstance): boolean {
  return b.id === 'wooden_pole' || b.id === 'iron_pole' || b.id === 'steel_pole';
}

/**
 * Generator = has power_capacity > 0 at its current tier AND isn't a pole.
 * (Poles can have coverage_radius without being generators.)
 */
function isGenerator(t: BuildingTierData, b: BuildingInstance): boolean {
  return !isPole(b) && t.power_capacity > 0;
}

/** Demander = has power_demand > 0 at its current tier. */
function isDemander(t: BuildingTierData): boolean {
  return t.power_demand > 0;
}

/**
 * Compute the coverage tiles for a building based on its footprint
 * and the catalog's coverage_radius (or 3 for generators by default).
 *
 * Coverage is the Manhattan ball of radius R around any footprint tile,
 * clipped to the grid.
 */
export function buildingCoverage(
  b: BuildingInstance,
  entry: BuildingCatalogEntry,
  tier: BuildingTierData,
): Set<string> {
  const tiles = new Set<string>();
  const radius = tier.coverage_radius ?? (tier.power_capacity > 0 ? 3 : 0);
  if (radius <= 0) return tiles;

  // For each footprint tile, fill the Manhattan diamond of radius R.
  for (let dy = 0; dy < entry.footprint.h; dy++) {
    for (let dx = 0; dx < entry.footprint.w; dx++) {
      const cx = b.x + dx;
      const cy = b.y + dy;
      for (let oy = -radius; oy <= radius; oy++) {
        const rem = radius - Math.abs(oy);
        for (let ox = -rem; ox <= rem; ox++) {
          const tx = cx + ox;
          const ty = cy + oy;
          if (inGrid(tx, ty)) tiles.add(tileKey(tx, ty));
        }
      }
    }
  }
  return tiles;
}

/** Compute the center tile (rounded) of a building's footprint. */
function buildingCenter(b: BuildingInstance, entry: BuildingCatalogEntry): { x: number; y: number } {
  return {
    x: b.x + Math.floor(entry.footprint.w / 2),
    y: b.y + Math.floor(entry.footprint.h / 2),
  };
}

/** Compute the footprint tiles of a building (for demander membership). */
function footprintTiles(b: BuildingInstance, entry: BuildingCatalogEntry): string[] {
  const tiles: string[] = [];
  for (let dy = 0; dy < entry.footprint.h; dy++) {
    for (let dx = 0; dx < entry.footprint.w; dx++) {
      tiles.push(tileKey(b.x + dx, b.y + dy));
    }
  }
  return tiles;
}

/**
 * Build the network analysis from a flat list of buildings.
 *
 * Algorithm:
 *   1. Seed: each generator forms a new network with its own coverage.
 *   2. Iteratively claim poles: any pole whose CENTER tile is inside an
 *      existing network's coverage joins that network. If the pole's center
 *      is inside MULTIPLE networks' coverage, those networks MERGE.
 *      Iterate until no pole claims (transitive chains resolve).
 *   3. Assign demanders to networks by footprint intersection. Demanders
 *      not in any network's coverage go to `offGrid`.
 *   4. Compute capacity, demand, state per network.
 *   5. Label networks: largest covered area = "Main", others by their
 *      center's compass direction from the city center.
 */
export function analyzeNetworks(buildings: readonly BuildingInstance[]): NetworkAnalysis {
  // Resolve each building's catalog + tier data once.
  type Resolved = {
    b: BuildingInstance;
    entry: BuildingCatalogEntry;
    tier: BuildingTierData;
  };
  const resolved: Resolved[] = [];
  for (const b of buildings) {
    const entry = getBuilding(b.id);
    if (!entry) continue;
    const tier = getTier(b.id, b.tier);
    if (!tier) continue;
    resolved.push({ b, entry, tier });
  }

  const generators = resolved.filter((r) => isGenerator(r.tier, r.b));
  const poles = resolved.filter((r) => isPole(r.b));
  const demanders = resolved.filter((r) => isDemander(r.tier));

  // Step 1: seed networks from generators.
  type WorkingNetwork = {
    generators: Resolved[];
    poles: Resolved[];
    coveredTiles: Set<string>;
  };

  let working: WorkingNetwork[] = generators.map((g) => ({
    generators: [g],
    poles: [],
    coveredTiles: buildingCoverage(g.b, g.entry, g.tier),
  }));

  // Step 2: iteratively claim poles.
  const unclaimedPoles = [...poles];
  // Safety bound — prevents pathological loop if data is malformed.
  let safety = unclaimedPoles.length * (working.length + 1) + 1;
  let changed = true;
  while (changed && safety-- > 0) {
    changed = false;
    for (let i = unclaimedPoles.length - 1; i >= 0; i--) {
      const pole = unclaimedPoles[i]!;
      const center = buildingCenter(pole.b, pole.entry);
      const centerKey = tileKey(center.x, center.y);

      // Find all networks whose coverage includes this pole's center.
      const matchIdxs: number[] = [];
      for (let k = 0; k < working.length; k++) {
        if (working[k]!.coveredTiles.has(centerKey)) matchIdxs.push(k);
      }
      if (matchIdxs.length === 0) continue;

      // Merge any extra networks into the first match (descending so
      // splices don't shift the keep-index).
      const keepIdx = matchIdxs[0]!;
      const keep = working[keepIdx]!;
      for (let k = matchIdxs.length - 1; k >= 1; k--) {
        const m = working[matchIdxs[k]!]!;
        keep.generators.push(...m.generators);
        keep.poles.push(...m.poles);
        for (const t of m.coveredTiles) keep.coveredTiles.add(t);
        working.splice(matchIdxs[k]!, 1);
      }

      // Add the pole + its coverage.
      keep.poles.push(pole);
      const pc = buildingCoverage(pole.b, pole.entry, pole.tier);
      for (const t of pc) keep.coveredTiles.add(t);

      unclaimedPoles.splice(i, 1);
      changed = true;
    }
  }

  // Step 3: assign demanders.
  const membership = new Map<string, string>();
  const offGrid: BuildingInstance[] = [];

  type AssignedNetwork = WorkingNetwork & { demanders: Resolved[] };
  const assigned: AssignedNetwork[] = working.map((w) => ({ ...w, demanders: [] }));

  for (const d of demanders) {
    const ft = footprintTiles(d.b, d.entry);
    let placed = false;
    for (const n of assigned) {
      if (ft.some((t) => n.coveredTiles.has(t))) {
        n.demanders.push(d);
        placed = true;
        break;
      }
    }
    if (!placed) offGrid.push(d.b);
  }

  // Step 4: compute capacity, demand, state.
  const networksWithState = assigned.map((n) => ({
    generators: n.generators.map((g) => g.b),
    poles: n.poles.map((p) => p.b),
    demanders: n.demanders.map((d) => d.b),
    coveredTiles: n.coveredTiles,
    capacity: n.generators.reduce((s, g) => s + g.tier.power_capacity, 0),
    demand: n.demanders.reduce((s, d) => s + d.tier.power_demand, 0),
    state: 'ok' as NetworkState,
  }));
  for (const n of networksWithState) {
    if (n.demand > n.capacity) n.state = 'brownout';
    else if (n.demand > n.capacity * 0.8) n.state = 'tight';
    else n.state = 'ok';
  }

  // Step 5: label networks.
  const labeled = labelNetworks(networksWithState);

  // Build membership map.
  for (const n of labeled) {
    for (const g of n.generators) membership.set(buildingUid(g), n.id);
    for (const p of n.poles) membership.set(buildingUid(p), n.id);
    for (const d of n.demanders) membership.set(buildingUid(d), n.id);
  }
  for (const d of offGrid) membership.set(buildingUid(d), 'off-grid');

  return { networks: labeled, membership, offGrid };
}

/**
 * Name networks: the network with the largest coverage area is "Main";
 * the rest are labeled by their center's compass direction from the
 * city center (16, 12).
 */
function labelNetworks(
  networks: Omit<PowerNetwork, 'id'>[],
): PowerNetwork[] {
  if (networks.length === 0) return [];

  // Sort by coverage size desc — biggest network gets "Main".
  const indexed = networks.map((n, i) => ({ n, i, size: n.coveredTiles.size }));
  indexed.sort((a, b) => b.size - a.size);

  const labeled: PowerNetwork[] = [];
  for (let rank = 0; rank < indexed.length; rank++) {
    const { n } = indexed[rank]!;
    let id: string;
    if (rank === 0) {
      id = 'Main';
    } else {
      // Compute center of this network's coverage.
      let sx = 0;
      let sy = 0;
      let count = 0;
      for (const key of n.coveredTiles) {
        const [xs, ys] = key.split(',');
        sx += Number(xs);
        sy += Number(ys);
        count++;
      }
      const cx = count > 0 ? sx / count : GRID_WIDTH / 2;
      const cy = count > 0 ? sy / count : GRID_HEIGHT / 2;
      id = compassLabel(cx - GRID_WIDTH / 2, cy - GRID_HEIGHT / 2, rank);
    }
    labeled.push({ ...n, id });
  }
  return labeled;
}

/** Map a (dx, dy) from city center → compass direction label. */
function compassLabel(dx: number, dy: number, fallbackRank: number): string {
  const angle = Math.atan2(dy, dx); // -π … π, dy positive = south
  // Sectors (8): E, SE, S, SW, W, NW, N, NE
  const deg = (angle * 180) / Math.PI;
  if (deg >= -22.5 && deg < 22.5) return 'East';
  if (deg >= 22.5 && deg < 67.5) return 'South-East';
  if (deg >= 67.5 && deg < 112.5) return 'South';
  if (deg >= 112.5 && deg < 157.5) return 'South-West';
  if (deg >= 157.5 || deg < -157.5) return 'West';
  if (deg >= -157.5 && deg < -112.5) return 'North-West';
  if (deg >= -112.5 && deg < -67.5) return 'North';
  if (deg >= -67.5 && deg < -22.5) return 'North-East';
  return `Net${fallbackRank}`;
}
