import Phaser from 'phaser';

/**
 * CityScene — the main game world.
 *
 * Per design/05-map: orthogonal 32×24 grid at 128px source tiles, integer
 * zoom 0.25× / 0.5× / 1× / 2×, default 0.5× centered on the Stone World
 * plaza. Camera pans with WASD / arrow / middle-drag.
 *
 * Phase 3 (this iteration): empty navy field. The grid + terrain + buildings
 * land in Phase 4+ as the asset pipeline + city/grid.ts come online.
 *
 * Sized to 1024 × 800 — the left part of the 1280 × 800 canvas. The right
 * 256 × 800 is owned by UIScene (HUD sidebar).
 */
export class CityScene extends Phaser.Scene {
  /** Game viewport width (canvas total minus HUD sidebar). */
  public static readonly VIEWPORT_WIDTH = 1024;

  constructor() {
    super('CityScene');
  }

  create(): void {
    const w = CityScene.VIEWPORT_WIDTH;
    const h = this.scale.height;

    // Background — deep navy per design/06-style §Master palette.
    // (Phaser's gameConfig.backgroundColor already paints this; the rect
    // is just so the camera bounds clip cleanly to the viewport later.)
    this.add.rectangle(0, 0, w, h, 0x0a1228).setOrigin(0, 0);

    // Placeholder text — the city itself lands in Phase 4.
    this.add
      .text(w / 2, h / 2 - 16, 'Stone World', {
        fontFamily: 'Pixellari, monospace',
        fontSize: '48px',
        color: '#F0EBD7',
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, h / 2 + 32, 'city grid arrives in Phase 4', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '12px',
        color: '#5C6E8E',
      })
      .setOrigin(0.5);

    // Bottom-left anchor for the Mecha Senku speech bubble (Phase 9).
    // For now: a small captain-gold marker so we can see where it lives.
    // Per design/06-style §HUD layout, bubble overlays bottom-left of game canvas.
    this.add
      .text(20, h - 36, '· Mecha Senku anchor', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#3A4868',
      })
      .setOrigin(0, 0.5);
  }
}
