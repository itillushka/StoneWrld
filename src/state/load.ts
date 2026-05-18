import { fetchState } from '../api/state-client';
import { migrate, MigrationError } from './migrations';
import { defaultState, StoneWorldState } from './schema';

/**
 * Browser-side state loader.
 *
 * Pulls raw JSON via the API, runs it through the migration chain,
 * and returns a typed StoneWorldState ready for game scenes to consume.
 *
 * On MigrationError, logs loudly and falls back to defaultState() so
 * a corrupt or forward-incompatible state.json doesn't brick the game.
 * The fallback is surfaced via the optional `onMigrationFailure` callback
 * so the game can show a recovery banner (per design/09-roadmap §Phase 15).
 */
export async function loadState(opts?: {
  onMigrationFailure?: (err: MigrationError) => void;
}): Promise<StoneWorldState> {
  const raw = await fetchState();
  try {
    return migrate(raw);
  } catch (err) {
    if (err instanceof MigrationError) {
      console.error('[StoneWrld] State migration failed:', err.message);
      opts?.onMigrationFailure?.(err);
      return defaultState();
    }
    throw err;
  }
}
