import Phaser from 'phaser';
import { AppState } from '../state/app-state';
import { ResourcesPanel } from '../hud/resources-panel';
import type { StoneWorldState } from '../state/schema';
import type { NetworkAnalysis } from '../economy/network';

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
  private networksText?: Phaser.GameObjects.Text;
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
    this.buildNetworksPanel(sidebarX, sidebarW);
    this.buildActionButtons(sidebarX, sidebarW);
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

  /**
   * Networks panel — per design/06-style §HUD components §2. Lists each
   * active power network with its capacity/demand state, plus an off-grid
   * count at the bottom (red if non-zero).
   *
   * Phase 7 ships the panel with live data. The Phase 3 stub is gone.
   */
  private buildNetworksPanel(sidebarX: number, sidebarW: number): void {
    const panelTop = 16 + 96 + 32 + ResourcesPanel.height + 16;
    const padX = 16;

    this.add
      .text(sidebarX + padX, panelTop, '⚡ Networks', {
        fontFamily: 'Pixellari, monospace',
        fontSize: '16px',
        color: '#FFC940',
      })
      .setOrigin(0, 0);

    this.add
      .rectangle(sidebarX + padX, panelTop + 22, sidebarW - padX * 2, 1, 0x3a4868)
      .setOrigin(0, 0);

    this.networksText = this.add
      .text(sidebarX + padX, panelTop + 30, '(no power buildings yet)', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#5C6E8E',
        lineSpacing: 4,
      })
      .setOrigin(0, 0);
  }

  /**
   * Render the Networks panel text from the current analysis. Called from
   * applyState — re-fires whenever state changes (placement/upgrade/poll).
   */
  private renderNetworksContent(analysis: NetworkAnalysis | null): void {
    if (!this.networksText) return;
    if (!analysis || analysis.networks.length === 0) {
      const offGridCount = analysis?.offGrid.length ?? 0;
      this.networksText
        .setText(
          offGridCount > 0
            ? `(no networks)\nOff-grid: ${offGridCount}`
            : '(no power buildings yet)',
        )
        .setColor(offGridCount > 0 ? '#E84B4B' : '#5C6E8E');
      return;
    }

    const lines: string[] = [];
    for (const net of analysis.networks) {
      const colorCode =
        net.state === 'brownout' ? '!' : net.state === 'tight' ? '~' : '';
      const padded = net.id.padEnd(8, ' ').slice(0, 8);
      lines.push(`${colorCode}${padded} ${net.capacity}/${net.demand}`);
    }
    if (analysis.offGrid.length > 0) {
      lines.push(`Off-grid: ${analysis.offGrid.length}`);
    }

    // Color the whole text based on worst-state network.
    const hasBrownout = analysis.networks.some((n) => n.state === 'brownout');
    const hasTight = analysis.networks.some((n) => n.state === 'tight');
    const color = hasBrownout ? '#E84B4B' : hasTight ? '#F0A030' : '#7CD16A';
    this.networksText.setText(lines.join('\n')).setColor(color);
  }

  /**
   * Action buttons block — Phase 5 has just [Build]. Phases 8 / 11 / 13 add
   * [Research], [Silos], [Overlays], [Captain's Log] per design/06-style §HUD
   * components §3.
   */
  private buildActionButtons(sidebarX: number, sidebarW: number): void {
    // Position below the resources panel.
    const panelTop = 16 + 96 + 32; // mirrors buildResourcesPanel offset
    const buttonsY = panelTop + ResourcesPanel.height + 16;
    const padX = 16;
    const buttonW = sidebarW - padX * 2;
    const buttonH = 36;

    this.makeButton(
      sidebarX + padX,
      buttonsY,
      buttonW,
      buttonH,
      '[ Build ]',
      () => this.openBuildModal(),
    );

    this.makeButton(
      sidebarX + padX,
      buttonsY + buttonH + 8,
      buttonW,
      buttonH,
      '[ Research ]',
      () => this.openResearchScene(),
    );
  }

  private makeButton(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    onClick: () => void,
  ): void {
    // 4-pixel gold border per design/06-style §Action buttons.
    const border = this.add.rectangle(x, y, w, h, 0xffc940).setOrigin(0, 0);
    const fill = this.add
      .rectangle(x + 2, y + 2, w - 4, h - 4, 0x0a1228)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    const text = this.add
      .text(x + w / 2, y + h / 2, label, {
        fontFamily: 'Pixellari, monospace',
        fontSize: '20px',
        color: '#F0EBD7',
      })
      .setOrigin(0.5);

    fill.on('pointerover', () => {
      fill.setFillStyle(0x1b2d5c);
      text.setColor('#FFE680'); // gold-shimmer hover
    });
    fill.on('pointerout', () => {
      fill.setFillStyle(0x0a1228);
      text.setColor('#F0EBD7');
    });
    fill.on('pointerdown', () => {
      // Brief inset-press cue.
      fill.setFillStyle(0x0f1f4d);
      this.time.delayedCall(80, () => fill.setFillStyle(0x1b2d5c));
      onClick();
    });

    void border;
  }

  private openBuildModal(): void {
    // Don't double-launch — if ModalScene is already up, do nothing.
    const modal = this.scene.get('ModalScene');
    if (modal.scene.isActive()) return;
    this.scene.launch('ModalScene', { mode: 'build' });
  }

  private openResearchScene(): void {
    // Switch the underlying game scene (city → research). UIScene stays
    // on top across both. Per design/05-map §View switching: Tab toggles
    // the same way.
    const city = this.scene.get('CityScene');
    const research = this.scene.get('ResearchScene');
    if (research.scene.isActive()) return;
    if (city.scene.isActive()) this.scene.stop('CityScene');
    this.scene.run('ResearchScene');
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
    this.renderNetworksContent(AppState.getAnalysis());
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
