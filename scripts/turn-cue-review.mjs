import { chromium } from 'playwright';
import { createGame, DEFAULT_CONFIG } from '../packages/game-core/dist/index.js';
import assert from 'node:assert/strict';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({
    viewport: { width: 844, height: 390 },
    serviceWorkers: 'block',
  });
  page.setDefaultTimeout(120000);
  const game = createGame(DEFAULT_CONFIG, 42);
  game.current = 3;
  await page.addInitScript(
    (g) => localStorage.setItem('skyhoof.match.v1', JSON.stringify(g)),
    game,
  );
  await page.goto('http://127.0.0.1:4173');
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 50));
  await page.getByRole('button', { name: 'Tiếp tục ván đang chơi', exact: false }).click();
  for (let i = 0; i < 120; i++) {
    await page.clock.runFor(100);
    if (await page.locator('.board-scene[data-ready=true]').count()) break;
  }
  await page.locator('.board-scene[data-ready=true]').waitFor();
  await page.locator('.notice-turn').waitFor();
  assert.match(await page.locator('.notice-turn').innerText(), /Đào/);
  await page.screenshot({ path: 'artifacts/rails-review/turn-banner.png' });
  console.log('Visible turn banner captured over ready board');
} finally {
  await browser.close();
}
