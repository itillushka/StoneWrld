import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { CityScene } from './scenes/CityScene';
import { UIScene } from './scenes/UIScene';
import { ModalScene } from './scenes/ModalScene';

/**
 * Phaser game configuration.
 *
 * Resolution + scaling per design/05-map §Camera + design/08-architecture §Stack:
 *   - Canvas: 1280 × 800 logical pixels (1024 game viewport + 256 HUD sidebar).
 *   - pixelArt + roundPixels enforce the "pure retro" pixel-art rule from
 *     design/06-style §Pixel-art principles — no antialiasing, no
 *     fractional-pixel rendering.
 *   - Scale.FIT + CENTER_BOTH lets the canvas grow to the window while
 *     preserving aspect ratio; the page background (index.html) matches
 *     #0A1228 so the letterbox is invisible.
 *
 * Background #0A1228 = Ryusui deep navy from design/06-style §Master palette.
 *
 * Scene list grows phase-by-phase per design/09-roadmap.
 * Phase 3: Boot → Preload → City (default game world) + UI (persistent overlay).
 * Future: ResearchScene (Phase 8), ModalScene (Phase 5).
 *
 * The scene array's order is the registration order, not the start order.
 * BootScene's `autoStart: true` (Phaser default for the first scene) is what
 * actually kicks off the pipeline; subsequent scenes are launched explicitly.
 */
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 800,
  backgroundColor: '#0A1228',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, PreloadScene, CityScene, UIScene, ModalScene],
};
