import { chromium } from 'playwright';
const b = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const p = await b.newPage({ viewport: { width: 1600, height: 1100 } });
p.on('pageerror', (e) => console.log('ERROR', String(e)));
p.on('console', (m) => {
  if (m.type() === 'error') console.log(m.text());
});
await p.goto('http://127.0.0.1:4173');
await p.waitForTimeout(5000);
await p.screenshot({ path: 'artifacts/browser/rebuild-welcome.png' });
await p.locator('#create-game').click();
await p.locator('#next-step').click();
await p.locator('#next-step').click();

await p.screenshot({ path: 'artifacts/browser/rebuild-create.png' });
await p.locator('#start-game').click();
await p.waitForTimeout(2500);
await p.screenshot({ path: 'artifacts/browser/rebuild-game.png' });
console.log(await p.evaluate(() => window.render_game_to_text()));
await b.close();
