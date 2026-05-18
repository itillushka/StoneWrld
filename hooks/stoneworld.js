#!/usr/bin/env node
/**
 * StoneWrld PostToolUse hook — the EARNER.
 *
 * Wired into ~/.claude/settings.json via `npm run hook:install`. Fires on
 * every Claude Code tool call across every session (matcher: ".*") per
 * design/08-architecture §Hook globality — earn from all work, not just
 * StoneWrld-directory work.
 *
 * Lifecycle (per design/08-architecture §Hook lifecycle):
 *   1. Claude Code spawns this script with the PostToolUse event JSON on stdin.
 *   2. Self-guard: if ~/StoneWrld/state.json is missing, exit 0 silently
 *      (player hasn't bootstrapped the game yet).
 *   3. Parse event, look up tool name in tool-yields.json, compute delta.
 *   4. Bash-command pattern bonuses are ADDITIVE on top of the base Bash yield.
 *   5. Apply delta to state.resources + state.stats.total_active_earned.
 *   6. Atomic-write state.json (tmp + fsync + rename — design/08 §Atomic write).
 *   7. Exit 0 ALWAYS — never block Claude Code, even on error.
 *
 * Error policy: anything that goes wrong gets logged to
 * ~/StoneWrld/hook-errors.log and we exit 0. The hook NEVER crashes the
 * parent Claude Code session.
 *
 * Performance budget: <50ms per invocation. File I/O on SSD is ~5-15ms;
 * the rest is JSON parse / object manipulation — comfortably under budget.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const HOOK_DIR = path.dirname(fileURLToPath(import.meta.url));
const STATE_PATH = path.join(os.homedir(), 'StoneWrld', 'state.json');
const YIELDS_PATH = path.join(HOOK_DIR, 'tool-yields.json');
const ERROR_LOG = path.join(os.homedir(), 'StoneWrld', 'hook-errors.log');

/** Resource keys recognised by the hook (matches src/state/schema.ts RESOURCE_KEYS). */
const RESOURCE_KEYS = [
  'knowledge',
  'discovery',
  'iron',
  'innovation',
  'completion',
];

/** Append an error line to ~/StoneWrld/hook-errors.log. Never throws. */
function logError(err) {
  try {
    const ts = new Date().toISOString();
    const msg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
    fs.appendFileSync(ERROR_LOG, `[${ts}] ${msg}\n`);
  } catch {
    // If even error logging fails, swallow — we will not crash Claude Code.
  }
}

/**
 * Atomic JSON write: write tmp + fsync + rename.
 * Mirrors src/api/atomic-write.ts but inlined since the hook is a standalone
 * Node script without bundler / Vite resolution.
 */
function atomicWriteJson(targetPath, content) {
  const dir = path.dirname(targetPath);
  fs.mkdirSync(dir, { recursive: true });

  const tmpPath = `${targetPath}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tmpPath, JSON.stringify(content, null, 2), 'utf8');

  const fd = fs.openSync(tmpPath, 'r+');
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }

  fs.renameSync(tmpPath, targetPath);
}

/**
 * Compute the resource delta for a given tool-use event.
 *
 * Exported via a sentinel global so the Vitest integration test can spawn
 * this script as a subprocess and verify deltas end-to-end. The function
 * is intentionally pure (no I/O, no logging) so unit tests can also call
 * it directly via dynamic import.
 *
 * @param {object} event   PostToolUse event payload from Claude Code stdin.
 * @param {object} yields  Parsed tool-yields.json contents.
 * @returns {Record<string, number>} Map of resource → amount to add.
 */
export function computeDelta(event, yields) {
  const delta = {};
  const tool = event?.tool_name;
  if (typeof tool !== 'string' || tool.length === 0) {
    return delta;
  }

  // Base tool yield, with optional Agent subagent variant.
  let lookupKey = tool;
  const subAgent = event?.tool_input?.subagent_type;
  if (
    tool === 'Agent' &&
    typeof subAgent === 'string' &&
    yields.tools?.[`Agent.${subAgent}`]
  ) {
    lookupKey = `Agent.${subAgent}`;
  }

  const baseYield = yields.tools?.[lookupKey];
  if (baseYield && typeof baseYield === 'object') {
    for (const [resource, amount] of Object.entries(baseYield)) {
      if (typeof amount !== 'number') continue;
      delta[resource] = (delta[resource] ?? 0) + amount;
    }
  }

  // Bash pattern bonuses — additive on top of the base Bash yield.
  if (tool === 'Bash') {
    const cmd = event?.tool_input?.command;
    if (typeof cmd === 'string') {
      const patterns = yields.bash_patterns ?? {};
      for (const [pattern, bonus] of Object.entries(patterns)) {
        try {
          if (new RegExp(pattern).test(cmd)) {
            if (bonus && typeof bonus === 'object') {
              for (const [resource, amount] of Object.entries(bonus)) {
                if (typeof amount !== 'number') continue;
                delta[resource] = (delta[resource] ?? 0) + amount;
              }
            }
          }
        } catch {
          // Malformed regex in yields config — skip this pattern, continue.
        }
      }
    }
  }

  return delta;
}

/**
 * Mutate the state in place: add delta resources, update total_active_earned.
 * Storage caps (silos) are NOT enforced here — Phase 10 brings silos.
 * Until then, resources accumulate uncapped (baseline cap 1000 from
 * design/02 §Storage caps will be enforced once silos exist).
 */
export function applyDelta(state, delta) {
  for (const [resource, amount] of Object.entries(delta)) {
    if (!RESOURCE_KEYS.includes(resource)) continue;
    if (typeof amount !== 'number') continue;
    state.resources[resource] = (state.resources[resource] ?? 0) + amount;
    state.stats.total_active_earned[resource] =
      (state.stats.total_active_earned[resource] ?? 0) + amount;
  }
  return state;
}

/** Read stdin to a string. Synchronous via fd=0 — keeps the hook simple. */
function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch (err) {
    if (err && err.code === 'EAGAIN') return '';
    throw err;
  }
}

function main() {
  // Self-guard: state.json absent ⇒ player hasn't bootstrapped, silently no-op.
  if (!fs.existsSync(STATE_PATH)) {
    process.exit(0);
  }

  let event;
  try {
    const stdin = readStdin();
    if (!stdin.trim()) {
      process.exit(0);
    }
    event = JSON.parse(stdin);
  } catch (err) {
    logError(err);
    process.exit(0);
  }

  try {
    const yields = JSON.parse(fs.readFileSync(YIELDS_PATH, 'utf8'));
    const delta = computeDelta(event, yields);

    // Empty delta ⇒ unknown tool / zero-yield. Skip the disk write.
    if (Object.keys(delta).length === 0) {
      process.exit(0);
    }

    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    applyDelta(state, delta);
    atomicWriteJson(STATE_PATH, state);
  } catch (err) {
    logError(err);
  }

  process.exit(0);
}

// Only run main() when invoked as a script (not when imported by tests).
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  main();
}
