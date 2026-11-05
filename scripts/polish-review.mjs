import { openBoardTools } from './board-tools.mjs';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createGame, DEFAULT_CONFIG, applyAction } from '../packages/game-core/dist/index.js';
const out = 'artifacts/polish-1103';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const errors = [];
const config = structuredClone(DEFAULT_CONFIG);
let seed = 1;
while (applyAction(createGame(config, seed), { type: 'roll' }).die !== 6) seed++;
const context = await browser.newContext({
  viewport: { width: 1280, height: 850 },
  serviceWorkers: 'block',
});
await context.addInitScript(
  (g) => {
    localStorage.setItem('skyhoof.match.v1', JSON.stringify(g));
    localStorage.setItem('skyhoof.locale', 'en');
  },
  createGame(config, seed),
);
const page = await context.newPage();
page.setDefaultTimeout(120000);
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
const frames = () =>
  page.evaluate(async () => {
    for (let i = 0; i < 3; i++) await new Promise(requestAnimationFrame);
  });
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
try {
  await page.goto('http://127.0.0.1:4173');
  await page.getByRole('button', { name: 'Resume match' }).click();
  await page.locator('.board-scene[data-ready=true]').waitFor();
  await frames();
  await page.locator('#roll-dice').waitFor({ state: 'visible' });
  assert.equal(await page.locator('.die-world-hint').count(), 0);
  await page.screenshot({ path: `${out}/desktop-ready.png` });
  // Click the actual 3D cube, below the projected prompt, through the canvas.
  await page.mouse.click(640, 338);
  await page.waitForFunction(() => JSON.parse(window.render_game_to_text()).die === 6);
  await page.screenshot({ path: `${out}/roll-motion.png` });
  await page.waitForFunction(() => !JSON.parse(window.render_game_to_text()).presenting);
  assert.equal((await state()).phase, 'move');
  assert.equal(await page.locator('.die-world-hint').count(), 0);
  await page.getByRole('button', { name: 'Choose a piece from the list' }).click();
  await page.getByRole('button', { name: 'Select piece 1', exact: true }).click();
  assert.match(await page.locator('#confirm-move').innerText(), /Deploy piece 1/);
  await page.locator('#confirm-move').click();
  await page.waitForFunction(() => !JSON.parse(window.render_game_to_text()).presenting);
  assert.equal((await state()).horses[0].progress, 0);
  await page.locator('#roll-dice').waitFor();
  await page.locator('#roll-dice').click();
  await page.waitForFunction(() => !JSON.parse(window.render_game_to_text()).presenting);
  assert.ok((await state()).die);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.locator('.pause-overlay summary').click();
  assert.match(await page.locator('.pause-overlay').innerText(), /rolls/);
  await openBoardTools(page);
  await page.getByRole('button', { name: 'Tiếng Việt', exact: true }).click();
  assert.equal(await page.locator('html').getAttribute('lang'), 'vi');
  await page
    .locator('.pause-overlay')
    .getByRole('button', { name: 'Tiếp tục', exact: true })
    .click();
  await openBoardTools(page);
  await page.getByRole('button', { name: 'English', exact: true }).click();
  for (const [name, dx, dy] of [
    ['forest-outlet', 350, -120],
    ['celestial-outlet', -350, -120],
    ['volcano-outlet', -350, 100],
    ['snow-outlet', 350, 100],
    ['altar', 0, 0],
  ]) {
    await openBoardTools(page);
    await page.getByRole('button', { name: 'Reset camera', exact: true }).click();
    await page.mouse.move(640, 425);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(640 + dx, 425 + dy);
    await page.mouse.up({ button: 'right' });
    await page.locator('canvas').evaluate((c) => {
      for (let i = 0; i < 9; i++)
        c.dispatchEvent(new WheelEvent('wheel', { deltaY: -120, bubbles: true, cancelable: true }));
    });
    await frames();
    await page.screenshot({ path: `${out}/${name}.png` });
    console.log(`Captured ${name}`);
  }
  await context.close();
  const mobile = await browser.newContext({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    isMobile: true,
    serviceWorkers: 'block',
  });
  await mobile.addInitScript(
    (g) => {
      Object.defineProperty(navigator, 'standalone', { value: true });
      localStorage.setItem('skyhoof.match.v1', JSON.stringify(g));
      localStorage.setItem('skyhoof.locale', 'en');
    },
    createGame(config, seed),
  );
  const phone = await mobile.newPage();
  phone.setDefaultTimeout(120000);
  phone.on('pageerror', (e) => errors.push(String(e)));
  await phone.goto('http://127.0.0.1:4173');
  await phone.getByRole('button', { name: 'Resume match' }).tap();
  await phone.locator('.board-scene[data-ready=true]').waitFor();
  const roll = await phone.locator('#roll-dice').boundingBox();
  assert.ok(roll.x >= 0 && roll.x + roll.width <= 844 && roll.y + roll.height <= 390);
  assert.equal(
    await phone.locator('#roll-dice').evaluate((el) => {
      const r = el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
    }),
    true,
  );
  await phone.screenshot({ path: `${out}/mobile-ready.png` });
  await phone.waitForFunction(() => document.querySelector('.board-scene')?.dataset.die);
  const die = await phone.locator('.board-scene').evaluate((el) => JSON.parse(el.dataset.die));
  await phone.touchscreen.tap(die.x, die.y);
  await phone.waitForFunction(
    () =>
      !JSON.parse(window.render_game_to_text()).presenting &&
      JSON.parse(window.render_game_to_text()).die === 6,
  );
  await phone.getByRole('button', { name: 'Choose a piece from the list' }).tap();
  await phone.getByRole('button', { name: 'Select piece 1', exact: true }).tap();
  assert.match(await phone.locator('#confirm-move').innerText(), /Deploy/);
  await phone.getByRole('button', { name: 'Cancel piece selection' }).tap();
  await phone.setViewportSize({ width: 390, height: 844 });
  await phone.getByRole('heading', { name: 'Rotate to enter the board' }).waitFor();
  await openBoardTools(phone);
  await phone.getByRole('button', { name: 'Tiếng Việt', exact: true }).tap();
  await phone.getByRole('heading', { name: 'Xoay ngang để vào bàn' }).waitFor();
  await phone.screenshot({ path: `${out}/portrait-gate.png` });
  assert.deepEqual(errors, []);
  await writeFile(
    `${out}/result.json`,
    JSON.stringify(
      {
        errors,
        directCubeClick: true,
        fallbackButton: true,
        touchDie: true,
        deployConfirmation: true,
        languages: ['vi', 'en'],
        mobileRollBounds: roll,
      },
      null,
      2,
    ),
  );
  console.log('Polish review passed');
} finally {
  await browser.close();
}
