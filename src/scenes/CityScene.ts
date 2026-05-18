import Phaser from 'phaser';
import { AppState } from '../state/app-state';
import {
  TILE_SIZE,
  WORLD_WIDTH_PX,
  WORLD_HEIGHT_PX,
  GRID_WIDTH,
  GRID_HEIGHT,
  currentBuildableArea,
  isBuildable,
} from '../city/grid';
import {
  fetchTerrainMap,
  TerrainMap,
  TERRAIN_COLOR_INT,
} from '../city/terrain';
import { setupCameraControls } from '../city/camera-controls';

/**
 * CityScene — the main game world.
 *
 * Per design/05-map: orthogonal 32×24 grid, 128px source tiles, integer
 * zoom 0.25× / 0.5× / 1× / 2×, default 0.5× centered on Stone World plaza.
 * Camera pans with WASD / arrows / middle-drag.
 *
 * Phase 4 deliverables (per design/09-roadmap §Phase 4):
 *   - Static terrain map rendered from public/maps/stoneworld.json
 *   - All 6 terrain types as solid-color placeholder tiles (real sprites
 *     land via the parallel asset track in later phases)
 *   - Frontier overlay on locked tiles (desaturated grey, 60% alpha)
 *   - Camera pan + zoom controls
 *   - Static speech-bubble placeholder anchored bottom-left of canvas
 *     (real Mecha Senku speech bubble lands Phase 9)
 *
 * Sized to the LEFT 1024 × 800 of the 1280 × 800 canvas. The right 256-px
 * column is the UIScene HUD sidebar. The camera viewport is clipped so the
 * city never bleeds under the HUD.
 */
export class CityScene extends Phaser.Scene {
  /** Game viewport width (canvas total minus HUD sidebar). */
  public static readonly VIEWPORT_WIDTH = 1024;
  /** Default zoom level — 0.5× per design/05-map §Camera default. */
  public static readonly DEFAULT_ZOOM_INDEX = 1; // index into ZOOM_LEVELS [0.25, 0.5, 1, 2]
  /** Camera margin around world bounds, in source pixels. */
  private static readonly CAMERA_MARGIN_PX = 2 * TILE_SIZE;

  private cameraTeardown?: () => void;

  constructor() {
    super('CityScene');
  }

  async create(): Promise<void> {
    const viewportW = CityScene.VIEWPORT_WIDTH;
    const viewportH = this.scale.height;

    // Clip the main camera to the LEFT 1024px so the city render never
    // bleeds under the HUD sidebar (UIScene overlays the right 256px).
    this.cameras.main.setViewport(0, 0, viewportW, viewportH);

    // Load + render the static terrain map.
    try {
      const map = await fetchTerrainMap();
      this.renderTerrain(map);
      this.renderFrontier();
    } catch (err) {
      console.error('[CityScene] Failed to load terrain map:', err);
      this.renderTerrainLoadFailure(viewportW, viewportH, err);
      return;
    }

    // Camera setup — pan + integer zoom, default centered on plaza.
    const controls = setupCameraControls(this, {
      worldBounds: { x: 0, y: 0, width: WORLD_WIDTH_PX, height: WORLD_HEIGHT_PX },
      panMargin: CityScene.CAMERA_MARGIN_PX,
      defaultZoomIndex: CityScene.DEFAULT_ZOOM_INDEX,
    });
    this.cameraTeardown = controls.teardown;

    // Center the camera on the Stone World plaza (tile ~16, 12).
    const plazaCenterX = 16 * TILE_SIZE;
    const plazaCenterY = 12 * TILE_SIZE;
    this.cameras.main.centerOn(plazaCenterX, plazaCenterY);

    // Static Mecha Senku speech bubble placeholder — bottom-left of canvas
    // (anchored in SCREEN space, not world space, so it doesn't pan/zoom).
    this.renderSpeechBubblePlaceholder(viewportW, viewportH);

    // Teardown on scene shutdown.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.teardown());
  }

  /**
   * Render all terrain tiles as a single Phaser.Graphics object →
   * generateTexture → display as an Image. Performant: one game object
   * for 768 tiles instead of 768 individual rectangles.
   */
  private renderTerrain(map: TerrainMap): void {
    const g = this.add.graphics();
    for (let y = 0; y < map.height; y++) {
      const row = map.tiles[y]!;
      for (let x = 0; x < map.width; x++) {
        const t = row[x]!;
        g.fillStyle(TERRAIN_COLOR_INT[t], 1);
        g.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
    g.generateTexture('terrain-base', WORLD_WIDTH_PX, WORLD_HEIGHT_PX);
    g.destroy();

    this.add.image(0, 0, 'terrain-base').setOrigin(0, 0).setDepth(0);
  }

  /**
   * Render the frontier overlay — desaturated stone tint on tiles OUTSIDE
   * the current buildable area. Per design/05-map §Expansion: 60% alpha
   * `#5C6E8E` (inactive grey).
   *
   * The buildable area is read from AppState (state.map.buildable_area_unlocks).
   * For Phase 4 there are no unlocks → just the starting Stone World plaza.
   * Phase 5+ will re-render this as expansions trigger.
   */
  private renderFrontier(): void {
    const state = AppState.getState();
    const unlocks = state?.map.buildable_area_unlocks ?? [];
    const rect = currentBuildableArea(unlocks);

    const g = this.add.graphics();
    g.fillStyle(0x5c6e8e, 0.6);
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (!isBuildable(rect, x, y)) {
          g.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }
    g.generateTexture('terrain-frontier', WORLD_WIDTH_PX, WORLD_HEIGHT_PX);
    g.destroy();

    this.add.image(0, 0, 'terrain-frontier').setOrigin(0, 0).setDepth(1);
  }

  /**
   * Static speech-bubble placeholder. Anchored in SCREEN space (setScrollFactor 0)
   * so it stays in the bottom-left regardless of camera pan/zoom.
   *
   * The real Mecha Senku speech bubble lands Phase 9 — full 6s/10s persistence,
   * factoid mode, click-to-dismiss, captain's log scrollback.
   */
  private renderSpeechBubblePlaceholder(viewportW: number, viewportH: number): void {
    void viewportW;

    const bubbleX = 16;
    const bubbleY = viewportH - 96;
    const bubbleW = 480;
    const bubbleH = 72;

    // Raised navy background + gold border.
    const bg = this.add
      .rectangle(bubbleX, bubbleY, bubbleW, bubbleH, 0x0f1f4d)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xffc940);
    bg.setScrollFactor(0).setDepth(10);

    const label = this.add
      .text(bubbleX + 14, bubbleY + 12, 'Mecha Senku', {
        fontFamily: 'Pixellari, monospace',
        fontSize: '16px',
        color: '#FFC940',
      })
      .setOrigin(0, 0);
    label.setScrollFactor(0).setDepth(11);

    const body = this.add
      .text(
        bubbleX + 14,
        bubbleY + 34,
        'Stone World — your village awaits.\nBubble system arrives in Phase 9.',
        {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: '#F0EBD7',
          lineSpacing: 6,
        },
      )
      .setOrigin(0, 0);
    body.setScrollFactor(0).setDepth(11);
  }

  /** Visible error state if the map JSON fails to load. */
  private renderTerrainLoadFailure(w: number, h: number, err: unknown): void {
    const msg = err instanceof Error ? err.message : String(err);
    this.add
      .text(w / 2, h / 2 - 16, 'Terrain map failed to load', {
        fontFamily: 'Pixellari, monospace',
        fontSize: '24px',
        color: '#E84B4B',
      })
      .setOrigin(0.5);
    this.add
      .text(w / 2, h / 2 + 20, msg, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#5C6E8E',
        align: 'center',
        wordWrap: { width: w * 0.8 },
      })
      .setOrigin(0.5);
  }

  private teardown(): void {
    this.cameraTeardown?.();
    this.cameraTeardown = undefined;
  }
}
