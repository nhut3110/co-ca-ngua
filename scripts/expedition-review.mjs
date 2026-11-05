import { openBoardTools } from './board-tools.mjs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { createGame, DEFAULT_CONFIG } from '../packages/game-core/dist/index.js';
import { maps, skies, skins, diceStyles } from '../packages/catalog/dist/index.js';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
page.setDefaultTimeout(120000);
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
const out = 'artifacts/expedition';
await mkdir(out, { recursive: true });
const frames = () =>
  page.evaluate(async () => {
    for (let i = 0; i < 5; i++) await new Promise(requestAnimationFrame);
  });
try {
  await page.goto('http://127.0.0.1:4173');
  for (const i of process.env.NIGHT_ONLY
    ? [3]
    : process.env.FINAL_VISUAL
      ? [3, 0]
      : [0, 1, 2, 3, 4]) {
    const config = structuredClone(DEFAULT_CONFIG);
    config.cosmetics.mapId = maps[i % 4].id;
    config.cosmetics.skyId = skies[i % 4].id;
    config.cosmetics.diceId = diceStyles[i].id;
    config.cosmetics.biomeIds = ['forest', 'snow', 'mushroom', 'ruins'];
    config.cosmetics.skinIds = Array.from(
      { length: 4 },
      (_, j) => skins[(i * 4 + j) % skins.length].id,
    );
    await page.evaluate(
      (g) => localStorage.setItem('skyhoof.match.v1', JSON.stringify(g)),
      createGame(config, 2026),
    );
    await page.reload();
    await page.getByRole('button', { name: 'Tiếp tục ván đang chơi', exact: false }).click();
    await page.locator('.board-scene[data-ready=true]').waitFor();
    await frames();
    const state = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
    assert.equal(state.config.cosmetics.diceId, diceStyles[i].id);
    await page.screenshot({ path: `${out}/world-${i}.png` });
    console.log('World', i, config.cosmetics);
    if (i === 0) {
      await openBoardTools(page);
      await page.getByRole('button', { name: 'Đưa camera về góc ban đầu', exact: true }).click();
      await page.mouse.move(550, 380);
      await page.mouse.down({ button: 'right' });
      await page.mouse.move(790, 240);
      await page.mouse.up({ button: 'right' });
      await page.locator('canvas').evaluate((c) => {
        for (let n = 0; n < 12; n++)
          c.dispatchEvent(
            new WheelEvent('wheel', { deltaY: -120, bubbles: true, cancelable: true }),
          );
      });
      for (let settle = 0; settle < 6; settle++) await frames();
      await page.screenshot({ path: `${out}/water-a.png` });
      await frames();
      await page.screenshot({ path: `${out}/water-b.png` });
    }
  }
  if (process.env.NIGHT_ONLY) {
    assert.deepEqual(errors, []);
    console.log('Night sky review passed');
    process.exitCode = 0;
  } else {
    await page.evaluate(() => localStorage.removeItem('skyhoof.match.v1'));
    await page.reload();
    await page.setViewportSize({ width: 844, height: 390 });
    await page.locator('#create-game').click();
    for (let i = 0; i < 2; i++) {
      await page.locator('#next-step').click();
    }
    await page.locator('.board-scene[data-ready=true]').waitFor();
    await frames();
    await page.locator('.atelier-tabs button').filter({ hasText: 'Đội hình' }).click();
    await page.locator('.recruit-grid button').last().scrollIntoViewIfNeeded();
    await page.locator('.recruit-grid button').last().click();
    const footer = await page.locator('#start-game').boundingBox();
    assert.ok(footer.y >= 0 && footer.y + footer.height <= 390);
    await page.screenshot({ path: `${out}/mobile-forge.png` });
    assert.deepEqual(errors, []);
    await writeFile(
      `${out}/result.json`,
      JSON.stringify(
        {
          errors,
          models: skins.length,
          maps: maps.length,
          skies: skies.length,
          dice: diceStyles.length,
        },
        null,
        2,
      ),
    );
    console.log('Expedition review passed');
  }
} finally {
  await browser.close();
}
