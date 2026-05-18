import Phaser from 'phaser';
import { AppState } from '../state/app-state';
import { ResourcesPanel } from '../hud/resources-panel';
import type { StoneWorldState } from '../state/schema';

/**
 * UIScene — the persistent HUD overlay.
 *
 * Per design/08-architecture §Per-scene responsibility:
 *   Renders the 256-px sidebar on the right edge of the canvas. Persists
 *   across CityScene ↔ ResearchScene transitions (Phase 8). Always on top
 *   of the city / research scenes, always under ModalScene (Phase 5).
 *
 * Phase 3 (this iteration):
 *   - Sidebar background (surface navy)
 *   - Mecha Senku inline portrait placeholder at the top
 *   - ResourcesPanel — 5 live counters that poll state every 5s
 *   - Footer with milestone + version
 *
 * Phases 7 / 8 / 9 / 13 add the Networks panel, action buttons, Captain's Log
 * scrollback, and overlay-toggle panel respectively.
 */
export class UIScene extends Phaser.Scene {
  /** Sidebar geometry — locked in design/05-map §HUD layout. */
  public static readonly SIDEBAR_X = 1024;
  public static readonly SIDEBAR_WIDTH = 256;

  /** Polling interval per design/09-roadmap §Phase 3. */
  private static readonly POLL_INTERVAL_MS = 5000;

  private resourcesPanel?: ResourcesPanel;
  private statusText?: Phaser.GameObjects.Text;
  private pollTimer?: Phaser.Time.TimerEvent;
  private unsubscribe?: () => void;

  constructor() {
    super('UIScene');
  }

  create(): void {
    const sidebarX = UIScene.SIDEBAR_X;
    const sidebarW = UIScene.SIDEBAR_WIDTH;
    const sidebarH = this.scale.height;

    // Sidebar background — surface navy per design/06-style §Core surfaces.
    this.add
      .rectangle(sidebarX, 0, sidebarW, sidebarH, 0x1b2d5c)
      .setOrigin(0, 0);

    // Faint left edge separator vs the game canvas.
    this.add
      .rectangle(sidebarX, 0, 1, sidebarH, 0x3a4868)
      .setOrigin(0, 0);

    this.buildMechaSenkuPlaceholder(sidebarX, sidebarW);
    this.buildResourcesPanel(sidebarX, sidebarW);
    this.buildFooter(sidebarX, sidebarW, sidebarH);

    // Subscribe to AppState. When state updates (from poll or other source),
    // re-render dependent HUD widgets. The subscribe call also fires
    // synchronously with the current state if one is loaded — first paint
    // is already correct.
    this.unsubscribe = AppState.subscribe((state) => this.applyState(state));

    // Start polling. The interval is reset on every scene-restart (the
    // shutdown handler cleans the timer below).
    this.pollTimer = this.time.addEvent({
      delay: UIScene.POLL_INTERVAL_MS,
      callback: () => this.poll(),
      loop: true,
    });

    // Belt-and-suspenders cleanup so a Phaser scene reset doesn't leak
    // intervals or zombie subscriptions.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.teardown());
  }

  private buildMechaSenkuPlaceholder(sidebarX: number, sidebarW: number): void {
    // Phase 9 brings the real 128×192 robot-Senku sprite. For now: a
    // gold rectangle stand-in so the layout is final.
    const portraitW = 64;
    const portraitH = 96;
    const px = sidebarX + (sidebarW - portraitW) / 2;
    const py = 16;

    this.add.rectangle(px, py, portraitW, portraitH, 0xffc940).setOrigin(0, 0);
    this.add
      .text(px + portraitW / 2, py + portraitH / 2 - 4, 'MS', {
        fontFamily: 'Pixellari, monospace',
        fontSize: '24px',
        color: '#0A1228',
      })
      .setOrigin(0.5);
    this.add
      .text(px + portraitW / 2, py + portraitH + 8, 'Mecha Senku', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#F0EBD7',
      })
      .setOrigin(0.5);
    this.add
      .text(px + portraitW / 2, py + portraitH + 22, '(Phase 9 sprite)', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '6px',
        color: '#5C6E8E',
      })
      .setOrigin(0.5);
  }

  private buildResourcesPanel(sidebarX: number, sidebarW: number): void {
    // Place panel below the Mecha Senku portrait block (~ y = 16 + 96 + 32).
    const panelY = 16 + 96 + 32;
    this.resourcesPanel = new ResourcesPanel(this, sidebarX, panelY, sidebarW);
  }

  private buildFooter(sidebarX: number, sidebarW: number, sidebarH: number): void {
    // Footer: milestone label + small status indicator updated on each poll.
    this.statusText = this.add
      .text(sidebarX + sidebarW / 2, sidebarH - 16, 'milestone: …', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '6px',
        color: '#5C6E8E',
        align: 'center',
      })
      .setOrigin(0.5);
  }

  private applyState(state: StoneWorldState): void {
    this.resourcesPanel?.update(state, this);
    if (this.statusText) {
      this.statusText.setText(
        `milestone: ${state.milestone}\n` +
          `buildings: ${state.buildings.length} · ` +
          `v${state.version} · poll 5s`,
      );
    }
  }

  /**
   * Poll state.json once. If it changed, AppState.refresh() fires the
   * subscribe callback which calls applyState — no need to handle the
   * "changed" return value here.
   *
   * On polling errors (network blip, dev server restart), log loud but
   * don't crash — the next poll will retry. This matches design/02-game-logic
   * §"surface failures plainly first" — visible-to-console, not silent.
   */
  private async poll(): Promise<void> {
    try {
      await AppState.refresh();
    } catch (err) {
      console.warn('[UIScene] poll failed:', err);
    }
  }

  private teardown(): void {
    this.pollTimer?.remove();
    this.pollTimer = undefined;
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }
}
