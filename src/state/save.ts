import { pushState } from '../api/state-client';
import { StoneWorldState } from './schema';

/**
 * Browser-side state saver.
 *
 * Thin wrapper over the API client. Kept as its own module so the rest
 * of the game imports `saveState` from `src/state/` (paired with `loadState`)
 * without ever reaching into `src/api/` — the api layer is plumbing,
 * `src/state/` is the public surface.
 */
export async function saveState(state: StoneWorldState): Promise<void> {
  await pushState(state);
}
