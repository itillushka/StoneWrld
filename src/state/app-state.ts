import type { StoneWorldState } from './schema';
import { loadState } from './load';

/**
 * AppState — shared in-memory snapshot of state.json.
 *
 * Per design/08-architecture §Scene communication:
 *   Scenes communicate via the Phaser event bus AND a shared application
 *   state singleton (this module). The singleton holds the loaded state.json
 *   plus derived data; changes emit typed events so all interested scenes
 *   subscribe without holding cross-scene references.
 *
 * Why a class with a single exported instance (not a bare module-level let):
 *   - Easier to mock in tests (instantiate a fresh AppStateImpl per test)
 *   - Explicit `subscribe()` returns an unsubscribe function — cleaner teardown
 *     than ad-hoc EventEmitter patterns
 *   - Refresh logic returns a "changed?" boolean so callers can skip work
 *     when the state is identical (the typical poll case)
 */

export type StateListener = (state: StoneWorldState) => void;

/**
 * Shallow equality good enough for "should we re-render?" — the polling
 * fetch returns a NEW object every time, so reference comparison can't
 * help. We compare JSON for the few fields the HUD actually reads.
 * Cheap (string compare on a small object) and correct.
 */
function statesEqual(a: StoneWorldState, b: StoneWorldState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export class AppStateImpl {
  private state: StoneWorldState | null = null;
  private listeners = new Set<StateListener>();

  /** Replace the held state and notify all subscribers. */
  setState(next: StoneWorldState): void {
    this.state = next;
    for (const fn of this.listeners) {
      try {
        fn(next);
      } catch (err) {
        // A buggy subscriber shouldn't break the others. Log loud, keep going.
        console.error('[AppState] subscriber threw:', err);
      }
    }
  }

  /** Read-only accessor. Returns null if state hasn't been loaded yet. */
  getState(): StoneWorldState | null {
    return this.state;
  }

  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe(fn: StateListener): () => void {
    this.listeners.add(fn);
    // Immediately deliver the current state to new subscribers — they
    // don't have to wait for the next change to populate their UI.
    if (this.state !== null) {
      try {
        fn(this.state);
      } catch (err) {
        console.error('[AppState] subscriber threw on initial delivery:', err);
      }
    }
    return () => {
      this.listeners.delete(fn);
    };
  }

  /**
   * Fetch the current server state, compare to in-memory copy, and
   * setState + notify only if it actually changed.
   *
   * Returns `true` if the state changed (subscribers were notified),
   * `false` if no change. Useful for the polling loop — it can throttle
   * downstream side effects (sound, animations) on no-op polls.
   */
  async refresh(): Promise<boolean> {
    const next = await loadState();
    if (this.state !== null && statesEqual(this.state, next)) {
      return false;
    }
    this.setState(next);
    return true;
  }

  /** Test helper — reset to "never loaded" state. */
  reset(): void {
    this.state = null;
    this.listeners.clear();
  }
}

/**
 * The single application-wide state instance.
 * Import and use directly: `import { AppState } from './state/app-state'`.
 */
export const AppState = new AppStateImpl();
