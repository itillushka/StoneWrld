import { beforeAll, describe, expect, it } from 'vitest';
import { computeTrickleDelta, applyTrickleDelta } from '../../src/economy/trickle';
import { analyzeNetworks } from '../../src/economy/network';
import { setCatalogForTesting } from '../../src/catalog/buildings';
import type { BuildingInstance, ResourceKey } from '../../src/state/schema';

beforeAll(() => {
  setCatalogForTesting([
    {
      id: 'windmill', name: 'Windmill', category: 'Power', footprint: { w: 1, h: 1 },
      sprite_source: 'cc0_placeholder',
      tiers: [
        { tier: 1, cost: {}, research_prereqs: [], passive_per_hour: {}, power_capacity: 3, power_demand: 0, idle_animation: '' },
      ],
    },
    {
      id: 'workshop', name: 'Workshop', category: 'Construction', footprint: { w: 1, h: 1 },
      sprite_source: 'cc0_placeholder',
      tiers: [
        // 10 innovation per hour at T1.
        { tier: 1, cost: {}, research_prereqs: [], passive_per_hour: { innovation: 10 }, power_capacity: 0, power_demand: 2, idle_animation: '' },
      ],
    },
    {
      id: 'soap_workshop', name: 'Soap Workshop', category: 'Chemistry', footprint: { w: 1, h: 1 },
      sprite_source: 'cc0_placeholder',
      tiers: [
        // 1 completion per hour — no power demand (early Stone World).
        { tier: 1, cost: {}, research_prereqs: [], passive_per_hour: { completion: 1 }, power_capacity: 0, power_demand: 0, idle_animation: '' },
      ],
    },
  ]);
});

function inst(id: string, x: number, y: number): BuildingInstance {
  return { id, tier: 1, x, y, spent: {}, placed_at: '' };
}

function zeroPurse(): Record<ResourceKey, number> {
  return { knowledge: 0, discovery: 0, iron: 0, innovation: 0, completion: 0 };
}

describe('computeTrickleDelta', () => {
  it('a powered workshop accrues 10 innovation per hour', () => {
    const buildings = [inst('windmill', 16, 12), inst('workshop', 17, 12)];
    const analysis = analyzeNetworks(buildings);
    const delta = computeTrickleDelta(buildings, { dtMs: 3_600_000, analysis });
    expect(delta.innovation).toBeCloseTo(10, 5);
  });

  it('an off-grid workshop (with power_demand > 0) accrues nothing', () => {
    // Workshop far from any generator → off-grid → 0% trickle.
    const buildings = [inst('windmill', 0, 0), inst('workshop', 28, 20)];
    const analysis = analyzeNetworks(buildings);
    const delta = computeTrickleDelta(buildings, { dtMs: 3_600_000, analysis });
    expect(delta.innovation ?? 0).toBe(0);
  });

  it('a brownout demander accrues nothing', () => {
    // 3 workshops on one windmill (cap 3, demand 6) → brownout.
    const buildings = [
      inst('windmill', 16, 12),
      inst('workshop', 17, 12),
      inst('workshop', 16, 13),
      inst('workshop', 15, 12),
    ];
    const analysis = analyzeNetworks(buildings);
    expect(analysis.networks[0]!.state).toBe('brownout');
    const delta = computeTrickleDelta(buildings, { dtMs: 3_600_000, analysis });
    expect(delta.innovation ?? 0).toBe(0);
  });

  it('a no-power-demand building (Soap Workshop) accrues regardless of network', () => {
    const buildings = [inst('soap_workshop', 16, 12)]; // far from any gen, no demand
    const analysis = analyzeNetworks(buildings);
    const delta = computeTrickleDelta(buildings, { dtMs: 3_600_000, analysis });
    expect(delta.completion).toBeCloseTo(1, 5);
  });

  it('scales proportionally with elapsed time (1 minute = 1/60 of hourly rate)', () => {
    const buildings = [inst('windmill', 16, 12), inst('workshop', 17, 12)];
    const analysis = analyzeNetworks(buildings);
    const delta = computeTrickleDelta(buildings, { dtMs: 60_000, analysis });
    expect(delta.innovation).toBeCloseTo(10 / 60, 5);
  });

  it('30-second tick on 10/hr workshop ≈ 0.0833 innovation', () => {
    const buildings = [inst('windmill', 16, 12), inst('workshop', 17, 12)];
    const analysis = analyzeNetworks(buildings);
    const delta = computeTrickleDelta(buildings, { dtMs: 30_000, analysis });
    expect(delta.innovation).toBeCloseTo(10 / 120, 5);
  });

  it('returns empty delta when no buildings have passive output', () => {
    const buildings = [inst('windmill', 16, 12)]; // gen only — 0 passive
    const analysis = analyzeNetworks(buildings);
    const delta = computeTrickleDelta(buildings, { dtMs: 3_600_000, analysis });
    expect(delta).toEqual({});
  });
});

describe('applyTrickleDelta', () => {
  it('adds delta resources to the purse', () => {
    const purse = zeroPurse();
    const next = applyTrickleDelta(purse, { knowledge: 3.5, innovation: 1.2 });
    expect(next.knowledge).toBeCloseTo(3.5, 5);
    expect(next.innovation).toBeCloseTo(1.2, 5);
    expect(next.iron).toBe(0);
  });

  it('accumulates across multiple applications', () => {
    let purse = zeroPurse();
    purse = applyTrickleDelta(purse, { innovation: 0.5 });
    purse = applyTrickleDelta(purse, { innovation: 0.3 });
    purse = applyTrickleDelta(purse, { innovation: 0.7 });
    expect(purse.innovation).toBeCloseTo(1.5, 5);
  });

  it('returns a NEW object — does not mutate input', () => {
    const purse = zeroPurse();
    const next = applyTrickleDelta(purse, { iron: 5 });
    expect(purse.iron).toBe(0); // input unchanged
    expect(next.iron).toBe(5);
  });
});
