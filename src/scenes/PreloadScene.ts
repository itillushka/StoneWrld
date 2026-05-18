import Phaser from 'phaser';
import { AppState } from '../state/app-state';
import { fetchTerrainMap } from '../city/terrain';
import { loadCatalog } from '../catalog/buildings';
import { loadTechTree } from '../catalog/techtree';

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

  preload(): void {
    // Mecha Senku placeholder sprite — single 84×84 frame for Phase 9.
    // Loaded under a RAW key; create() does a chroma-key pass to make
    // the near-white background transparent before publishing under the
    // 'mecha-senku-placeholder' key that scenes consume.
    this.load.image('mecha-senku-raw', '/sprites/mecha-senku.png');
  }

  /**
   * Strip the white background ONLY where it's connected to the image edge.
   * Previous version naively thresholded across the whole image, which made
   * interior near-white pixels (eye whites, glasses gleam, lab-coat highlights)
   * also transparent — visually punched holes through Mecha Senku.
   *
   * Flood-fill from every edge pixel: only pixels that are (a) near-white
   * AND (b) reachable from the canvas edge through other near-white pixels
   * become transparent. White pixels surrounded by non-white stay opaque.
   *
   * Re-publishes under 'mecha-senku-placeholder' so the consuming scenes
   * don't have to know about the source-image quirk.
   */
  private chromaKeyMechaSenku(): void {
    const src = this.textures.get('mecha-senku-raw');
    const img = src.getSourceImage(0) as HTMLImageElement | HTMLCanvasElement;
    const w = img.width;
    const h = img.height;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, w, h);
    const px = data.data;

    const NEAR_WHITE = 240;
    const visited = new Uint8Array(w * h);
    const queue: number[] = []; // (y * w + x) cell indices

    function isNearWhite(cellIdx: number): boolean {
      const pxIdx = cellIdx * 4;
      return (
        px[pxIdx]! >= NEAR_WHITE &&
        px[pxIdx + 1]! >= NEAR_WHITE &&
        px[pxIdx + 2]! >= NEAR_WHITE
      );
    }

    function trySeed(x: number, y: number): void {
      if (x < 0 || x >= w || y < 0 || y >= h) return;
      const idx = y * w + x;
      if (visited[idx]) return;
      if (!isNearWhite(idx)) return;
      visited[idx] = 1;
      queue.push(idx);
    }

    // Seed from every edge pixel — top + bottom rows, left + right columns.
    for (let x = 0; x < w; x++) {
      trySeed(x, 0);
      trySeed(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
      trySeed(0, y);
      trySeed(w - 1, y);
    }

    // BFS flood — set every reachable near-white pixel to alpha 0.
    while (queue.length > 0) {
      const idx = queue.shift()!;
      px[idx * 4 + 3] = 0;
      const x = idx % w;
      const y = (idx - x) / w;
      trySeed(x + 1, y);
      trySeed(x - 1, y);
      trySeed(x, y + 1);
      trySeed(x, y - 1);
    }

    ctx.putImageData(data, 0, 0);
    if (this.textures.exists('mecha-senku-placeholder')) {
      this.textures.remove('mecha-senku-placeholder');
    }
    this.textures.addCanvas('mecha-senku-placeholder', canvas);
  }

  create(): void {
    // Convert the raw white-bg PNG into a chroma-keyed canvas texture.
    this.chromaKeyMechaSenku();

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
      [
        'tech tree',
        async () => {
          await loadTechTree();
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
