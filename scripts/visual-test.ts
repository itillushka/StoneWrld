/**
 * Headless visual smoke test — drives the StoneWrld game via Playwright and
 * captures screenshots through key user flows.
 *
 * Usage: npm run visual-test  (requires `npm run dev` running on :5100)
 *
 * Output: writes PNGs to .playwright-screenshots/ (gitignored).
 *
 * This is a TOOLING script for captain-side verification, not a Vitest
 * unit test. The Vitest suite stays node-only per design/08-architecture
 * §Test scope v1 — no browser tests in v1, but ad-hoc visual verification
 * during development is encouraged.
 */

import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');
const OUT_DIR = path.join(REPO_ROOT, '.playwright-screenshots');
const URL = 'http://127.0.0.1:5100/';

async function shoot(page: import('playwright').Page, name: string): Promise<void> {
  const p = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  console.log(`  ✓ ${name}.png`);
}

async function main(): Promise<void> {
  await fs.mkdir(OUT_DIR, { recursive: true });

  console.log('Launching headless Chromium…');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
  });
  const page = await context.newPage();

  // Log any errors / warnings — captain's-log discipline, never silent.
  page.on('console', (msg) => {
    const t = msg.type();
    if (t === 'error' || t === 'warning') {
      console.log(`  [browser:${t}] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => console.log(`  [browser:pageerror] ${err.message}`));

  console.log(`Navigating to ${URL} (1600 × 900 viewport)…`);
  await page.goto(URL, { waitUntil: 'networkidle' });

  // Wait for Phaser to settle past BootScene → PreloadScene → CityScene.
  // Boot is 150ms delayedCall, preload depends on state.json + map + catalog
  // + tech tree fetches — give it generous time.
  await page.waitForTimeout(2500);

  console.log('Screenshots:');
  await shoot(page, '01-city-default');

  // Open Build modal.
  console.log('Clicking [ Build ]…');
  // The button text is rendered to canvas — we can't click by text. Instead
  // click roughly where the button sits in the sidebar. Sidebar right-aligned
  // at width-256, button #1 is below the resources panel + networks panel.
  // Approx coords: x ≈ width-128 (sidebar middle), y ≈ 16+96+32+150+96+0+18
  const w = 1600;
  const h = 900;
  // Button stack starts around y = (16 portrait-top + 96 portrait-h + 8 label +
  //   30 padding + 5*28 resources + 16 + 22 networks-heading + 30 + 60 networks
  //   + 16 + 96 + 0) → roughly 414. Each button is 36 tall + 8 gap = 44 stride.
  // Don't try to be exact — click 3 progressively-lower y positions and screenshot each.
  await page.mouse.click(w - 128, 460);
  await page.waitForTimeout(600);
  await shoot(page, '02-build-modal');

  // Press Escape to close.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // Tab to Research.
  console.log('Pressing Tab → Research…');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(800);
  await shoot(page, '03-research-tree');

  // Scroll wheel down in research scene to test the dense lanes.
  await page.mouse.move(w / 2 - 100, h / 2);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(300);
  await shoot(page, '04-research-scrolled');

  // Hover over a tech node to verify the arrow-highlight focus mode.
  // Scroll back to top first so M2 column is at predictable y.
  await page.mouse.wheel(0, -1000);
  await page.waitForTimeout(300);
  // Iron Smelting sits in Materials lane, M2 column — roughly here:
  await page.mouse.move(285, 158);
  await page.waitForTimeout(300);
  await shoot(page, '04b-research-hover');

  // Tab back to City.
  await page.keyboard.press('Tab');
  await page.waitForTimeout(600);
  await shoot(page, '05-city-after-tab-back');

  // Captain's Log button — bottom of the action stack.
  console.log('Opening Captain\'s Log…');
  await page.mouse.click(w - 128, 548);
  await page.waitForTimeout(600);
  await shoot(page, '06-captains-log');

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // Resize test — narrow the viewport to ~1200 wide.
  console.log('Resizing viewport to 1200 × 800…');
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.waitForTimeout(600);
  await shoot(page, '07-city-1200x800');

  await browser.close();
  console.log(`\nDone. Screenshots in ${OUT_DIR}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
