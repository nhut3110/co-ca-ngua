import { openBoardTools } from './board-tools.mjs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createGame, DEFAULT_CONFIG } from '../packages/game-core/dist/index.js';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({
  viewport: { width: 1600, height: 1100 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
const game = createGame(DEFAULT_CONFIG, 2026);
await page.addInitScript((g) => localStorage.setItem('skyhoof.match.v1', JSON.stringify(g)), game);
await page.goto('http://127.0.0.1:4173');
await page.getByRole('button', { name: 'Tiếp tục ván đang chơi', exact: false }).click();
await page.waitForTimeout(5000);
await mkdir('artifacts/detail-review', { recursive: true });
await page.screenshot({ path: 'artifacts/detail-review/board.png' });
await page.clock.install({ time: new Date(0) });
await page.clock.pauseAt(new Date(60_000));
for (const [name, dx, dy] of [
  ['forest', 370, -220],
  ['celestial', -370, -220],
  ['snow', 370, 150],
  ['volcano', -370, 150],
  ['dice', 0, -350],
]) {
  await openBoardTools(page);
  await page
    .getByRole('button', { name: 'Đưa camera về góc ban đầu', exact: true })
    .click({ force: true });
  await page.mouse.move(800, 500);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(800 + dx, 500 + dy, { steps: 4 });
  await page.mouse.up({ button: 'right' });
  for (let i = 0; i < 17; i++) await page.mouse.wheel(0, -150);
  await page.clock.fastForward(1000);
  await page.screenshot({ path: `artifacts/detail-review/${name}-close.png` });
}
await openBoardTools(page);
await page
  .getByRole('button', { name: 'Đưa camera về góc ban đầu', exact: true })
  .click({ force: true });
await page.mouse.move(800, 500);
await page.mouse.down();
await page.mouse.move(1200, 560, { steps: 8 });
await page.mouse.up();
await page.clock.fastForward(1000);
await page.screenshot({ path: 'artifacts/detail-review/reverse-angle.png' });
await writeFile(
  'artifacts/detail-review/result.json',
  JSON.stringify(
    { errors, state: JSON.parse(await page.evaluate(() => window.render_game_to_text())) },
    null,
    2,
  ),
);
assert.deepEqual(errors, []);
console.log(JSON.stringify({ errors }));
await browser.close();
