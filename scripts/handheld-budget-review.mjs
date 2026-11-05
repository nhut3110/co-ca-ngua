import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createGame, DEFAULT_CONFIG, applyAction } from '../packages/game-core/dist/index.js';
import { openBoardTools } from './board-tools.mjs';
const out = 'artifacts/handheld-budget';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const context = await browser.newContext({
  viewport: { width: 844, height: 390 },
  deviceScaleFactor: 3,
  hasTouch: true,
  isMobile: true,
  serviceWorkers: 'block',
});
let seed = 1;
while (applyAction(createGame(DEFAULT_CONFIG, seed), { type: 'roll' }).die !== 6) seed++;
await context.addInitScript(
  (g) => {
    Object.defineProperty(navigator, 'standalone', { value: true });
    localStorage.setItem('skyhoof.match.v1', JSON.stringify(g));
  },
  createGame(DEFAULT_CONFIG, seed),
);
const page = await context.newPage();
page.setDefaultTimeout(120000);
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
const metrics = () => page.locator('.board-scene').evaluate((e) => JSON.parse(e.dataset.render));
try {
  await page.goto('http://127.0.0.1:4174');
  await page.getByRole('button', { name: 'Tiếp tục ván đang chơi', exact: false }).tap();
  await page.locator('.board-scene[data-ready=true]').waitFor();
  await page.waitForFunction(() => !JSON.parse(window.render_game_to_text()).presenting);
  await page.waitForTimeout(2500);
  const idle = await metrics();
  assert.equal(idle.dpr, 1);
  assert.ok(idle.fps <= 16, JSON.stringify(idle));
  await page.screenshot({ path: `${out}/mobile.png` });
  const die = await page.locator('.board-scene').evaluate((e) => JSON.parse(e.dataset.die));
  await page.touchscreen.tap(die.x, die.y);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).phase === 'move');
  await page.waitForFunction(() => !JSON.parse(window.render_game_to_text()).presenting);
  assert.equal(JSON.parse(await page.evaluate(() => window.render_game_to_text())).die, 6);
  await page.getByRole('button', { name: 'Chọn quân bằng danh sách', exact: true }).tap();
  await page.getByRole('button', { name: 'Chọn quân 1', exact: true }).tap();
  await page.locator('#confirm-move').tap();
  await page.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).horses[0].progress === 0,
  );
  await openBoardTools(page);
  await page.getByRole('button', { name: 'Tạm dừng', exact: true }).tap();
  await page.locator('.pause-overlay').waitFor();
  const before = await metrics();
  await page.waitForTimeout(1600);
  const after = await metrics();
  assert.ok(after.renders - before.renders <= 2, JSON.stringify({ before, after }));
  await page.locator('.pause-overlay').getByRole('button', { name: 'Tiếp tục', exact: true }).tap();
  await page.waitForFunction(() => !JSON.parse(window.render_game_to_text()).paused);
  assert.deepEqual(errors, []);
  await writeFile(
    `${out}/result.json`,
    JSON.stringify(
      { idle, pauseFrames: after.renders - before.renders, roll: true, move: true, errors },
      null,
      2,
    ),
  );
  console.log(
    'Handheld budget and gameplay passed',
    JSON.stringify({ idle, pauseFrames: after.renders - before.renders }),
  );
} finally {
  await browser.close();
}
