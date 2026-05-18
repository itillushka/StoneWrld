import Phaser from 'phaser';
import { gameConfig } from './config';

/**
 * StoneWrld entry point.
 *
 * Bootstraps the Phaser game with the config from ./config.ts.
 *
 * Font discipline (per design/06-style §Pixel-art rule #1 + §Typography):
 *   The locked fonts are Pixellari (headings) + Press Start 2P (body).
 *   Both are SELF-HOSTED in public/fonts/ — no CDN race, no async surprises.
 *
 *   The bootstrap below does TWO things before Phaser starts:
 *     1. Explicit `document.fonts.load()` for each font in every size we use.
 *        This guarantees the browser has committed the font to its glyph
 *        cache before Phaser's canvas-text pipeline tries to draw with it.
 *        Without this, document.fonts.ready can resolve early and Phaser
 *        ends up drawing the FIRST scene's text with the monospace fallback.
 *     2. Final `document.fonts.ready` belt-and-suspenders — catches any
 *        @font-face declarations the explicit loads missed.
 *
 *   Symptom of getting this wrong: some scenes render in correct pixel font,
 *   others in browser-default monospace. Hard to diagnose because the timing
 *   varies with network speed, cache state, and Phaser scene-load ordering.
 */

/** Font sizes used across the game — enumerated here so the loader hits them all. */
const FONT_SIZES_PIXELLARI = [14, 16, 20, 24, 32, 48];
const FONT_SIZES_PRESS_START_2P = [6, 8, 10, 12, 16];

async function loadAllFonts(): Promise<void> {
  const loads: Promise<unknown>[] = [];
  for (const size of FONT_SIZES_PIXELLARI) {
    loads.push(document.fonts.load(`${size}px Pixellari`));
  }
  for (const size of FONT_SIZES_PRESS_START_2P) {
    loads.push(document.fonts.load(`${size}px "Press Start 2P"`));
  }
  await Promise.all(loads);
  // Final belt-and-suspenders sync with FontFaceSet's overall ready signal.
  await document.fonts.ready;
}

async function bootstrap(): Promise<void> {
  try {
    await loadAllFonts();
  } catch (err) {
    // Non-fatal — Phaser will fall back to monospace, but the failure must
    // surface loudly so co-captain sees it in dev console (design/06-style
    // is strict about NOT shipping with the wrong font).
    console.warn('[StoneWrld] Font preload failed:', err);
  }
  const game = new Phaser.Game(gameConfig);
  // Expose for the headless visual-test (scripts/visual-test.ts) and
  // ad-hoc browser-console debugging. Captain-only; no production code
  // should pull from window.game.
  (window as unknown as { game?: Phaser.Game }).game = game;
}

bootstrap();
