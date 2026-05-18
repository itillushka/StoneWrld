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
import { voiceBuild, voiceUpgrade, voiceBrownout } from '../mecha-senku/voice';
import type { BuildingInstance, LogEntry, ResourceKey, StoneWorldState } from '../state/schema';
import { CAPTAIN_LOG_MAX } from '../state/schema';

// Sidebar width — must match UIScene.SIDEBAR_WIDTH. Imported via static
// lookup to avoid a hard dep cycle between scenes.
const HUD_SIDEBAR_WIDTH = 256;

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
  public static readonly DEFAULT_ZOOM_INDEX = 1;
  private static readonly CAMERA_MARGIN_PX = 2 * TILE_SIZE;

  /** Computed dynamically from current canvas size (window resize friendly). */
  private get viewportWidth(): number {
    return Math.max(320, this.scale.width - HUD_SIDEBAR_WIDTH);
  }
  private get viewportHeight(): number {
    return this.scale.height;
  }

  private cameraTeardown?: () => void;
  private terrainMap?: TerrainMap;
  private occupancy: OccupancyMap = { cells: [] };

  // Placement-mode state.
  private placingId: string | null = null;
  private placementPreview?: Phaser.GameObjects.Container;
  private placementTooltip?: Phaser.GameObjects.Text;

  // Speech bubble now lives in UIScene (overlay layer); CityScene fires
  // bubble:show events on the game bus to trigger it.
  private lastBrownoutSet = new Set<string>(); // networks currently in brownout, for edge-detect

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

    const viewportW = this.viewportWidth;
    const viewportH = this.viewportHeight;

    this.cameras.main.setViewport(0, 0, viewportW, viewportH);

    // React to window resize — keep the camera viewport flush with the
    // window width minus the right-anchored HUD sidebar.
    this.scale.on('resize', this.onResize, this);

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

    // Tab toggles to ResearchScene per design/05-map §View switching.
    // Don't fire during placement mode — placement should commit/cancel first.
    this.input.keyboard?.on('keydown-TAB', (e: KeyboardEvent) => {
      e.preventDefault();
      if (this.placingId) return;
      this.scene.start('ResearchScene');
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

    // Speech bubble: announce placement mode via the same channel the
    // voiced events use, so the visual cue is consistent.
    this.game.events.emit('bubble:show', {
      ts: new Date().toISOString(),
      operational: `Placing ${entry.name}. Click a green tile to build. Right-click or Esc to cancel.`,
      trigger: 'placement:start',
    });
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

    // Voiced log entry per design/06-style §Voice rules.
    const effectSummary = this.summarizeTierEffect(tier1);
    const voiced = voiceBuild(entry.name, 1, effectSummary, `build:${buildingId}:1`);

    // Deduct + append + log + stats.
    const updated: StoneWorldState = {
      ...state,
      resources: this.subtractCost(state.resources, tier1.cost),
      buildings: [...state.buildings, newBuilding],
      captain_log: this.appendLog(state.captain_log, voiced),
      stats: {
        ...state.stats,
        total_buildings_placed: state.stats.total_buildings_placed + 1,
      },
    };
    this.game.events.emit("bubble:show", voiced);

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
    // Bubble fades out on its own via persistence timer; no explicit reset needed.
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

  private renderSpeechBubblePlaceholder(_viewportW: number, _viewportH: number): void {
    // Bubble lives in UIScene now (overlay layer above both CityScene and
    // ResearchScene). CityScene fires bubble:show events on the game bus.
    // Method kept as a no-op stub so the existing create() call doesn't break.
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

    const voiced = voiceUpgrade(entry.name, nextTier, `upgrade:${building.id}:${nextTier}`);
    const updated: StoneWorldState = {
      ...state,
      resources: this.subtractCost(state.resources, tierData.cost),
      buildings: updatedBuildings,
      captain_log: this.appendLog(state.captain_log, voiced),
    };
    this.game.events.emit("bubble:show", voiced);

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

    // Edge-detect brownout transitions — fire a Mecha Senku alert for any
    // network that JUST entered brownout this cycle.
    const nowBrownout = new Set(
      analysis.networks.filter((n) => n.state === 'brownout').map((n) => n.id),
    );
    const newlyBrownout: string[] = [];
    for (const id of nowBrownout) {
      if (!this.lastBrownoutSet.has(id)) newlyBrownout.push(id);
    }
    this.lastBrownoutSet = nowBrownout;

    for (const id of newlyBrownout) {
      const net = analysis.networks.find((n) => n.id === id);
      if (!net) continue;
      const voiced = voiceBrownout(
        net.id,
        net.capacity,
        net.demand,
        `brownout:${net.id}`,
      );
      this.game.events.emit("bubble:show", voiced);
      // Record the brownout in captain_log; this triggers another setState
      // but the brownout-set is now in lastBrownoutSet so we won't loop.
      const state = AppState.getState();
      if (state) {
        const updated: StoneWorldState = {
          ...state,
          captain_log: this.appendLog(state.captain_log, voiced),
        };
        AppState.setState(updated);
        void saveState(updated).catch((err) => {
          console.error('[CityScene] brownout log save failed:', err);
        });
      }
    }
  }

  /**
   * Build a human-readable effect summary for a building tier — used by
   * voiceBuild to give the player something concrete in the bubble.
   */
  private summarizeTierEffect(tier: { passive_per_hour: Partial<Record<ResourceKey, number>>; power_capacity: number; power_demand: number; coverage_radius?: number }): string {
    const parts: string[] = [];
    const labels: Record<ResourceKey, string> = {
      knowledge: '📚',
      discovery: '🔭',
      iron: '⛓',
      innovation: '⚡',
      completion: '🏁',
    };
    for (const [k, v] of Object.entries(tier.passive_per_hour) as Array<[ResourceKey, number]>) {
      parts.push(`+${v}${labels[k]} / hr`);
    }
    if (tier.power_capacity > 0) parts.push(`+${tier.power_capacity} power capacity`);
    if (tier.coverage_radius && tier.coverage_radius > 0) {
      parts.push(`coverage ${tier.coverage_radius} tiles`);
    }
    if (parts.length === 0) return 'on the deck';
    return parts.join(', ');
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

  /** Window resize handler — update camera viewport. (Bubble lives in UIScene now.) */
  private onResize(): void {
    this.cameras.main.setViewport(0, 0, this.viewportWidth, this.viewportHeight);
  }

  private teardown(): void {
    this.scale.off('resize', this.onResize, this);
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
