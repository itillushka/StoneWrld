import Phaser from 'phaser';

/**
 * BootScene — the very first scene Phaser runs.
 *
 * Phase 0 responsibility (per design/09-roadmap §Phase 0):
 *   Render a placeholder "StoneWrld — boot" label centered on the
 *   Ryusui deep-navy canvas. This proves the Phaser pipeline works
 *   end-to-end: index.html → main.ts → config → BootScene → render.
 *
 * Phase 1+ responsibility (per design/08-architecture §Per-scene responsibility):
 *   Become the minimal preloader skeleton — load just enough to show a
 *   loading bar, then hand off to PreloadScene which loads atlases /
 *   fonts / catalogs / state.json.
 *
 * Phase 0 keeps it dead-simple: one centered text label, monospace
 * fallback font (Pixellari comes in Phase 9 via BitmapText). Cream text
 * `#F0EBD7` per design/06-style §Master palette (default on-surface text).
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2, 'StoneWrld — boot', {
        fontFamily: 'monospace',
        fontSize: '32px',
        color: '#F0EBD7',
      })
      .setOrigin(0.5);

    // Subtle subtitle so co-captain knows the phase + can confirm
    // pixel-perfect text rendering without antialiasing (look closely).
    this.add
      .text(width / 2, height / 2 + 48, 'Phase 0 — bootstrap', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#FFC940', // captain gold (design/06-style §Master palette accents)
      })
      .setOrigin(0.5);
  }
}
