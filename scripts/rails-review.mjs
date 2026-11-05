import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createGame, DEFAULT_CONFIG } from '../packages/game-core/dist/index.js';
import { openBoardTools } from './board-tools.mjs';
const out = 'artifacts/rails-review';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const errors = [];
const context = await browser.newContext({
  viewport: { width: 1280, height: 850 },
  hasTouch: true,
  serviceWorkers: 'block',
});
const page = await context.newPage();
page.setDefaultTimeout(120000);
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
await context.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
const frames = () =>
  page.evaluate(async () => {
    for (let i = 0; i < 3; i++) await new Promise(requestAnimationFrame);
  });
async function fixture(actor, count = 4) {
  const config = structuredClone(DEFAULT_CONFIG);
  config.playerCount = count;
  const game = createGame(config, 42);
  game.current = actor;
  await page.evaluate((g) => localStorage.setItem('skyhoof.match.v1', JSON.stringify(g)), game);
  await page.reload();
  await page
    .locator('#continue-game')
    .count()
    .then(async (n) => {
      if (n) await page.locator('#continue-game').click();
      else await page.getByRole('button', { name: 'Tiếp tục ván đang chơi', exact: false }).click();
    });
}
async function rails(count) {
  const cards = await page.locator('.player-rails .player-chip').evaluateAll((els) =>
    els.map((el) => ({
      side: el.dataset.side,
      id: Number(el.dataset.player),
      box: el.getBoundingClientRect().toJSON(),
      current: el.getAttribute('aria-current'),
    })),
  );
  assert.equal(cards.length, count);
  for (const c of cards) {
    assert.ok(c.box.x >= 0 && c.box.right <= (await page.evaluate(() => innerWidth)));
    assert.ok(
      c.side === 'left' ? c.box.x < 200 : c.box.x > (await page.evaluate(() => innerWidth / 2)),
    );
  }
  if (count === 4) {
    assert.equal(cards.filter((c) => c.side === 'left').length, 2);
    assert.equal(cards.filter((c) => c.side === 'right').length, 2);
    assert.ok(cards[1].box.y > cards[0].box.bottom);
    assert.ok(cards[3].box.y > cards[2].box.bottom);
  }
  return cards;
}
try {
  await page.goto('http://127.0.0.1:4173');
  await fixture(0);
  await page.locator('.board-scene[data-ready=true]').waitFor();
  await frames();
  await rails(4);
  assert.equal(
    await page.locator('.player-chip[aria-current="true"]').getAttribute('data-player'),
    '0',
  );
  await page.screenshot({ path: `${out}/desktop.png` });
  await openBoardTools(page);
  await page.getByRole('button', { name: 'Phóng to bàn cờ', exact: true }).click();
  await page.getByRole('button', { name: 'Thu nhỏ bàn cờ', exact: true }).click();
  await page.getByRole('button', { name: 'Đưa camera về góc ban đầu', exact: true }).click();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  await page.getByRole('button', { name: 'Unlock board camera', exact: true }).click();
  assert.equal(
    await page
      .getByRole('button', { name: 'Lock camera to select pieces', exact: true })
      .getAttribute('aria-pressed'),
    'true',
  );
  await page.getByRole('button', { name: 'Lock camera to select pieces', exact: true }).click();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#board-tools').count(), 0);
  assert.equal(
    await page
      .locator('.command-dock button[aria-controls]')
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.setViewportSize({ width: 844, height: 390 });
  await frames();
  await rails(4);
  assert.ok(
    await page
      .locator('.active .portrait-fire svg')
      .evaluate(
        (el) =>
          el.getBoundingClientRect().width >
          el.closest('.player-avatar').getBoundingClientRect().width,
      ),
  );
  await page.screenshot({ path: `${out}/mobile.png` });
  await openBoardTools(page);
  await page.screenshot({ path: `${out}/mobile-tools.png` });
  for (const label of ['Zoom in', 'Zoom out', 'Reset camera']) {
    assert.ok(await page.getByRole('button', { name: label, exact: true }).isVisible());
  }
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('dialog').waitFor();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await openBoardTools(page);
  await page.getByRole('button', { name: 'Tiếng Việt', exact: true }).click();
  await page.keyboard.press('Escape');
  // The arrival banner starts after the 3D scene is ready; bots wait during loading.
  await fixture(3);
  await page.locator('.board-scene[data-ready=true]').waitFor();
  await page.locator('.notice-turn').waitFor();
  assert.equal(
    await page.locator('.player-chip[aria-current="true"]').getAttribute('data-player'),
    '3',
  );
  assert.match(await page.locator('.notice-turn').innerText(), /Đào/);
  assert.equal(await page.locator('.notice-turn .notice-emblem img').count(), 1);
  await page.screenshot({ path: `${out}/bot-turn.png` });
  await fixture(0, 2);
  await page.locator('.board-scene[data-ready=true]').waitFor();
  await frames();
  await rails(2);
  await page.screenshot({ path: `${out}/two-players.png` });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const motion = await page
    .locator('.active .flame-back')
    .evaluate((el) => getComputedStyle(el).animationName);
  assert.equal(motion, 'none');
  assert.deepEqual(errors, []);
  await writeFile(
    `${out}/result.json`,
    JSON.stringify(
      {
        errors,
        fourPlayerRails: true,
        twoPlayerRails: true,
        botTurnPortrait: true,
        toolControls: true,
        languageSwitch: true,
        reducedMotion: true,
      },
      null,
      2,
    ),
  );
  console.log('Rails review passed');
} finally {
  await browser.close();
}
