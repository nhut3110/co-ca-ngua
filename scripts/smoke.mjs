import { openBoardTools } from './board-tools.mjs';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createGame, DEFAULT_CONFIG } from '../packages/game-core/dist/index.js';

const base = process.env.WEB_URL ?? 'http://127.0.0.1:5173';
const out = 'artifacts/browser';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const screenshot = async (name) => {
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
};
const waitScene = async () => {
  await page.waitForSelector('canvas, .welcome-poster');
  await page.waitForTimeout(1000);
  assert.equal(await page.locator('.scene-error').count(), 0);
};
try {
  await page.goto(base);
  await waitScene();
  await page.evaluate(() => document.fonts.ready);
  await screenshot('01-welcome-desktop');
  await page.getByRole('button', { name: 'Cách chơi', exact: false }).first().click();
  assert.equal(await page.locator('dialog[open]').count(), 1);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog[open]').count(), 0);
  await page.locator('#create-game').click();
  await waitScene();
  assert.equal(await page.getByRole('slider', { name: 'Độ khó của bot' }).inputValue(), '3');
  await page.getByLabel('Tên của bạn').fill('Nhựt');
  await page.getByRole('slider', { name: 'Độ khó của bot' }).fill('5');
  await screenshot('02-create-players');
  await page.locator('#next-step').click();
  for (const checkbox of await page.locator('.toggle-row input').all())
    assert.equal(
      await checkbox.isChecked(),
      await checkbox.evaluate((e) => e.closest('label').textContent.includes('Xuất chuồng')),
    );
  await page.getByLabel('Tinh thạch & phép', { exact: false }).check();
  await page.getByLabel('Cổng không gian', { exact: false }).check();
  await page.getByLabel('Tái xuất', { exact: false }).check();
  await screenshot('03-create-rules');
  await page.locator('#next-step').click();
  await page.getByRole('button', { name: 'Vườn trăng', exact: false }).click();
  await page.locator('.atelier-tabs button').filter({ hasText: 'Đội hình' }).click();
  await page.locator('.recruit-grid button').filter({ hasText: 'Hiệp sĩ' }).click();
  await page.locator('.atelier-tabs button').filter({ hasText: 'Bốn miền' }).click();
  await page.getByRole('button', { name: 'Miền tuyết', exact: true }).click();
  await page.getByRole('button', { name: 'Góc 2', exact: true }).click();
  await page.getByRole('button', { name: 'Vườn anh đào', exact: true }).click();
  await page.locator('.atelier-tabs button').filter({ hasText: 'Đội hình' }).click();
  await page.locator('.recruit-grid button').filter({ hasText: 'Pháp sư' }).click();
  await page.waitForTimeout(700);
  await screenshot('04-create-world');
  await page.locator('#start-game').click();
  await waitScene();
  let s = await state();
  assert.equal(s.config.difficulty, 5);
  assert.equal(s.config.cosmetics.mapId, 'moon-garden');
  assert.equal(s.config.cosmetics.skinIds[0], 'knight');
  assert.equal(s.config.cosmetics.skinIds[1], 'mage');
  assert.equal(s.config.cosmetics.biomeIds[0], 'snow');
  assert.equal(s.players[0].name, 'Nhựt');
  assert.ok(Object.values(s.config.modules).every(Boolean));
  await openBoardTools(page);
  await page.getByRole('button', { name: 'Tạm dừng', exact: true }).click();
  assert.equal((await state()).paused, true);
  await page
    .locator('.pause-overlay')
    .getByRole('button', { name: 'Tiếp tục', exact: true })
    .click();
  for (let i = 0; i < 14; i++) {
    s = await state();
    if (s.phase === 'finished') break;
    if (s.current !== 0) {
      await page.evaluate(() => window.advanceTime(18000));
      continue;
    }
    if (s.phase === 'roll') await page.locator('#roll-dice').click();
    else if (s.legalMoves.length) {
      await page
        .getByRole('button', {
          name: `Chọn quân ${Number(s.legalMoves[0].split('h')[1]) + 1}`,
          exact: true,
        })
        .click();
      await page.locator('#confirm-move').click();
    } else await page.getByRole('button', { name: 'Qua lượt', exact: false }).click();
    await page.waitForTimeout(80);
  }
  await screenshot('05-game-desktop');
  await openBoardTools(page);
  await page.getByRole('button', { name: 'Tạm dừng', exact: true }).click();
  const before = await state();
  await page.reload();
  await waitScene();
  await page.getByRole('button', { name: 'Tiếp tục ván đang chơi', exact: false }).click();
  const restored = await state();
  assert.deepEqual(restored.horses, before.horses);
  assert.equal(restored.turn, before.turn);
  // Controlled fixtures cover real spell/capture/finish UI, not just the reducer.
  async function fixture(game) {
    await page.getByRole('button', { name: 'Rời bàn', exact: false }).click();
    await page.getByRole('button', { name: 'Về trang chủ', exact: false }).click();
    await page.evaluate((g) => localStorage.setItem('skyhoof.match.v1', JSON.stringify(g)), game);
    await page.reload();
    await page.getByRole('button', { name: 'Tiếp tục ván đang chơi', exact: false }).click();
    await waitScene();
  }
  const config = structuredClone(DEFAULT_CONFIG);
  config.modules = { spells: true, portals: true, comeback: true };
  const workerGame = createGame(config, 2026);
  workerGame.current = 1;
  workerGame.config.difficulty = 5;
  await fixture(workerGame);
  await page.waitForFunction(
    () => {
      const s = JSON.parse(window.render_game_to_text());
      return s.phase !== 'roll' || s.turn > 1;
    },
    { timeout: 10000 },
  );
  assert.notEqual((await state()).log[0], workerGame.log[0]);
  let g = createGame(config, 2026);
  g.players[0].mana = 3;
  g.horses[0].progress = 15;
  g.horses[4].progress = 4;
  await fixture(g);
  await page.getByRole('button', { name: 'Kết giới', exact: false }).click();
  await page.getByRole('button', { name: 'Chọn quân 1', exact: true }).click();
  assert.equal((await state()).horses[0].shield, true);
  assert.equal((await state()).players[0].mana, 1);
  g = createGame(config, 2026);
  g.phase = 'move';
  g.die = g.rawDie = 1;
  g.players[0].mana = 2;
  g.horses[0].progress = 15;
  g.horses[4].progress = 4;
  await fixture(g);
  await page.getByRole('button', { name: '+1 bước', exact: false }).click();
  assert.equal((await state()).die, 2);
  await page.getByRole('button', { name: 'Chọn quân 1', exact: true }).click();
  await page.locator('#confirm-move').click();
  assert.equal((await state()).horses[4].progress, -1);
  assert.equal((await state()).horses[4].comeback, true);
  g = createGame(config, 2026);
  g.phase = 'move';
  g.die = g.rawDie = 1;
  g.horses.filter((h) => h.owner === 0).forEach((h) => (h.progress = 57));
  g.horses[0].progress = 56;
  await fixture(g);
  await page.getByRole('button', { name: 'Chọn quân 1', exact: true }).click();
  await page.locator('#confirm-move').click();
  assert.equal((await state()).phase, 'finished');
  await screenshot('06-victory');
  await page.getByRole('button', { name: 'Chơi lại', exact: false }).click();
  assert.equal((await state()).phase, 'roll');
  assert.equal((await state()).horses[0].progress, -1);
  await page.getByRole('button', { name: 'Rời bàn', exact: false }).click();
  await page.getByRole('button', { name: 'Về trang chủ', exact: false }).click();
  const widths = [320, 390, 768, 1024, 1440];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(200);
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `welcome overflow at ${width}`,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await screenshot('07-welcome-mobile');
  await page.locator('#create-game').click();
  await waitScene();
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(100);
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `create overflow at ${width}`,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await screenshot('08-create-mobile');
  await page.locator('#next-step').click();
  await page.locator('#next-step').click();
  await page.locator('#start-game').click();
  await waitScene();
  await screenshot('09-game-mobile');
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(200);
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `game overflow at ${width}`,
    );
  }
  assert.equal(errors.length, 0, errors.join('\n'));
  await writeFile(
    `${out}/result.json`,
    JSON.stringify(
      {
        ok: true,
        errors,
        widths,
        checks: [
          'welcome',
          'rules-dialog',
          'default-medium',
          'module-toggles',
          'cosmetics',
          'level-5-worker',
          'human-moves',
          'pause',
          'restore',
          'shield',
          'modified-die-capture',
          'comeback',
          'victory',
          'replay',
          'mobile-overflow',
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    'Browser smoke passed: creation, 5-level worker, cosmetics, spells, captures, save/restore, victory and mobile layouts.',
  );
} finally {
  await browser.close();
}
