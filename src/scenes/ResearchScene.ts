import Phaser from 'phaser';
import { AppState } from '../state/app-state';
import { saveState } from '../state/save';
import {
  listTechs,
  getTech,
  listBranches,
  isTechAvailable,
  type TechEntry,
} from '../catalog/techtree';
import { categoryColorInt } from '../hud/category-colors';
import type {
  LogEntry,
  ResourceKey,
  StoneWorldState,
} from '../state/schema';
import { CAPTAIN_LOG_MAX } from '../state/schema';
import { voiceResearch } from '../mecha-senku/voice';

/**
 * ResearchScene — the tech tree view.
 *
 * Per design/03-progression §Research UI Layout:
 *   - Nodes arranged left-to-right by milestone (7 columns).
 *   - 10 vertical lanes for branches (we render whatever branches the
 *     compiled tree contains — 10 canonical + a few hybrid cross-branch
 *     entries from design/03).
 *   - Prereq arrows drawn between nodes; cross-branch arrows cross lanes.
 *   - Three node states (locked / available / researched) per design/03 §Node states.
 *
 * Phase 8 ships:
 *   - Static graph layout (no zoom/pan in this scene — the tree is sized to fit).
 *   - Click an available node → spend cost → researched + ripple updates downstream.
 *   - Tab key (or HUD button) toggles back to CityScene.
 *   - CityScene's build modal now filters to only researched-prereq-met buildings.
 *
 * Future polish (v1.x): zoom/pan, filter modes, search.
 */

const SIDEBAR_X = 1024; // matches UIScene
const SCENE_W = 1024;   // game viewport (left of HUD)

// Layout constants — tuned for ~85 nodes.
const PAD_X = 32;
const PAD_Y = 64;
const COLUMN_GAP = 4;
const NODE_W = 124;
const NODE_H = 44;
const NODE_GAP_Y = 6;
const HEADER_HEIGHT = 24;

// Color palette — design/06-style §State colors.
const COLOR_LOCKED_FILL = 0x1b2d5c;
const COLOR_LOCKED_TEXT = '#5C6E8E';
const COLOR_LOCKED_BORDER = 0x3a4868;

const COLOR_AVAIL_FILL = 0x0a1228;
const COLOR_AVAIL_TEXT = '#FFC940';
const COLOR_AVAIL_BORDER = 0xffc940;

const COLOR_RESEARCHED_FILL = 0x1b3a2c;
const COLOR_RESEARCHED_TEXT = '#7CD16A';
const COLOR_RESEARCHED_BORDER = 0x7cd16a;

const COLOR_BOSS_ACCENT = 0xa47ce0;

interface NodeRender {
  tech: TechEntry;
  container: Phaser.GameObjects.Container;
  border: Phaser.GameObjects.Rectangle;
  fill: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  costText: Phaser.GameObjects.Text;
  x: number; // top-left x
  y: number; // top-left y
}

export class ResearchScene extends Phaser.Scene {
  private nodesById = new Map<string, NodeRender>();
  private arrows: Phaser.GameObjects.Graphics | null = null;
  private tooltip?: Phaser.GameObjects.Text;
  private unsubscribe?: () => void;

  constructor() {
    super('ResearchScene');
  }

  create(): void {
    // Clip the main camera to the game viewport (HUD sits on top via UIScene).
    this.cameras.main.setViewport(0, 0, SCENE_W, this.scale.height);
    this.cameras.main.setBackgroundColor('#0A1228');

    this.renderHeader();
    this.renderBranchLabels();
    this.renderMilestoneColumns();
    this.layoutAndRenderNodes();
    this.renderArrows();

    this.tooltip = this.add
      .text(0, 0, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#F0EBD7',
        backgroundColor: '#0A1228',
        padding: { x: 6, y: 4 },
      })
      .setDepth(100)
      .setScrollFactor(0)
      .setVisible(false);

    // Tab toggles back to CityScene.
    this.input.keyboard?.on('keydown-TAB', (e: KeyboardEvent) => {
      e.preventDefault();
      this.scene.start('CityScene');
    });

    // Subscribe to state changes — when a research completes, re-render
    // node states (available → researched, locked downstream → available).
    this.unsubscribe = AppState.subscribe(() => this.refreshNodeStates());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.teardown());
  }

  private renderHeader(): void {
    this.add
      .text(SCENE_W / 2, 24, 'Research', {
        fontFamily: 'Pixellari, monospace',
        fontSize: '32px',
        color: '#FFC940',
      })
      .setOrigin(0.5);
    this.add
      .text(SCENE_W / 2, 56, 'press Tab to return to the city', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#5C6E8E',
      })
      .setOrigin(0.5);
  }

  private renderBranchLabels(): void {
    const branches = listBranches();
    const laneHeight = this.computeLaneHeight();
    for (let i = 0; i < branches.length; i++) {
      const y = PAD_Y + HEADER_HEIGHT + i * laneHeight + laneHeight / 2;
      this.add
        .text(8, y, branches[i]!, {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: '#F0EBD7',
        })
        .setOrigin(0, 0.5);

      // Faint lane separator at the top of each lane (except the first).
      if (i > 0) {
        this.add
          .rectangle(
            PAD_X,
            PAD_Y + HEADER_HEIGHT + i * laneHeight,
            SCENE_W - PAD_X * 2,
            1,
            0x3a4868,
          )
          .setOrigin(0, 0);
      }
    }
  }

  private renderMilestoneColumns(): void {
    const milestones = [1, 2, 3, 4, 5, 6, 7];
    const colWidth = this.computeColumnWidth();
    for (let i = 0; i < milestones.length; i++) {
      const x = PAD_X + i * colWidth;
      this.add
        .text(x + colWidth / 2, PAD_Y, `M${milestones[i]}`, {
          fontFamily: 'Pixellari, monospace',
          fontSize: '14px',
          color: '#FFC940',
        })
        .setOrigin(0.5, 0);
    }
  }

  private computeColumnWidth(): number {
    const usable = SCENE_W - PAD_X * 2;
    return Math.floor((usable - 6 * COLUMN_GAP) / 7);
  }

  private computeLaneHeight(): number {
    const branches = listBranches();
    if (branches.length === 0) return 60;
    const usable = this.scale.height - PAD_Y - HEADER_HEIGHT - 16;
    return Math.floor(usable / branches.length);
  }

  /**
   * Layout: each (milestone, branch) cell holds 0..N tech nodes stacked
   * vertically. We compute positions, then render the boxes.
   */
  private layoutAndRenderNodes(): void {
    const branches = listBranches();
    const branchIdx = new Map<string, number>();
    branches.forEach((b, i) => branchIdx.set(b, i));

    const colWidth = this.computeColumnWidth();
    const laneHeight = this.computeLaneHeight();

    // Group techs by (milestone, branch).
    const cellMap = new Map<string, TechEntry[]>();
    for (const t of listTechs()) {
      const key = `${t.milestone}|${t.branch}`;
      const arr = cellMap.get(key) ?? [];
      arr.push(t);
      cellMap.set(key, arr);
    }

    for (const t of listTechs()) {
      const lane = branchIdx.get(t.branch) ?? 0;
      const cellKey = `${t.milestone}|${t.branch}`;
      const cellTechs = cellMap.get(cellKey)!;
      const idxInCell = cellTechs.indexOf(t);

      const x = PAD_X + (t.milestone - 1) * colWidth + 4;
      // Position within lane: center base + stack offset.
      const laneTop = PAD_Y + HEADER_HEIGHT + lane * laneHeight;
      const y =
        laneTop +
        4 +
        idxInCell * (NODE_H + NODE_GAP_Y);

      const w = Math.min(NODE_W, colWidth - 8);

      this.renderNode(t, x, y, w);
    }
  }

  private renderNode(tech: TechEntry, x: number, y: number, w: number): void {
    const container = this.add.container(x, y);
    container.setDepth(2);

    const border = this.add
      .rectangle(0, 0, w, NODE_H, COLOR_LOCKED_BORDER)
      .setOrigin(0, 0);
    const fill = this.add
      .rectangle(2, 2, w - 4, NODE_H - 4, COLOR_LOCKED_FILL)
      .setOrigin(0, 0);
    container.add(border);
    container.add(fill);

    // Branch color stripe.
    const stripeColor = categoryColorInt(tech.branch) || 0x5c6e8e;
    const stripe = this.add
      .rectangle(2, 2, 4, NODE_H - 4, stripeColor)
      .setOrigin(0, 0);
    container.add(stripe);

    // Boss accent stripe on the right edge.
    if (tech.is_boss) {
      const bossStripe = this.add
        .rectangle(w - 6, 2, 4, NODE_H - 4, COLOR_BOSS_ACCENT)
        .setOrigin(0, 0);
      container.add(bossStripe);
    }

    const nameText = this.add
      .text(10, 6, this.truncate(tech.name, Math.floor((w - 14) / 6)), {
        fontFamily: 'Pixellari, monospace',
        fontSize: '12px',
        color: COLOR_LOCKED_TEXT,
      })
      .setOrigin(0, 0);
    container.add(nameText);

    const costStr = this.formatCost(tech.cost) || 'free';
    const costText = this.add
      .text(10, NODE_H - 16, costStr, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '7px',
        color: COLOR_LOCKED_TEXT,
      })
      .setOrigin(0, 0);
    container.add(costText);

    // Click hit area = fill rect.
    fill.setInteractive({ useHandCursor: true });
    fill.on('pointerover', () => this.onNodeHover(tech, x, y));
    fill.on('pointerout', () => this.tooltip?.setVisible(false));
    fill.on('pointerdown', () => void this.onNodeClick(tech));

    this.nodesById.set(tech.id, {
      tech,
      container,
      border,
      fill,
      nameText,
      costText,
      x,
      y,
    });

    // Initial state.
    this.refreshNodeRender(tech.id);
  }

  private truncate(s: string, max: number): string {
    if (s.length <= max) return s;
    return s.slice(0, Math.max(1, max - 1)) + '…';
  }

  private refreshNodeStates(): void {
    for (const id of this.nodesById.keys()) {
      this.refreshNodeRender(id);
    }
  }

  private refreshNodeRender(id: string): void {
    const n = this.nodesById.get(id);
    if (!n) return;

    const state = AppState.getState();
    const researched = new Set(state?.research.researched ?? []);

    if (researched.has(id)) {
      n.border.setFillStyle(COLOR_RESEARCHED_BORDER);
      n.fill.setFillStyle(COLOR_RESEARCHED_FILL);
      n.nameText.setColor(COLOR_RESEARCHED_TEXT);
      n.costText.setText('researched').setColor(COLOR_RESEARCHED_TEXT);
    } else if (isTechAvailable(id, researched)) {
      n.border.setFillStyle(COLOR_AVAIL_BORDER);
      n.fill.setFillStyle(COLOR_AVAIL_FILL);
      n.nameText.setColor(COLOR_AVAIL_TEXT);
      n.costText
        .setText(this.formatCost(n.tech.cost) || 'free')
        .setColor(COLOR_AVAIL_TEXT);
    } else {
      n.border.setFillStyle(COLOR_LOCKED_BORDER);
      n.fill.setFillStyle(COLOR_LOCKED_FILL);
      n.nameText.setColor(COLOR_LOCKED_TEXT);
      n.costText
        .setText(this.formatCost(n.tech.cost) || 'free')
        .setColor(COLOR_LOCKED_TEXT);
    }
  }

  private renderArrows(): void {
    this.arrows?.destroy();
    this.arrows = this.add.graphics().setDepth(1);

    for (const tech of listTechs()) {
      const dst = this.nodesById.get(tech.id);
      if (!dst) continue;
      for (const prereqId of tech.prereqs) {
        const src = this.nodesById.get(prereqId);
        if (!src) continue;
        this.drawArrow(src, dst);
      }
    }
  }

  private drawArrow(src: NodeRender, dst: NodeRender): void {
    if (!this.arrows) return;
    // Faint navy line by default.
    this.arrows.lineStyle(1, 0x3a4868, 0.55);
    const sx = src.x + NODE_W;
    const sy = src.y + NODE_H / 2;
    const dx = dst.x;
    const dy = dst.y + NODE_H / 2;
    // Simple bezier curve for cross-branch readability.
    const mid = (sx + dx) / 2;
    this.arrows.beginPath();
    this.arrows.moveTo(sx, sy);
    this.arrows.lineTo(mid, sy);
    this.arrows.lineTo(mid, dy);
    this.arrows.lineTo(dx, dy);
    this.arrows.strokePath();
  }

  private async onNodeClick(tech: TechEntry): Promise<void> {
    const state = AppState.getState();
    if (!state) return;
    const researched = new Set(state.research.researched);

    if (researched.has(tech.id)) return; // already done
    if (!isTechAvailable(tech.id, researched)) return; // locked

    // Affordability check.
    for (const [k, need] of Object.entries(tech.cost) as Array<[ResourceKey, number]>) {
      if ((state.resources[k] ?? 0) < need) {
        // Soft fail: flash the cost text red briefly.
        const n = this.nodesById.get(tech.id);
        n?.costText.setColor('#E84B4B');
        this.time.delayedCall(600, () => {
          if (n) this.refreshNodeRender(tech.id);
        });
        return;
      }
    }

    // Build follow-up text: what does researching this unlock?
    const followUp =
      tech.unlocks_buildings.length > 0
        ? `Unlocks ${tech.unlocks_buildings.slice(0, 2).join(', ')}.`
        : tech.enables_techs.length > 0
          ? `Opens ${tech.enables_techs.slice(0, 2).join(', ')}.`
          : 'The kingdom of science advances.';
    const voiced = voiceResearch(tech.name, followUp, `research:${tech.id}`);

    const updated: StoneWorldState = {
      ...state,
      resources: this.subtractCost(state.resources, tech.cost),
      research: {
        ...state.research,
        researched: [...state.research.researched, tech.id],
      },
      captain_log: this.appendLog(state.captain_log, voiced),
    };
    AppState.setState(updated);
    try {
      await saveState(updated);
    } catch (err) {
      console.error('[ResearchScene] save failed:', err);
    }

    // Visual: flash the node in green.
    const n = this.nodesById.get(tech.id);
    if (n) {
      this.tweens.add({
        targets: n.fill,
        alpha: { from: 0.3, to: 1 },
        duration: 200,
        yoyo: true,
      });
    }
    // refreshNodeStates fires via AppState subscription — cascades downstream.
  }

  private onNodeHover(tech: TechEntry, x: number, y: number): void {
    if (!this.tooltip) return;
    const prereqLine =
      tech.prereqs.length === 0
        ? 'prereqs: none'
        : `prereqs: ${tech.prereqs.join(', ')}`;
    const unlocksLine =
      tech.unlocks_buildings.length > 0
        ? `unlocks: ${tech.unlocks_buildings.join(', ')}`
        : '';
    const lines = [tech.name, `branch: ${tech.branch}`, prereqLine];
    if (unlocksLine) lines.push(unlocksLine);
    if (tech.is_boss) lines.push('★ milestone boss');
    this.tooltip
      .setText(lines.join('\n'))
      .setPosition(Math.min(x + NODE_W + 4, SCENE_W - 200), Math.max(8, y))
      .setVisible(true);
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
      .join('+');
  }

  private subtractCost(
    purse: Record<ResourceKey, number>,
    cost: Partial<Record<ResourceKey, number>>,
  ): Record<ResourceKey, number> {
    const next: Record<ResourceKey, number> = { ...purse };
    for (const [k, v] of Object.entries(cost) as Array<[ResourceKey, number]>) {
      next[k] = Math.max(0, (next[k] ?? 0) - v);
    }
    return next;
  }

  private appendLog(log: LogEntry[], entry: LogEntry): LogEntry[] {
    const next = [...log, entry];
    while (next.length > CAPTAIN_LOG_MAX) next.shift();
    return next;
  }

  private teardown(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.input.keyboard?.removeAllListeners('keydown-TAB');
  }
}

// Unused import shim — eliminates the noUnusedLocals warning when SIDEBAR_X
// is only referenced by future code paths.
void SIDEBAR_X;
void getTech;
