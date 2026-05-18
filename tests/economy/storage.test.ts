import { beforeAll, describe, expect, it } from 'vitest';
import {
  BASELINE_CAP,
  SILO_CAPS_BY_TIER,
  SILO_FOR_RESOURCE,
  RESOURCE_FOR_SILO,
  NEAR_CAP_THRESHOLD,
  computeCaps,
  clampResources,
  isNearCap,
  isAtCap,
} from '../../src/economy/storage';
import { setCatalogForTesting } from '../../src/catalog/buildings';
import type { BuildingInstance } from '../../src/state/schema';

/**
 * Silo storage tests — pure-function coverage of design/02 §Storage.
 */

beforeAll(() => {
  // Minimal catalog: just the 5 silos with category = 'Storage' so
  // computeCaps recognises them.
  setCatalogForTesting([
    {
      id: 'library', name: 'Library', category: 'Storage', footprint: { w: 2, h: 2 },
      sprite_source: 'cc0_placeholder',
      tiers: [
        { tier: 1, cost: {}, research_prereqs: [], passive_per_hour: {}, power_capacity: 0, power_demand: 0, idle_animation: '' },
        { tier: 2, cost: {}, research_prereqs: [], passive_per_hour: {}, power_capacity: 0, power_demand: 0, idle_animation: '' },
        { tier: 3, cost: {}, research_prereqs: [], passive_per_hour: {}, power_capacity: 0, power_demand: 0, idle_animation: '' },
      ],
    },
    {
      id: 'map_archive', name: 'Map Archive', category: 'Storage', footprint: { w: 2, h: 2 },
      sprite_source: 'cc0_placeholder',
      tiers: [
        { tier: 1, cost: {}, research_prereqs: [], passive_per_hour: {}, power_capacity: 0, power_demand: 0, idle_animation: '' },
        { tier: 2, cost: {}, research_prereqs: [], passive_per_hour: {}, power_capacity: 0, power_demand: 0, idle_animation: '' },
        { tier: 3, cost: {}, research_prereqs: [], passive_per_hour: {}, power_capacity: 0, power_demand: 0, idle_animation: '' },
      ],
    },
    {
      id: 'workshop', name: 'Workshop', category: 'Construction', footprint: { w: 2, h: 2 },
      sprite_source: 'cc0_placeholder',
      tiers: [{ tier: 1, cost: {}, research_prereqs: [], passive_per_hour: {}, power_capacity: 0, power_demand: 0, idle_animation: '' }],
    },
  ]);
});

function silo(id: string, tier: 1 | 2 | 3): BuildingInstance {
  return { id, tier, x: 0, y: 0, spent: {}, placed_at: '' };
}

describe('constants', () => {
  it('baseline cap is 1000 per design/02 §Storage', () => {
    expect(BASELINE_CAP).toBe(1000);
  });
  it('silo tier caps match design: 5k / 20k / 100k', () => {
    expect(SILO_CAPS_BY_TIER[1]).toBe(5000);
    expect(SILO_CAPS_BY_TIER[2]).toBe(20000);
    expect(SILO_CAPS_BY_TIER[3]).toBe(100000);
  });
  it('silo↔resource mapping is bijective', () => {
    for (const [resource, siloId] of Object.entries(SILO_FOR_RESOURCE)) {
      expect(RESOURCE_FOR_SILO[siloId]).toBe(resource);
    }
  });
  it('near-cap threshold is 90%', () => {
    expect(NEAR_CAP_THRESHOLD).toBe(0.9);
  });
});

describe('computeCaps', () => {
  it('returns baseline for every resource when no silos placed', () => {
    const c = computeCaps([]);
    expect(c.knowledge).toBe(BASELINE_CAP);
    expect(c.iron).toBe(BASELINE_CAP);
    expect(c.completion).toBe(BASELINE_CAP);
  });

  it('Library T1 bumps knowledge cap to 5000', () => {
    const c = computeCaps([silo('library', 1)]);
    expect(c.knowledge).toBe(5000);
    expect(c.iron).toBe(BASELINE_CAP); // others unchanged
  });

  it('Library T2 bumps knowledge cap to 20000', () => {
    const c = computeCaps([silo('library', 2)]);
    expect(c.knowledge).toBe(20000);
  });

  it('Library T3 bumps knowledge cap to 100000', () => {
    const c = computeCaps([silo('library', 3)]);
    expect(c.knowledge).toBe(100000);
  });

  it('Multiple silos of same id don\'t stack — highest tier wins', () => {
    const c = computeCaps([silo('library', 1), silo('library', 1)]);
    expect(c.knowledge).toBe(5000); // not 10000
  });

  it('Map Archive bumps discovery, not knowledge', () => {
    const c = computeCaps([silo('map_archive', 2)]);
    expect(c.discovery).toBe(20000);
    expect(c.knowledge).toBe(BASELINE_CAP);
  });

  it('Non-storage buildings are ignored (Workshop doesn\'t affect any cap)', () => {
    const c = computeCaps([silo('workshop', 1)]);
    expect(c.knowledge).toBe(BASELINE_CAP);
    expect(c.iron).toBe(BASELINE_CAP);
    expect(c.innovation).toBe(BASELINE_CAP);
  });
});

describe('clampResources', () => {
  it('returns a NEW object — does not mutate input', () => {
    const r = { knowledge: 9999, discovery: 0, iron: 0, innovation: 0, completion: 0 };
    const caps = { knowledge: 5000, discovery: 1000, iron: 1000, innovation: 1000, completion: 1000 };
    const clamped = clampResources(r, caps);
    expect(r.knowledge).toBe(9999); // input unchanged
    expect(clamped.knowledge).toBe(5000);
  });

  it('values below cap pass through unchanged', () => {
    const r = { knowledge: 250, discovery: 50, iron: 999, innovation: 0, completion: 0 };
    const caps = { knowledge: 5000, discovery: 1000, iron: 1000, innovation: 1000, completion: 1000 };
    expect(clampResources(r, caps)).toEqual(r);
  });

  it('overflow is silently lost (no surplus tracking)', () => {
    const r = { knowledge: 100_000, discovery: 0, iron: 0, innovation: 0, completion: 0 };
    const caps = { knowledge: 5000, discovery: 1000, iron: 1000, innovation: 1000, completion: 1000 };
    expect(clampResources(r, caps).knowledge).toBe(5000);
  });
});

describe('isNearCap / isAtCap', () => {
  it('isNearCap true at 90% exactly', () => {
    expect(isNearCap(900, 1000)).toBe(true);
  });
  it('isNearCap false at 89.99%', () => {
    expect(isNearCap(899, 1000)).toBe(false);
  });
  it('isAtCap true at 100%, false at 99%', () => {
    expect(isAtCap(1000, 1000)).toBe(true);
    expect(isAtCap(999, 1000)).toBe(false);
  });
  it('isAtCap true when overflow happened (shouldn\'t happen post-clamp but defensive)', () => {
    expect(isAtCap(1500, 1000)).toBe(true);
  });
});
