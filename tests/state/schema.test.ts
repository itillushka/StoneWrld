import { describe, expect, it } from 'vitest';
import {
  CURRENT_VERSION,
  RESOURCE_KEYS,
  defaultState,
} from '../../src/state/schema';

describe('defaultState()', () => {
  it('returns a state at the current schema version', () => {
    const state = defaultState();
    expect(state.version).toBe(CURRENT_VERSION);
  });

  it('starts with zero of every resource', () => {
    const state = defaultState();
    for (const key of RESOURCE_KEYS) {
      expect(state.resources[key]).toBe(0);
    }
  });

  it('starts in the Stone World milestone with an empty buildable_area_unlocks', () => {
    const state = defaultState();
    expect(state.milestone).toBe('stone_world');
    expect(state.map.buildable_area_unlocks).toEqual([]);
  });

  it('starts with no placed buildings, no research, empty captain log', () => {
    const state = defaultState();
    expect(state.buildings).toEqual([]);
    expect(state.research.researched).toEqual([]);
    expect(state.research.in_progress).toBeNull();
    expect(state.captain_log).toEqual([]);
  });

  it('starts with v1 settings (silent, paths visible, no overlay)', () => {
    const state = defaultState();
    expect(state.settings.sound_enabled).toBe(false);
    expect(state.settings.paths_visible).toBe(true);
    expect(state.settings.active_overlay).toBeNull();
    expect(state.settings.music_volume).toBe(0);
  });

  it('uses the locked 32×24 grid', () => {
    const state = defaultState();
    expect(state.map.grid.width).toBe(32);
    expect(state.map.grid.height).toBe(24);
  });

  it('embeds a stable ISO timestamp when `now` is passed in (deterministic for tests)', () => {
    const fixed = new Date('2026-05-18T10:00:00.000Z');
    const state = defaultState(fixed);
    expect(state.last_session_open_at).toBe('2026-05-18T10:00:00.000Z');
    expect(state.last_session_close_at).toBe('2026-05-18T10:00:00.000Z');
  });

  it('stats are all zero', () => {
    const state = defaultState();
    expect(state.stats.session_count).toBe(0);
    expect(state.stats.total_buildings_placed).toBe(0);
    expect(state.stats.total_demolished).toBe(0);
    for (const key of RESOURCE_KEYS) {
      expect(state.stats.total_active_earned[key]).toBe(0);
      expect(state.stats.total_passive_earned[key]).toBe(0);
    }
  });
});
