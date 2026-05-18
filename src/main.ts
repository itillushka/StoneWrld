import Phaser from 'phaser';
import { gameConfig } from './config';

/**
 * StoneWrld entry point.
 *
 * Bootstraps the Phaser game with the config from ./config.ts.
 * Phase 0 renders only the BootScene placeholder — see design/09-roadmap §Phase 0.
 * Subsequent phases register PreloadScene → CityScene → ResearchScene → UIScene → ModalScene
 * (the full scene tree is locked in design/08-architecture §Phaser scene tree).
 *
 * Fonts are loaded before Phaser instantiates so the first paint already uses
 * Pixellari + Press Start 2P (design/06-style §Typography). Without this,
 * Phaser would render text using the monospace fallback for the few hundred
 * milliseconds the browser takes to fetch + commit the @font-face files.
 *
 * `document.fonts.ready` resolves once every @font-face declaration in the
 * stylesheet has either loaded or failed. With `font-display: block` on
 * Pixellari + `display=block` on the Press Start 2P import URL, this is the
 * canonical "fonts are usable now" signal.
 */
async function bootstrap(): Promise<void> {
  try {
    await document.fonts.ready;
  } catch (err) {
    // Non-fatal — Phaser will fall back to monospace. Surface the warning so
    // co-captain sees it loudly in dev console (design/06 §Pixel-art principles
    // is strict about NOT shipping with the wrong font).
    console.warn('[StoneWrld] document.fonts.ready failed:', err);
  }
  new Phaser.Game(gameConfig);
}

bootstrap();
