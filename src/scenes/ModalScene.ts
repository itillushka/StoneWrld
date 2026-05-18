import Phaser from 'phaser';
import { listBuildings, getTier, type BuildingCatalogEntry } from '../catalog/buildings';
import { AppState } from '../state/app-state';
import type { ResourceKey } from '../state/schema';

/**
 * ModalScene — the topmost overlay for build / inspect / silos / demolish modals.
 *
 * Per design/08-architecture §Phaser scene tree:
 *   Lives above CityScene + UIScene. Pauses interaction on lower scenes
 *   while open. Closes on Esc or its own close button.
 *
 * Per design/06-style §Modal chassis:
 *   - Deep-navy scrim at 60% alpha
 *   - Surface-navy frame with 4-pixel gold border
 *   - Gold title bar with inverse-text title + close [×] top-right
 *
 * Phase 5 supports only 'build' mode (the Settler Hut chooser). Phase 10
 * adds silo upgrades; Phase 11 adds inspect/demolish; Phase 13 adds overlays.
 *
 * Communication: when the user picks a building, ModalScene emits
 * `placement:start` on the global game event bus and closes itself.
 * CityScene listens for that event and enters placement mode.
 */

export type ModalMode = 'build';

export interface ModalLaunchData {
  mode: ModalMode;
}

const SCRIM_COLOR = 0x0a1228;
const SCRIM_ALPHA = 0.6;
const FRAME_FILL = 0x1b2d5c;     // surface navy
const FRAME_BORDER = 0xffc940;   // captain gold
const TITLE_BAR_HEIGHT = 32;
const FRAME_PADDING = 16;
const FRAME_BORDER_WIDTH = 4;

export class ModalScene extends Phaser.Scene {
  private mode: ModalMode = 'build';
  private escListener?: (e: KeyboardEvent) => void;

  constructor() {
    super('ModalScene');
  }

  init(data: ModalLaunchData): void {
    this.mode = data.mode;
  }

  create(): void {
    const { width, height } = this.scale;

    // Scrim — full-canvas dimmed background. Click on the scrim closes.
    const scrim = this.add
      .rectangle(0, 0, width, height, SCRIM_COLOR, SCRIM_ALPHA)
      .setOrigin(0, 0)
      .setInteractive();
    scrim.on('pointerdown', () => this.closeModal());

    // Frame geometry.
    const frameW = 520;
    const frameH = 380;
    const frameX = (width - frameW) / 2;
    const frameY = (height - frameH) / 2;

    // Border (drawn as outer rect; inner rect drawn on top as fill).
    this.add
      .rectangle(
        frameX - FRAME_BORDER_WIDTH,
        frameY - FRAME_BORDER_WIDTH,
        frameW + FRAME_BORDER_WIDTH * 2,
        frameH + FRAME_BORDER_WIDTH * 2,
        FRAME_BORDER,
      )
      .setOrigin(0, 0);

    // Body fill — block clicks from reaching the scrim.
    const body = this.add
      .rectangle(frameX, frameY, frameW, frameH, FRAME_FILL)
      .setOrigin(0, 0)
      .setInteractive();
    body.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
    });

    // Title bar (gold, full width).
    this.add
      .rectangle(frameX, frameY, frameW, TITLE_BAR_HEIGHT, FRAME_BORDER)
      .setOrigin(0, 0);

    this.add
      .text(frameX + FRAME_PADDING, frameY + TITLE_BAR_HEIGHT / 2, this.titleFor(this.mode), {
        fontFamily: 'Pixellari, monospace',
        fontSize: '20px',
        color: '#0A1228', // inverse text on gold
      })
      .setOrigin(0, 0.5);

    // Close [×] button — top-right of title bar.
    const closeBtn = this.add
      .text(frameX + frameW - FRAME_PADDING, frameY + TITLE_BAR_HEIGHT / 2, '×', {
        fontFamily: 'Pixellari, monospace',
        fontSize: '24px',
        color: '#0A1228',
      })
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.closeModal();
    });

    // Body content per mode.
    const contentY = frameY + TITLE_BAR_HEIGHT + FRAME_PADDING;
    if (this.mode === 'build') {
      this.renderBuildContent(frameX + FRAME_PADDING, contentY, frameW - FRAME_PADDING * 2);
    }

    // Esc key closes — registered on the DOM keyboard since Phaser's
    // own keyboard plugin might be blocked by other scenes' subscriptions.
    this.escListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.closeModal();
    };
    window.addEventListener('keydown', this.escListener);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.teardown());
  }

  private titleFor(mode: ModalMode): string {
    switch (mode) {
      case 'build':
        return 'Build';
      default:
        return '';
    }
  }

  private renderBuildContent(x: number, y: number, width: number): void {
    const state = AppState.getState();
    const buildings = listBuildings();

    if (buildings.length === 0) {
      this.add
        .text(x, y, 'No buildings unlocked yet.', {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '10px',
          color: '#5C6E8E',
        })
        .setOrigin(0, 0);
      return;
    }

    const rowHeight = 64;
    buildings.forEach((entry, i) => {
      this.renderBuildRow(x, y + i * (rowHeight + 12), width, rowHeight, entry, state);
    });

    // Hint line at the bottom.
    this.add
      .text(
        x,
        y + buildings.length * (rowHeight + 12) + 16,
        'Phase 5 — only Settler Hut available. Full catalog arrives in Phase 6.',
        {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: '#5C6E8E',
        },
      )
      .setOrigin(0, 0);
  }

  private renderBuildRow(
    x: number,
    y: number,
    width: number,
    height: number,
    entry: BuildingCatalogEntry,
    state: ReturnType<typeof AppState.getState>,
  ): void {
    const t1 = getTier(entry.id, 1);
    if (!t1) return;

    // Row background — slightly raised surface.
    const bg = this.add
      .rectangle(x, y, width, height, 0x0f1f4d)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });

    // Category-color accent stripe on the left edge (4 px wide).
    // Phase 5 has only Dwellings (cream); full per-category map lives in
    // src/hud/category-colors.ts in Phase 6.
    this.add.rectangle(x, y, 4, height, 0xf0ebd7).setOrigin(0, 0);

    // Building name.
    this.add
      .text(x + 16, y + 12, entry.name, {
        fontFamily: 'Pixellari, monospace',
        fontSize: '20px',
        color: '#F0EBD7',
      })
      .setOrigin(0, 0);

    // T1 / footprint / category info line.
    this.add
      .text(
        x + 16,
        y + 38,
        `T1 · ${entry.footprint.w}×${entry.footprint.h} · ${entry.category}`,
        {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: '#5C6E8E',
        },
      )
      .setOrigin(0, 0);

    // Cost — right-aligned, with affordability cue (red if short).
    const costStr = this.formatCost(t1.cost);
    const canAfford = this.canAfford(t1.cost, state?.resources ?? null);
    this.add
      .text(x + width - 16, y + 12, costStr, {
        fontFamily: 'Pixellari, monospace',
        fontSize: '16px',
        color: canAfford ? '#FFC940' : '#E84B4B',
      })
      .setOrigin(1, 0);

    this.add
      .text(
        x + width - 16,
        y + 36,
        canAfford ? '[click to build]' : '[insufficient resources]',
        {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '6px',
          color: canAfford ? '#7CD16A' : '#5C6E8E',
        },
      )
      .setOrigin(1, 0);

    bg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      if (!canAfford) return; // silent reject — the row already shows red
      // Hand off to CityScene via the global event bus, then close.
      this.game.events.emit('placement:start', { buildingId: entry.id });
      this.closeModal();
    });
  }

  private formatCost(cost: Partial<Record<ResourceKey, number>>): string {
    const labels: Record<ResourceKey, string> = {
      knowledge: 'K',
      discovery: 'D',
      iron: 'I',
      innovation: 'N',
      completion: 'C',
    };
    return Object.entries(cost)
      .map(([k, v]) => `${v}${labels[k as ResourceKey]}`)
      .join(' + ');
  }

  private canAfford(
    cost: Partial<Record<ResourceKey, number>>,
    purse: Record<ResourceKey, number> | null,
  ): boolean {
    if (!purse) return false;
    for (const [k, need] of Object.entries(cost) as Array<[ResourceKey, number]>) {
      if ((purse[k] ?? 0) < need) return false;
    }
    return true;
  }

  private closeModal(): void {
    this.scene.stop('ModalScene');
  }

  private teardown(): void {
    if (this.escListener) {
      window.removeEventListener('keydown', this.escListener);
      this.escListener = undefined;
    }
  }
}
