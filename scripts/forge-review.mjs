import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({
  viewport: { width: 1500, height: 960 },
  deviceScaleFactor: 1,
});
page.setDefaultTimeout(120000);
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
const out = 'artifacts/forge';
await mkdir(out, { recursive: true });
const frames = () =>
  page.evaluate(async () => {
    for (let i = 0; i < 4; i++) await new Promise(requestAnimationFrame);
  });
const shot = async (n) => {
  await frames();
  await page.screenshot({ path: `${out}/${n}.png` });
  console.log(n);
};
try {
  await page.goto('http://127.0.0.1:4173');
  await page.locator('#create-game').click();
  await page.locator('.board-scene[data-ready=true]').waitFor();
  await shot('01-gather');
  assert.equal(await page.getByRole('slider', { name: 'Độ khó của bot' }).inputValue(), '3');
  await page.locator('#next-step').click();
  await page.getByText('Tinh thạch & phép', { exact: true }).click();
  await shot('02-runes');
  await page.locator('#next-step').click();
  await page.getByRole('button', { name: 'Hoàng hôn', exact: true }).click();
  await page.getByRole('button', { name: 'Thành trì lơ lửng', exact: false }).click();
  await shot('03-realm');
  await page.locator('.atelier-tabs button').filter({ hasText: 'Đội hình' }).click();
  assert.equal(await page.locator('.recruit-grid button').count(), 10);
  await page.locator('.recruit-grid button').filter({ hasText: 'Hiệp sĩ' }).click();
  await shot('04-recruits');
  await page.getByRole('button', { name: 'Góc 2', exact: true }).click();
  await page.locator('.recruit-grid button').filter({ hasText: 'Pháp sư' }).click();
  await page.getByRole('button', { name: 'Góc 3', exact: true }).click();
  await page.locator('.recruit-grid button').filter({ hasText: 'Cốt kỵ' }).click();
  await page.getByRole('button', { name: 'Góc 4', exact: true }).click();
  await page.locator('.recruit-grid button').filter({ hasText: 'Cuồng chiến' }).click();
  await page.locator('.atelier-tabs button').filter({ hasText: 'Xúc xắc' }).click();
  await page.getByRole('button', { name: 'Ngà cổ', exact: false }).click();
  await shot('05-relics');
  await page.locator('#start-game').click();
  await page.locator('.immersive-game .board-scene[data-ready=true]').waitFor();
  await shot('06-battle');
  const state = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  assert.equal(state.config.cosmetics.mapId, 'sky-citadel');
  assert.equal(state.config.cosmetics.skyId, 'sunset');
  assert.equal(state.config.cosmetics.diceId, 'ivory-relic');
  await page.locator('#roll-dice').click();
  await page.waitForFunction(() => !JSON.parse(window.render_game_to_text()).presenting);
  assert.ok((await page.evaluate(() => JSON.parse(window.render_game_to_text()))).die);
  await page.setViewportSize({ width: 844, height: 390 });
  await shot('07-landscape');
  assert.deepEqual(errors, []);
  await writeFile(`${out}/result.json`, JSON.stringify({ errors, state }, null, 2));
  console.log('Forge review passed');
} finally {
  await browser.close();
}
