import type { BuildingInstance, ResourceKey } from '../state/schema';
import { getBuilding, getTier } from '../catalog/buildings';
import type { NetworkAnalysis } from './network';
import { buildingUid } from './network';

/**
 * Passive trickle accrual per design/02-game-logic §Passive trickle.
 *
 * Each building produces `passive_per_hour` of its category's primary
 * resource(s). The actual rate applied during a tick depends on power state:
 *
 *   - In an OK / TIGHT network → 100% rate
 *   - In a BROWNOUT network    → 0% rate
 *   - Off-grid AND has power_demand > 0 → 0% rate (needs power, has none)
 *   - Off-grid AND power_demand == 0     → 100% rate (manual / no-power building)
 *
 * Phase 7 ships with an in-window tick loop (every 30s). Catch-up math
 * for offline accrual (last_session_close_at → now, capped at 72h) is
 * a separate scope and lands in a later phase per design/02 §72h trickle cap.
 */

export interface TrickleOptions {
  /** Milliseconds since the last trickle tick. */
  dtMs: number;
  /** Map building.uid → network membership ('off-grid' or network id). */
  analysis: NetworkAnalysis;
}

/** Net delta of resources to apply this tick — empty if no trickle. */
export function computeTrickleDelta(
  buildings: readonly BuildingInstance[],
  opts: TrickleOptions,
): Partial<Record<ResourceKey, number>> {
  const delta: Partial<Record<ResourceKey, number>> = {};
  const hoursElapsed = opts.dtMs / 3_600_000; // ms → hours

  // Pre-compute network state lookup by id.
  const stateById = new Map<string, 'ok' | 'tight' | 'brownout'>();
  for (const n of opts.analysis.networks) stateById.set(n.id, n.state);

  for (const b of buildings) {
    const entry = getBuilding(b.id);
    if (!entry) continue;
    const tier = getTier(b.id, b.tier);
    if (!tier) continue;
    if (!tier.passive_per_hour || Object.keys(tier.passive_per_hour).length === 0) {
      continue; // no passive — skip
    }

    // Determine the rate multiplier based on power coverage state.
    const member = opts.analysis.membership.get(buildingUid(b));
    let rate = 1.0;
    if (tier.power_demand > 0) {
      if (member === 'off-grid' || member === undefined) {
        rate = 0; // demander out of coverage
      } else {
        const s = stateById.get(member);
        if (s === 'brownout') rate = 0;
      }
    }
    if (rate === 0) continue;

    for (const [resource, perHour] of Object.entries(tier.passive_per_hour) as Array<[ResourceKey, number]>) {
      const amount = perHour * hoursElapsed * rate;
      delta[resource] = (delta[resource] ?? 0) + amount;
    }
  }
  return delta;
}

/**
 * Apply a trickle delta to a state's resources, rounding to a sensible
 * precision. Returns a NEW resources object — caller swaps it in via
 * AppState.setState.
 *
 * Resources stay as floating-point to accumulate sub-unit trickle across
 * many small ticks; the HUD floors them for display.
 */
export function applyTrickleDelta(
  resources: Record<ResourceKey, number>,
  delta: Partial<Record<ResourceKey, number>>,
): Record<ResourceKey, number> {
  const next = { ...resources };
  for (const [k, v] of Object.entries(delta) as Array<[ResourceKey, number]>) {
    next[k] = (next[k] ?? 0) + v;
  }
  return next;
}
