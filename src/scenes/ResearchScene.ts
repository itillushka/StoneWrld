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
import { compactN } from '../hud/format';

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

const HUD_SIDEBAR_WIDTH = 256; // matches UIScene.SIDEBAR_WIDTH

// Layout constants — tuned for ~85 nodes across a viewport up to ~1500px wide.
const PAD_X = 32;
const PAD_Y = 64;
const COLUMN_GAP = 4;
const NODE_W = 110;
const NODE_H = 34;          // tighter than v1 (was 44) to fit dense cells
const NODE_GAP_Y = 4;
const HEADER_HEIGHT = 24;
const LANE_LABEL_HEIGHT = 16;
const MIN_LANE_HEIGHT = 44;

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
  x: number; // top-left x (in scrollable content space, NOT screen space)
  y: number; // top-left y
}


/**
 * One drawn arrow connecting two tech nodes. We keep a Graphics object
 * per arrow so we can re-style individual arrows for hover-highlight
 * without redrawing the whole edge set.
 */
interface ArrowRender {
  srcId: string;
  dstId: string;
  graphics: Phaser.GameObjects.Graphics;
  /** Default color (source branch color) when no node is hovered. */
  baseColor: number;
}

export class ResearchScene extends Phaser.Scene {
  private nodesById = new Map<string, NodeRender>();
  private arrows: ArrowRender[] = [];
  /** Index: arrows arriving at this dst — used for hover-highlight. */
  private arrowsByDst = new Map<string, ArrowRender[]>();
  /** Index: arrows leaving this src — used for hover-highlight. */
  private arrowsBySrc = new Map<string, ArrowRender[]>();
  private tooltip?: Phaser.GameObjects.Text;
  private unsubscribe?: () => void;
  /** Holds all scrollable content (lanes, columns, nodes, arrows). */
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
    super('ResearchScene');
  }

  /** Game-viewport width = window width minus the right-anchored HUD sidebar. */
  private viewportWidth(): number {
    return Math.max(320, this.scale.width - HUD_SIDEBAR_WIDTH);
  }

  create(): void {
    // Clip the main camera to the game viewport (HUD sits on top via UIScene).
    this.cameras.main.setViewport(0, 0, this.viewportWidth(), this.scale.height);

    this.scale.on('resize', this.onResize, this);
    this.cameras.main.setBackgroundColor('#0A1228');

    // Static header at the top of the viewport (above the scroll region).
    this.renderHeader();

    // Scrollable content holds lanes, milestone columns, nodes, arrows.
    const contentTop = PAD_Y;
    this.contentContainer = this.add.container(0, contentTop);
    this.contentContainer.setDepth(2);

    this.renderBranchLabels();
    this.renderMilestoneColumns();
    this.layoutAndRenderNodes();
    this.renderArrows();

    this.setupScroll(contentTop);

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
    // Opaque background bar so scrolled content (milestone-column labels)
    // doesn't bleed through the static header. Per screenshot 04: without
    // this mask, the M1-M7 labels were visible behind the "Research" title.
    this.add
      .rectangle(0, 0, this.viewportWidth(), PAD_Y, 0x0a1228, 1)
      .setOrigin(0, 0)
      .setDepth(50);
    this.add
      .rectangle(0, PAD_Y - 1, this.viewportWidth(), 1, 0x3a4868)
      .setOrigin(0, 0)
      .setDepth(50);

    this.add
      .text(this.viewportWidth() / 2, 24, 'Research', {
        fontFamily: 'Pixellari, monospace',
        fontSize: '32px',
        color: '#FFC940',
      })
      .setOrigin(0.5)
      .setDepth(51);
    this.add
      .text(this.viewportWidth() / 2, 56, 'press Tab to return to the city', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#5C6E8E',
      })
      .setOrigin(0.5)
      .setDepth(51);
  }

  private renderBranchLabels(): void {
    if (!this.contentContainer) return;
    const branches = listBranches();
    const laneHeight = this.computeLaneHeight();
    for (let i = 0; i < branches.length; i++) {
      // Lane Y is relative to contentContainer (which is at y = PAD_Y).
      const laneTop = HEADER_HEIGHT + i * laneHeight;

      // Lane label in the branch's canonical color — gives the player
      // a quick visual anchor that matches the arrow color (see drawArrow).
      const branchColor = categoryColorInt(branches[i]!) || 0xf0ebd7;
      const colorHex = `#${branchColor.toString(16).padStart(6, '0')}`;
      const label = this.add
        .text(8, laneTop + LANE_LABEL_HEIGHT / 2, branches[i]!, {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: colorHex,
        })
        .setOrigin(0, 0.5);
      this.contentContainer.add(label);
      // Lane separators removed per co-captain — frees up visual space
      // for the arrow ribbons.
    }
  }

  private renderMilestoneColumns(): void {
    if (!this.contentContainer) return;
    const milestones = [1, 2, 3, 4, 5, 6, 7];
    const colWidth = this.computeColumnWidth();
    for (let i = 0; i < milestones.length; i++) {
      const x = PAD_X + i * colWidth;
      const label = this.add
        .text(x + colWidth / 2, 0, `M${milestones[i]}`, {
          fontFamily: 'Pixellari, monospace',
          fontSize: '14px',
          color: '#FFC940',
        })
        .setOrigin(0.5, 0);
      this.contentContainer.add(label);
    }
  }

  private computeColumnWidth(): number {
    const usable = this.viewportWidth() - PAD_X * 2;
    return Math.floor((usable - 6 * COLUMN_GAP) / 7);
  }

  /**
   * Dynamic lane height — accommodates the densest (milestone, branch) cell.
   * If the densest cell has N techs, the lane must fit N nodes vertically
   * stacked, plus label + padding. Earlier version divided viewport
   * height by branch count, which crushed dense cells.
   */
  private computeLaneHeight(): number {
    let maxDensity = 1;
    const counter = new Map<string, number>();
    for (const t of listTechs()) {
      const key = `${t.milestone}|${t.branch}`;
      const c = (counter.get(key) ?? 0) + 1;
      counter.set(key, c);
      if (c > maxDensity) maxDensity = c;
    }
    const needed = LANE_LABEL_HEIGHT + maxDensity * (NODE_H + NODE_GAP_Y) + NODE_GAP_Y * 2;
    return Math.max(MIN_LANE_HEIGHT, needed);
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
      // Y is RELATIVE to contentContainer (which is offset by PAD_Y).
      // No PAD_Y added here — contentContainer's own y handles the offset.
      const laneTop = HEADER_HEIGHT + lane * laneHeight + LANE_LABEL_HEIGHT;
      const y = laneTop + idxInCell * (NODE_H + NODE_GAP_Y);

      const w = Math.min(NODE_W, colWidth - 8);

      this.renderNode(t, x, y, w);
    }
  }

  private renderNode(tech: TechEntry, x: number, y: number, w: number): void {
    if (!this.contentContainer) return;
    const container = this.add.container(x, y);
    container.setDepth(2);
    this.contentContainer.add(container);

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
    fill.on('pointerover', () => {
      this.onNodeHover(tech, x, y);
      // Brighten arrows touching this node; dim everything else so the
      // player can read THIS tech's prereq chain clearly.
      this.restyleAllArrows(tech.id);
    });
    fill.on('pointerout', () => {
      this.tooltip?.setVisible(false);
      // Restore default styling.
      this.restyleAllArrows(null);
    });
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
    if (!this.contentContainer) return;
    // Tear down any previous arrows.
    for (const a of this.arrows) a.graphics.destroy();
    this.arrows = [];
    this.arrowsByDst.clear();
    this.arrowsBySrc.clear();

    for (const tech of listTechs()) {
      const dst = this.nodesById.get(tech.id);
      if (!dst) continue;
      for (const prereqId of tech.prereqs) {
        const src = this.nodesById.get(prereqId);
        if (!src) continue;
        this.createArrow(src, dst);
      }
    }
    // Initial render at default styling (no hovered node).
    this.restyleAllArrows(null);
  }

  /** Create the per-arrow Graphics object + index it. */
  private createArrow(src: NodeRender, dst: NodeRender): void {
    if (!this.contentContainer) return;
    const baseColor = categoryColorInt(src.tech.branch) || 0x7a8ca8;
    const g = this.add.graphics().setDepth(1);
    this.contentContainer.add(g);

    const ar: ArrowRender = {
      srcId: src.tech.id,
      dstId: dst.tech.id,
      graphics: g,
      baseColor,
    };
    this.arrows.push(ar);
    this.arrowsByDst.set(dst.tech.id, [...(this.arrowsByDst.get(dst.tech.id) ?? []), ar]);
    this.arrowsBySrc.set(src.tech.id, [...(this.arrowsBySrc.get(src.tech.id) ?? []), ar]);
  }

  /**
   * Apply default / highlighted styling to every arrow based on which
   * node (if any) is currently hovered:
   *
   *   - No hover            → all arrows at their default branch color, alpha 0.55
   *   - Hovering tech T     → arrows touching T painted bright + opaque;
   *                           ALL other arrows dimmed to alpha 0.1.
   *
   * Bezier curve from src's right-mid to dst's left-mid, with control
   * points offset horizontally so cross-lane arrows arc smoothly instead
   * of zig-zagging through orthogonal corners.
   *
   * Arrowhead is a small triangle at the destination side.
   */
  private restyleAllArrows(hoveredId: string | null): void {
    // Default-view arrows are intentionally faint — with ~85 nodes and
    // many cross-branch prereqs the graph is dense by nature; we rely on
    // HOVER-HIGHLIGHT to make any specific tech's chain readable.
    const dimAlpha = 0.08;
    const baseAlpha = 0.28;
    const highlightAlpha = 1.0;
    const highlightColor = 0xffc940; // captain gold for the focused chain

    const touched = new Set<string>();
    if (hoveredId) {
      for (const a of this.arrowsByDst.get(hoveredId) ?? []) touched.add(this.arrowKey(a));
      for (const a of this.arrowsBySrc.get(hoveredId) ?? []) touched.add(this.arrowKey(a));
    }

    for (const ar of this.arrows) {
      const isTouched = touched.has(this.arrowKey(ar));
      const color = isTouched ? highlightColor : ar.baseColor;
      const alpha = hoveredId === null
        ? baseAlpha
        : isTouched
          ? highlightAlpha
          : dimAlpha;
      const lineWidth = isTouched ? 2.5 : 1;
      this.drawArrowGraphics(ar, color, alpha, lineWidth);
    }
  }

  private arrowKey(a: ArrowRender): string {
    return `${a.srcId}→${a.dstId}`;
  }

  private drawArrowGraphics(
    ar: ArrowRender,
    color: number,
    alpha: number,
    lineWidth: number,
  ): void {
    const src = this.nodesById.get(ar.srcId);
    const dst = this.nodesById.get(ar.dstId);
    if (!src || !dst) return;

    // Integer-aligned endpoints — keeps the orthogonal segments pixel-sharp
    // (no anti-alias smear on horizontal / vertical lines).
    const sx = Math.round(src.x + NODE_W);
    const sy = Math.round(src.y + NODE_H / 2);
    const dx = Math.round(dst.x);
    const dy = Math.round(dst.y + NODE_H / 2);

    // Fan-out: each outgoing arrow from a source gets a slightly different
    // turn-x so multiple arrows don't stack on top of each other along the
    // shared vertical run. Index by the arrow's position in this source's
    // outgoing list — small offset (3 px per arrow) keeps the fan tight.
    const outgoing = this.arrowsBySrc.get(ar.srcId) ?? [];
    const fanIndex = outgoing.indexOf(ar);
    const exitOffset = 6 + fanIndex * 3;

    const g = ar.graphics;
    g.clear();

    // Three-segment orthogonal path: right-out, vertical, right-in.
    // Pixel-art friendly: 90° corners only, no curves.
    const turnX = sx + exitOffset;
    g.lineStyle(lineWidth, color, alpha);
    g.beginPath();
    g.moveTo(sx, sy);
    g.lineTo(turnX, sy);
    g.lineTo(turnX, dy);
    g.lineTo(dx, dy);
    g.strokePath();

    // Arrowhead — chunky pixel triangle. Integer coords ensure crisp edges.
    const head = lineWidth >= 2 ? 5 : 4;
    g.fillStyle(color, alpha);
    g.fillTriangle(
      dx, dy,
      dx - head, dy - head,
      dx - head, dy + head,
    );
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
    // Speech bubble (now in UIScene overlay) shows the message on top of
    // ResearchScene as well — no need to Tab back to City to see it.
    this.game.events.emit('bubble:show', voiced);
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
      .setPosition(Math.min(x + NODE_W + 4, this.viewportWidth() - 200), Math.max(8, y))
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
      .map(([k, v]) => `${compactN(v)}${labels[k as ResourceKey]}`)
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

  /**
   * Set up vertical scroll for the contentContainer. The dense-cell lane
   * height can blow past the viewport, so we add a wheel handler that
   * translates the container's Y, clamped to keep at least one row visible.
   */
  private setupScroll(contentTop: number): void {
    if (!this.contentContainer) return;
    const branches = listBranches();
    const totalContentHeight =
      HEADER_HEIGHT + branches.length * this.computeLaneHeight() + 32;
    const visibleH = this.scale.height - contentTop - 16;

    this.contentMinY = contentTop;
    this.contentMaxY = Math.min(contentTop, contentTop - (totalContentHeight - visibleH));

    if (totalContentHeight <= visibleH) {
      return; // no overflow → no scroll needed
    }

    this.wheelHandler = (
      _pointer: Phaser.Input.Pointer,
      _objs: unknown,
      _dx: number,
      dy: number,
    ) => {
      if (!this.contentContainer) return;
      const step = Math.sign(dy) * 48;
      const next = this.contentContainer.y - step;
      this.contentContainer.y = Phaser.Math.Clamp(next, this.contentMaxY, this.contentMinY);
    };
    this.input.on('wheel', this.wheelHandler);

    // Tiny hint at the bottom of the viewport.
    this.add
      .text(this.viewportWidth() / 2, this.scale.height - 8, 'scroll wheel to see more', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '6px',
        color: '#5C6E8E',
      })
      .setOrigin(0.5, 1);
  }

  /**
   * Window resize handler — re-clip camera. The tree layout uses
   * viewportWidth() dynamically already, but already-drawn nodes don't
   * re-layout. For now we accept a stale layout on resize; the
   * player can press Tab and come back for a fresh paint if needed.
   */
  private onResize(): void {
    this.cameras.main.setViewport(0, 0, this.viewportWidth(), this.scale.height);
  }

  private teardown(): void {
    this.scale.off('resize', this.onResize, this);
    if (this.wheelHandler) {
      this.input.off('wheel', this.wheelHandler);
      this.wheelHandler = undefined;
    }
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.input.keyboard?.removeAllListeners('keydown-TAB');
  }
}

// Keep getTech reference live — it's exposed for future per-node tooltip
// enrichment; suppress the unused-import warning until that lands.
void getTech;
void HUD_SIDEBAR_WIDTH;
