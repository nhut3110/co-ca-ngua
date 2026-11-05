import { openBoardTools } from './board-tools.mjs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { createGame, DEFAULT_CONFIG } from '../packages/game-core/dist/index.js';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
page.setDefaultTimeout(120000);
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
const out = 'artifacts/world-review';
await mkdir(out, { recursive: true });
const config = structuredClone(DEFAULT_CONFIG);
config.cosmetics.biomeIds = ['forest', 'snow', 'mushroom', 'ruins'];
await page.addInitScript(
  (g) => localStorage.setItem('skyhoof.match.v1', JSON.stringify(g)),
  createGame(config, 2026),
);
try {
  await page.goto('http://127.0.0.1:4173');
  await page.getByRole('button', { name: 'Tiếp tục ván đang chơi', exact: false }).click();
  await page.locator('.board-scene[data-ready=true]').waitFor();
  await page.waitForTimeout(1800);
  assert.equal(await page.locator('.game-panel').count(), 0);
  let b = await page.locator('canvas').boundingBox();
  assert.equal(b.width, 1440);
  assert.equal(b.height, 900);
  assert.equal(b.y, 0);
  await page.screenshot({ path: `${out}/desktop.png` });
  console.log('Desktop captured');
  const metrics = await page.locator('.board-scene').getAttribute('data-render');
  for (const [name, dx, dy] of [
    ['forest-river', 290, -170],
    ['ruins', -290, -170],
    ['mushroom', -290, 120],
  ]) {
    await openBoardTools(page);
    await page.getByRole('button', { name: 'Đưa camera về góc ban đầu', exact: true }).click();
    await page.mouse.move(720, 450);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(720 + dx, 450 + dy, { steps: 1 });
    await page.mouse.up({ button: 'right' });
    await page.locator('canvas').evaluate((canvas) => {
      for (let i = 0; i < 12; i++)
        canvas.dispatchEvent(
          new WheelEvent('wheel', { deltaY: -120, bubbles: true, cancelable: true }),
        );
    });
    await page.evaluate(async () => {
      for (let i = 0; i < 8; i++) await new Promise(requestAnimationFrame);
    });
    await page.screenshot({ path: `${out}/${name}.png` });
    console.log(name);
  }
  await openBoardTools(page);
  await page.getByRole('button', { name: 'Đưa camera về góc ban đầu', exact: true }).click();
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(1600);
  b = await page.locator('canvas').boundingBox();
  assert.equal(b.width, 844);
  assert.equal(b.height, 390);
  await page.screenshot({ path: `${out}/landscape.png` });
  assert.deepEqual(errors, []);
  await writeFile(
    `${out}/result.json`,
    JSON.stringify({ errors, metrics: JSON.parse(metrics) }, null, 2),
  );
  console.log(JSON.stringify({ errors, metrics: JSON.parse(metrics) }));
} finally {
  await browser.close();
}
