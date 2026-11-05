import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { createGame, DEFAULT_CONFIG } from '../packages/game-core/dist/index.js';
const label = process.argv[2] ?? 'sample';
await mkdir('artifacts/scatter-benchmark', { recursive: true });
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const context = await browser.newContext({
  viewport: { width: 844, height: 390 },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 3,
  serviceWorkers: 'block',
});
await context.addInitScript(
  (game) => {
    Object.defineProperty(navigator, 'standalone', { value: true });
    localStorage.setItem('skyhoof.match.v1', JSON.stringify(game));
  },
  createGame(DEFAULT_CONFIG, 42),
);
const page = await context.newPage();
page.setDefaultTimeout(120000);
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
try {
  await page.goto('http://127.0.0.1:4191');
  await page.getByRole('button', { name: 'Tiếp tục ván đang chơi', exact: false }).tap();
  await page.locator('.board-scene[data-ready=true]').waitFor();
  await page.waitForFunction(() => !JSON.parse(window.render_game_to_text()).presenting);
  await page.waitForTimeout(5000);
  const metrics = await page.locator('.board-scene').evaluate((e) => JSON.parse(e.dataset.render));
  await page.screenshot({ path: `artifacts/scatter-benchmark/${label}.png`, scale: 'css' });
  await writeFile(
    `artifacts/scatter-benchmark/${label}.json`,
    JSON.stringify({ metrics, errors }, null, 2),
  );
  console.log(label, JSON.stringify({ metrics, errors }));
} finally {
  await browser.close();
}
