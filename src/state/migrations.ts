import { CURRENT_VERSION, StoneWorldState } from './schema';

/**
 * State migration chain.
 *
 * v1 ships with no migrations — v1 is the initial release. The structure
 * exists so future schema bumps (v1 → v2, etc.) plug in as pure functions
 * `(oldState) => newState`, tested per-version under tests/state/.
 *
 * Per design/08-architecture §Migration discipline:
 *   - `version` field gates loading.
 *   - version > CURRENT refuses to load (forward-incompatible).
 *   - version < CURRENT runs the upgrade chain through MIGRATIONS.
 */

/** A migration is a pure function from one version's shape to the next. */
export type MigrationFn = (state: unknown) => unknown;

/**
 * Migration registry — keyed by the FROM version.
 * `MIGRATIONS[n]` upgrades a v`n` state to v`n+1`.
 *
 * v1 is the initial release, so this is empty. Add entries as the schema evolves.
 */
const MIGRATIONS: Record<number, MigrationFn> = {
  // 1 → 2: (when v2 ships, define how to upgrade v1 → v2 here)
};

/**
 * Thrown when loaded state cannot be migrated to the current version.
 * Caller (load.ts / dev-middleware.ts) decides how to recover —
 * typically: log + fall back to defaultState() + show a recovery banner.
 */
export class MigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MigrationError';
  }
}

/**
 * Migrate loaded JSON to the current schema version.
 *
 * Validates `version` is a number, refuses forward-incompatible loads,
 * runs the upgrade chain for older versions. Returns the migrated state
 * typed as the current schema. Throws MigrationError on any failure.
 */
export function migrate(loaded: unknown): StoneWorldState {
  if (
    typeof loaded !== 'object' ||
    loaded === null ||
    !('version' in loaded) ||
    typeof (loaded as { version: unknown }).version !== 'number'
  ) {
    throw new MigrationError(
      'Invalid state: missing or non-numeric `version` field',
    );
  }

  let state = loaded as { version: number };
  const loadedVersion = state.version;

  if (loadedVersion > CURRENT_VERSION) {
    throw new MigrationError(
      `State version ${loadedVersion} is newer than supported ${CURRENT_VERSION} — refusing to load (forward-incompatible)`,
    );
  }

  for (let v = loadedVersion; v < CURRENT_VERSION; v++) {
    const fn = MIGRATIONS[v];
    if (!fn) {
      throw new MigrationError(
        `No migration registered from version ${v} → ${v + 1}`,
      );
    }
    state = fn(state) as { version: number };
  }

  return state as unknown as StoneWorldState;
}
