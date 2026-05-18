import type { BuildingInstance, ResourceKey } from '../state/schema';
import { getBuilding } from '../catalog/buildings';

/**
 * Silo storage caps — pure data engine.
 *
 * Per design/02-game-logic §Storage and design/06-style §HUD components:
 *   - Each resource has a silo building. Without it, baseline cap = 1000.
 *   - Silo T1 → 5,000. T2 → 20,000. T3 → 100,000.
 *   - When resources[r] > cap(r), overflow is lost (active + passive).
 *   - HUD shows a fill bar when current/cap is within 10% of cap.
 *   - Mecha Senku fires "Storage tight" at 90% and "Silo full" at 100%.
 *
 * Silo → resource mapping per design/04-buildings §Storage / Silos.
 */

export const BASELINE_CAP = 1000;
export const SILO_CAPS_BY_TIER: Record<1 | 2 | 3, number> = {
  1: 5000,
  2: 20_000,
  3: 100_000,
};

/** Catalog id of each silo building, keyed by the resource it stores. */
export const SILO_FOR_RESOURCE: Record<ResourceKey, string> = {
  knowledge: 'library',
  discovery: 'map_archive',
  iron: 'foundry_stockpile',
  innovation: 'workshop_storage',
  completion: 'trophy_hall',
};

/** Reverse lookup: catalog id → resource. */
export const RESOURCE_FOR_SILO: Record<string, ResourceKey> = {
  library: 'knowledge',
  map_archive: 'discovery',
  foundry_stockpile: 'iron',
  workshop_storage: 'innovation',
  trophy_hall: 'completion',
};

/** Threshold (fraction of cap) above which the HUD shows the fill bar. */
export const NEAR_CAP_THRESHOLD = 0.9;

/**
 * Compute the cap for every resource based on the player's placed silos.
 *
 * Algorithm: for each resource, find the highest-tier silo of that type
 * the player has placed. Multiple silo instances of the SAME building don't
 * stack (a second Library doesn't double the cap) — design/02-game-logic §Storage
 * is silent on stacking, so we choose the conservative "max-tier wins" rule
 * to match the design's per-silo cap progression (T1→5k, T2→20k, T3→100k).
 */
export function computeCaps(
  buildings: readonly BuildingInstance[],
): Record<ResourceKey, number> {
  const caps: Record<ResourceKey, number> = {
    knowledge: BASELINE_CAP,
    discovery: BASELINE_CAP,
    iron: BASELINE_CAP,
    innovation: BASELINE_CAP,
    completion: BASELINE_CAP,
  };

  for (const b of buildings) {
    const entry = getBuilding(b.id);
    if (!entry) continue;
    if (entry.category !== 'Storage') continue;
    const resource = RESOURCE_FOR_SILO[b.id];
    if (!resource) continue;
    const tierCap = SILO_CAPS_BY_TIER[b.tier];
    if (tierCap > caps[resource]) {
      caps[resource] = tierCap;
    }
  }

  return caps;
}

/**
 * Clamp a resource purse to the given caps. Returns a NEW object — does
 * not mutate input. Overflow is silently lost (per design/02 §Storage:
 * "active work awards stop at the cap, overflow is lost").
 */
export function clampResources(
  resources: Record<ResourceKey, number>,
  caps: Record<ResourceKey, number>,
): Record<ResourceKey, number> {
  return {
    knowledge: Math.min(resources.knowledge, caps.knowledge),
    discovery: Math.min(resources.discovery, caps.discovery),
    iron: Math.min(resources.iron, caps.iron),
    innovation: Math.min(resources.innovation, caps.innovation),
    completion: Math.min(resources.completion, caps.completion),
  };
}

/** Returns true if a resource is within NEAR_CAP_THRESHOLD of its cap. */
export function isNearCap(current: number, cap: number): boolean {
  return current >= cap * NEAR_CAP_THRESHOLD;
}

/** Returns true if a resource is AT or above its cap. */
export function isAtCap(current: number, cap: number): boolean {
  return current >= cap;
}

/** Human-readable silo name for the given resource (for Mecha Senku messages). */
export const SILO_DISPLAY_NAME: Record<ResourceKey, string> = {
  knowledge: 'Library',
  discovery: 'Map Archive',
  iron: 'Foundry Stockpile',
  innovation: 'Workshop Storage',
  completion: 'Trophy Hall',
};
