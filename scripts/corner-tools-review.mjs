import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createGame, DEFAULT_CONFIG } from '../packages/game-core/dist/index.js';
import { openBoardTools } from './board-tools.mjs';
const out = 'artifacts/corner-tools';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({
  viewport: { width: 1280, height: 850 },
  hasTouch: true,
  serviceWorkers: 'block',
});
page.setDefaultTimeout(120000);
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
await page.addInitScript(
  (g) => {
    Object.defineProperty(navigator, 'standalone', { value: true });
    localStorage.setItem('skyhoof.match.v1', JSON.stringify(g));
  },
  createGame(DEFAULT_CONFIG, 42),
);
try {
  await page.goto('http://127.0.0.1:4173');
  await page.getByRole('button', { name: 'Tiếp tục ván đang chơi', exact: false }).click();
  await page.locator('.board-scene[data-ready=true]').waitFor();
  await page.waitForFunction(() => !JSON.parse(window.render_game_to_text()).presenting);
  for (const [name, width, height] of [
    ['desktop', 1280, 850],
    ['mobile', 844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    const dock = page.locator('.command-dock');
    const box = await dock.boundingBox();
    assert.ok(box.width <= 44 && box.height <= 44 && box.x > width - 70 && box.y < 20);
    assert.equal(await page.locator('.dock-primary button').count(), 1);
    await page.screenshot({ path: `${out}/${name}.png` });
    await openBoardTools(page);
    const menu = await page.locator('#board-tools').boundingBox();
    assert.ok(menu.x >= 0 && menu.x + menu.width <= width && menu.y + menu.height <= height);
    await page.getByRole('button', { name: 'Phóng to bàn cờ', exact: true }).click();
    await page.screenshot({ path: `${out}/${name}-menu.png` });
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#board-tools').count(), 0);
    assert.equal(JSON.parse(await page.evaluate(() => window.render_game_to_text())).paused, false);
    await openBoardTools(page);
    await page.getByRole('button', { name: 'Tạm dừng', exact: true }).click();
    await page.locator('.pause-overlay').waitFor();
    await page
      .locator('.pause-overlay')
      .getByRole('button', { name: 'Tiếp tục', exact: true })
      .click();
    await page.waitForFunction(() => !JSON.parse(window.render_game_to_text()).paused);
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${out}/result.json`,
    JSON.stringify(
      {
        compactCorner: true,
        containedMenu: true,
        camera: true,
        escapeWithoutPause: true,
        pauseResume: true,
        errors,
      },
      null,
      2,
    ),
  );
  console.log('Corner tools review passed');
} finally {
  await browser.close();
}
