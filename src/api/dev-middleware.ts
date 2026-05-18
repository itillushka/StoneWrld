import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { defaultState } from '../state/schema';
import { atomicWriteJson, readJsonOrNull } from './atomic-write';

/**
 * Vite plugin exposing the StoneWrld state API in dev mode.
 *
 * Per design/08-architecture §Persistence API:
 *   GET  /api/state  → reads ~/StoneWrld/state.json, returns JSON.
 *                       Auto-creates a defaultState() if the file is missing.
 *   POST /api/state  → atomically writes the body to ~/StoneWrld/state.json.
 *
 * Same file is also touched by the PostToolUse hook (Phase 2). Concurrency
 * mitigation is last-writer-wins for v1 (see design/08-architecture §Concurrency).
 *
 * This middleware is DEV-ONLY. In v2 (Tauri / Electron), the equivalent
 * lives in the Rust / Node main process — same contract, different transport.
 */

const STATE_PATH = path.join(os.homedir(), 'StoneWrld', 'state.json');

const ENDPOINT = '/api/state';

/** Maximum POST body size — defensive cap against runaway requests. */
const MAX_BODY_BYTES = 1024 * 1024; // 1 MB; state.json is normally < 50 KB

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error(`Request body exceeds ${MAX_BODY_BYTES} bytes`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function sendError(
  res: ServerResponse,
  status: number,
  message: string,
): void {
  sendJson(res, status, { error: message });
}

async function handleGet(res: ServerResponse): Promise<void> {
  const existing = await readJsonOrNull(STATE_PATH);
  if (existing !== null) {
    sendJson(res, 200, existing);
    return;
  }

  // File missing — bootstrap a fresh default state on first GET.
  // Per design/09-roadmap §Phase 1 acceptance gate:
  //   "Open game → it creates ~/StoneWrld/state.json automatically."
  const fresh = defaultState();
  await atomicWriteJson(STATE_PATH, fresh);
  sendJson(res, 200, fresh);
}

async function handlePost(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  let raw: string;
  try {
    raw = await readBody(req);
  } catch (err) {
    sendError(res, 413, err instanceof Error ? err.message : String(err));
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    sendError(res, 400, 'Invalid JSON body');
    return;
  }

  // Minimal shape gate — require an object with a numeric `version`.
  // Full validation lives in src/state/migrations.ts on the client side
  // (the client is the one applying schema rules; the middleware just
  // refuses to write garbage).
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as { version?: unknown }).version !== 'number'
  ) {
    sendError(res, 400, 'Body must be an object with a numeric `version` field');
    return;
  }

  await atomicWriteJson(STATE_PATH, parsed);
  res.statusCode = 204;
  res.end();
}

/**
 * Vite plugin factory. Registers a middleware on /api/state that
 * services GET (read or auto-bootstrap) and POST (atomic write).
 */
export function stateApiPlugin(): Plugin {
  return {
    name: 'stonewrld-state-api',
    configureServer(server) {
      server.middlewares.use(ENDPOINT, async (req, res, next) => {
        // Only handle exact /api/state — sub-paths fall through.
        if (req.url !== '/' && req.url !== '') {
          next();
          return;
        }

        try {
          if (req.method === 'GET') {
            await handleGet(res);
          } else if (req.method === 'POST') {
            await handlePost(req, res);
          } else {
            res.statusCode = 405;
            res.setHeader('Allow', 'GET, POST');
            res.end();
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error('[stonewrld-state-api]', msg);
          sendError(res, 500, msg);
        }
      });
    },
  };
}
