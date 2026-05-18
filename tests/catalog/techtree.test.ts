import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  setTechTreeForTesting,
  listTechs,
  getTech,
  isTechAvailable,
  isTechResearched,
  buildingIsResearched,
} from '../../src/catalog/techtree';

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');
const TECH_TREE_JSON = path.join(REPO_ROOT, 'public', 'content', 'tech-tree.json');

describe('tech-tree runtime — setTechTreeForTesting + accessors', () => {
  beforeEach(() => {
    setTechTreeForTesting({
      version: 1,
      generated_at: '',
      branches: ['Materials', 'Power'],
      milestones: ['Stone World'],
      techs: [
        { id: 'stone_tools', name: 'Stone Tools', branch: 'Materials', milestone: 1,
          cost: {}, prereqs: [], unlocks_buildings: [], enables_techs: [], is_boss: false },
        { id: 'fire', name: 'Fire', branch: 'Power', milestone: 1,
          cost: { iron: 5 }, prereqs: ['stone_tools'], unlocks_buildings: [], enables_techs: [], is_boss: false },
        { id: 'mud_brick', name: 'Mud Brick', branch: 'Materials', milestone: 1,
          cost: { iron: 15, innovation: 10 }, prereqs: ['stone_tools', 'fire'], unlocks_buildings: ['settler_hut'], enables_techs: [], is_boss: false },
      ],
    });
  });

  it('listTechs returns the injected techs', () => {
    expect(listTechs()).toHaveLength(3);
  });

  it('getTech finds by id', () => {
    expect(getTech('fire')?.name).toBe('Fire');
    expect(getTech('nope')).toBeUndefined();
  });

  it('isTechResearched matches researched set', () => {
    const researched = new Set(['stone_tools']);
    expect(isTechResearched('stone_tools', researched)).toBe(true);
    expect(isTechResearched('fire', researched)).toBe(false);
  });
});

describe('isTechAvailable — gating logic', () => {
  beforeEach(() => {
    setTechTreeForTesting({
      version: 1,
      generated_at: '',
      branches: ['Materials', 'Power'],
      milestones: ['Stone World'],
      techs: [
        { id: 'stone_tools', name: 'Stone Tools', branch: 'Materials', milestone: 1,
          cost: {}, prereqs: [], unlocks_buildings: [], enables_techs: [], is_boss: false },
        { id: 'fire', name: 'Fire', branch: 'Power', milestone: 1,
          cost: {}, prereqs: ['stone_tools'], unlocks_buildings: [], enables_techs: [], is_boss: false },
        { id: 'mud_brick', name: 'Mud Brick', branch: 'Materials', milestone: 1,
          cost: {}, prereqs: ['stone_tools', 'fire'], unlocks_buildings: [], enables_techs: [], is_boss: false },
      ],
    });
  });

  it('starter techs (no prereqs) are immediately available', () => {
    expect(isTechAvailable('stone_tools', new Set())).toBe(true);
  });

  it('a tech with unresearched prereqs is locked', () => {
    expect(isTechAvailable('fire', new Set())).toBe(false);
  });

  it('a tech becomes available after its prereqs are researched', () => {
    expect(isTechAvailable('fire', new Set(['stone_tools']))).toBe(true);
  });

  it('a tech with multiple prereqs needs ALL of them', () => {
    expect(isTechAvailable('mud_brick', new Set(['stone_tools']))).toBe(false);
    expect(isTechAvailable('mud_brick', new Set(['stone_tools', 'fire']))).toBe(true);
  });

  it('an unknown tech id is never available', () => {
    expect(isTechAvailable('nope', new Set(['stone_tools']))).toBe(false);
  });

  it('dangling prereqs (referenced but not in compiled tree) are auto-satisfied', () => {
    setTechTreeForTesting({
      version: 1,
      generated_at: '',
      branches: [],
      milestones: [],
      techs: [
        { id: 'a', name: 'A', branch: 'X', milestone: 1,
          cost: {}, prereqs: ['mystery_tech'], unlocks_buildings: [], enables_techs: [], is_boss: false },
      ],
    });
    // The prereq doesn't resolve to a real tech, so treat as "no real gate" —
    // tech is available immediately. This prevents soft-locks from doc typos.
    expect(isTechAvailable('a', new Set())).toBe(true);
  });
});

describe('buildingIsResearched — modal gating helper', () => {
  beforeAll(() => {
    setTechTreeForTesting({
      version: 1,
      generated_at: '',
      branches: ['Materials'],
      milestones: ['Stone World'],
      techs: [
        { id: 'stone_tools', name: 'Stone Tools', branch: 'Materials', milestone: 1,
          cost: {}, prereqs: [], unlocks_buildings: [], enables_techs: [], is_boss: false },
        { id: 'mud_brick', name: 'Mud Brick', branch: 'Materials', milestone: 1,
          cost: {}, prereqs: ['stone_tools'], unlocks_buildings: [], enables_techs: [], is_boss: false },
      ],
    });
  });

  it('a building with no prereqs is always available', () => {
    expect(buildingIsResearched([], new Set())).toBe(true);
  });

  it('a building whose prereq is researched is available', () => {
    expect(buildingIsResearched(['mud_brick'], new Set(['mud_brick']))).toBe(true);
  });

  it('a building whose prereq is NOT researched is locked', () => {
    expect(buildingIsResearched(['mud_brick'], new Set())).toBe(false);
  });

  it('multi-prereq building: needs all of them', () => {
    expect(buildingIsResearched(['stone_tools', 'mud_brick'], new Set(['stone_tools']))).toBe(false);
    expect(buildingIsResearched(['stone_tools', 'mud_brick'], new Set(['stone_tools', 'mud_brick']))).toBe(true);
  });

  it('dangling building prereqs (no matching tech in compiled tree) are auto-satisfied', () => {
    expect(buildingIsResearched(['mystery_prereq'], new Set())).toBe(true);
  });
});

describe('compiled tech-tree.json fixture', () => {
  if (!fs.existsSync(TECH_TREE_JSON)) {
    it.skip('tech-tree.json missing — run npx tsx scripts/compile-techtree.ts', () => {});
    return;
  }

  const raw = JSON.parse(fs.readFileSync(TECH_TREE_JSON, 'utf8'));

  it('has version 1 + reasonable counts', () => {
    expect(raw.version).toBe(1);
    expect(raw.techs.length).toBeGreaterThanOrEqual(70);
    expect(raw.milestones.length).toBe(7);
  });

  it('Stone Tools parsed as a starter tech (no prereqs)', () => {
    const st = raw.techs.find((t: { id: string }) => t.id === 'stone_tools');
    expect(st).toBeDefined();
    expect(st.prereqs).toEqual([]);
    expect(st.milestone).toBe(1);
  });

  it('Sulfuric Acid is marked as Milestone 1 boss', () => {
    const sa = raw.techs.find((t: { id: string }) => t.id === 'sulfuric_acid');
    expect(sa).toBeDefined();
    expect(sa.is_boss).toBe(true);
    expect(sa.milestone).toBe(1);
  });

  it('every tech belongs to milestone in 1..7', () => {
    for (const t of raw.techs) {
      expect(t.milestone).toBeGreaterThanOrEqual(1);
      expect(t.milestone).toBeLessThanOrEqual(7);
    }
  });

  it('all 7 milestone names are non-empty strings', () => {
    for (const m of raw.milestones) {
      expect(typeof m).toBe('string');
      expect(m.length).toBeGreaterThan(0);
    }
  });
});
