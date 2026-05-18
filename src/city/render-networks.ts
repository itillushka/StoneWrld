import Phaser from 'phaser';
import type { NetworkAnalysis, PowerNetwork } from '../economy/network';
import { TILE_SIZE, WORLD_WIDTH_PX, WORLD_HEIGHT_PX } from './grid';
import type { BuildingInstance } from '../state/schema';
import { getBuilding } from '../catalog/buildings';

/**
 * Render coverage halos + chain lines + off-grid indicators.
 *
 * Per design/05-map §Power coverage §Visualization:
 *   - Generator + pole coverage halos at ~20% gold alpha (always visible)
 *   - Brownout networks → halos shift to dim red
 *   - Off-grid demanders → small red dot above the sprite
 *   - Network chain lines: thin gold between connected pole/gen centers
 *
 * Phase 7 ships the halo + off-grid dot. Power overlay (Phase 13) makes
 * these more prominent when the user toggles "Power" in the HUD overlay panel.
 */

const HALO_ALPHA = 0.18;
const HALO_COLOR_OK = 0xffc940; // captain gold
const HALO_COLOR_BROWNOUT = 0xe84b4b; // error red
const OFFGRID_DOT_COLOR = 0xe84b4b;
const OFFGRID_DOT_SIZE = 14;

export interface RenderedNetworks {
  haloLayer: Phaser.GameObjects.Image;
  offGridDots: Phaser.GameObjects.Container;
  destroy: () => void;
}

/** Build a single packed texture for all halos, then add it as one image. */
export function renderNetworkHalos(
  scene: Phaser.Scene,
  analysis: NetworkAnalysis,
  textureKey: string,
): Phaser.GameObjects.Image {
  const g = scene.add.graphics();

  for (const net of analysis.networks) {
    const color = net.state === 'brownout' ? HALO_COLOR_BROWNOUT : HALO_COLOR_OK;
    g.fillStyle(color, HALO_ALPHA);
    for (const key of net.coveredTiles) {
      const [xs, ys] = key.split(',');
      const x = Number(xs);
      const y = Number(ys);
      g.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  // Texture key needs to be fresh-on-rebuild so Phaser doesn't cache stale.
  g.generateTexture(textureKey, WORLD_WIDTH_PX, WORLD_HEIGHT_PX);
  g.destroy();

  // Depth between terrain (0/1) and buildings (2) — halos sit on terrain
  // but UNDER the buildings so building art reads clearly.
  return scene.add.image(0, 0, textureKey).setOrigin(0, 0).setDepth(1.5);
}

/** Render small red dots above each off-grid demander's footprint. */
export function renderOffGridDots(
  scene: Phaser.Scene,
  offGrid: readonly BuildingInstance[],
): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);
  container.setDepth(3); // above buildings

  for (const b of offGrid) {
    const entry = getBuilding(b.id);
    if (!entry) continue;
    const centerX = (b.x + entry.footprint.w / 2) * TILE_SIZE;
    const topY = b.y * TILE_SIZE - 4;

    const bg = scene.add
      .circle(centerX, topY, OFFGRID_DOT_SIZE / 2 + 2, 0x0a1228)
      .setStrokeStyle(2, 0x0a1228);
    const dot = scene.add.circle(centerX, topY, OFFGRID_DOT_SIZE / 2, OFFGRID_DOT_COLOR);
    container.add(bg);
    container.add(dot);

    // Subtle alpha-pulse to draw the eye.
    scene.tweens.add({
      targets: dot,
      alpha: { from: 1, to: 0.4 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });
  }

  return container;
}

/** Brownout shake: jitter all in-coverage demanders ±2 px every 2 seconds. */
export function startBrownoutShake(
  scene: Phaser.Scene,
  networks: readonly PowerNetwork[],
  buildingContainerByUid: Map<string, Phaser.GameObjects.Container>,
): { stop: () => void } {
  const tweens: Phaser.Tweens.Tween[] = [];
  for (const net of networks) {
    if (net.state !== 'brownout') continue;
    for (const d of net.demanders) {
      const c = buildingContainerByUid.get(`${d.id}@${d.x},${d.y}`);
      if (!c) continue;
      const baseX = c.x;
      const t = scene.tweens.add({
        targets: c,
        x: { from: baseX - 2, to: baseX + 2 },
        duration: 80,
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 1000, // stagger so all buildings don't shake in sync
      });
      tweens.push(t);
    }
  }
  return {
    stop: () => {
      for (const t of tweens) t.stop();
    },
  };
}
