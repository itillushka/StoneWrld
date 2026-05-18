import { defineConfig } from 'vitest/config';

/**
 * Vitest config for StoneWrld.
 *
 * Test scope per design/08-architecture §Test scope v1:
 *   pure-function unit tests for economy / network / trickle / upgrades /
 *   placement / voice + hook integration. No Phaser scene rendering tests
 *   in v1 — manual click-test for UI; Playwright MCP deferred to v1.x.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist', 'moodboard'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/scenes/**', 'src/main.ts', 'src/config.ts'],
    },
  },
});
