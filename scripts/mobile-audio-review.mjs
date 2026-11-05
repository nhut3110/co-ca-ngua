import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { setTimeout as settleAssets } from 'node:timers/promises';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createGame, DEFAULT_CONFIG, applyAction } from '../packages/game-core/dist/index.js';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const out = 'artifacts/mobile-audio';
await mkdir(out, { recursive: true });
const errors = [];
function watch(page) {
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
}
const base = process.env.WEB_URL ?? 'http://127.0.0.1:4173';
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
});
await context.addInitScript(() => {
  Object.defineProperty(navigator, 'standalone', { get: () => window.__installed === true });
  const Original = window.AudioContext;
  window.AudioContext = class extends Original {
    createDynamicsCompressor() {
      const node = super.createDynamicsCompressor();
      window.__audioProbe = this.createAnalyser();
      node.connect(window.__audioProbe);
      const silent = this.createGain();
      silent.gain.value = 0;
      window.__audioProbe.connect(silent);
      silent.connect(this.destination);
      return node;
    }
  };
});
const fixturesOnly = process.argv.includes('--fixtures-only');
const gameOnly = process.argv.includes('--game-only') || fixturesOnly;
if (gameOnly)
  await context.addInitScript(() => {
    window.__installed = true;
  });
const page = await context.newPage();
page.setDefaultTimeout(90000);
watch(page);
const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
let platform;
let controlled = false;
const waitReady = async () => {
  if (!controlled)
    return page.locator('.board-scene[data-ready="true"]').waitFor({ timeout: 90000 });
  for (let i = 0; i < 100; i++) {
    await settleAssets(500);
    await page.clock.fastForward(80);
    if (await page.locator('.board-scene[data-ready="true"]').count()) return;
  }
  throw new Error('3D scene did not load');
};
try {
  await page.goto(base);
  if (!gameOnly) {
    await page.getByRole('heading', { name: 'Mang bàn cờ về màn hình chính' }).waitFor();
    assert.match(await page.locator('.install-steps').innerText(), /Safari/);
    assert.equal(await page.locator('canvas').count(), 0);
    assert.equal((await state()).mobileAccess.blocked, true);
    await page.screenshot({ path: `${out}/01-install-iphone.png` });
    await page.setViewportSize({ width: 844, height: 390 });
    assert.equal((await state()).mobileAccess.blocked, true);
    await page.evaluate(() => {
      const prompt = new Event('beforeinstallprompt');
      prompt.prompt = async () => {
        window.__promptOpened = true;
      };
      prompt.userChoice = Promise.resolve({ outcome: 'dismissed' });
      window.dispatchEvent(prompt);
    });
    await page.getByRole('button', { name: 'Cài Skyhoof', exact: true }).tap();
    assert.equal(await page.evaluate(() => window.__promptOpened), true);
    assert.match(await page.locator('[role=status]').innerText(), /cài lại/);
    assert.equal((await state()).mobileAccess.blocked, true);
    await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
    assert.equal(
      (await state()).mobileAccess.blocked,
      true,
      'install event alone must not bypass standalone launch',
    );
    await page.evaluate(() => {
      window.__installed = true;
      window.dispatchEvent(new Event('pageshow'));
    });
    await page.locator('#create-game').waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('heading', { name: 'Xoay ngang để vào bàn' }).waitFor();
    await page.screenshot({ path: `${out}/02-rotate.png` });
    console.log('Install and portrait gates passed.');
    await page.setViewportSize({ width: 844, height: 390 });
    await page.getByRole('button', { name: 'Cài đặt hiển thị', exact: true }).tap();
    await page.getByRole('slider', { name: 'Âm lượng nhạc nền' }).fill('28');
    await page.getByRole('slider', { name: 'Âm lượng hiệu ứng' }).fill('64');
    await page.getByRole('button', { name: 'Nghe thử phép thuật', exact: true }).tap();
    await page.waitForTimeout(200);
    assert.equal((await state()).audio.state, 'running');
    assert.ok((await state()).audio.recent.includes('spell'));
    const energy = await page.evaluate(async () => {
      let peak = 0;
      for (let i = 0; i < 16; i++) {
        const values = new Float32Array(2048);
        window.__audioProbe.getFloatTimeDomainData(values);
        peak = Math.max(peak, Math.sqrt(values.reduce((sum, x) => sum + x * x, 0) / values.length));
        await new Promise((resolve) => setTimeout(resolve, 80));
      }
      return peak;
    });
    assert.ok(
      energy > 0.00001,
      `audio graph is silent: ${energy}; ${JSON.stringify((await state()).audio)}`,
    );
    await page.screenshot({ path: `${out}/03-audio-settings.png` });
    await page.getByRole('button', { name: 'Đóng', exact: true }).tap();
    await page.getByRole('button', { name: 'Tắt âm thanh', exact: true }).tap();
    await page.waitForTimeout(400);
    assert.equal((await state()).audio.muted, true);
    const silentEnergy = await page.evaluate(() => {
      const values = new Float32Array(2048);
      window.__audioProbe.getFloatTimeDomainData(values);
      return Math.sqrt(values.reduce((sum, x) => sum + x * x, 0) / values.length);
    });
    assert.ok(silentEnergy < 0.00001, `muted output is audible: ${silentEnergy}`);
    await page.evaluate(() => {
      window.__installed = true;
      localStorage.setItem('qa.standalone', '1');
    });
    await context.addInitScript(() => {
      if (localStorage.getItem('qa.standalone')) window.__installed = true;
    });
    await page.reload();
    assert.equal((await state()).audio.muted, true);
    assert.equal((await state()).audio.music, 0.28);
    assert.equal((await state()).audio.effects, 0.64);
    await page.getByRole('button', { name: 'Bật âm thanh', exact: true }).tap();
    // Wait for the actual worker install and verify the complete precache offline.
    console.log('Audio output, mute and preferences passed.');
    const cache = await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      const keys = await caches.keys();
      const active = await caches.open(keys.find((k) => k.startsWith('skyhoof-')));
      const files = (await active.keys()).map((r) => new URL(r.url).pathname);
      return { files, manifest: await (await fetch('/manifest.webmanifest')).json() };
    });
    assert.equal(cache.manifest.orientation, 'landscape');
    assert.equal(cache.manifest.display, 'standalone');
    assert.ok(cache.files.includes('/index.html'));
    assert.ok(cache.files.some((f) => f.endsWith('.glb')));
    assert.ok(cache.files.some((f) => f.endsWith('.woff2')));
    await context.setOffline(true);
    await page.reload();
    await page.locator('#create-game').waitFor();
    assert.equal((await state()).screen, 'welcome');
    await context.setOffline(false);
    console.log('PWA cache and offline navigation passed.');
    platform = { energy, silentEnergy, cachedFiles: cache.files.length };
    await writeFile(`${out}/platform-result.json`, JSON.stringify(platform, null, 2));
  } else {
    platform = JSON.parse(await readFile(`${out}/platform-result.json`, 'utf8'));
    await page.setViewportSize({ width: 844, height: 390 });
  }
  let seed = 1;
  while (applyAction(createGame(DEFAULT_CONFIG, seed), { type: 'roll' }).die !== 6) seed++;
  if (!fixturesOnly) {
    await page.evaluate(
      (g) => localStorage.setItem('skyhoof.match.v1', JSON.stringify(g)),
      createGame(DEFAULT_CONFIG, seed),
    );
    await page.reload();
    await page.getByRole('button', { name: 'Tiếp tục ván đang chơi', exact: false }).tap();
    await waitReady();
    await page.clock.install({ time: new Date(0) });
    await page.clock.pauseAt(new Date(60000));
    controlled = true;
    await page.locator('#roll-dice').tap();
    await page.clock.fastForward(1250);
    assert.ok((await state()).audio.recent.includes('roll'));
    assert.ok((await state()).audio.recent.includes('six'), JSON.stringify(await state()));
    await page.clock.fastForward(550);
    await page.getByRole('button', { name: 'Chọn quân bằng danh sách', exact: true }).tap();
    await page.getByRole('button', { name: 'Chọn quân 1', exact: true }).tap();
    assert.ok((await state()).audio.recent.includes('select'));
    await page.locator('#confirm-move').tap();
    await page.clock.fastForward(100);
    assert.ok((await state()).audio.recent.includes('deploy'));
    await page.clock.fastForward(1550);
    assert.ok((await state()).audio.recent.includes('deploy'));
    assert.ok((await state()).audio.recent.includes('bonus'));
    console.log('Roll result, select, deploy and bonus sounds passed.');
    const beforeRotate = await state();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('heading', { name: 'Xoay ngang để vào bàn' }).waitFor();
    assert.equal((await state()).paused, true);
    assert.equal((await state()).audio.blocked, true);
    await page.keyboard.press('Enter');
    const advanceAttempt = page.evaluate(() => window.advanceTime(18000));
    await page.clock.runFor(60);
    await advanceAttempt;
    assert.deepEqual((await state()).horses, beforeRotate.horses);
    assert.equal((await state()).turn, beforeRotate.turn);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.clock.fastForward(100);
    await page.locator('.mobile-gate').waitFor({ state: 'hidden' });
    await page.locator('#roll-dice').waitFor();
    assert.equal((await state()).paused, false);
    await page.screenshot({ path: `${out}/04-landscape-game.png` });
  }
  async function fixture(g) {
    await page.evaluate((g) => localStorage.setItem('skyhoof.match.v1', JSON.stringify(g)), g);
    await page.reload();
    await page.getByRole('button', { name: 'Tiếp tục ván đang chơi', exact: false }).tap();
    await waitReady();
    if (!controlled) {
      await page.clock.install({ time: new Date(0) });
      await page.clock.pauseAt(new Date(60000));
      controlled = true;
    }
  }
  let g = createGame(DEFAULT_CONFIG, seed);
  g.phase = 'move';
  g.die = g.rawDie = 6;
  g.horses[0].progress = 11;
  g.horses[4].progress = 4;
  await fixture(g);
  await page.getByRole('button', { name: 'Chọn quân bằng danh sách', exact: true }).tap();
  await page.getByRole('button', { name: 'Chọn quân 1', exact: true }).tap();
  await page.locator('#confirm-move').tap();
  await page.clock.fastForward(1200);
  assert.ok((await state()).audio.recent.includes('capture'));
  await page.screenshot({ path: `${out}/05-capture-sound.png` });
  const beforeBlock = await state();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.fastForward(50);
  await page.getByRole('heading', { name: 'Xoay ngang để vào bàn' }).waitFor();
  assert.equal((await state()).paused, true);
  assert.equal((await state()).audio.blocked, true);
  await page.keyboard.press('Enter');
  const attempt = page.evaluate(() => window.advanceTime(18000));
  await page.clock.runFor(60);
  await attempt;
  assert.deepEqual((await state()).horses, beforeBlock.horses);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.clock.fastForward(100);
  await page.locator('.mobile-gate').waitFor({ state: 'hidden' });
  assert.equal((await state()).paused, false);
  await page.screenshot({ path: `${out}/04-landscape-game.png` });
  console.log('Rotation blocks/resumes gameplay and audio without changing the board.');
  g = createGame(DEFAULT_CONFIG, seed);
  g.config.modules.spells = true;
  g.horses[0].progress = 11;
  g.players[0].mana = 3;
  await fixture(g);
  await page.getByRole('button', { name: 'Phép thuật', exact: false }).click();
  await page.getByRole('button', { name: 'Kết giới', exact: false }).tap();
  await page.getByRole('button', { name: 'Chọn quân bằng danh sách', exact: true }).tap();
  await page.getByRole('button', { name: 'Chọn quân 1', exact: true }).tap();
  assert.ok((await state()).audio.recent.includes('spell'));
  g = createGame(DEFAULT_CONFIG, seed);
  g.phase = 'move';
  g.die = g.rawDie = 1;
  g.horses.filter((h) => h.owner === 0).forEach((h) => (h.progress = 57));
  g.horses[0].progress = 56;
  await fixture(g);
  await page.getByRole('button', { name: 'Chọn quân bằng danh sách', exact: true }).tap();
  await page.getByRole('button', { name: 'Chọn quân 1', exact: true }).tap();
  await page.locator('#confirm-move').tap();
  await page.clock.fastForward(2300);
  assert.ok((await state()).audio.recent.includes('finish'));
  assert.ok((await state()).audio.recent.includes('victory'));
  console.log('Capture, shield spell, finish and victory sounds passed.');
  const result = {
    ...platform,
    state: await state(),
    errors,
  };
  assert.deepEqual(errors, []);
  await writeFile(`${out}/result.json`, JSON.stringify(result, null, 2));
  console.log(
    'Mobile/audio review passed: install gate, standalone/orientation pause, real sound output/mute/persistence, offline PWA, roll/deploy/bonus cues and landscape gameplay.',
  );
} finally {
  await browser.close();
}
