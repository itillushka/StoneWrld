import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultState } from '../../src/state/schema';

/**
 * Hook integration tests — spawn the real script, pipe a fake stdin event,
 * verify state.json on disk after the hook exits.
 *
 * Discipline:
 *   - Override HOME via env so the hook reads/writes a temp StoneWrld dir
 *     (the hook resolves STATE_PATH from os.homedir() — HOME is the
 *     honored override on Linux).
 *   - Each test gets a fresh tmp HOME — total isolation, no global state leak.
 *   - Acceptance gates from design/09-roadmap §Phase 2:
 *       * hook self-guards when state.json missing (exits 0, no side effects)
 *       * resource delta lands correctly for each tool branch
 *       * atomic write is proven (no .tmp file leftover)
 *       * hook never crashes Claude Code — exit code is always 0
 */

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');
const HOOK_SCRIPT = path.join(REPO_ROOT, 'hooks', 'stoneworld.js');

let tmpHome: string;
let stateDir: string;
let statePath: string;

beforeEach(async () => {
  tmpHome = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'stonewrld-hook-test-'));
  stateDir = path.join(tmpHome, 'StoneWrld');
  statePath = path.join(stateDir, 'state.json');
});

afterEach(async () => {
  await fs.promises.rm(tmpHome, { recursive: true, force: true });
});

function runHook(event: unknown): { exit: number; stdout: string; stderr: string } {
  const result = spawnSync('node', [HOOK_SCRIPT], {
    input: JSON.stringify(event),
    env: { ...process.env, HOME: tmpHome },
    encoding: 'utf8',
    timeout: 5000,
  });
  return {
    exit: result.status ?? -1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function writeState(state: unknown): void {
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}

function readState(): {
  resources: Record<string, number>;
  stats: { total_active_earned: Record<string, number> };
} {
  return JSON.parse(fs.readFileSync(statePath, 'utf8'));
}

describe('hook self-guard', () => {
  it('exits 0 silently when state.json is missing', () => {
    // No state.json written — hook should no-op.
    const result = runHook({ tool_name: 'Edit', tool_input: {} });
    expect(result.exit).toBe(0);
    expect(fs.existsSync(statePath)).toBe(false);
  });

  it('exits 0 on empty stdin', () => {
    writeState(defaultState());
    const result = spawnSync('node', [HOOK_SCRIPT], {
      input: '',
      env: { ...process.env, HOME: tmpHome },
      encoding: 'utf8',
      timeout: 5000,
    });
    expect(result.status).toBe(0);
    // State unchanged
    const state = readState();
    expect(state.resources.innovation).toBe(0);
  });

  it('exits 0 on invalid JSON stdin (logged, but never crashes)', () => {
    writeState(defaultState());
    const result = spawnSync('node', [HOOK_SCRIPT], {
      input: '{this is not json',
      env: { ...process.env, HOME: tmpHome },
      encoding: 'utf8',
      timeout: 5000,
    });
    expect(result.status).toBe(0);
    // State unchanged
    const state = readState();
    expect(state.resources.innovation).toBe(0);
    // hook-errors.log should now exist with the parse failure
    const errLog = path.join(stateDir, 'hook-errors.log');
    expect(fs.existsSync(errLog)).toBe(true);
  });
});

describe('hook delta application', () => {
  it('Edit event → +2 innovation persisted to state.json', () => {
    writeState(defaultState());
    const result = runHook({
      tool_name: 'Edit',
      tool_input: { file_path: 'foo.ts', old_string: 'a', new_string: 'b' },
    });
    expect(result.exit).toBe(0);
    const state = readState();
    expect(state.resources.innovation).toBe(2);
    expect(state.stats.total_active_earned.innovation).toBe(2);
  });

  it('Multiple invocations accumulate correctly', () => {
    writeState(defaultState());
    runHook({ tool_name: 'Edit', tool_input: {} });
    runHook({ tool_name: 'Edit', tool_input: {} });
    runHook({ tool_name: 'Read', tool_input: {} });
    const state = readState();
    expect(state.resources.innovation).toBe(4);
    expect(state.resources.knowledge).toBe(1);
  });

  it('Bash with `git commit` → +1 innovation, +1 iron, +20 completion', () => {
    writeState(defaultState());
    runHook({
      tool_name: 'Bash',
      tool_input: { command: 'git commit -m "feat: x"' },
    });
    const state = readState();
    expect(state.resources.innovation).toBe(1);
    expect(state.resources.iron).toBe(1);
    expect(state.resources.completion).toBe(20);
  });

  it('Agent with gen-negotiator subagent → +8 discovery (not +10)', () => {
    writeState(defaultState());
    runHook({
      tool_name: 'Agent',
      tool_input: { subagent_type: 'gen-negotiator', description: 'x', prompt: 'y' },
    });
    const state = readState();
    expect(state.resources.discovery).toBe(8);
  });

  it('Unknown tool → state unchanged, no error', () => {
    writeState(defaultState());
    runHook({ tool_name: 'TotallyMadeUp', tool_input: {} });
    const state = readState();
    expect(state.resources.knowledge).toBe(0);
    expect(state.resources.innovation).toBe(0);
  });
});

describe('atomic write integrity', () => {
  it('leaves no .tmp file after a successful write', () => {
    writeState(defaultState());
    runHook({ tool_name: 'Edit', tool_input: {} });

    const entries = fs.readdirSync(stateDir);
    const tmps = entries.filter((e) => e.includes('.tmp.'));
    expect(tmps).toEqual([]);
  });

  it('state.json content is valid JSON after write (no corruption)', () => {
    writeState(defaultState());
    runHook({ tool_name: 'Bash', tool_input: { command: 'git push origin main' } });
    // If atomic write corrupted, this would throw.
    expect(() => readState()).not.toThrow();
  });
});

describe('hook performance budget', () => {
  it('typical invocation completes well under the 5s timeout (sanity check)', () => {
    writeState(defaultState());
    const start = Date.now();
    const result = runHook({ tool_name: 'Edit', tool_input: {} });
    const elapsed = Date.now() - start;
    expect(result.exit).toBe(0);
    // Subprocess startup alone is usually ~50-150ms; the hook itself
    // should complete in <50ms per design/08-architecture. We assert a
    // loose ceiling so flaky CI doesn't false-alarm.
    expect(elapsed).toBeLessThan(2000);
  });
});
