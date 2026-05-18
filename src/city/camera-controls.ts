import Phaser from 'phaser';

/**
 * Camera controls — pan + integer zoom.
 *
 * Per design/05-map §Camera:
 *   - Pan: WASD / arrow keys / middle-mouse-drag
 *   - Zoom levels: 0.25× / 0.5× / 1× / 2× (integer-clean for nearest-neighbour)
 *   - Default zoom: 0.5× centered on Stone World plaza
 *   - Camera bounds: full 32×24 grid + ~2 tiles of margin
 *
 * Skipping fractional zoom levels (1.5×, 3×) prevents the sub-pixel
 * shimmer that breaks pixel-art sharpness per design/06-style §Pixel-art
 * principles rule #1.
 *
 * Zoom-on-cursor pattern: when zooming, the world point under the cursor
 * stays anchored to the screen point under the cursor — standard
 * city-builder camera convention.
 */

/**
 * Integer-clean zoom multiples for nearest-neighbour pixel-art rendering.
 * With TILE_SIZE = 32, the full 32×24 grid at 1× is 1024×768 (fits a
 * 1024-wide viewport already). Higher zooms let the player inspect detail.
 */
export const ZOOM_LEVELS: readonly number[] = [1, 2, 3, 4] as const;

const PAN_SPEED_PX_PER_SEC = 600;

interface CameraControlsOptions {
  /** Camera viewport bounds in world (source-pixel) coordinates. */
  worldBounds: { x: number; y: number; width: number; height: number };
  /** Where to clamp the camera (a few tiles of margin around the world). */
  panMargin: number;
  /** Default zoom level index into ZOOM_LEVELS. */
  defaultZoomIndex: number;
}

export function setupCameraControls(
  scene: Phaser.Scene,
  options: CameraControlsOptions,
): { teardown: () => void } {
  const cam = scene.cameras.main;

  // Set world bounds so the camera can't pan into the void.
  cam.setBounds(
    options.worldBounds.x - options.panMargin,
    options.worldBounds.y - options.panMargin,
    options.worldBounds.width + options.panMargin * 2,
    options.worldBounds.height + options.panMargin * 2,
  );

  let zoomIndex = options.defaultZoomIndex;
  cam.setZoom(ZOOM_LEVELS[zoomIndex]!);

  // Keyboard pan setup (cursor keys + WASD via custom keys).
  const cursors = scene.input.keyboard?.createCursorKeys();
  const wasd = {
    W: scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.W),
    A: scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A),
    S: scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.S),
    D: scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    PLUS: scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.PLUS),
    // `=` key (unshifted form of `+` on US QWERTY). Phaser KeyCodes doesn't
    // name this in our version, so we register by raw JS keyCode (187).
    EQUALS: scene.input.keyboard?.addKey(187),
    MINUS: scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.MINUS),
  };

  // Track when zoom keys were last pressed so we only step on the down event,
  // not while held — otherwise +/− would race through all zoom levels in one frame.
  let plusDownLast = false;
  let minusDownLast = false;

  const onUpdate = (_time: number, delta: number) => {
    const pxPerFrame = (PAN_SPEED_PX_PER_SEC * delta) / 1000 / cam.zoom;
    let dx = 0;
    let dy = 0;
    if (cursors?.left.isDown || wasd.A?.isDown) dx -= pxPerFrame;
    if (cursors?.right.isDown || wasd.D?.isDown) dx += pxPerFrame;
    if (cursors?.up.isDown || wasd.W?.isDown) dy -= pxPerFrame;
    if (cursors?.down.isDown || wasd.S?.isDown) dy += pxPerFrame;
    if (dx !== 0 || dy !== 0) {
      cam.scrollX += dx;
      cam.scrollY += dy;
    }

    // Zoom keys — edge-detect so a held key steps once per press.
    const plusDown = !!(wasd.PLUS?.isDown || wasd.EQUALS?.isDown);
    const minusDown = !!wasd.MINUS?.isDown;
    if (plusDown && !plusDownLast) stepZoom(+1);
    if (minusDown && !minusDownLast) stepZoom(-1);
    plusDownLast = plusDown;
    minusDownLast = minusDown;
  };

  function stepZoom(direction: 1 | -1, anchorScreen?: { x: number; y: number }): void {
    const next = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, zoomIndex + direction));
    if (next === zoomIndex) return;

    // Zoom-on-cursor: keep the world point under the anchor in place. If no
    // anchor is given (keyboard zoom), use the camera center.
    const anchorWorldBefore = anchorScreen
      ? cam.getWorldPoint(anchorScreen.x, anchorScreen.y)
      : { x: cam.midPoint.x, y: cam.midPoint.y };

    zoomIndex = next;
    cam.setZoom(ZOOM_LEVELS[zoomIndex]!);

    if (anchorScreen) {
      const anchorWorldAfter = cam.getWorldPoint(anchorScreen.x, anchorScreen.y);
      cam.scrollX += anchorWorldBefore.x - anchorWorldAfter.x;
      cam.scrollY += anchorWorldBefore.y - anchorWorldAfter.y;
    }
  }

  // Mouse wheel zoom — anchor under the cursor.
  const onWheel = (
    _pointer: Phaser.Input.Pointer,
    _objs: unknown,
    _dx: number,
    deltaY: number,
  ) => {
    if (deltaY === 0) return;
    const screen = { x: scene.input.activePointer.x, y: scene.input.activePointer.y };
    stepZoom(deltaY > 0 ? -1 : +1, screen);
  };
  scene.input.on('wheel', onWheel);

  // Middle-mouse drag pan — track pointer down + move while held.
  let dragLast: { x: number; y: number } | null = null;
  const onPointerDown = (pointer: Phaser.Input.Pointer) => {
    if (pointer.middleButtonDown()) {
      dragLast = { x: pointer.x, y: pointer.y };
    }
  };
  const onPointerMove = (pointer: Phaser.Input.Pointer) => {
    if (!dragLast || !pointer.middleButtonDown()) {
      dragLast = null;
      return;
    }
    const dxScreen = pointer.x - dragLast.x;
    const dyScreen = pointer.y - dragLast.y;
    cam.scrollX -= dxScreen / cam.zoom;
    cam.scrollY -= dyScreen / cam.zoom;
    dragLast = { x: pointer.x, y: pointer.y };
  };
  const onPointerUp = () => {
    dragLast = null;
  };
  scene.input.on('pointerdown', onPointerDown);
  scene.input.on('pointermove', onPointerMove);
  scene.input.on('pointerup', onPointerUp);

  scene.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);

  return {
    teardown: () => {
      scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate);
      scene.input.off('wheel', onWheel);
      scene.input.off('pointerdown', onPointerDown);
      scene.input.off('pointermove', onPointerMove);
      scene.input.off('pointerup', onPointerUp);
    },
  };
}
