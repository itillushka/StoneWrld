import Phaser from 'phaser';
import {
  buildingsByCategory,
  getBuilding,
  getTier,
  type BuildingCatalogEntry,
} from '../catalog/buildings';
import { AppState } from '../state/app-state';
import { categoryColorInt } from '../hud/category-colors';
import type { BuildingInstance, BuildingTier, ResourceKey } from '../state/schema';

/**
 * ModalScene — the topmost overlay for build / inspect / silos / demolish.
 *
 * Phase 6 modes:
 *   - 'build'    : grouped, scrollable list of every catalog entry; click a
 *                  row to enter placement mode for that building.
 *   - 'inspect'  : opened by clicking a placed building. Shows current tier,
 *                  production, power, next-tier cost, and an [Upgrade] button.
 *
 * Phase 10 adds 'silos', Phase 11 adds 'demolish-confirm', Phase 13 adds 'overlays'.
 *
 * Per design/06-style §Modal chassis: deep-navy scrim 60% alpha, surface-navy
 * frame with 4-pixel gold border, gold title bar with inverse text.
 */

export type ModalMode = 'build' | 'inspect';

export interface ModalLaunchData {
  mode: ModalMode;
  /** Required when mode === 'inspect' — the building to show details for. */
  building?: BuildingInstance;
}

const SCRIM_COLOR = 0x0a1228;
const SCRIM_ALPHA = 0.6;
const FRAME_FILL = 0x1b2d5c;
const FRAME_BORDER = 0xffc940;
const ROW_FILL = 0x0f1f4d;
const TITLE_BAR_HEIGHT = 32;
const FRAME_PADDING = 16;
const FRAME_BORDER_WIDTH = 4;

const ROW_HEIGHT = 56;
const ROW_GAP = 8;
const CATEGORY_HEADER_HEIGHT = 24;
const CATEGORY_HEADER_GAP = 4;

export class ModalScene extends Phaser.Scene {
  private mode: ModalMode = 'build';
  private buildingForInspect: BuildingInstance | null = null;
  private escListener?: (e: KeyboardEvent) => void;

  // Scroll state — only used in build mode.
  private contentContainer?: Phaser.GameObjects.Container;
  private contentMinY = 0;
  private contentMaxY = 0;
  private wheelHandler?: (
    p: Phaser.Input.Pointer,
    o: unknown,
    dx: number,
    dy: number,
  ) => void;

  constructor() {
    super('ModalScene');
  }

  init(data: ModalLaunchData): void {
    this.mode = data.mode;
    this.buildingForInspect = data.building ?? null;
  }

  create(): void {
    const { width, height } = this.scale;

    // Scrim — click anywhere outside the frame closes.
    const scrim = this.add
      .rectangle(0, 0, width, height, SCRIM_COLOR, SCRIM_ALPHA)
      .setOrigin(0, 0)
      .setInteractive();
    scrim.on('pointerdown', () => this.closeModal());

    // Frame geometry — taller for build mode (room for many rows), compact for inspect.
    const isBuild = this.mode === 'build';
    const frameW = isBuild ? 720 : 480;
    const frameH = isBuild ? 600 : 360;
    const frameX = (width - frameW) / 2;
    const frameY = (height - frameH) / 2;

    // Border + body fill.
    this.add
      .rectangle(
        frameX - FRAME_BORDER_WIDTH,
        frameY - FRAME_BORDER_WIDTH,
        frameW + FRAME_BORDER_WIDTH * 2,
        frameH + FRAME_BORDER_WIDTH * 2,
        FRAME_BORDER,
      )
      .setOrigin(0, 0);

    const body = this.add
      .rectangle(frameX, frameY, frameW, frameH, FRAME_FILL)
      .setOrigin(0, 0)
      .setInteractive();
    body.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
    });

    // Title bar.
    this.add
      .rectangle(frameX, frameY, frameW, TITLE_BAR_HEIGHT, FRAME_BORDER)
      .setOrigin(0, 0);
    this.add
      .text(frameX + FRAME_PADDING, frameY + TITLE_BAR_HEIGHT / 2, this.titleFor(), {
        fontFamily: 'Pixellari, monospace',
        fontSize: '20px',
        color: '#0A1228',
      })
      .setOrigin(0, 0.5);

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

    // Mode-specific content.
    if (this.mode === 'build') {
      this.renderBuildContent(frameX, frameY, frameW, frameH);
    } else if (this.mode === 'inspect' && this.buildingForInspect) {
      this.renderInspectContent(frameX, frameY, frameW, frameH, this.buildingForInspect);
    }

    // Esc closes.
    this.escListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') this.closeModal();
    };
    window.addEventListener('keydown', this.escListener);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.teardown());
  }

  private titleFor(): string {
    if (this.mode === 'build') return 'Build';
    if (this.mode === 'inspect' && this.buildingForInspect) {
      const entry = getBuilding(this.buildingForInspect.id);
      return entry ? `${entry.name}` : 'Building';
    }
    return '';
  }

  // ---------- BUILD MODE ----------

  private renderBuildContent(
    frameX: number,
    frameY: number,
    frameW: number,
    frameH: number,
  ): void {
    const state = AppState.getState();
    const byCat = buildingsByCategory();

    if (byCat.size === 0) {
      this.add
        .text(
          frameX + frameW / 2,
          frameY + frameH / 2,
          'Catalog not loaded yet.',
          {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '12px',
            color: '#E84B4B',
          },
        )
        .setOrigin(0.5);
      return;
    }

    const contentX = frameX + FRAME_PADDING;
    const contentY = frameY + TITLE_BAR_HEIGHT + FRAME_PADDING;
    const contentW = frameW - FRAME_PADDING * 2;
    const visibleH = frameH - TITLE_BAR_HEIGHT - FRAME_PADDING * 2;

    // Container holds ALL category sections; we translate its y to scroll.
    this.contentContainer = this.add.container(contentX, contentY);

    let yCursor = 0;
    // Sort categories for stable presentation. Power first (most early game),
    // Dwellings second, then alphabetical for the rest.
    const categoryOrder = this.preferredCategoryOrder(Array.from(byCat.keys()));

    for (const category of categoryOrder) {
      const entries = byCat.get(category) ?? [];
      this.renderCategoryHeader(category, 0, yCursor, contentW);
      yCursor += CATEGORY_HEADER_HEIGHT + CATEGORY_HEADER_GAP;

      for (const entry of entries) {
        this.renderBuildRow(0, yCursor, contentW, entry, state);
        yCursor += ROW_HEIGHT + ROW_GAP;
      }
      yCursor += 8; // small gap between categories
    }

    // Clip the container to the visible content area via a geometry mask.
    const maskShape = this.make.graphics({ x: contentX, y: contentY }, false);
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(0, 0, contentW, visibleH);
    const mask = maskShape.createGeometryMask();
    this.contentContainer.setMask(mask);

    // Scroll bounds: container.y is in absolute world coords.
    // - Top:    contentY (already correct, fully scrolled up)
    // - Bottom: contentY - (totalHeight - visibleH) — fully scrolled down
    const totalHeight = yCursor;
    this.contentMinY = contentY;
    this.contentMaxY = Math.min(contentY, contentY - (totalHeight - visibleH));

    // Mouse wheel scroll. dy > 0 ⇒ scroll down; we move content up (-y).
    this.wheelHandler = (
      _pointer: Phaser.Input.Pointer,
      _objs: unknown,
      _dx: number,
      dy: number,
    ) => {
      if (!this.contentContainer) return;
      // 32 px per wheel notch — comfortable rate.
      const step = Math.sign(dy) * 32;
      const next = this.contentContainer.y - step;
      this.contentContainer.y = Phaser.Math.Clamp(next, this.contentMaxY, this.contentMinY);
    };
    this.input.on('wheel', this.wheelHandler);

    // Scroll hint at the bottom of the modal.
    if (totalHeight > visibleH) {
      this.add
        .text(frameX + frameW / 2, frameY + frameH - 8, 'scroll wheel to see more', {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '6px',
          color: '#5C6E8E',
        })
        .setOrigin(0.5, 1);
    }
  }

  private preferredCategoryOrder(found: string[]): string[] {
    const priority = ['Power', 'Dwellings'];
    const rest = found
      .filter((c) => !priority.includes(c))
      .sort();
    return [...priority.filter((c) => found.includes(c)), ...rest];
  }

  private renderCategoryHeader(
    category: string,
    x: number,
    y: number,
    width: number,
  ): void {
    if (!this.contentContainer) return;

    // Color bar.
    const bar = this.add
      .rectangle(x, y + CATEGORY_HEADER_HEIGHT / 2 + 6, width, 2, categoryColorInt(category))
      .setOrigin(0, 0.5);
    this.contentContainer.add(bar);

    const label = this.add
      .text(x, y, category.toUpperCase(), {
        fontFamily: 'Pixellari, monospace',
        fontSize: '18px',
        color: '#F0EBD7',
      })
      .setOrigin(0, 0);
    this.contentContainer.add(label);
  }

  private renderBuildRow(
    x: number,
    y: number,
    width: number,
    entry: BuildingCatalogEntry,
    state: ReturnType<typeof AppState.getState>,
  ): void {
    if (!this.contentContainer) return;
    const t1 = getTier(entry.id, 1);
    if (!t1) return;

    const bg = this.add
      .rectangle(x, y, width, ROW_HEIGHT, ROW_FILL)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    this.contentContainer.add(bg);

    // Category color stripe on the left edge.
    const stripe = this.add
      .rectangle(x, y, 4, ROW_HEIGHT, categoryColorInt(entry.category))
      .setOrigin(0, 0);
    this.contentContainer.add(stripe);

    // Building name (left).
    const nameGo = this.add
      .text(x + 14, y + 10, entry.name, {
        fontFamily: 'Pixellari, monospace',
        fontSize: '18px',
        color: '#F0EBD7',
      })
      .setOrigin(0, 0);
    this.contentContainer.add(nameGo);

    // Footprint + category + tier 1 tags.
    const tagsGo = this.add
      .text(
        x + 14,
        y + 34,
        `T1 · ${entry.footprint.w}×${entry.footprint.h} · ${entry.category}` +
          (entry.terrain_gate === 'naval_needs_water' ? ' · needs water'
            : entry.terrain_gate === 'rocket_needs_concrete' ? ' · needs concrete'
            : ''),
        {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '7px',
          color: '#5C6E8E',
        },
      )
      .setOrigin(0, 0);
    this.contentContainer.add(tagsGo);

    // Cost (right-aligned).
    const costStr = this.formatCost(t1.cost);
    const canAfford = this.canAfford(t1.cost, state?.resources ?? null);
    const costGo = this.add
      .text(x + width - 14, y + 10, costStr, {
        fontFamily: 'Pixellari, monospace',
        fontSize: '16px',
        color: canAfford ? '#FFC940' : '#E84B4B',
      })
      .setOrigin(1, 0);
    this.contentContainer.add(costGo);

    const hintGo = this.add
      .text(
        x + width - 14,
        y + 36,
        canAfford ? '[click to build]' : '[insufficient resources]',
        {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '6px',
          color: canAfford ? '#7CD16A' : '#5C6E8E',
        },
      )
      .setOrigin(1, 0);
    this.contentContainer.add(hintGo);

    bg.on('pointerover', () => bg.setFillStyle(0x1b2d5c));
    bg.on('pointerout', () => bg.setFillStyle(ROW_FILL));
    bg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      if (!canAfford) return;
      this.game.events.emit('placement:start', { buildingId: entry.id });
      this.closeModal();
    });
  }

  // ---------- INSPECT MODE ----------

  private renderInspectContent(
    frameX: number,
    frameY: number,
    frameW: number,
    frameH: number,
    building: BuildingInstance,
  ): void {
    const entry = getBuilding(building.id);
    if (!entry) {
      this.add
        .text(frameX + frameW / 2, frameY + frameH / 2, 'Unknown building', {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '12px',
          color: '#E84B4B',
        })
        .setOrigin(0.5);
      return;
    }
    const currentTier = getTier(building.id, building.tier);
    if (!currentTier) return;

    const x = frameX + FRAME_PADDING;
    let y = frameY + TITLE_BAR_HEIGHT + FRAME_PADDING;

    // Category badge bar.
    this.add
      .rectangle(x, y, frameW - FRAME_PADDING * 2, 2, categoryColorInt(entry.category))
      .setOrigin(0, 0);
    y += 8;

    // Position + category + footprint line.
    this.add
      .text(
        x,
        y,
        `${entry.category} · ${entry.footprint.w}×${entry.footprint.h} · at (${building.x}, ${building.y})`,
        {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: '#5C6E8E',
        },
      )
      .setOrigin(0, 0);
    y += 18;

    // Tier display.
    this.add
      .text(x, y, `Tier ${building.tier} / 3`, {
        fontFamily: 'Pixellari, monospace',
        fontSize: '22px',
        color: '#FFC940',
      })
      .setOrigin(0, 0);
    y += 32;

    // Passive output line.
    const passiveStr = this.formatPassive(currentTier.passive_per_hour);
    this.add
      .text(x, y, `Passive: ${passiveStr}`, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: '#F0EBD7',
      })
      .setOrigin(0, 0);
    y += 18;

    // Power line.
    const powerLine =
      currentTier.power_capacity > 0
        ? `Power capacity: +${currentTier.power_capacity}`
        : currentTier.power_demand > 0
          ? `Power demand: ${currentTier.power_demand}`
          : 'Power: none';
    this.add
      .text(x, y, powerLine, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: '#F0EBD7',
      })
      .setOrigin(0, 0);
    y += 18;

    // Total spent so far.
    const spentStr = this.formatCost(building.spent);
    if (spentStr) {
      this.add
        .text(x, y, `Total spent: ${spentStr}`, {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: '#5C6E8E',
        })
        .setOrigin(0, 0);
      y += 16;
    }
    y += 12;

    // Upgrade section.
    const nextTier = (building.tier + 1) as BuildingTier;
    const next = getTier(building.id, nextTier);
    if (!next) {
      // Already at max tier.
      this.add
        .text(x, y, 'Max tier reached', {
          fontFamily: 'Pixellari, monospace',
          fontSize: '16px',
          color: '#7CD16A',
        })
        .setOrigin(0, 0);
      return;
    }

    this.add
      .text(x, y, `→ Upgrade to T${nextTier}`, {
        fontFamily: 'Pixellari, monospace',
        fontSize: '16px',
        color: '#F0EBD7',
      })
      .setOrigin(0, 0);
    y += 24;

    const state = AppState.getState();
    const canAfford = this.canAfford(next.cost, state?.resources ?? null);
    const costStr = this.formatCost(next.cost);
    this.add
      .text(x, y, `Cost: ${costStr}`, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: canAfford ? '#FFC940' : '#E84B4B',
      })
      .setOrigin(0, 0);
    y += 22;

    // Upgrade button.
    const btnW = 200;
    const btnH = 40;
    const btnX = x;
    const btnY = y + 8;
    const border = this.add
      .rectangle(btnX, btnY, btnW, btnH, canAfford ? 0xffc940 : 0x5c6e8e)
      .setOrigin(0, 0);
    const fill = this.add
      .rectangle(btnX + 2, btnY + 2, btnW - 4, btnH - 4, 0x0a1228)
      .setOrigin(0, 0);
    const label = this.add
      .text(btnX + btnW / 2, btnY + btnH / 2, canAfford ? `Upgrade` : `Insufficient`, {
        fontFamily: 'Pixellari, monospace',
        fontSize: '18px',
        color: canAfford ? '#F0EBD7' : '#5C6E8E',
      })
      .setOrigin(0.5);
    void border;

    if (canAfford) {
      fill.setInteractive({ useHandCursor: true });
      fill.on('pointerover', () => {
        fill.setFillStyle(0x1b2d5c);
        label.setColor('#FFE680');
      });
      fill.on('pointerout', () => {
        fill.setFillStyle(0x0a1228);
        label.setColor('#F0EBD7');
      });
      fill.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        this.game.events.emit('building:upgrade', {
          building, // CityScene will look up by x,y,id
        });
        this.closeModal();
      });
    }
  }

  // ---------- Formatting helpers ----------

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

  private formatPassive(p: Partial<Record<ResourceKey, number>>): string {
    if (Object.keys(p).length === 0) return 'none';
    const labels: Record<ResourceKey, string> = {
      knowledge: 'K',
      discovery: 'D',
      iron: 'I',
      innovation: 'N',
      completion: 'C',
    };
    return (
      Object.entries(p)
        .map(([k, v]) => `+${v}${labels[k as ResourceKey]}`)
        .join(' ') + ' / hr'
    );
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
    if (this.wheelHandler) {
      this.input.off('wheel', this.wheelHandler);
      this.wheelHandler = undefined;
    }
  }
}
