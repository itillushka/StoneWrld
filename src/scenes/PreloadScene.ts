import Phaser from 'phaser';
import { AppState } from '../state/app-state';
import { fetchTerrainMap } from '../city/terrain';
import { loadCatalog } from '../catalog/buildings';

/**
 * PreloadScene — heavy lifting before the game world appears.
 *
 * Per design/08-architecture §Per-scene responsibility (Phase 3+):
 *   Load atlases, fonts, catalogs, state.json. Show a loading bar.
 *   Transition to CityScene + UIScene once everything's ready.
 *
 * Phase 3 (this iteration) loads only state.json — atlases / catalogs /
 * factoids land as later phases add them. The loading-bar skeleton is
 * structural so subsequent phases don't have to redesign the look.
 *
 * Failure mode: if state load throws, the scene shows a red error line
 * but still launches CityScene/UIScene with whatever AppState managed
 * to capture (loadState falls back to defaultState on MigrationError —
 * see src/state/load.ts).
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  create(): void {
    const { width, height } = this.scale;

    // Bar geometry — centered, 60% of canvas width.
    const barWidth = width * 0.6;
    const barX = (width - barWidth) / 2;
    const barY = height / 2;

    this.add
      .text(width / 2, barY - 48, 'loading state', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '16px',
        color: '#F0EBD7',
      })
      .setOrigin(0.5);

    // Track outline (inactive grey).
    const track = this.add
      .rectangle(barX, barY, barWidth, 8, 0x3a4868)
      .setOrigin(0, 0.5);
    void track;

    // Filling bar (captain gold). Width animates as load progresses.
    const fill = this.add
      .rectangle(barX, barY, 0, 8, 0xffc940)
      .setOrigin(0, 0.5);

    const status = this.add
      .text(width / 2, barY + 40, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#5C6E8E',
      })
      .setOrigin(0.5);

    // Per-phase load steps. The list grows as later phases add atlases /
    // catalogs / factoids. Each step shows its label on the bar so a
    // failing step is identifiable at a glance.
    const steps: Array<[string, () => Promise<void>]> = [
      [
        'state.json',
        async () => {
          await AppState.refresh();
        },
      ],
      [
        'terrain map',
        async () => {
          // Validate the map fetches + parses cleanly before CityScene tries
          // to use it. Errors here are caught + surfaced on the bar.
          await fetchTerrainMap();
        },
      ],
      [
        'building catalog',
        async () => {
          await loadCatalog();
        },
      ],
    ];

    void this.runLoadSteps(steps, fill, barWidth, status);
  }

  private async runLoadSteps(
    steps: Array<[string, () => Promise<void>]>,
    fill: Phaser.GameObjects.Rectangle,
    barWidth: number,
    status: Phaser.GameObjects.Text,
  ): Promise<void> {
    const total = steps.length;
    let done = 0;

    for (const [label, fn] of steps) {
      status.setText(label);
      try {
        await fn();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        status.setText(`load failed: ${label} — ${msg}`).setColor('#E84B4B');
        console.error(`[PreloadScene] ${label} failed:`, err);
        // Continue to whatever steps remain so the game still launches
        // with whatever state we managed to get (defaultState fallback).
      }
      done += 1;
      fill.width = (barWidth * done) / total;
    }

    // Brief pause so the user sees the bar completing.
    this.time.delayedCall(120, () => {
      this.scene.start('CityScene');
      this.scene.launch('UIScene');
    });
  }
}
