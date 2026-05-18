import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  setCatalogForTesting,
  listBuildings,
  getBuilding,
  getTier,
  buildingsByCategory,
} from '../../src/catalog/buildings';

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');
const CATALOG_JSON_PATH = path.join(REPO_ROOT, 'public', 'content', 'catalog.json');

describe('catalog runtime — setCatalogForTesting + accessors', () => {
  it('listBuildings returns the injected entries', () => {
    setCatalogForTesting([
      {
        id: 'a', name: 'A', category: 'Dwellings', footprint: { w: 1, h: 1 },
        sprite_source: 'cc0_placeholder',
        tiers: [{ tier: 1, cost: {}, research_prereqs: [], passive_per_hour: {}, power_capacity: 0, power_demand: 0, idle_animation: '' }],
      },
      {
        id: 'b', name: 'B', category: 'Power', footprint: { w: 2, h: 2 },
        sprite_source: 'ai_gen',
        tiers: [{ tier: 1, cost: {}, research_prereqs: [], passive_per_hour: {}, power_capacity: 5, power_demand: 0, idle_animation: '' }],
      },
    ]);
    expect(listBuildings()).toHaveLength(2);
  });

  it('getBuilding returns the right entry by id', () => {
    setCatalogForTesting([
      { id: 'iron_smelter', name: 'Iron Smelter', category: 'Materials', footprint: { w: 2, h: 2 }, sprite_source: 'cc0_placeholder', tiers: [{ tier: 1, cost: { iron: 100 }, research_prereqs: [], passive_per_hour: { iron: 3 }, power_capacity: 0, power_demand: 1, idle_animation: '' }] },
    ]);
    expect(getBuilding('iron_smelter')?.name).toBe('Iron Smelter');
    expect(getBuilding('nope')).toBeUndefined();
  });

  it('getTier returns the right tier or undefined', () => {
    setCatalogForTesting([
      { id: 'x', name: 'X', category: 'Power', footprint: { w: 1, h: 1 }, sprite_source: 'cc0_placeholder', tiers: [
        { tier: 1, cost: {}, research_prereqs: [], passive_per_hour: {}, power_capacity: 3, power_demand: 0, idle_animation: '' },
        { tier: 2, cost: {}, research_prereqs: [], passive_per_hour: {}, power_capacity: 8, power_demand: 0, idle_animation: '' },
      ] },
    ]);
    expect(getTier('x', 1)?.power_capacity).toBe(3);
    expect(getTier('x', 2)?.power_capacity).toBe(8);
    expect(getTier('x', 3)).toBeUndefined();
  });

  it('buildingsByCategory groups by category', () => {
    setCatalogForTesting([
      { id: 'a', name: 'A', category: 'Power', footprint: { w: 1, h: 1 }, sprite_source: 'cc0_placeholder', tiers: [{ tier: 1, cost: {}, research_prereqs: [], passive_per_hour: {}, power_capacity: 0, power_demand: 0, idle_animation: '' }] },
      { id: 'b', name: 'B', category: 'Power', footprint: { w: 1, h: 1 }, sprite_source: 'cc0_placeholder', tiers: [{ tier: 1, cost: {}, research_prereqs: [], passive_per_hour: {}, power_capacity: 0, power_demand: 0, idle_animation: '' }] },
      { id: 'c', name: 'C', category: 'Dwellings', footprint: { w: 1, h: 1 }, sprite_source: 'cc0_placeholder', tiers: [{ tier: 1, cost: {}, research_prereqs: [], passive_per_hour: {}, power_capacity: 0, power_demand: 0, idle_animation: '' }] },
    ]);
    const map = buildingsByCategory();
    expect(map.get('Power')).toHaveLength(2);
    expect(map.get('Dwellings')).toHaveLength(1);
  });
});

describe('compiled catalog.json fixture (sanity check the parser output)', () => {
  // Skip if the file isn't present (e.g. fresh clone before `npm run compile`).
  if (!fs.existsSync(CATALOG_JSON_PATH)) {
    it.skip('catalog.json missing — run npx tsx scripts/compile-catalog.ts', () => {});
    return;
  }

  const raw = JSON.parse(fs.readFileSync(CATALOG_JSON_PATH, 'utf8'));

  it('has version 1', () => {
    expect(raw.version).toBe(1);
  });

  it('has at least 60 building entries (close to the ~67 estimate)', () => {
    expect(raw.entries.length).toBeGreaterThanOrEqual(60);
  });

  it('every entry has a valid id (snake_case)', () => {
    for (const e of raw.entries) {
      expect(e.id).toMatch(/^[a-z0-9_]+$/);
    }
  });

  it('every entry has a footprint with positive width + height', () => {
    for (const e of raw.entries) {
      expect(e.footprint.w).toBeGreaterThan(0);
      expect(e.footprint.h).toBeGreaterThan(0);
    }
  });

  it('every entry has at least one tier', () => {
    for (const e of raw.entries) {
      expect(e.tiers.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('Settler Hut parsed with the expected T1 cost (30 iron + 15 innovation)', () => {
    const sh = raw.entries.find((e: { id: string }) => e.id === 'settler_hut');
    expect(sh).toBeDefined();
    expect(sh.tiers[0].cost).toEqual({ iron: 30, innovation: 15 });
  });

  it('Wooden Pole has coverage_radius = 4 (single-tier infrastructure)', () => {
    const wp = raw.entries.find((e: { id: string }) => e.id === 'wooden_pole');
    expect(wp).toBeDefined();
    expect(wp.tiers).toHaveLength(1);
    expect(wp.tiers[0].coverage_radius).toBe(4);
  });

  it('Iron Pole has coverage_radius = 6, Steel Pole = 8', () => {
    const ip = raw.entries.find((e: { id: string }) => e.id === 'iron_pole');
    const sp = raw.entries.find((e: { id: string }) => e.id === 'steel_pole');
    expect(ip.tiers[0].coverage_radius).toBe(6);
    expect(sp.tiers[0].coverage_radius).toBe(8);
  });

  it('Naval buildings carry the naval_needs_water terrain gate', () => {
    const navalIds = ['shipyard', 'sailboat_dock', 'steamship_dock', 'perseus_dock'];
    for (const id of navalIds) {
      const entry = raw.entries.find((e: { id: string }) => e.id === id);
      expect(entry, `expected ${id} in catalog`).toBeDefined();
      expect(entry.terrain_gate).toBe('naval_needs_water');
    }
  });

  it('Rocket Launch Pad carries the rocket_needs_concrete terrain gate', () => {
    const rlp = raw.entries.find((e: { id: string }) => e.id === 'rocket_launch_pad');
    expect(rlp).toBeDefined();
    expect(rlp.terrain_gate).toBe('rocket_needs_concrete');
  });

  it('Categories include all 12 expected per design/04-buildings', () => {
    const cats = new Set<string>();
    for (const e of raw.entries) cats.add(e.category);
    // Should have all 12 (or 11 if Materials Processing normalized).
    const required = [
      'Dwellings', 'Power', 'Materials', 'Chemistry', 'Construction',
      'Mechanics', 'Electronics', 'Communication', 'Naval', 'Medicine',
      'Space', 'Storage',
    ];
    for (const c of required) {
      expect(cats.has(c), `missing category: ${c}`).toBe(true);
    }
  });

  it('Power category has at least the 3 pole tiers as single-tier entries', () => {
    const poles = raw.entries.filter((e: { category: string; id: string }) =>
      e.category === 'Power' && /pole/.test(e.id),
    );
    expect(poles.length).toBeGreaterThanOrEqual(3);
  });
});
