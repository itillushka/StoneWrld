import Phaser from 'phaser';
import { loadState } from '../state/load';

/**
 * BootScene — the very first scene Phaser runs.
 *
 * Phase 0 responsibility (per design/09-roadmap §Phase 0):
 *   Render a placeholder "StoneWrld — boot" label centered on the
 *   Ryusui deep-navy canvas. This proves the Phaser pipeline works
 *   end-to-end: index.html → main.ts → config → BootScene → render.
 *
 * Phase 1 addition (per design/09-roadmap §Phase 1):
 *   Smoke-test the state API end-to-end. Loading state at boot proves
 *   the browser → dev middleware → state.json atomic write loop.
 *   A small status line shows current resource totals + milestone +
 *   building count so co-captain can verify the round-trip visually.
 *
 * Phase 1+ responsibility (per design/08-architecture §Per-scene responsibility):
 *   Becomes the minimal preloader skeleton — load just enough to show a
 *   loading bar, then hand off to PreloadScene which loads atlases /
 *   fonts / catalogs / state.json.
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

    this.add
      .text(width / 2, height / 2 + 48, 'Phase 1 — state API', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#FFC940', // captain gold
      })
      .setOrigin(0.5);

    // Smoke-test the state API: browser → middleware → state.json round-trip.
    // The result renders below as a green (success) or red (failure) status line.
    this.smokeTestStateApi(width, height);
  }

  private smokeTestStateApi(width: number, height: number): void {
    const statusText = this.add
      .text(width / 2, height / 2 + 96, 'state: loading…', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#5C6E8E', // inactive grey while pending
      })
      .setOrigin(0.5);

    loadState()
      .then((state) => {
        const summary =
          `state: v${state.version} • ` +
          `milestone=${state.milestone} • ` +
          `buildings=${state.buildings.length} • ` +
          `📚${state.resources.knowledge} 🔭${state.resources.discovery} ` +
          `⛓${state.resources.iron} ⚡${state.resources.innovation} 🏁${state.resources.completion}`;
        statusText.setText(summary).setColor('#7CD16A'); // KoS green
        console.log('[StoneWrld] State loaded:', state);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        statusText.setText(`state load failed — ${msg}`).setColor('#E84B4B'); // error red
        console.error('[StoneWrld] State load failed:', err);
      });
  }
}
