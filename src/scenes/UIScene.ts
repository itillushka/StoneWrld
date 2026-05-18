import Phaser from 'phaser';
import { AppState } from '../state/app-state';
import { ResourcesPanel } from '../hud/resources-panel';
import { SpeechBubble } from '../mecha-senku/speech-bubble';
import type { LogEntry, StoneWorldState } from '../state/schema';
import type { NetworkAnalysis } from '../economy/network';

/**
 * UIScene — the persistent HUD overlay.
 *
 * After Phase 9 fix: with Scale.RESIZE in src/config.ts the canvas now
 * fills the browser window. The sidebar lives inside a Container which
 * we re-anchor to (window.width - SIDEBAR_WIDTH) on every resize event.
 * No more "dark navy bars on the side" — the HUD sits flush against the
 * right edge regardless of window size.
 *
 * Resources panel, Networks panel, action buttons, and Mecha Senku
 * portrait all use COORDINATES RELATIVE TO THE SIDEBAR (0..SIDEBAR_WIDTH),
 * not absolute screen coords. The container's position handles the actual
 * placement.
 */
export class UIScene extends Phaser.Scene {
  public static readonly SIDEBAR_WIDTH = 256;
  private static readonly POLL_INTERVAL_MS = 5000;

  private sidebarContainer!: Phaser.GameObjects.Container;
  private sidebarBg!: Phaser.GameObjects.Rectangle;
  private sidebarSeparator!: Phaser.GameObjects.Rectangle;
  private resourcesPanel?: ResourcesPanel;
  private statusText?: Phaser.GameObjects.Text;
  private networksText?: Phaser.GameObjects.Text;
  private pollTimer?: Phaser.Time.TimerEvent;
  private unsubscribe?: () => void;
  private speechBubble?: SpeechBubble;

  constructor() {
    super('UIScene');
  }

  create(): void {
    const sidebarW = UIScene.SIDEBAR_WIDTH;

    // Container holds the entire HUD. All children use container-relative
    // coordinates (x: 0..sidebarW, y: 0..scene-height).
    this.sidebarContainer = this.add.container(0, 0);
    this.sidebarContainer.setDepth(50);

    // Sidebar background — full height. Recreated on resize.
    this.sidebarBg = this.add
      .rectangle(0, 0, sidebarW, this.scale.height, 0x1b2d5c)
      .setOrigin(0, 0);
    this.sidebarSeparator = this.add
      .rectangle(0, 0, 1, this.scale.height, 0x3a4868)
      .setOrigin(0, 0);
    this.sidebarContainer.add(this.sidebarBg);
    this.sidebarContainer.add(this.sidebarSeparator);

    // Build each widget with x relative to the sidebar (0..sidebarW).
    this.buildMechaSenkuPortrait(sidebarW);
    this.buildResourcesPanel(sidebarW);
    this.buildNetworksPanel(sidebarW);
    this.buildActionButtons(sidebarW);
    this.buildFooter(sidebarW);

    // Initial anchor + resize handler.
    this.repositionSidebar();
    this.scale.on('resize', this.repositionSidebar, this);

    // Mecha Senku speech bubble lives in UIScene now (overlay layer) so it
    // floats above both CityScene and ResearchScene. Anchored bottom-left
    // of the WINDOW, repositions on resize.
    this.speechBubble = new SpeechBubble(this, this.bubbleAnchor());

    // Cross-scene wiring: anyone can fire bubble:show on game.events.
    this.game.events.on('bubble:show', this.onBubbleShow, this);

    // Subscribe + start polling (unchanged from Phase 3).
    this.unsubscribe = AppState.subscribe((state) => this.applyState(state));
    this.pollTimer = this.time.addEvent({
      delay: UIScene.POLL_INTERVAL_MS,
      callback: () => this.poll(),
      loop: true,
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.teardown());
  }

  /**
   * Re-anchor the sidebar to the right edge of the current canvas.
   * Also resizes the bg + separator to match the new height (which
   * matters if the user pulls the window taller).
   */
  private repositionSidebar(): void {
    const sidebarW = UIScene.SIDEBAR_WIDTH;
    this.sidebarContainer.setPosition(this.scale.width - sidebarW, 0);
    this.sidebarBg.height = this.scale.height;
    this.sidebarSeparator.height = this.scale.height;

    // Footer y depends on canvas height — re-anchor.
    if (this.statusText) {
      this.statusText.setPosition(sidebarW / 2, this.scale.height - 16);
    }

    // Speech bubble re-anchors to bottom-left of canvas.
    if (this.speechBubble) {
      const a = this.bubbleAnchor();
      this.speechBubble.setPosition(a.x, a.y);
    }
  }

  /** Bottom-left anchor for the SpeechBubble — 16px in, 16px above bottom. */
  private bubbleAnchor(): { x: number; y: number } {
    // Bubble portrait height = 168, total widget height ~168.
    return { x: 16, y: this.scale.height - 184 };
  }

  /** Global bubble:show handler — any scene can fire it on game.events. */
  private onBubbleShow(entry: LogEntry): void {
    this.speechBubble?.setEntry(entry);
  }

  private buildMechaSenkuPortrait(sidebarW: number): void {
    const portraitW = 84;
    const portraitH = 84;
    const px = (sidebarW - portraitW) / 2;
    const py = 16;

    const portrait = this.add
      .image(px, py, 'mecha-senku-placeholder')
      .setOrigin(0, 0)
      .setDisplaySize(portraitW, portraitH);
    this.sidebarContainer.add(portrait);

    const label = this.add
      .text(px + portraitW / 2, py + portraitH + 8, 'Mecha Senku', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#F0EBD7',
      })
      .setOrigin(0.5);
    this.sidebarContainer.add(label);
  }

  private buildResourcesPanel(sidebarW: number): void {
    const panelY = 16 + 96 + 32;
    // ResourcesPanel uses absolute coords; we wrap its container into ours.
    this.resourcesPanel = new ResourcesPanel(this, 0, panelY, sidebarW);
    // ResourcesPanel internally creates a Container at (x, y). We grab it
    // and reparent into the sidebarContainer so resize moves it together.
    const panelContainer = (this.resourcesPanel as unknown as {
      container: Phaser.GameObjects.Container;
    }).container;
    if (panelContainer) {
      this.sidebarContainer.add(panelContainer);
    }
  }

  private buildNetworksPanel(sidebarW: number): void {
    const panelTop = 16 + 96 + 32 + ResourcesPanel.height + 16;
    const padX = 16;

    const heading = this.add
      .text(padX, panelTop, '⚡ Networks', {
        fontFamily: 'Pixellari, monospace',
        fontSize: '16px',
        color: '#FFC940',
      })
      .setOrigin(0, 0);
    this.sidebarContainer.add(heading);

    const sep = this.add
      .rectangle(padX, panelTop + 22, sidebarW - padX * 2, 1, 0x3a4868)
      .setOrigin(0, 0);
    this.sidebarContainer.add(sep);

    this.networksText = this.add
      .text(padX, panelTop + 30, '(no power buildings yet)', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#5C6E8E',
        lineSpacing: 4,
      })
      .setOrigin(0, 0);
    this.sidebarContainer.add(this.networksText);
  }

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
    const hasBrownout = analysis.networks.some((n) => n.state === 'brownout');
    const hasTight = analysis.networks.some((n) => n.state === 'tight');
    const color = hasBrownout ? '#E84B4B' : hasTight ? '#F0A030' : '#7CD16A';
    this.networksText.setText(lines.join('\n')).setColor(color);
  }

  private buildActionButtons(sidebarW: number): void {
    const panelTop = 16 + 96 + 32 + ResourcesPanel.height + 16;
    const buttonsY = panelTop + 96; // below the Networks panel area
    const padX = 16;
    const buttonW = sidebarW - padX * 2;
    const buttonH = 36;

    this.makeButton(padX, buttonsY, buttonW, buttonH, '[ Build ]', () =>
      this.openBuildModal(),
    );
    this.makeButton(
      padX,
      buttonsY + (buttonH + 8),
      buttonW,
      buttonH,
      '[ Research ]',
      () => this.openResearchScene(),
    );
    this.makeButton(
      padX,
      buttonsY + (buttonH + 8) * 2,
      buttonW,
      buttonH,
      "[ Captain's Log ]",
      () => this.openLogModal(),
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
      text.setColor('#FFE680');
    });
    fill.on('pointerout', () => {
      fill.setFillStyle(0x0a1228);
      text.setColor('#F0EBD7');
    });
    fill.on('pointerdown', () => {
      fill.setFillStyle(0x0f1f4d);
      this.time.delayedCall(80, () => fill.setFillStyle(0x1b2d5c));
      onClick();
    });

    this.sidebarContainer.add(border);
    this.sidebarContainer.add(fill);
    this.sidebarContainer.add(text);
  }

  private openBuildModal(): void {
    const modal = this.scene.get('ModalScene');
    if (modal.scene.isActive()) return;
    this.scene.launch('ModalScene', { mode: 'build' });
  }

  private openResearchScene(): void {
    const city = this.scene.get('CityScene');
    const research = this.scene.get('ResearchScene');
    if (research.scene.isActive()) return;
    if (city.scene.isActive()) this.scene.stop('CityScene');
    this.scene.run('ResearchScene');
  }

  private openLogModal(): void {
    const modal = this.scene.get('ModalScene');
    if (modal.scene.isActive()) return;
    this.scene.launch('ModalScene', { mode: 'log' });
  }

  private buildFooter(sidebarW: number): void {
    this.statusText = this.add
      .text(sidebarW / 2, this.scale.height - 16, 'milestone: …', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '6px',
        color: '#5C6E8E',
        align: 'center',
      })
      .setOrigin(0.5);
    this.sidebarContainer.add(this.statusText);
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

  private async poll(): Promise<void> {
    try {
      await AppState.refresh();
    } catch (err) {
      console.warn('[UIScene] poll failed:', err);
    }
  }

  private teardown(): void {
    this.scale.off('resize', this.repositionSidebar, this);
    this.game.events.off('bubble:show', this.onBubbleShow, this);
    this.pollTimer?.remove();
    this.pollTimer = undefined;
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.speechBubble?.destroy();
    this.speechBubble = undefined;
  }
}
