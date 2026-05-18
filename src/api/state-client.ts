import type { StoneWorldState } from '../state/schema';

/**
 * Browser-side state client — talks to the dev middleware (or v2 Tauri backend).
 *
 * Per design/08-architecture §Persistence API:
 *   GET  /api/state  → reads state.json, returns JSON
 *   POST /api/state  → atomically writes the body to state.json
 *
 * This module is the SINGLE PLACE the browser touches state persistence.
 * v2 Electron / Tauri swap = replace these implementations only; the rest
 * of the codebase stays unchanged.
 */

const ENDPOINT = '/api/state';

export class StateApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'StateApiError';
  }
}

/** Fetch the current state from the dev middleware. */
export async function fetchState(): Promise<unknown> {
  const res = await fetch(ENDPOINT, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new StateApiError(
      `GET ${ENDPOINT} failed: ${res.status} ${res.statusText}`,
      res.status,
    );
  }

  return res.json();
}

/** Atomically persist the given state via the dev middleware. */
export async function pushState(state: StoneWorldState): Promise<void> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  });

  if (!res.ok) {
    throw new StateApiError(
      `POST ${ENDPOINT} failed: ${res.status} ${res.statusText}`,
      res.status,
    );
  }
}
