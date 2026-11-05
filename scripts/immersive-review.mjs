import { openBoardTools } from './board-tools.mjs';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createGame, DEFAULT_CONFIG, applyAction } from '../packages/game-core/dist/index.js';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const context = await browser.newContext({
  viewport: { width: 844, height: 390 },
  hasTouch: true,
  isMobile: true,
});
await context.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
const page = await context.newPage();
page.setDefaultTimeout(120000);
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
const out = 'artifacts/immersive';
await mkdir(out, { recursive: true });
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const frames = () =>
  page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
async function fixture(g) {
  await page.evaluate((g) => localStorage.setItem('skyhoof.match.v1', JSON.stringify(g)), g);
  await page.reload();
  await page.getByRole('button', { name: 'Tiếp tục ván đang chơi', exact: false }).tap();
  await page.locator('.board-scene[data-ready=true]').waitFor();
  await frames();
}
async function piece(id) {
  await page.waitForFunction((id) => {
    const raw = document.querySelector('.board-scene')?.dataset.pieces;
    return raw && JSON.parse(raw).some((p) => p.id === id && p.active);
  }, id);
  return page
    .locator('.board-scene')
    .evaluate((el, id) => JSON.parse(el.dataset.pieces).find((p) => p.id === id), id);
}
try {
  await page.goto(process.env.WEB_URL ?? 'http://127.0.0.1:4173');
  let seed = 1;
  while (applyAction(createGame(DEFAULT_CONFIG, seed), { type: 'roll' }).die !== 6) seed++;
  await fixture(createGame(DEFAULT_CONFIG, seed));
  assert.equal(await page.locator('.game-panel').count(), 0);
  let scene = await page.locator('.board-scene').boundingBox();
  assert.ok(scene.width >= 840 && scene.height >= 386, JSON.stringify(scene));
  await page.screenshot({ path: `${out}/01-full-board.png` });
  await page.locator('#roll-dice').tap();
  await page.waitForFunction(() => !JSON.parse(window.render_game_to_text()).presenting);
  assert.equal((await state()).die, 6);
  const p = await piece('p0-h0');
  await page.touchscreen.tap(p.x, p.y);
  await page.locator('#confirm-move').waitFor();
  assert.match(await page.locator('#confirm-move').innerText(), /Xuất quân/);
  assert.equal((await state()).horses[0].progress, -1);
  await page.screenshot({ path: `${out}/02-direct-select.png` });
  await page.getByRole('button', { name: 'Hủy chọn quân', exact: true }).tap();
  assert.equal(await page.locator('#confirm-move').count(), 0);
  await page.getByRole('button', { name: 'Chọn quân bằng danh sách', exact: true }).tap();
  await page.getByRole('button', { name: 'Chọn quân 2', exact: true }).tap();
  await page.locator('#confirm-move').tap();
  await page.waitForFunction(() => !JSON.parse(window.render_game_to_text()).presenting);
  assert.equal((await state()).horses[1].progress, 0);
  // Selection was a real scene raycast; now verify camera gestures don't issue moves.
  await openBoardTools(page);
  await page.getByRole('button', { name: 'Mở xoay bàn cờ', exact: true }).tap();
  assert.equal(await page.locator('.camera-mode-hint').count(), 1);
  await page.getByRole('button', { name: 'Xong', exact: true }).tap();
  const before = (await state()).horses;
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: 410, y: 200, id: 1 },
      { x: 460, y: 210, id: 2 },
    ],
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [
      { x: 380, y: 180, id: 1 },
      { x: 500, y: 230, id: 2 },
    ],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.deepEqual((await state()).horses, before);
  await openBoardTools(page);
  await page.getByRole('button', { name: 'Đưa camera về góc ban đầu', exact: true }).tap();
  await openBoardTools(page);
  await page.getByRole('button', { name: 'Tạm dừng', exact: true }).tap();
  await page.getByRole('button', { name: 'Âm thanh & cài đặt', exact: true }).tap();
  await page.getByRole('slider', { name: 'Âm lượng nhạc nền' }).fill('20');
  await page.getByRole('button', { name: 'Đóng', exact: true }).tap();
  await page.locator('.pause-overlay').getByRole('button', { name: 'Tiếp tục', exact: true }).tap();
  let g = createGame(DEFAULT_CONFIG, seed);
  g.phase = 'move';
  g.die = g.rawDie = 6;
  g.horses[0].progress = 11;
  g.horses[4].progress = 4;
  await fixture(g);
  await page.keyboard.press('1');
  await page.locator('#confirm-move').waitFor();
  assert.match(await page.locator('#confirm-move').innerText(), /Đá quân/);
  await page.screenshot({ path: `${out}/03-capture-preview.png` });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => !JSON.parse(window.render_game_to_text()).presenting);
  assert.equal((await state()).horses[4].progress, -1);
  g = createGame(DEFAULT_CONFIG, seed);
  g.config.modules.spells = true;
  g.players[0].mana = 3;
  g.horses[0].progress = 11;
  await fixture(g);
  await page.getByRole('button', { name: 'Phép thuật', exact: true }).tap();
  await page.getByRole('button', { name: 'Kết giới', exact: false }).tap();
  const target = await piece('p0-h0');
  await page.touchscreen.tap(target.x, target.y);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).horses[0].shield);
  await page.waitForFunction(() => !JSON.parse(window.render_game_to_text()).presenting);
  assert.equal(await page.locator('.floating-spells').count(), 0);
  for (const [width, height] of [
    [740, 360],
    [1280, 500],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await frames();
    const box = await page.locator('.board-scene').boundingBox();
    assert.ok(box.width >= width - 4 && box.height >= height - 4);
    const roll = await page.locator('#roll-dice').boundingBox();
    assert.ok(roll.x + roll.width <= width && roll.y + roll.height <= height);
  }
  await page.screenshot({ path: `${out}/04-mobile-final.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('heading', { name: 'Xoay ngang để vào bàn' }).waitFor();
  assert.equal((await state()).paused, true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await frames();
  assert.equal(await page.locator('.game-panel').count(), 0);
  const desktop = await page.locator('.board-scene').boundingBox();
  assert.equal(desktop.width, 1440);
  assert.equal(desktop.height, 1000);
  assert.deepEqual(errors, []);
  await writeFile(
    `${out}/result.json`,
    JSON.stringify(
      {
        errors,
        state: await state(),
        checks: [
          'full viewport',
          'direct 3D selection',
          'cancel',
          'accessible picker',
          'confirm',
          'two-finger camera',
          'pause/settings',
          'capture',
          'shield',
          'three landscape sizes',
          'portrait gate',
          'desktop full viewport',
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    'Immersive QA passed: full-screen map, direct picking/cancel/confirm, picker, gestures, capture, spells, pause/settings, layouts and desktop full viewport.',
  );
} finally {
  await browser.close();
}
