import { beforeAll, describe, expect, it } from 'vitest';
import {
  validatePlacement,
  explainRejection,
} from '../../src/city/placement';
import {
  buildOccupancy,
  wouldOverlap,
  emptyOccupancy,
} from '../../src/city/occupancy';
import { BUILDABLE_AREA } from '../../src/city/grid';
import { defaultState } from '../../src/state/schema';
import type { StoneWorldState, BuildingInstance } from '../../src/state/schema';
import type { TerrainMap } from '../../src/city/terrain';
import { setCatalogForTesting } from '../../src/catalog/buildings';

/**
 * Inject a minimal fake catalog for placement tests. Phase 5's hardcoded
 * entry was replaced by Phase 6's runtime-loaded catalog, so unit tests
 * need to populate it explicitly.
 */
beforeAll(() => {
  setCatalogForTesting([
    {
      id: 'settler_hut',
      name: 'Settler Hut',
      category: 'Dwellings',
      footprint: { w: 1, h: 1 },
      sprite_source: 'cc0_placeholder',
      tiers: [
        {
          tier: 1,
          cost: { iron: 30, innovation: 15 },
          research_prereqs: ['mud_brick'],
          passive_per_hour: {},
          power_capacity: 0,
          power_demand: 0,
          idle_animation: 'chimney_smoke',
        },
      ],
    },
  ]);
});

/**
 * Placement + occupancy tests — pure functions, full coverage of the
 * validation rules in design/05-map §Placement rules.
 */

/** Build a 32×24 terrain map filled with one terrain type (helper). */
function uniformTerrain(t: TerrainMap['tiles'][number][number]): TerrainMap {
  const tiles: TerrainMap['tiles'] = [];
  for (let y = 0; y < 24; y++) {
    tiles.push(new Array(32).fill(t));
  }
  return { version: 1, width: 32, height: 24, tiles };
}

function richState(overrides: Partial<StoneWorldState> = {}): StoneWorldState {
  const base = defaultState();
  return {
    ...base,
    resources: { knowledge: 1000, discovery: 1000, iron: 1000, innovation: 1000, completion: 1000 },
    ...overrides,
  };
}

describe('wouldOverlap', () => {
  it('returns false on empty grid for an in-bounds 1×1 placement', () => {
    const occ = emptyOccupancy();
    expect(wouldOverlap(occ, 'settler_hut', 16, 12)).toBe(false);
  });

  it('returns true when the target tile is already claimed', () => {
    const existing: BuildingInstance = {
      id: 'settler_hut', tier: 1, x: 16, y: 12, spent: {}, placed_at: '',
    };
    const occ = buildOccupancy([existing]);
    expect(wouldOverlap(occ, 'settler_hut', 16, 12)).toBe(true);
  });

  it('returns true for any out-of-grid coordinate (defensive reject)', () => {
    const occ = emptyOccupancy();
    expect(wouldOverlap(occ, 'settler_hut', -1, 0)).toBe(true);
    expect(wouldOverlap(occ, 'settler_hut', 32, 0)).toBe(true);
    expect(wouldOverlap(occ, 'settler_hut', 0, -1)).toBe(true);
    expect(wouldOverlap(occ, 'settler_hut', 0, 24)).toBe(true);
  });

  it('returns true for unknown building id (defensive reject)', () => {
    const occ = emptyOccupancy();
    expect(wouldOverlap(occ, 'never_heard_of_it', 16, 12)).toBe(true);
  });
});

describe('validatePlacement — happy path', () => {
  it('accepts Settler Hut on an empty plaza tile with sufficient resources', () => {
    const result = validatePlacement({
      buildingId: 'settler_hut',
      x: 16,
      y: 12,
      state: richState(),
      occupancy: emptyOccupancy(),
      terrain: uniformTerrain('grass'),
      buildableArea: BUILDABLE_AREA[0]!,
    });
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });
});

describe('validatePlacement — overlap', () => {
  it('rejects when another building already occupies the tile', () => {
    const existing: BuildingInstance = {
      id: 'settler_hut', tier: 1, x: 16, y: 12, spent: {}, placed_at: '',
    };
    const result = validatePlacement({
      buildingId: 'settler_hut',
      x: 16,
      y: 12,
      state: richState({ buildings: [existing] }),
      occupancy: buildOccupancy([existing]),
      terrain: uniformTerrain('grass'),
      buildableArea: BUILDABLE_AREA[0]!,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('overlap');
  });

  it('rejects unknown building id with overlap (defensive)', () => {
    const result = validatePlacement({
      buildingId: 'mystery_building',
      x: 16,
      y: 12,
      state: richState(),
      occupancy: emptyOccupancy(),
      terrain: uniformTerrain('grass'),
      buildableArea: BUILDABLE_AREA[0]!,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('overlap');
  });
});

describe('validatePlacement — frontier', () => {
  it('rejects placement outside the buildable area', () => {
    // (0, 0) is outside the starting 8×8 plaza (cols 12-19, rows 8-15).
    const result = validatePlacement({
      buildingId: 'settler_hut',
      x: 0,
      y: 0,
      state: richState(),
      occupancy: emptyOccupancy(),
      terrain: uniformTerrain('grass'),
      buildableArea: BUILDABLE_AREA[0]!,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('frontier');
  });

  it('accepts placement at the buildable-area boundary', () => {
    const result = validatePlacement({
      buildingId: 'settler_hut',
      x: 12,
      y: 8,
      state: richState(),
      occupancy: emptyOccupancy(),
      terrain: uniformTerrain('grass'),
      buildableArea: BUILDABLE_AREA[0]!,
    });
    expect(result.valid).toBe(true);
  });
});

describe('validatePlacement — resources', () => {
  it('rejects when the player cannot afford the T1 cost', () => {
    const result = validatePlacement({
      buildingId: 'settler_hut',
      x: 16,
      y: 12,
      state: richState({
        resources: { knowledge: 0, discovery: 0, iron: 10, innovation: 0, completion: 0 },
      }),
      occupancy: emptyOccupancy(),
      terrain: uniformTerrain('grass'),
      buildableArea: BUILDABLE_AREA[0]!,
    });
    // Settler Hut T1 cost: 30 iron + 15 innovation. Player has 10 iron + 0 innovation.
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('insufficient_resources');
    expect(result.shortBy).toEqual({ iron: 20, innovation: 15 });
  });

  it('accepts when the player has EXACTLY the cost (no shortfall)', () => {
    const result = validatePlacement({
      buildingId: 'settler_hut',
      x: 16,
      y: 12,
      state: richState({
        resources: { knowledge: 0, discovery: 0, iron: 30, innovation: 15, completion: 0 },
      }),
      occupancy: emptyOccupancy(),
      terrain: uniformTerrain('grass'),
      buildableArea: BUILDABLE_AREA[0]!,
    });
    expect(result.valid).toBe(true);
  });
});

describe('explainRejection', () => {
  it('returns empty string for valid placements', () => {
    expect(explainRejection({ valid: true })).toBe('');
  });

  it('returns specific text per reason', () => {
    expect(explainRejection({ valid: false, reason: 'overlap' })).toBe('Tile occupied');
    expect(explainRejection({ valid: false, reason: 'frontier' })).toBe('Outside buildable area');
    expect(explainRejection({ valid: false, reason: 'needs_water' })).toMatch(/water/i);
    expect(explainRejection({ valid: false, reason: 'needs_concrete' })).toMatch(/concrete/i);
  });

  it('lists short resources by name for insufficient_resources', () => {
    expect(
      explainRejection({
        valid: false,
        reason: 'insufficient_resources',
        shortBy: { iron: 20, innovation: 15 },
      }),
    ).toMatch(/iron/i);
    expect(
      explainRejection({
        valid: false,
        reason: 'insufficient_resources',
        shortBy: { iron: 20, innovation: 15 },
      }),
    ).toMatch(/innovation/i);
  });

  it('handles insufficient_resources with no shortBy gracefully', () => {
    expect(
      explainRejection({ valid: false, reason: 'insufficient_resources' }),
    ).toBe('Not enough resources');
  });
});
