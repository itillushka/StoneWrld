import Phaser from 'phaser';

/**
 * BootScene — the very first scene Phaser runs.
 *
 * Per design/08-architecture §Per-scene responsibility (Phase 3+):
 *   Minimal preloader skeleton. Shows the loading bar shell, then hands
 *   off to PreloadScene which does the real asset / state.json loading.
 *
 * Kept deliberately tiny so it renders in the first ~50ms before any
 * heavyweight loading work begins.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    const { width, height } = this.scale;

    // Title — Pixellari at 32px (2× native). Per design/06-style.
    this.add
      .text(width / 2, height / 2 - 32, 'StoneWrld', {
        fontFamily: 'Pixellari, monospace',
        fontSize: '48px',
        color: '#F0EBD7',
      })
      .setOrigin(0.5);

    // Tagline — Press Start 2P at 16px (2× native).
    this.add
      .text(width / 2, height / 2 + 24, 'booting…', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '16px',
        color: '#FFC940',
      })
      .setOrigin(0.5);

    // Hand off to PreloadScene almost immediately — Boot is just the
    // before-anything-happens flash.
    this.time.delayedCall(150, () => {
      this.scene.start('PreloadScene');
    });
  }
}
