import { describe, expect, it } from 'vitest';
import { migrate, MigrationError } from '../../src/state/migrations';
import { CURRENT_VERSION, defaultState } from '../../src/state/schema';

describe('migrate()', () => {
  it('passes a v1 state through unchanged', () => {
    const fresh = defaultState();
    const migrated = migrate(fresh);
    // Deep equality — no fields added, removed, or mutated.
    expect(migrated).toEqual(fresh);
  });

  it('throws MigrationError when version field is missing', () => {
    expect(() => migrate({})).toThrow(MigrationError);
  });

  it('throws MigrationError when version is not a number', () => {
    expect(() => migrate({ version: 'one' })).toThrow(MigrationError);
  });

  it('throws MigrationError on null input', () => {
    expect(() => migrate(null)).toThrow(MigrationError);
  });

  it('throws MigrationError on primitive (non-object) input', () => {
    expect(() => migrate(42)).toThrow(MigrationError);
    expect(() => migrate('state')).toThrow(MigrationError);
  });

  it('refuses forward-incompatible versions (newer than current)', () => {
    const future = { ...defaultState(), version: (CURRENT_VERSION + 1) as 1 };
    expect(() => migrate(future)).toThrow(MigrationError);
    expect(() => migrate(future)).toThrow(/newer than supported/i);
  });

  it('throws when no migration is registered for an older version', () => {
    // v0 doesn't exist (v1 is the initial release), so trying to migrate
    // from v0 should fail loudly with a clear message.
    expect(() => migrate({ version: 0 })).toThrow(/No migration registered/i);
  });
});
