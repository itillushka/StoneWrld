import Phaser from 'phaser';
import { AppState } from '../state/app-state';
import { saveState } from '../state/save';
import {
  TILE_SIZE,
  WORLD_WIDTH_PX,
  WORLD_HEIGHT_PX,
  GRID_WIDTH,
  GRID_HEIGHT,
  currentBuildableArea,
  isBuildable,
  pixelToTile,
} from '../city/grid';
import {
  fetchTerrainMap,
  TerrainMap,
  TERRAIN_COLOR_INT,
} from '../city/terrain';
import { setupCameraControls } from '../city/camera-controls';
import {
  buildOccupancy,
  addToOccupancy,
  type OccupancyMap,
} from '../city/occupancy';
import {
  validatePlacement,
  explainRejection,
  type PlacementValidation,
} from '../city/placement';
import { getBuilding, getTier } from '../catalog/buildings';
import {
  renderAllBuildings,
  animateConstructionDrop,
  animateUpgradePulse,
  replaceBuildingRender,
  resetBuildingRenderCache,
} from '../city/render-buildings';
import {
  renderNetworkHalos,
  renderOffGridDots,
  startBrownoutShake,
} from '../city/render-networks';
import { computeTrickleDelta, applyTrickleDelta } from '../economy/trickle';
import type { BuildingInstance, LogEntry, ResourceKey, StoneWorldState } from '../state/schema';
import { CAPTAIN_LOG_MAX } from '../state/schema';

/**
 * CityScene — the main game world.
 *
 * Phase 5 additions on top of Phase 4 terrain + camera:
 *   - Render any buildings already in state.json as gold-square placeholders.
 *   - Listen for `placement:start` on the global game event bus (fired by
 *     ModalScene) and enter placement mode.
 *   - Placement mode: footprint preview at cursor (green = valid, red = invalid),
 *     click-to-place, right-click / Esc to cancel.
 *   - On successful place: deduct cost, append building, append captain_log
 *     entry, atomic-save via /api/state, animate construction drop.
 *
 * Per design/05-map §Build UX. Sized to the LEFT 1024 × 800 of the
 * 1280 × 800 canvas — UIScene owns the right 256 px.
 */
export class CityScene extends Phaser.Scene {
  public static readonly VIEWPORT_WIDTH = 1024;
  public static readonly DEFAULT_ZOOM_INDEX = 1;
  private static readonly CAMERA_MARGIN_PX = 2 * TILE_SIZE;

  private cameraTeardown?: () => void;
  private terrainMap?: TerrainMap;
  private occupancy: OccupancyMap = { cells: [] };

  // Placement-mode state.
  private placingId: string | null = null;
  private placementPreview?: Phaser.GameObjects.Container;
  private placementTooltip?: Phaser.GameObjects.Text;

  // Bottom-left speech bubble (Phase 4 placeholder).
  private bubbleBody?: Phaser.GameObjects.Text;

  // Network rendering state — recreated on each rebuild.
  private haloImage?: Phaser.GameObjects.Image;
  private offGridContainer?: Phaser.GameObjects.Container;
  private brownoutShake?: { stop: () => void };
  private trickleTimer?: Phaser.Time.TimerEvent;
  private static readonly TRICKLE_INTERVAL_MS = 30_000; // 30s tick

  constructor() {
    super('CityScene');
  }

  async create(): Promise<void> {
    resetBuildingRenderCache();

    const viewportW = CityScene.VIEWPORT_WIDTH;
    const viewportH = this.scale.height;

    this.cameras.main.setViewport(0, 0, viewportW, viewportH);

    // Load terrain. Bail with red banner if the map fetch fails.
    try {
      this.terrainMap = await fetchTerrainMap();
      this.renderTerrain(this.terrainMap);
      this.renderFrontier();
    } catch (err) {
      console.error('[CityScene] Failed to load terrain map:', err);
      this.renderTerrainLoadFailure(viewportW, viewportH, err);
      return;
    }

    // Camera.
    const controls = setupCameraControls(this, {
      worldBounds: { x: 0, y: 0, width: WORLD_WIDTH_PX, height: WORLD_HEIGHT_PX },
      panMargin: CityScene.CAMERA_MARGIN_PX,
      defaultZoomIndex: CityScene.DEFAULT_ZOOM_INDEX,
    });
    this.cameraTeardown = controls.teardown;
    this.cameras.main.centerOn(16 * TILE_SIZE, 12 * TILE_SIZE);

    // Initial building render — anything already in state from a prior session.
    const state = AppState.getState();
    if (state) {
      this.occupancy = buildOccupancy(state.buildings);
      renderAllBuildings(this, state.buildings);
    }

    // Initial network render — depends on state + buildings already in scene.
    this.rebuildNetworkRender();

    this.renderSpeechBubblePlaceholder(viewportW, viewportH);

    // Trickle ticker — every 30 seconds, applies passive accrual based on
    // current network state. Resources update via AppState.setState, which
    // triggers UIScene's HUD update.
    this.trickleTimer = this.time.addEvent({
      delay: CityScene.TRICKLE_INTERVAL_MS,
      loop: true,
      callback: () => void this.runTrickleTick(),
    });

    // Cross-scene wiring.
    this.game.events.on('placement:start', this.onPlacementStart, this);
    this.game.events.on('building:inspect', this.onBuildingInspect, this);
    this.game.events.on('building:upgrade', this.onBuildingUpgrade, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerdown', this.onPointerDown, this);

    // Esc cancels placement.
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.placingId) this.cancelPlacement();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.teardown());
  }

  // ---------- Terrain + frontier ----------

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
    // Texture key needs to be unique per scene-create cycle to avoid
    // "key already in use" warnings on Phaser hot-reload.
    const key = `terrain-base-${Date.now()}`;
    g.generateTexture(key, WORLD_WIDTH_PX, WORLD_HEIGHT_PX);
    g.destroy();
    this.add.image(0, 0, key).setOrigin(0, 0).setDepth(0);
  }

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
    const key = `terrain-frontier-${Date.now()}`;
    g.generateTexture(key, WORLD_WIDTH_PX, WORLD_HEIGHT_PX);
    g.destroy();
    this.add.image(0, 0, key).setOrigin(0, 0).setDepth(1);
  }

  // ---------- Placement mode ----------

  private onPlacementStart(payload: { buildingId: string }): void {
    this.cancelPlacement(); // safety: clear any previous preview
    this.placingId = payload.buildingId;

    const entry = getBuilding(this.placingId);
    if (!entry) {
      this.placingId = null;
      return;
    }

    // Build the preview container — same shape as a real building placeholder
    // but with a tintable rectangle (green/red) on top instead of the gold fill.
    const w = entry.footprint.w * TILE_SIZE;
    const h = entry.footprint.h * TILE_SIZE;
    this.placementPreview = this.add.container(0, 0);
    this.placementPreview.setDepth(3);
    const rect = this.add
      .rectangle(0, 0, w, h, 0x7cd16a, 0.5)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x7cd16a);
    this.placementPreview.add(rect);

    // Floating tooltip — anchored to the cursor.
    this.placementTooltip = this.add
      .text(0, 0, '', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: '#F0EBD7',
        backgroundColor: '#0A1228',
        padding: { x: 6, y: 4 },
      })
      .setDepth(10)
      .setScrollFactor(0);
    this.placementTooltip.setVisible(false);

    // Update the speech bubble to announce placement mode.
    this.bubbleBody?.setText(
      `Placing ${entry.name}. Click a green tile to build.\nRight-click or Esc to cancel.`,
    );
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.placingId || !this.placementPreview) return;

    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tile = pixelToTile(world.x, world.y);

    this.placementPreview.setPosition(tile.x * TILE_SIZE, tile.y * TILE_SIZE);
    const validation = this.validateNow(tile.x, tile.y);
    this.applyPreviewStyle(validation, pointer);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.placingId) return;

    // Right-click cancels.
    if (pointer.rightButtonDown()) {
      this.cancelPlacement();
      pointer.event.preventDefault();
      return;
    }

    if (!pointer.leftButtonDown()) return;

    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tile = pixelToTile(world.x, world.y);
    const validation = this.validateNow(tile.x, tile.y);
    if (!validation.valid) return; // silent — tooltip already showing reason

    void this.commitPlacement(tile.x, tile.y);
  }

  private validateNow(x: number, y: number): PlacementValidation {
    if (!this.placingId || !this.terrainMap) {
      return { valid: false, reason: 'overlap' };
    }
    const state = AppState.getState();
    if (!state) return { valid: false, reason: 'overlap' };
    const buildableArea = currentBuildableArea(state.map.buildable_area_unlocks);

    return validatePlacement({
      buildingId: this.placingId,
      x,
      y,
      state,
      occupancy: this.occupancy,
      terrain: this.terrainMap,
      buildableArea,
    });
  }

  private applyPreviewStyle(
    validation: PlacementValidation,
    pointer: Phaser.Input.Pointer,
  ): void {
    if (!this.placementPreview) return;

    const rect = this.placementPreview.list[0] as Phaser.GameObjects.Rectangle;
    if (validation.valid) {
      rect.setFillStyle(0x7cd16a, 0.5); // KoS green
      rect.setStrokeStyle(2, 0x7cd16a);
      this.placementTooltip?.setVisible(false);
    } else {
      rect.setFillStyle(0xe84b4b, 0.5); // error red
      rect.setStrokeStyle(2, 0xe84b4b);
      const reason = explainRejection(validation);
      if (this.placementTooltip) {
        this.placementTooltip
          .setText(reason)
          .setPosition(pointer.x + 16, pointer.y + 16)
          .setVisible(true);
      }
    }
  }

  private async commitPlacement(x: number, y: number): Promise<void> {
    if (!this.placingId) return;
    const buildingId = this.placingId;
    const entry = getBuilding(buildingId);
    const tier1 = getTier(buildingId, 1);
    if (!entry || !tier1) return;

    const state = AppState.getState();
    if (!state) return;

    const newBuilding: BuildingInstance = {
      id: buildingId,
      tier: 1,
      x,
      y,
      spent: { ...tier1.cost },
      placed_at: new Date().toISOString(),
    };

    // Deduct + append + log + stats.
    const updated: StoneWorldState = {
      ...state,
      resources: this.subtractCost(state.resources, tier1.cost),
      buildings: [...state.buildings, newBuilding],
      captain_log: this.appendLog(state.captain_log, {
        ts: new Date().toISOString(),
        operational: `Profit. ${entry.name} T1 on the deck at (${x}, ${y}).`,
        trigger: `build:${buildingId}:1`,
      }),
      stats: {
        ...state.stats,
        total_buildings_placed: state.stats.total_buildings_placed + 1,
      },
    };

    // Optimistic UI: render + animate immediately. saveState() persists in
    // background. If save fails, AppState's next poll snaps the world back
    // to truth (with a slight visual flicker — acceptable per design/08
    // §Concurrency last-writer-wins).
    addToOccupancy(this.occupancy, newBuilding);
    const containers = renderAllBuildings(this, [newBuilding]);
    if (containers[0]) animateConstructionDrop(this, containers[0]);

    AppState.setState(updated);

    // Networks change whenever a building is added — re-render halos / dots.
    this.rebuildNetworkRender();

    try {
      await saveState(updated);
    } catch (err) {
      console.error('[CityScene] saveState failed:', err);
    }

    this.cancelPlacement();
  }

  private cancelPlacement(): void {
    this.placingId = null;
    this.placementPreview?.destroy();
    this.placementPreview = undefined;
    this.placementTooltip?.destroy();
    this.placementTooltip = undefined;
    this.bubbleBody?.setText(
      'Stone World — your village awaits.\nBubble system arrives in Phase 9.',
    );
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

  // ---------- Speech bubble placeholder ----------

  private renderSpeechBubblePlaceholder(viewportW: number, viewportH: number): void {
    void viewportW;

    const bubbleX = 16;
    const bubbleY = viewportH - 96;
    const bubbleW = 480;
    const bubbleH = 72;

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

    this.bubbleBody = this.add
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
    this.bubbleBody.setScrollFactor(0).setDepth(11);
  }

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

  // ---------- Inspect + Upgrade flow ----------

  /**
   * A placed building was clicked → open the inspect modal.
   * Suppressed while in placement mode (the placement click takes priority).
   */
  private onBuildingInspect(payload: { building: BuildingInstance }): void {
    if (this.placingId) return; // placement-mode click takes priority
    this.scene.launch('ModalScene', { mode: 'inspect', building: payload.building });
  }

  /**
   * The user clicked the [Upgrade] button in the inspect modal.
   * Deduct cost, bump tier, save, re-render the sprite, animate.
   */
  private async onBuildingUpgrade(payload: { building: BuildingInstance }): Promise<void> {
    const { building } = payload;
    const nextTier = (building.tier + 1) as 1 | 2 | 3;
    const tierData = getTier(building.id, nextTier);
    if (!tierData) return; // already max
    const entry = getBuilding(building.id);
    if (!entry) return;

    const state = AppState.getState();
    if (!state) return;

    // Affordability re-check (modal could be stale).
    for (const [k, need] of Object.entries(tierData.cost) as Array<[ResourceKey, number]>) {
      if ((state.resources[k] ?? 0) < need) return;
    }

    // Find the index of this instance in state.buildings (match by id+x+y).
    const idx = state.buildings.findIndex(
      (b) => b.id === building.id && b.x === building.x && b.y === building.y,
    );
    if (idx < 0) return;

    const old = state.buildings[idx]!;
    const upgraded: BuildingInstance = {
      ...old,
      tier: nextTier,
      // Accumulate the new cost into spent (drives the demolish-refund math in Phase 11).
      spent: this.mergeSpent(old.spent, tierData.cost),
    };

    const updatedBuildings = [...state.buildings];
    updatedBuildings[idx] = upgraded;

    const updated: StoneWorldState = {
      ...state,
      resources: this.subtractCost(state.resources, tierData.cost),
      buildings: updatedBuildings,
      captain_log: this.appendLog(state.captain_log, {
        ts: new Date().toISOString(),
        operational: `${entry.name} T${nextTier} redrawn — production scales.`,
        trigger: `upgrade:${building.id}:${nextTier}`,
      }),
    };

    // Optimistic UI: re-render sprite at the new tier + animate.
    const newContainer = replaceBuildingRender(this, upgraded);
    if (newContainer) animateUpgradePulse(this, newContainer);

    AppState.setState(updated);

    // Tier change may shift capacity / demand / coverage; re-render the
    // network layer so halos + brownout state reflect the new reality.
    this.rebuildNetworkRender();

    try {
      await saveState(updated);
    } catch (err) {
      console.error('[CityScene] upgrade save failed:', err);
    }
  }

  private mergeSpent(
    existing: Partial<Record<ResourceKey, number>>,
    add: Partial<Record<ResourceKey, number>>,
  ): Partial<Record<ResourceKey, number>> {
    const next: Partial<Record<ResourceKey, number>> = { ...existing };
    for (const [k, v] of Object.entries(add) as Array<[ResourceKey, number]>) {
      next[k] = (next[k] ?? 0) + v;
    }
    return next;
  }

  // ---------- Network rendering ----------

  /**
   * Tear down + re-render the coverage halos, off-grid dots, and brownout
   * shake based on the CURRENT network analysis. Called after any building
   * change (placement, upgrade, demolish-in-Phase-11).
   */
  private rebuildNetworkRender(): void {
    // Destroy previous render objects.
    this.haloImage?.destroy();
    this.haloImage = undefined;
    this.offGridContainer?.destroy();
    this.offGridContainer = undefined;
    this.brownoutShake?.stop();
    this.brownoutShake = undefined;

    const analysis = AppState.getAnalysis();
    if (!analysis) return;

    // Halos.
    const haloKey = `network-halos-${Date.now()}`;
    this.haloImage = renderNetworkHalos(this, analysis, haloKey);

    // Off-grid dots.
    this.offGridContainer = renderOffGridDots(this, analysis.offGrid);

    // Brownout shake — find the rendered building containers by uid.
    // This is approximate: we rebuild render-buildings cache externally; we
    // look up the existing containers via the renderedBuildings module.
    // For Phase 7 simplicity, brownout shake re-runs after each rebuild —
    // it grabs containers by their tracking key.
    const containerByUid = this.collectBuildingContainersByUid();
    this.brownoutShake = startBrownoutShake(this, analysis.networks, containerByUid);
  }

  /**
   * Walk the scene's children to map "buildingId@x,y" → its Container.
   * Used by brownout shake which needs to address specific buildings.
   */
  private collectBuildingContainersByUid(): Map<string, Phaser.GameObjects.Container> {
    // For Phase 7 we trust that render-buildings already created the
    // containers + stored them; we don't have a direct getter on the
    // cache map. The shake works with what render-buildings produced
    // during render*Buildings calls. If a building isn't found, shake
    // skips it silently.
    const map = new Map<string, Phaser.GameObjects.Container>();
    const state = AppState.getState();
    if (!state) return map;

    for (const b of state.buildings) {
      const px = b.x * TILE_SIZE;
      const py = b.y * TILE_SIZE;
      // Find the building Container at this position. Phaser scenes don't
      // index children efficiently, but our building list is small (~100 max)
      // and this only runs on state change.
      for (const child of this.children.list) {
        if (
          child instanceof Phaser.GameObjects.Container &&
          child.x === px &&
          child.y === py
        ) {
          map.set(`${b.id}@${b.x},${b.y}`, child);
          break;
        }
      }
    }
    return map;
  }

  // ---------- Trickle ----------

  private async runTrickleTick(): Promise<void> {
    const state = AppState.getState();
    const analysis = AppState.getAnalysis();
    if (!state || !analysis) return;

    const delta = computeTrickleDelta(state.buildings, {
      dtMs: CityScene.TRICKLE_INTERVAL_MS,
      analysis,
    });
    if (Object.keys(delta).length === 0) return;

    // Update stats too — passive earnings.
    const newStats = { ...state.stats };
    const newPassive: Record<ResourceKey, number> = { ...state.stats.total_passive_earned };
    for (const [k, v] of Object.entries(delta) as Array<[ResourceKey, number]>) {
      newPassive[k] = (newPassive[k] ?? 0) + v;
    }
    newStats.total_passive_earned = newPassive;

    const updated: StoneWorldState = {
      ...state,
      resources: applyTrickleDelta(state.resources, delta),
      stats: newStats,
    };
    AppState.setState(updated);
    try {
      await saveState(updated);
    } catch (err) {
      console.error('[CityScene] trickle save failed:', err);
    }
  }

  private teardown(): void {
    this.cameraTeardown?.();
    this.cameraTeardown = undefined;
    this.brownoutShake?.stop();
    this.brownoutShake = undefined;
    this.trickleTimer?.remove();
    this.trickleTimer = undefined;
    this.game.events.off('placement:start', this.onPlacementStart, this);
    this.game.events.off('building:inspect', this.onBuildingInspect, this);
    this.game.events.off('building:upgrade', this.onBuildingUpgrade, this);
  }
}
