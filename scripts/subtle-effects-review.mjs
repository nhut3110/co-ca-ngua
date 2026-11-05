import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createGame, DEFAULT_CONFIG, applyAction } from '../packages/game-core/dist/index.js';
import { openBoardTools } from './board-tools.mjs';
const out = 'artifacts/subtle-effects';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const context = await browser.newContext({
  viewport: { width: 844, height: 390 },
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
const die = () => page.locator('.board-scene').evaluate((el) => JSON.parse(el.dataset.die));
const frames = () =>
  page.evaluate(async () => {
    for (let i = 0; i < 4; i++) await new Promise(requestAnimationFrame);
  });
try {
  await page.goto('http://127.0.0.1:4173');
  await page.getByRole('button', { name: 'Tiếp tục ván đang chơi', exact: false }).tap();
  await page.locator('.board-scene[data-ready=true]').waitFor();
  await page.waitForFunction(
    () => JSON.parse(document.querySelector('.board-scene').dataset.die || '{}').canRoll === true,
  );
  assert.equal(await page.locator('.die-world-hint').count(), 0);
  assert.equal(await page.getByText('Chạm để tung', { exact: true }).count(), 0);
  await page.screenshot({ path: `${out}/mobile-idle.png` });
  await frames();
  await page.screenshot({ path: `${out}/mobile-idle-next.png` });
  await openBoardTools(page);
  await page.getByRole('button', { name: 'Tạm dừng', exact: true }).tap();
  for (const cls of ['.flame-back', '.fire-ember'])
    assert.equal(
      await page
        .locator('.active ' + cls)
        .first()
        .evaluate((el) => getComputedStyle(el).animationPlayState),
      'paused',
    );
  await page.locator('.pause-overlay').getByRole('button', { name: 'Tiếp tục', exact: true }).tap();
  const point = await die();
  await page.touchscreen.tap(point.x, point.y);
  await page.waitForFunction(() => {
    const g = JSON.parse(window.render_game_to_text());
    return !g.presenting && g.die === 6;
  });
  await page.waitForFunction(
    () => JSON.parse(document.querySelector('.board-scene').dataset.die).glow < 0.13,
  );
  await page.getByRole('button', { name: 'Chọn quân bằng danh sách', exact: true }).tap();
  await page.getByRole('button', { name: 'Chọn quân 1', exact: true }).tap();
  await page.locator('#confirm-move').tap();
  await page.waitForFunction(() => {
    const g = JSON.parse(window.render_game_to_text());
    return !g.presenting && g.horses[0].progress === 0 && g.phase === 'roll';
  });
  await page.locator('#roll-dice').tap();
  await page.waitForFunction(() => !JSON.parse(window.render_game_to_text()).presenting);
  assert.equal(await page.locator('.die-world-hint').count(), 0);
  // Inspect the same visual feedback without touch emulation's lack of hover.
  await page.reload();
  await page.getByRole('button', { name: 'Tiếp tục ván đang chơi', exact: false }).tap();
  await page.locator('.board-scene[data-ready=true]').waitFor();
  await page.setViewportSize({ width: 1280, height: 850 });
  await frames();
  await page.waitForFunction(
    () => JSON.parse(document.querySelector('.board-scene').dataset.die || '{}').canRoll,
  );
  const hover = await die();
  await page.mouse.move(hover.x, hover.y);
  await page.waitForFunction(
    () => JSON.parse(document.querySelector('.board-scene').dataset.die).scale > 1.026,
  );
  await page.screenshot({ path: `${out}/desktop-hover.png` });
  await openBoardTools(page);
  for (let i = 0; i < 4; i++)
    await page.getByRole('button', { name: 'Phóng to bàn cờ', exact: true }).click();
  await page.keyboard.press('Escape');
  await frames();
  await page.screenshot({ path: `${out}/relic-close.png` });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const cls of ['.flame-back', '.fire-ember'])
    assert.equal(
      await page
        .locator('.active ' + cls)
        .first()
        .evaluate((el) => getComputedStyle(el).animationName),
      'none',
    );
  assert.deepEqual(errors, []);
  await writeFile(
    `${out}/result.json`,
    JSON.stringify(
      {
        errors,
        noRollLabel: true,
        touchOnDie: true,
        deployAndFallback: true,
        hoverFeedback: true,
        pause: true,
        reducedMotion: true,
      },
      null,
      2,
    ),
  );
  console.log('Subtle effects review passed');
} finally {
  await browser.close();
}
