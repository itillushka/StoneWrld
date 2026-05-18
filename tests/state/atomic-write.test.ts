import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  atomicWriteJson,
  readJsonOrNull,
} from '../../src/api/atomic-write';

/**
 * Atomic-write tests — node-only (touches the real filesystem under tmpdir).
 *
 * Covers the contract from design/08-architecture §Atomic write pattern:
 *   - target file ends up with the new content
 *   - no leftover .tmp file on success
 *   - readJsonOrNull returns null for missing files (not throw)
 *   - readJsonOrNull throws on truly corrupt JSON (so callers can recover)
 */

let tmpRoot: string;

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'stonewrld-test-'));
});

afterEach(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

describe('atomicWriteJson()', () => {
  it('writes JSON to the target path', async () => {
    const target = path.join(tmpRoot, 'state.json');
    const payload = { version: 1, hello: 'world' };

    await atomicWriteJson(target, payload);

    const raw = await fs.readFile(target, 'utf8');
    expect(JSON.parse(raw)).toEqual(payload);
  });

  it('creates parent directories if missing', async () => {
    const target = path.join(tmpRoot, 'deeply', 'nested', 'state.json');
    await atomicWriteJson(target, { version: 1 });

    const raw = await fs.readFile(target, 'utf8');
    expect(JSON.parse(raw)).toEqual({ version: 1 });
  });

  it('leaves no .tmp file after a successful write', async () => {
    const target = path.join(tmpRoot, 'state.json');
    await atomicWriteJson(target, { version: 1 });

    const entries = await fs.readdir(tmpRoot);
    const tmps = entries.filter((e) => e.includes('.tmp.'));
    expect(tmps).toEqual([]);
  });

  it('overwrites an existing file atomically (content swaps cleanly)', async () => {
    const target = path.join(tmpRoot, 'state.json');

    await atomicWriteJson(target, { version: 1, n: 1 });
    await atomicWriteJson(target, { version: 1, n: 2 });

    const raw = await fs.readFile(target, 'utf8');
    expect(JSON.parse(raw)).toEqual({ version: 1, n: 2 });
  });

  it('writes pretty-printed JSON (2-space indent) for human-edit-ability', async () => {
    const target = path.join(tmpRoot, 'state.json');
    await atomicWriteJson(target, { version: 1, nested: { a: 1 } });

    const raw = await fs.readFile(target, 'utf8');
    expect(raw).toContain('\n  '); // some 2-space indent present
    expect(raw).toContain('"version": 1');
  });
});

describe('readJsonOrNull()', () => {
  it('returns null when the file does not exist', async () => {
    const target = path.join(tmpRoot, 'absent.json');
    const result = await readJsonOrNull(target);
    expect(result).toBeNull();
  });

  it('returns parsed JSON when the file exists and is valid', async () => {
    const target = path.join(tmpRoot, 'state.json');
    await fs.writeFile(target, JSON.stringify({ ok: true }), 'utf8');

    const result = await readJsonOrNull(target);
    expect(result).toEqual({ ok: true });
  });

  it('throws on corrupt JSON (so callers can surface a recovery banner)', async () => {
    const target = path.join(tmpRoot, 'state.json');
    await fs.writeFile(target, '{this is not json', 'utf8');

    await expect(readJsonOrNull(target)).rejects.toThrow();
  });

  it('round-trips through atomicWriteJson cleanly', async () => {
    const target = path.join(tmpRoot, 'state.json');
    const payload = {
      version: 1,
      resources: { knowledge: 47, iron: 89 },
      buildings: [{ id: 'settler_hut', tier: 1, x: 14, y: 10 }],
    };

    await atomicWriteJson(target, payload);
    const read = await readJsonOrNull(target);

    expect(read).toEqual(payload);
  });
});
