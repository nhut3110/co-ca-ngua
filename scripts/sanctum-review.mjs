import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import {
  createGame,
  DEFAULT_CONFIG,
  applyAction,
  playableMoves,
} from '../packages/game-core/dist/index.js';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
const out = 'artifacts/sanctum';
await mkdir(out, { recursive: true });
const frames = () =>
  page.evaluate(async () => {
    for (let i = 0; i < 5; i++) await new Promise(requestAnimationFrame);
  });
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
try {
  await page.goto('http://127.0.0.1:4173');
  await page.locator('#create-game').click();
  await page.locator('#next-step').click();
  await page.locator('#next-step').click();
  assert.equal(
    await page.getByRole('button', { name: 'Cổ điển', exact: false }).getAttribute('aria-pressed'),
    'true',
  );
  await page.locator('.board-scene[data-ready=true]').waitFor();
  await frames();
  await page.screenshot({ path: `${out}/classic.png` });
  console.log('Classic captured');
  await page.getByRole('button', { name: 'Đại viễn chinh', exact: false }).click();
  await frames();
  await page.screenshot({ path: `${out}/grand-setup.png` });
  console.log('Grand setup captured');
  await page.locator('#start-game').click();
  await page.locator('.immersive-game .board-scene[data-ready=true]').waitFor();
  await frames();
  assert.equal((await state()).config.board, 'grand');
  await page.screenshot({ path: `${out}/grand.png` });
  await page.locator('#roll-dice').click();
  await page.waitForFunction(() => !JSON.parse(window.render_game_to_text()).presenting);
  assert.ok((await state()).die);
  await page.screenshot({ path: `${out}/grand-roll.png` });
  console.log('Grand roll captured');
  const config = {
    ...structuredClone(DEFAULT_CONFIG),
    board: 'grand',
    playerCount: 2,
    horsesPerPlayer: 2,
  };
  const game = createGame(config, 123);
  game.phase = 'move';
  game.die = game.rawDie = 1;
  game.horses[0].progress = 79;
  await page.evaluate((g) => localStorage.setItem('skyhoof.match.v1', JSON.stringify(g)), game);
  await page.reload();
  await page.getByRole('button', { name: 'Tiếp tục ván đang chơi', exact: false }).click();
  await page.locator('.board-scene[data-ready=true]').waitFor();
  await frames();
  await page.getByRole('button', { name: 'Chọn quân bằng danh sách', exact: true }).click();
  await page.getByRole('button', { name: 'Chọn quân 1', exact: true }).click();
  await page.locator('#confirm-move').click();
  await page.waitForFunction(() => !JSON.parse(window.render_game_to_text()).presenting);
  assert.equal((await state()).horses[0].progress, 80);
  await page.setViewportSize({ width: 844, height: 390 });
  await frames();
  await page.screenshot({ path: `${out}/grand-mobile.png` });
  const saved = await state();
  await page.reload();
  await page.getByRole('button', { name: 'Tiếp tục ván đang chơi', exact: false }).click();
  assert.equal((await state()).horses[0].progress, 80);
  assert.deepEqual(errors, []);
  await writeFile(
    `${out}/result.json`,
    JSON.stringify({ errors, board: saved.config.board, homeEntry: 80 }, null, 2),
  );
  console.log('Sanctum QA passed');
} finally {
  await browser.close();
}
