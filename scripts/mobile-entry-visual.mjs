import { openBoardTools } from './board-tools.mjs';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createGame, DEFAULT_CONFIG } from '../packages/game-core/dist/index.js';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const out = 'artifacts/mobile-entry-final';
await mkdir(out, { recursive: true });
const errors = [];
const phone = {
  viewport: { width: 844, height: 390 },
  hasTouch: true,
  isMobile: true,
  userAgent:
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36',
};
const context = await browser.newContext(phone);
await context.addInitScript(
  (g) => {
    Object.defineProperty(navigator, 'standalone', { value: true });
    localStorage.setItem('skyhoof.match.v1', JSON.stringify(g));
  },
  createGame(DEFAULT_CONFIG, 2026),
);
const page = await context.newPage();
page.setDefaultTimeout(90000);
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
const frames = () =>
  page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      ),
  );
try {
  await page.goto('http://127.0.0.1:4173');
  await page.getByRole('button', { name: 'Tiếp tục ván đang chơi', exact: false }).tap();
  await page.locator('.board-scene[data-ready="true"]').waitFor();
  await frames();
  await page.screenshot({ path: `${out}/01-landscape.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('heading', { name: 'Xoay ngang để vào bàn' }).waitFor();
  const before = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  await page.screenshot({ path: `${out}/02-portrait-blocked.png` });
  assert.equal(before.paused, true);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.locator('.mobile-gate').waitFor({ state: 'hidden' });
  await openBoardTools(page);
  await page.getByRole('button', { name: 'Đưa camera về góc ban đầu', exact: true }).tap();
  await frames();
  const after = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  assert.equal(after.paused, false);
  assert.deepEqual(after.horses, before.horses);
  await page.screenshot({ path: `${out}/03-landscape-restored.png` });
  await page.close();
  const browserTab = await browser.newContext(phone);
  const guide = await browserTab.newPage();
  await guide.goto('http://127.0.0.1:4173');
  await guide.getByRole('heading', { name: 'Mang bàn cờ về màn hình chính' }).waitFor();
  assert.match(await guide.locator('.install-steps').innerText(), /Chrome/);
  await guide.evaluate(() => {
    const event = new Event('beforeinstallprompt');
    event.prompt = async () => {};
    event.userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(event);
  });
  await guide.screenshot({ path: `${out}/04-android-install.png` });
  await guide.getByRole('button', { name: 'Cài Skyhoof', exact: true }).tap();
  assert.match(await guide.locator('.install-status').innerText(), /màn hình chính/);
  assert.equal(await guide.locator('canvas').count(), 0);
  assert.deepEqual(errors, []);
  await writeFile(
    `${out}/result.json`,
    JSON.stringify(
      { errors, landscape: after.mobileAccess, portrait: before.mobileAccess, androidGuide: true },
      null,
      2,
    ),
  );
  console.log(
    'Mobile visual review passed: loaded landscape, portrait block, restored/reset camera, Android installation prompt.',
  );
} finally {
  await browser.close();
}
