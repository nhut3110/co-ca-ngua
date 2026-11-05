import { chromium } from 'playwright';
import { createGame, DEFAULT_CONFIG } from '../packages/game-core/dist/index.js';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({
  viewport: { width: 844, height: 390 },
  hasTouch: true,
  isMobile: true,
});
page.setDefaultTimeout(120000);
await page.addInitScript(
  (g) => {
    Object.defineProperty(navigator, 'standalone', { value: true });
    localStorage.setItem('skyhoof.match.v1', JSON.stringify(g));
  },
  createGame(DEFAULT_CONFIG, 2026),
);
try {
  await page.goto(
    'http://127.0.0.1:4173' + (process.argv[2] === 'baseline' ? '/?renderProfile=baseline' : '/'),
  );
  await page.getByRole('button', { name: 'Tiếp tục ván đang chơi', exact: false }).tap();
  await page.locator('.board-scene[data-ready=true]').waitFor();
  await page.waitForFunction(() => {
    const raw = document.querySelector('.board-scene')?.dataset.render;
    return raw && JSON.parse(raw).renders >= 4;
  });
  await page.waitForTimeout(1500);
  const metrics = await page.locator('.board-scene').getAttribute('data-render');
  await mkdir('artifacts/performance', { recursive: true });
  await writeFile(`artifacts/performance/${process.argv[2] ?? 'profile'}.json`, metrics);
  await page.screenshot({ path: `artifacts/performance/${process.argv[2] ?? 'profile'}.png` });
  console.log(metrics);
} finally {
  await browser.close();
}
