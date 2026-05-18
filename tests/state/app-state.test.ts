import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppStateImpl } from '../../src/state/app-state';
import { defaultState } from '../../src/state/schema';

/**
 * AppState — singleton-pattern shared state container.
 *
 * These tests use a FRESH AppStateImpl instance per test instead of the
 * exported `AppState` singleton, so test isolation is clean. The actual
 * exported singleton is just `new AppStateImpl()` — same class, same behavior.
 */

describe('AppStateImpl', () => {
  let state: AppStateImpl;

  beforeEach(() => {
    state = new AppStateImpl();
  });

  describe('getState / setState', () => {
    it('returns null before any state is set', () => {
      expect(state.getState()).toBeNull();
    });

    it('returns the held state after setState', () => {
      const fixture = defaultState();
      state.setState(fixture);
      expect(state.getState()).toBe(fixture);
    });
  });

  describe('subscribe', () => {
    it('delivers the current state immediately to a new subscriber', () => {
      const fixture = defaultState();
      state.setState(fixture);

      const listener = vi.fn();
      state.subscribe(listener);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(fixture);
    });

    it('does NOT call a new subscriber when no state has been set yet', () => {
      const listener = vi.fn();
      state.subscribe(listener);
      expect(listener).not.toHaveBeenCalled();
    });

    it('notifies all subscribers on setState', () => {
      const a = vi.fn();
      const b = vi.fn();
      state.subscribe(a);
      state.subscribe(b);

      const fixture = defaultState();
      state.setState(fixture);

      expect(a).toHaveBeenCalledWith(fixture);
      expect(b).toHaveBeenCalledWith(fixture);
    });

    it('unsubscribe stops the listener from receiving further updates', () => {
      const listener = vi.fn();
      const unsub = state.subscribe(listener);
      unsub();

      state.setState(defaultState());
      expect(listener).not.toHaveBeenCalled();
    });

    it('one buggy subscriber does not break others', () => {
      const good = vi.fn();
      const bad = vi.fn(() => {
        throw new Error('listener boom');
      });
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      state.subscribe(bad);
      state.subscribe(good);
      state.setState(defaultState());

      expect(good).toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('[AppState] subscriber threw'),
        expect.any(Error),
      );
      consoleError.mockRestore();
    });
  });

  describe('reset', () => {
    it('clears held state and all subscribers', () => {
      const listener = vi.fn();
      state.setState(defaultState());
      state.subscribe(listener);

      state.reset();

      expect(state.getState()).toBeNull();
      state.setState(defaultState());
      // listener was removed by reset — should not be called again
      expect(listener).toHaveBeenCalledTimes(1); // only the initial delivery
    });
  });

  describe('change detection (refresh would short-circuit on equality)', () => {
    it('notifies subscribers when state value changes', () => {
      const listener = vi.fn();
      state.subscribe(listener);

      const a = defaultState();
      const b = { ...defaultState(), milestone: 'kingdom_of_science' as const };

      state.setState(a);
      state.setState(b);

      // Two setState calls → two notifications (no equality short-circuit
      // in setState itself; that's refresh()'s job, tested separately).
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenLastCalledWith(b);
    });
  });
});
