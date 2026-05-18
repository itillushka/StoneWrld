import { describe, expect, it } from 'vitest';
// @ts-expect-error — importing plain JS from the hooks/ directory; functions
// are intentionally re-exported from the script for direct unit testing.
import { computeDelta, applyDelta } from '../../hooks/stoneworld.js';
import yields from '../../hooks/tool-yields.json' with { type: 'json' };
import { defaultState } from '../../src/state/schema';

/**
 * Pure-function unit tests for the hook's delta math.
 *
 * Tests every tool branch in design/02-game-logic §Resource yields:
 *   - base tool yields (Edit / Read / Bash / etc.)
 *   - Agent subagent variants (gen-negotiator / kohaku-guard)
 *   - Bash pattern bonuses (additive on top of base)
 *   - unknown tools → empty delta (no-op)
 *
 * applyDelta tests verify the state mutation discipline:
 *   - resources accumulate
 *   - stats.total_active_earned mirrors
 *   - unknown resource keys are ignored (defense in depth)
 */

describe('computeDelta()', () => {
  it('Edit → +2 innovation', () => {
    const delta = computeDelta({ tool_name: 'Edit', tool_input: {} }, yields);
    expect(delta).toEqual({ innovation: 2 });
  });

  it('Write → +3 innovation', () => {
    const delta = computeDelta({ tool_name: 'Write', tool_input: {} }, yields);
    expect(delta).toEqual({ innovation: 3 });
  });

  it('Read → +1 knowledge', () => {
    const delta = computeDelta({ tool_name: 'Read', tool_input: {} }, yields);
    expect(delta).toEqual({ knowledge: 1 });
  });

  it('Bash (no special pattern) → +1 innovation, +1 iron', () => {
    const delta = computeDelta(
      { tool_name: 'Bash', tool_input: { command: 'ls -la' } },
      yields,
    );
    expect(delta).toEqual({ innovation: 1, iron: 1 });
  });

  it('Agent (default) → +10 discovery', () => {
    const delta = computeDelta({ tool_name: 'Agent', tool_input: {} }, yields);
    expect(delta).toEqual({ discovery: 10 });
  });

  it('Agent (gen-negotiator subagent) → +8 discovery (lower, per design/02)', () => {
    const delta = computeDelta(
      { tool_name: 'Agent', tool_input: { subagent_type: 'gen-negotiator' } },
      yields,
    );
    expect(delta).toEqual({ discovery: 8 });
  });

  it('Agent (kohaku-guard subagent) → +8 discovery', () => {
    const delta = computeDelta(
      { tool_name: 'Agent', tool_input: { subagent_type: 'kohaku-guard' } },
      yields,
    );
    expect(delta).toEqual({ discovery: 8 });
  });

  it('Agent (unknown subagent type) → falls back to default +10 discovery', () => {
    const delta = computeDelta(
      { tool_name: 'Agent', tool_input: { subagent_type: 'never-heard-of-it' } },
      yields,
    );
    expect(delta).toEqual({ discovery: 10 });
  });

  it('Bash with `git commit` → base (1⚡+1⛓) + bonus +20 completion', () => {
    const delta = computeDelta(
      { tool_name: 'Bash', tool_input: { command: 'git commit -m "feat: x"' } },
      yields,
    );
    expect(delta).toEqual({ innovation: 1, iron: 1, completion: 20 });
  });

  it('Bash with `git push` → base + bonus +10 completion', () => {
    const delta = computeDelta(
      { tool_name: 'Bash', tool_input: { command: 'git push origin main' } },
      yields,
    );
    expect(delta).toEqual({ innovation: 1, iron: 1, completion: 10 });
  });

  it('Bash with `gh pr create` → base + bonus +15 completion', () => {
    const delta = computeDelta(
      { tool_name: 'Bash', tool_input: { command: 'gh pr create --title "x"' } },
      yields,
    );
    expect(delta).toEqual({ innovation: 1, iron: 1, completion: 15 });
  });

  it('Bash with `npm test` → base + bonus +5 completion', () => {
    const delta = computeDelta(
      { tool_name: 'Bash', tool_input: { command: 'npm test' } },
      yields,
    );
    expect(delta).toEqual({ innovation: 1, iron: 1, completion: 5 });
  });

  it('Bash with `pytest` → base + bonus +5 completion', () => {
    const delta = computeDelta(
      { tool_name: 'Bash', tool_input: { command: 'pytest tests/' } },
      yields,
    );
    expect(delta).toEqual({ innovation: 1, iron: 1, completion: 5 });
  });

  it('Bash that does NOT match any pattern → just base yield', () => {
    const delta = computeDelta(
      { tool_name: 'Bash', tool_input: { command: 'echo "hello"' } },
      yields,
    );
    expect(delta).toEqual({ innovation: 1, iron: 1 });
  });

  it('Unknown tool name → empty delta (skip silently, no crash)', () => {
    const delta = computeDelta(
      { tool_name: 'TotallyMadeUpTool', tool_input: {} },
      yields,
    );
    expect(delta).toEqual({});
  });

  it('Missing tool_name → empty delta', () => {
    const delta = computeDelta({ tool_input: {} }, yields);
    expect(delta).toEqual({});
  });

  it('Null/undefined event → empty delta (defensive)', () => {
    expect(computeDelta(null, yields)).toEqual({});
    expect(computeDelta(undefined, yields)).toEqual({});
  });

  it('Skill → +3 knowledge', () => {
    const delta = computeDelta({ tool_name: 'Skill', tool_input: {} }, yields);
    expect(delta).toEqual({ knowledge: 3 });
  });

  it('WebFetch → +2 discovery', () => {
    const delta = computeDelta({ tool_name: 'WebFetch', tool_input: {} }, yields);
    expect(delta).toEqual({ discovery: 2 });
  });

  it('Grep → +1 knowledge', () => {
    const delta = computeDelta({ tool_name: 'Grep', tool_input: {} }, yields);
    expect(delta).toEqual({ knowledge: 1 });
  });
});

describe('applyDelta()', () => {
  it('adds delta to resources AND mirrors to stats.total_active_earned', () => {
    const state = defaultState();
    applyDelta(state, { innovation: 2, iron: 1 });
    expect(state.resources.innovation).toBe(2);
    expect(state.resources.iron).toBe(1);
    expect(state.stats.total_active_earned.innovation).toBe(2);
    expect(state.stats.total_active_earned.iron).toBe(1);
  });

  it('accumulates across multiple deltas', () => {
    const state = defaultState();
    applyDelta(state, { knowledge: 1 });
    applyDelta(state, { knowledge: 3 });
    applyDelta(state, { knowledge: 1 });
    expect(state.resources.knowledge).toBe(5);
    expect(state.stats.total_active_earned.knowledge).toBe(5);
  });

  it('ignores unknown resource keys (defense in depth)', () => {
    const state = defaultState();
    applyDelta(state, { gold: 100, knowledge: 5 } as Record<string, number>);
    expect(state.resources.knowledge).toBe(5);
    // No `gold` field exists on resources — silently dropped
    expect((state.resources as Record<string, unknown>).gold).toBeUndefined();
  });

  it('handles empty delta as no-op', () => {
    const state = defaultState();
    applyDelta(state, {});
    expect(state.resources.knowledge).toBe(0);
    expect(state.resources.innovation).toBe(0);
  });
});
