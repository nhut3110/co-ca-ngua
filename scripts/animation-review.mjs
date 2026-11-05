import { openBoardTools } from './board-tools.mjs';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createGame, DEFAULT_CONFIG, applyAction } from '../packages/game-core/dist/index.js';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
let seed = 1;
while (applyAction(createGame(DEFAULT_CONFIG, seed), { type: 'roll' }).die !== 6) seed++;
const g = createGame(DEFAULT_CONFIG, seed);
g.horses[0].progress = 11;
g.horses[4].progress = 4;
await page.addInitScript((g) => localStorage.setItem('skyhoof.match.v1', JSON.stringify(g)), g);
await page.goto('http://127.0.0.1:4173');
await page.getByRole('button', { name: 'Tiếp tục ván đang chơi', exact: false }).click();
await page.waitForTimeout(4000);
await page.screenshot({ path: 'artifacts/browser/world-final.png' });
await page.clock.install({ time: new Date(0) });
await page.clock.pauseAt(new Date(60_000));
await page.locator('#roll-dice').click({ force: true });
assert.ok(await page.locator('#roll-dice').isDisabled());
await page.clock.fastForward(250);
await page.screenshot({ path: 'artifacts/browser/dice-throw.png' });
await openBoardTools(page);
await page.getByRole('button', { name: 'Tạm dừng', exact: true }).click({ force: true });
await page.clock.fastForward(700);
assert.equal(JSON.parse(await page.evaluate(() => window.render_game_to_text())).presenting, true);
await page
  .locator('.pause-overlay')
  .getByRole('button', { name: 'Tiếp tục', exact: true })
  .click({ force: true });
await page.clock.fastForward(1100);
await page.screenshot({ path: 'artifacts/browser/dice-magic-impact.png' });
await page.clock.fastForward(1100);
assert.equal(JSON.parse(await page.evaluate(() => window.render_game_to_text())).die, 6);
await page.screenshot({ path: 'artifacts/browser/dice-settled.png' });
await page.getByRole('button', { name: 'Chọn quân 1', exact: true }).click({ force: true });
assert.equal(
  JSON.parse(await page.evaluate(() => window.render_game_to_text())).horses[0].progress,
  11,
);
assert.match(await page.locator('#confirm-move').innerText(), /Đá quân/);
await page.locator('#confirm-move').click({ force: true });
await page.clock.fastForward(450);
await page.screenshot({ path: 'artifacts/browser/move-mid.png' });
await page.clock.fastForward(700);
assert.match(await page.locator('.battle-notice').innerText(), /ĐÁ QUÂN/);
await page.screenshot({ path: 'artifacts/browser/capture-impact.png' });
await page.clock.fastForward(1500);
const s = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
assert.equal(s.horses[0].progress, 17);
assert.equal(s.horses[4].progress, -1);
await page.screenshot({ path: 'artifacts/browser/move-landed.png' });
await page.setViewportSize({ width: 390, height: 844 });
await page.clock.fastForward(700);
await page.screenshot({ path: 'artifacts/browser/world-mobile.png', fullPage: true });
assert.deepEqual(errors, []);
console.log('Animation review passed: six roll, input lock, capture, landing, no console errors.');
await browser.close();
