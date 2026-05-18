import Phaser from 'phaser';
import type { ResourceKey, StoneWorldState } from '../state/schema';

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
}

export class ResourcesPanel {
  private readonly container: Phaser.GameObjects.Container;
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
      this.rows.set(row.key, { label: labelGo, value: valueGo, lastValue: 0 });
    });
  }

  /**
   * Apply a fresh state to the panel. Numerals that changed since the
   * last update briefly flash KoS green to draw the eye, then return
   * to their canonical color.
   */
  update(state: StoneWorldState, scene: Phaser.Scene): void {
    for (const row of ROWS) {
      const go = this.rows.get(row.key);
      if (!go) continue;

      const current = state.resources[row.key] ?? 0;
      if (current === go.lastValue) {
        continue; // no change → skip
      }

      go.value.setText(formatNumber(current));

      // Flash highlight if the value INCREASED (the common case from hook ticks).
      // Decrements (player spends in later phases) get no highlight — different cue.
      if (current > go.lastValue) {
        this.flash(go.value, row.color, scene);
      }
      go.lastValue = current;
    }
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
