import Phaser from 'phaser';
import type { BuildingInstance } from '../state/schema';
import { getBuilding } from '../catalog/buildings';
import { categoryColorInt } from '../hud/category-colors';
import { TILE_SIZE } from './grid';

/**
 * Render placed buildings as Phaser game objects.
 *
 * Phase 5 placeholder per design/09-roadmap §Phase 5 risks:
 *   "No sprites for most buildings yet. Mitigation: render colored squares
 *    with the building name as overlay text."
 *
 * Each building → one Phaser.Container at (x*TILE_SIZE, y*TILE_SIZE) holding:
 *   - Captain-gold rectangle sized to the footprint
 *   - 2-pixel deep-navy outline (design/06-style §Pixel-art rule #3)
 *   - 4-pixel black shadow blob below (design/06-style §Pixel-art rule #4)
 *   - Building name in Pixellari, centered
 *
 * Real sprites swap in via the parallel asset track. The atlas-frame
 * registration is a single-file change in this module.
 */

const SHADOW_HEIGHT = 4;
const OUTLINE_WIDTH = 2;
const PLACEHOLDER_FILL = 0xffc940; // captain gold (matches Mecha Senku body)
const OUTLINE_COLOR = 0x0a1228;    // deep navy

/** Internal map: building "uid" (id + x + y) → container — for diffing later. */
const renderedBuildings = new Map<string, Phaser.GameObjects.Container>();

function buildingUid(b: BuildingInstance): string {
  return `${b.id}@${b.x},${b.y}`;
}

/**
 * Render a single building. Returns the container so the caller can
 * animate it (e.g. construction drop on freshly-placed instances).
 *
 * The container is INTERACTIVE — clicking the building fires the
 * 'building:inspect' event on the scene's game.events bus with the
 * building reference as payload. CityScene listens and opens the
 * inspect modal.
 */
export function renderBuilding(
  scene: Phaser.Scene,
  building: BuildingInstance,
): Phaser.GameObjects.Container | null {
  const entry = getBuilding(building.id);
  if (!entry) return null;

  const px = building.x * TILE_SIZE;
  const py = building.y * TILE_SIZE;
  const w = entry.footprint.w * TILE_SIZE;
  const h = entry.footprint.h * TILE_SIZE;

  const container = scene.add.container(px, py);
  container.setDepth(2);

  // Shadow — a thin dark slab at the base of the footprint.
  const shadow = scene.add
    .rectangle(0, h, w, SHADOW_HEIGHT, 0x000000, 0.55)
    .setOrigin(0, 0);
  container.add(shadow);

  // Outline.
  const outline = scene.add
    .rectangle(0, 0, w, h, OUTLINE_COLOR)
    .setOrigin(0, 0);
  container.add(outline);

  // Fill — Phase 6 tier-visual differentiation:
  //   T1: captain gold (#FFC940)
  //   T2: gold shimmer (#FFE680) — slightly brighter
  //   T3: gold shimmer + small purple badge bar overlay (added below)
  const fillColor = building.tier === 1 ? PLACEHOLDER_FILL : 0xffe680;
  const fill = scene.add
    .rectangle(
      OUTLINE_WIDTH,
      OUTLINE_WIDTH,
      w - OUTLINE_WIDTH * 2,
      h - OUTLINE_WIDTH * 2,
      fillColor,
    )
    .setOrigin(0, 0);
  container.add(fill);

  // Category color stripe along the top edge (4 px thin).
  const stripe = scene.add
    .rectangle(OUTLINE_WIDTH, OUTLINE_WIDTH, w - OUTLINE_WIDTH * 2, 4, categoryColorInt(entry.category))
    .setOrigin(0, 0);
  container.add(stripe);

  // Tier badge only — 64×64 buildings can't fit a name label readably.
  // Building identity comes from sprite + category stripe + hover tooltip
  // (and the upcoming AI-gen sprites will be visually distinct).
  const tierBadge = scene.add
    .text(w / 2, h / 2, `T${building.tier}`, {
      fontFamily: 'Pixellari, monospace',
      fontSize: '14px',
      color: '#0A1228',
    })
    .setOrigin(0.5);
  container.add(tierBadge);

  // T3 endgame accent — small endgame-violet bar across the bottom edge.
  if (building.tier === 3) {
    const t3Bar = scene.add
      .rectangle(OUTLINE_WIDTH, h - OUTLINE_WIDTH - 2, w - OUTLINE_WIDTH * 2, 2, 0xa47ce0)
      .setOrigin(0, 0);
    container.add(t3Bar);
  }

  // Make the building's inner fill interactive — clicking it fires
  // building:inspect (CityScene listens). The fill is the inner
  // rectangle inset by the outline; it covers the building's body
  // without bleeding outside the footprint.
  fill.setInteractive({ useHandCursor: true });
  fill.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    // Stop propagation so the click doesn't double-fire on the world.
    pointer.event.stopPropagation();
    scene.game.events.emit('building:inspect', { building });
  });

  renderedBuildings.set(buildingUid(building), container);
  return container;
}

/**
 * Render all buildings from state, skipping any already rendered.
 * Returns containers for newly-rendered ones so the caller can animate them.
 */
export function renderAllBuildings(
  scene: Phaser.Scene,
  buildings: readonly BuildingInstance[],
): Phaser.GameObjects.Container[] {
  const newOnes: Phaser.GameObjects.Container[] = [];
  for (const b of buildings) {
    if (renderedBuildings.has(buildingUid(b))) continue;
    const c = renderBuilding(scene, b);
    if (c) newOnes.push(c);
  }
  return newOnes;
}

/** Test / scene-reset helper — clear the cache. */
export function resetBuildingRenderCache(): void {
  renderedBuildings.clear();
}

/**
 * Re-render a building in place — used after a tier upgrade so the new
 * tier's visual treatment (fill color, badges) replaces the old one. The
 * old container is destroyed and a fresh one is rendered + animated.
 *
 * Returns the new container so the caller can chain the upgrade-pulse animation.
 */
export function replaceBuildingRender(
  scene: Phaser.Scene,
  building: BuildingInstance,
): Phaser.GameObjects.Container | null {
  // Look up by id+x+y — the SAME key for any tier of the same instance.
  const oldContainer = renderedBuildings.get(buildingUid(building));
  oldContainer?.destroy();
  renderedBuildings.delete(buildingUid(building));
  return renderBuilding(scene, building);
}

/**
 * Upgrade-pulse animation per design/06-style §Universal events:
 *   "scale-pulse 1 → 1.3 → 1 + brief flash + sprite swap to next-tier | 300ms"
 *
 * Called AFTER replaceBuildingRender so the new tier's visual is what scales.
 */
export function animateUpgradePulse(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
): void {
  // Scale-pulse from the center — Phaser containers scale from origin (top-left)
  // by default, so we set the container as its own scale anchor and translate
  // by half-extent on each frame. Simpler: scale via tween with no origin shift;
  // the visual offset is minor for our scale jump.
  scene.tweens.add({
    targets: container,
    scaleX: { from: 1, to: 1.3 },
    scaleY: { from: 1, to: 1.3 },
    duration: 150,
    yoyo: true,
    ease: 'Cubic.easeOut',
    onComplete: () => {
      container.setScale(1);
    },
  });

  // Brief gold-shimmer flash overlay.
  const w = (container.list[2] as Phaser.GameObjects.Rectangle).width;
  const h = (container.list[2] as Phaser.GameObjects.Rectangle).height;
  const flash = scene.add
    .rectangle(container.x, container.y, w, h, 0xffe680, 0.7)
    .setOrigin(0, 0)
    .setDepth(2.5);
  scene.tweens.add({
    targets: flash,
    alpha: 0,
    duration: 300,
    ease: 'Cubic.easeOut',
    onComplete: () => flash.destroy(),
  });
}

/**
 * Construction-drop animation per design/06-style §Universal events:
 *   "Sprite drops in from above with elastic-bounce ease + dust puff
 *    at landing | 400 ms"
 */
export function animateConstructionDrop(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
): void {
  const finalY = container.y;
  const dropDistance = 160; // pixels above final
  container.y = finalY - dropDistance;

  scene.tweens.add({
    targets: container,
    y: finalY,
    duration: 400,
    ease: 'Back.easeOut', // elastic-bounce feel
    onComplete: () => spawnDustPuff(scene, container),
  });
}

/** Tiny dust puff at the base of the footprint when construction lands. */
function spawnDustPuff(scene: Phaser.Scene, container: Phaser.GameObjects.Container): void {
  const entry = container.getData('entry') as { w: number; h: number } | undefined;
  void entry;
  // Use the container's first child (shadow) to figure out the base position.
  // Falls back to container origin if not yet set.
  const baseY = container.y + (container.list[0] as Phaser.GameObjects.Rectangle).height;
  const baseX = container.x;

  const puff = scene.add
    .ellipse(baseX + 32, baseY, 16, 8, 0x826048, 0.7)
    .setDepth(2.5);
  scene.tweens.add({
    targets: puff,
    scaleX: 4,
    scaleY: 4,
    alpha: 0,
    duration: 320,
    ease: 'Cubic.easeOut',
    onComplete: () => puff.destroy(),
  });
}
