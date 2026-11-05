import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createGame, DEFAULT_CONFIG } from '../packages/game-core/dist/index.js';
const out = 'artifacts/sky-events';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({
  viewport: { width: 844, height: 390 },
  hasTouch: true,
  isMobile: true,
  serviceWorkers: 'block',
});
page.setDefaultTimeout(120000);
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
const config = structuredClone(DEFAULT_CONFIG);
config.modules = { spells: true, portals: true, comeback: true, events: true };
const g = createGame(config, 1);
g.phase = 'move';
g.die = g.rawDie = 2;
await page.addInitScript((g) => {
  Object.defineProperty(navigator, 'standalone', { value: true });
  if (!sessionStorage.getItem('fixture')) {
    localStorage.setItem('skyhoof.match.v1', JSON.stringify(g));
    sessionStorage.setItem('fixture', '1');
  }
}, g);
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
try {
  await page.goto('http://127.0.0.1:4174');
  await page.getByRole('button', { name: 'Tiếp tục ván đang chơi', exact: false }).tap();
  await page.locator('.board-scene[data-ready=true]').waitFor();
  await page.waitForFunction(() => !JSON.parse(window.render_game_to_text()).presenting);
  assert.equal((await state()).event, 'tailwind');
  assert.ok((await state()).legalMoves.includes('p0-h0'));
  const event = await page.locator('.sky-event').boundingBox();
  const mana = await page.locator('.floating-mana').boundingBox();
  assert.ok(event.y + event.height <= mana.y);
  await page.screenshot({ path: `${out}/mobile-winds.png` });
  await page.getByRole('button', { name: 'Chọn quân bằng danh sách', exact: true }).tap();
  await page.getByRole('button', { name: 'Chọn quân 1', exact: true }).tap();
  await page.locator('#confirm-move').tap();
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).horses[0].progress === 0,
  );
  await page.reload();
  await page.getByRole('button', { name: 'Tiếp tục ván đang chơi', exact: false }).tap();
  await page.locator('.board-scene[data-ready=true]').waitFor();
  assert.equal((await state()).horses[0].progress, 0);
  assert.equal((await state()).event, 'tailwind');
  await page.setViewportSize({ width: 1280, height: 850 });
  await page.screenshot({ path: `${out}/desktop-restored.png` });
  assert.deepEqual(errors, []);
  console.log(
    'Sky events browser flow passed: event display, mobile spell control spacing, deployment on 2, restore.',
  );
} finally {
  await browser.close();
}
