import Phaser from 'phaser';
import type { LogEntry } from '../state/schema';
import { classifyLogEntry } from './voice';

/**
 * Mecha Senku speech bubble — bottom-left canvas overlay.
 *
 * Per design/06-style §Speech bubble system:
 *   - 480 × 72 raised-navy bubble with 2-pixel border in the event's
 *     accent color (gold for build, green for research, red for brownout, etc.)
 *   - Persists 6 s for operational-only messages, 10 s when a factoid is
 *     attached (Phase 12 brings real factoids).
 *   - Click to dismiss → moves into the Captain's Log scrollback.
 *   - Latest message wins — a new event replaces whatever was showing.
 *
 * Phase 9 ships with the static placeholder sprite + 11 voice templates.
 * Real 26-frame emotion animation lands when the parallel asset track
 * delivers the full sprite sheet — the swap is a one-module change here
 * (just animate the sprite's frame index in setEntry).
 */

const BUBBLE_PERSISTENCE_MS = 6000;
const BUBBLE_FADE_OUT_MS = 800;
// Portrait + bubble doubled relative to the v1 84/480-wide sizing per
// co-captain's "way bigger" request. Source sprite scales 2× to 168px
// via nearest-neighbour (keeps pixel-art sharp).
const PORTRAIT_DISPLAY_SIZE = 168;
const BUBBLE_WIDTH = 900;
const BUBBLE_HEIGHT = 168;

export interface SpeechBubbleOptions {
  /** Anchor x in canvas pixels (top-left of the portrait+bubble). */
  x: number;
  /** Anchor y in canvas pixels (top of the portrait). */
  y: number;
}

export class SpeechBubble {
  private scene: Phaser.Scene;
  private portrait: Phaser.GameObjects.Image;
  private bubbleBg: Phaser.GameObjects.Rectangle;
  private bubbleLabel: Phaser.GameObjects.Text;
  private bubbleBody: Phaser.GameObjects.Text;
  private container: Phaser.GameObjects.Container;
  private fadeTween?: Phaser.Tweens.Tween;
  private hideTimer?: Phaser.Time.TimerEvent;
  private currentEntry: LogEntry | null = null;
  private clickHandler: (() => void) | null = null;

  constructor(scene: Phaser.Scene, opts: SpeechBubbleOptions) {
    this.scene = scene;

    // Container holds the portrait + bubble together, anchored in screen
    // space (scrollFactor 0) so it doesn't pan with the camera. Lives in
    // UIScene now (per co-captain) so it overlays both CityScene and
    // ResearchScene at the same layer as the sidebar.
    this.container = scene.add.container(opts.x, opts.y);
    this.container.setDepth(100).setScrollFactor(0);

    // Portrait — Mecha Senku 168×168 (2× the native 84px source via
    // nearest-neighbour, stays pixel-sharp).
    this.portrait = scene.add
      .image(0, 0, 'mecha-senku-placeholder')
      .setOrigin(0, 0)
      .setDisplaySize(PORTRAIT_DISPLAY_SIZE, PORTRAIT_DISPLAY_SIZE);
    this.container.add(this.portrait);

    // Bubble background — to the right of the portrait, sized to fit the
    // doubled portrait height.
    const bubbleX = PORTRAIT_DISPLAY_SIZE + 16;
    this.bubbleBg = scene.add
      .rectangle(bubbleX, 0, BUBBLE_WIDTH, BUBBLE_HEIGHT, 0x0f1f4d)
      .setOrigin(0, 0)
      .setStrokeStyle(4, 0xffc940);
    this.container.add(this.bubbleBg);

    // Heading label inside the bubble — 32px Pixellari (2× native).
    this.bubbleLabel = scene.add
      .text(bubbleX + 20, 16, 'Mecha Senku', {
        fontFamily: 'Pixellari, monospace',
        fontSize: '32px',
        color: '#FFC940',
      })
      .setOrigin(0, 0);
    this.container.add(this.bubbleLabel);

    // Operational body line — 16px Press Start 2P (2× native), word-wrapped
    // to bubble width with generous line spacing.
    this.bubbleBody = scene.add
      .text(bubbleX + 20, 64, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '16px',
        color: '#F0EBD7',
        wordWrap: { width: BUBBLE_WIDTH - 40 },
        lineSpacing: 8,
      })
      .setOrigin(0, 0);
    this.container.add(this.bubbleBody);

    // Click-to-dismiss on the bubble.
    this.bubbleBg.setInteractive({ useHandCursor: true });
    this.bubbleBg.on('pointerdown', () => {
      if (this.currentEntry) this.clickHandler?.();
      this.hideNow();
    });

    // Start fully hidden — bubble only appears when setEntry() fires
    // (e.g. build / upgrade / brownout / research). Per co-captain's
    // request: pop on event, disappear after 6s, stay invisible otherwise.
    this.container.setAlpha(0);
    this.container.setVisible(false);
  }

  /** Register a callback fired when the player click-dismisses a real entry. */
  onDismiss(fn: () => void): void {
    this.clickHandler = fn;
  }

  /** Show a captain-log entry — replaces whatever's showing. */
  setEntry(entry: LogEntry): void {
    this.currentEntry = entry;
    const { accentColor } = classifyLogEntry(entry);

    this.bubbleBg.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(accentColor).color);
    this.bubbleLabel.setColor(accentColor);
    this.bubbleBody
      .setText(entry.operational)
      .setColor('#F0EBD7');

    // Pop in: container becomes visible + fades from 0 → 1 over 200ms.
    this.fadeTween?.stop();
    this.hideTimer?.remove();
    this.container.setVisible(true);
    this.fadeTween = this.scene.tweens.add({
      targets: this.container,
      alpha: { from: 0, to: 1 },
      duration: 200,
      ease: 'Cubic.easeOut',
    });

    // Schedule fade-out + hide.
    this.hideTimer = this.scene.time.delayedCall(BUBBLE_PERSISTENCE_MS, () =>
      this.fadeOut(),
    );
  }

  private fadeOut(): void {
    this.fadeTween = this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: BUBBLE_FADE_OUT_MS,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        // Fully invisible AND non-interactive once the tween settles.
        this.container.setVisible(false);
      },
    });
  }

  private hideNow(): void {
    this.hideTimer?.remove();
    this.hideTimer = undefined;
    this.fadeTween?.stop();
    this.fadeTween = undefined;
    this.container.setAlpha(0).setVisible(false);
  }

  /** Allow CityScene to reposition on window resize. */
  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  destroy(): void {
    this.hideTimer?.remove();
    this.fadeTween?.stop();
    this.container.destroy();
  }
}
