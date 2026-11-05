import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createGame, DEFAULT_CONFIG } from '../packages/game-core/dist/index.js';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const context = await browser.newContext({
  viewport: { width: 844, height: 390 },
  hasTouch: true,
  isMobile: true,
  userAgent:
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36',
});
await context.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
const page = await context.newPage();
page.setDefaultTimeout(90000);
const errors = [],
  bounds = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
const out = 'artifacts/welcome-landscape-fix';
await mkdir(out, { recursive: true });
async function reachable(selector, width, height) {
  const box = await page.locator(selector).boundingBox();
  assert.ok(
    box &&
      box.x >= 0 &&
      box.y >= 0 &&
      box.x + box.width <= width + 1 &&
      box.y + box.height <= height + 1,
    `${selector} clipped in ${width}x${height}: ${JSON.stringify(box)}`,
  );
  assert.ok(
    await page.locator(selector).evaluate((el) => {
      const r = el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
    }),
    `${selector} blocked by another layer`,
  );
  return box;
}
try {
  await page.goto('http://127.0.0.1:4173');
  for (const saved of [false, true]) {
    await page.evaluate(
      (g) =>
        g
          ? localStorage.setItem('skyhoof.match.v1', JSON.stringify(g))
          : localStorage.removeItem('skyhoof.match.v1'),
      saved ? createGame(DEFAULT_CONFIG, 2026) : null,
    );
    await page.reload();
    for (const [width, height] of [
      [1280, 500],
      [980, 430],
      [844, 390],
      [740, 360],
      [640, 280],
    ]) {
      await page.setViewportSize({ width, height });
      await page.locator('#create-game').waitFor();
      await page.evaluate(() => document.fonts.ready);
      const box = await reachable('#create-game', width, height);
      if (saved) await reachable('.menu-continue', width, height);
      assert.equal(await page.locator('canvas').count(), 0, 'mobile welcome must not start WebGL');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      bounds.push({ saved, width, height, box });
      if (width === 1280 || width === 844)
        await page.screenshot({ path: `${out}/${width}x${height}-${saved ? 'saved' : 'new'}.png` });
    }
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await page.locator('#create-game').tap();
  assert.equal(
    JSON.parse(await page.evaluate(() => window.render_game_to_text())).screen,
    'create',
  );
  assert.equal(await page.locator('canvas').count(), 0, 'player setup should not start WebGL');
  await reachable('#next-step', 844, 390);
  const form = page.locator('.step-content');
  const box = await form.boundingBox();
  const session = await context.newCDPSession(page);
  const x = box.x + box.width / 2,
    y = box.y + box.height - 20;
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 6; i++)
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: y - i * 16 }],
    });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(200);
  assert.ok(
    await form.evaluate((el) => el.scrollTop > 0),
    'touch swipe must scroll the setup fields',
  );
  await page.screenshot({ path: `${out}/create-touch-scroll.png` });
  await page.locator('#next-step').tap();
  assert.match(await page.locator('.step-tabs [aria-current=step]').innerText(), /Luật chơi/);
  await reachable('#next-step', 844, 390);
  await page.locator('#next-step').tap();
  await reachable('#start-game', 844, 390);
  await page.locator('#start-game').tap();
  assert.equal(JSON.parse(await page.evaluate(() => window.render_game_to_text())).screen, 'game');
  await page.locator('.board-scene[data-ready=true]').waitFor();
  await page.locator('#roll-dice').tap();
  await page.waitForTimeout(1800);
  assert.notEqual(JSON.parse(await page.evaluate(() => window.render_game_to_text())).die, null);
  assert.deepEqual(errors, []);
  await writeFile(
    `${out}/result.json`,
    JSON.stringify(
      {
        errors,
        bounds,
        checks: [
          'visible/receives touches',
          'no WebGL at entry',
          'native touch scroll',
          'pinned setup footer',
          'create and play',
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    'Landscape regression passed: 10 welcome layouts, visible/unblocked actions, native touch scrolling, all setup steps, start and roll.',
  );
} finally {
  await browser.close();
}
