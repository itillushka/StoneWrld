import { defineConfig } from 'vite';
import { stateApiPlugin } from './src/api/dev-middleware';

/**
 * Vite config for StoneWrld.
 *
 * Port allocation per design/08-architecture §Port allocation:
 *   5100 = dev server (this file)
 *   5101 = preview
 *   5102 = Vitest UI
 *   5103-5150 = reserved
 *
 * Pixel-art rendering rules per design/06-style §Pixel-art principles:
 *   sharp pixels, integer scaling, no antialiasing.
 *   Phaser's own `pixelArt: true` + `roundPixels: true` (see src/config.ts)
 *   does the heavy lifting at render time; Vite only needs to leave the
 *   assets alone (no image transforms, no inlining of large atlases).
 *
 * Plugins:
 *   - stateApiPlugin: exposes GET/POST /api/state during `npm run dev`,
 *     reading & atomically writing ~/StoneWrld/state.json. Added in Phase 1.
 */
export default defineConfig({
  server: {
    port: 5100,
    strictPort: true,
    host: '127.0.0.1',
  },
  preview: {
    port: 5101,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    // Don't inline atlas PNGs as base64 — keep them as separate files
    // for browser caching + easier debugging during asset iteration.
    assetsInlineLimit: 0,
  },
  plugins: [stateApiPlugin()],
});
