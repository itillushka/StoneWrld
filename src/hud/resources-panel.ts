import Phaser from 'phaser';
import type { ResourceKey, StoneWorldState } from '../state/schema';
import { computeCaps, isNearCap, NEAR_CAP_THRESHOLD } from '../economy/storage';

/**
 * Resources panel — the 5-counter readout at the top of the HUD sidebar.
 *
 * Per design/06-style §HUD components §1. Resources panel:
 *   Each row: icon + label + right-aligned numeral. Numerals in the
 *   resource's canonical color. On change, the new value briefly flashes
 *   KoS green (#7CD16A) so the eye catches the tick.
 *
 * Icons:
 *   The design doc uses emoji (📚🔭⛓⚡🏁) but Press Start 2P has no emoji
 *   glyphs. Phaser's canvas2D text rendering's fallback chain for color
 *   emoji is unreliable across browsers. For Phase 3 we use one-letter
 *   labels (K D I N C) in the resource's color — clear, pixel-perfect,
 *   matches the design's color-as-cue intent. Real emoji return in Phase 9
 *   via the HTML-overlay speech bubble.
 */

interface RowSpec {
  key: ResourceKey;
  label: string;
  fullName: string;
  color: string;
}

/** Per-resource colors locked in design/06-style §Per-resource color. */
const ROWS: readonly RowSpec[] = [
  { key: 'knowledge', label: 'K', fullName: 'Knowledge', color: '#FFC940' },
  { key: 'discovery', label: 'D', fullName: 'Discovery', color: '#3DCBE3' },
  { key: 'iron', label: 'I', fullName: 'Iron', color: '#A8ADB4' },
  { key: 'innovation', label: 'N', fullName: 'Innovation', color: '#FFE680' },
  { key: 'completion', label: 'C', fullName: 'Completion', color: '#7CD16A' },
] as const;

const ROW_HEIGHT = 28;
const PANEL_PAD_X = 16;

/** Format integers with thousand separators — "1,284" reads better than "1284". */
function formatNumber(n: number): string {
  return Math.floor(n).toLocaleString('en-US');
}

interface RowGameObjects {
  label: Phaser.GameObjects.Text;
  value: Phaser.GameObjects.Text;
  /** Last value we rendered — used to detect ticks for the flash highlight. */
  lastValue: number;
  /** Optional fill-bar widgets — only created when the row first hits near-cap. */
  fillTrack?: Phaser.GameObjects.Rectangle;
  fillFill?: Phaser.GameObjects.Rectangle;
  fillLabel?: Phaser.GameObjects.Text;
  /** Width that the fillTrack spans. */
  fillBarWidth?: number;
  /** Y baseline of the fill-bar group (relative to panel container). */
  fillBarY?: number;
}

export class ResourcesPanel {
  /** Public so UIScene can reparent the panel into the sidebar Container
   * for synchronized resize-anchoring. */
  public readonly container: Phaser.GameObjects.Container;
  private readonly rows = new Map<ResourceKey, RowGameObjects>();

  /**
   * @param scene  The Phaser scene that owns the panel objects.
   * @param x      Sidebar left edge (e.g. 1024 for a 256-wide HUD on the right).
   * @param y      Top of the panel within the sidebar.
   * @param width  Panel width (typically the full sidebar width, e.g. 256).
   */
  constructor(scene: Phaser.Scene, x: number, y: number, width: number) {
    this.container = scene.add.container(x, y);

    // Faint separator under the (eventually) Mecha Senku portrait.
    // We render it inside the panel so the sidebar can stack widgets cleanly.
    const sep = scene.add.rectangle(PANEL_PAD_X, 0, width - PANEL_PAD_X * 2, 1, 0x3a4868);
    sep.setOrigin(0, 0.5);
    this.container.add(sep);

    ROWS.forEach((row, i) => {
      const rowY = 16 + i * ROW_HEIGHT;

      // Icon-label in resource color (the K / D / I / N / C letter).
      const labelGo = scene.add.text(PANEL_PAD_X, rowY, row.label, {
        fontFamily: 'Pixellari, monospace',
        fontSize: '20px',
        color: row.color,
      });
      labelGo.setOrigin(0, 0.5);

      // Full name in cream — sits between label and numeral.
      const nameGo = scene.add.text(PANEL_PAD_X + 28, rowY, row.fullName, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#F0EBD7',
      });
      nameGo.setOrigin(0, 0.5);

      // Numeral, right-aligned to the panel's right edge minus padding.
      const valueGo = scene.add.text(width - PANEL_PAD_X, rowY, '0', {
        fontFamily: 'Pixellari, monospace',
        fontSize: '20px',
        color: row.color,
      });
      valueGo.setOrigin(1, 0.5); // right-anchored

      this.container.add([labelGo, nameGo, valueGo]);
      this.rows.set(row.key, {
        label: labelGo,
        value: valueGo,
        lastValue: 0,
        fillBarY: rowY + ROW_HEIGHT / 2 + 4,
        fillBarWidth: width - PANEL_PAD_X * 2,
      });
    });
  }

  /**
   * Apply a fresh state to the panel. Numerals that changed since the
   * last update briefly flash KoS green to draw the eye, then return
   * to their canonical color.
   *
   * Phase 10 addition: fill bars appear beneath rows whose resource is
   * within 10% of its silo cap. Bar turns red when fully at cap.
   */
  update(state: StoneWorldState, scene: Phaser.Scene): void {
    const caps = computeCaps(state.buildings);

    for (const row of ROWS) {
      const go = this.rows.get(row.key);
      if (!go) continue;

      const current = state.resources[row.key] ?? 0;
      const cap = caps[row.key] ?? 0;

      if (current !== go.lastValue) {
        go.value.setText(formatNumber(current));
        if (current > go.lastValue) {
          this.flash(go.value, row.color, scene);
        }
        go.lastValue = current;
      }

      // Cap-aware fill bar — show / hide / update based on threshold.
      this.updateFillBar(scene, go, current, cap, row.color);
    }
  }

  private updateFillBar(
    scene: Phaser.Scene,
    go: RowGameObjects,
    current: number,
    cap: number,
    rowColor: string,
  ): void {
    const showBar = isNearCap(current, cap);
    if (!showBar) {
      go.fillTrack?.destroy();
      go.fillFill?.destroy();
      go.fillLabel?.destroy();
      go.fillTrack = undefined;
      go.fillFill = undefined;
      go.fillLabel = undefined;
      return;
    }

    const atCap = current >= cap;
    const fraction = Math.min(1, current / cap);
    const totalW = go.fillBarWidth ?? 100;
    const filledW = Math.max(2, Math.round(totalW * fraction));
    const barY = go.fillBarY ?? 0;
    const trackColor = 0x3a4868; // inactive grey
    const fillColor = atCap ? 0xe84b4b : 0xf0a030; // red at cap, amber tight

    if (!go.fillTrack) {
      go.fillTrack = scene.add
        .rectangle(PANEL_PAD_X, barY, totalW, 4, trackColor)
        .setOrigin(0, 0);
      this.container.add(go.fillTrack);
    }
    if (!go.fillFill) {
      go.fillFill = scene.add
        .rectangle(PANEL_PAD_X, barY, filledW, 4, fillColor)
        .setOrigin(0, 0);
      this.container.add(go.fillFill);
    } else {
      go.fillFill.width = filledW;
      go.fillFill.setFillStyle(fillColor);
    }
    const pct = Math.round(fraction * 100);
    const labelText = `${pct}% of ${formatNumber(cap)}`;
    if (!go.fillLabel) {
      go.fillLabel = scene.add
        .text(PANEL_PAD_X, barY + 6, labelText, {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '6px',
          color: atCap ? '#E84B4B' : '#F0A030',
        })
        .setOrigin(0, 0);
      this.container.add(go.fillLabel);
    } else {
      go.fillLabel.setText(labelText);
      go.fillLabel.setColor(atCap ? '#E84B4B' : '#F0A030');
    }
    void rowColor;
  }

  /** Threshold accessor exposed for tests / sanity checks. */
  static get nearCapThreshold(): number {
    return NEAR_CAP_THRESHOLD;
  }

  /** Brief tween: green flash → fade back to canonical color over 600ms. */
  private flash(text: Phaser.GameObjects.Text, restoreColor: string, scene: Phaser.Scene): void {
    text.setColor('#7CD16A'); // KoS green
    scene.tweens.add({
      targets: text,
      alpha: { from: 1, to: 0.65 },
      duration: 200,
      yoyo: true,
      onComplete: () => {
        text.setColor(restoreColor);
        text.setAlpha(1);
      },
    });
  }

  /** Total height the panel occupies — useful to stack the next HUD widget below. */
  static get height(): number {
    return 16 + ROWS.length * ROW_HEIGHT + 16;
  }
}
