import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const b = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
p.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
await p.goto('http://127.0.0.1:4173');
await p.waitForTimeout(5000);
await p.screenshot({ path: 'artifacts/browser/ui-welcome.png' });
await p.locator('#create-game').click();
await p.waitForTimeout(3000);
await p.screenshot({ path: 'artifacts/browser/ui-setup.png' });
await p.locator('#next-step').click();
await p.screenshot({ path: 'artifacts/browser/ui-rules.png' });
await p.locator('#next-step').click();
await p.screenshot({ path: 'artifacts/browser/ui-world.png' });
await p.locator('#start-game').click();
await p.waitForTimeout(6000);
console.log(
  await p.locator('.game-layout,.game-world,.board-scene,canvas').evaluateAll((es) =>
    es.map((e) => ({
      class: e.className,
      rect: JSON.stringify(e.getBoundingClientRect()),
      height: getComputedStyle(e).height,
    })),
  ),
);
await p.screenshot({ path: 'artifacts/browser/ui-game.png' });
await p.setViewportSize({ width: 390, height: 844 });
await p.waitForTimeout(1500);
await p.screenshot({ path: 'artifacts/browser/ui-game-mobile.png' });
await p.locator('.activity summary').click();
assert.equal(await p.locator('.activity').getAttribute('open'), '');
await p.locator('.activity summary').click();
await p.getByRole('button', { name: 'Cài đặt hiển thị', exact: true }).click();
assert.equal(await p.locator('dialog[open]').count(), 1);
await p.keyboard.press('Escape');
assert.equal(await p.locator('dialog[open]').count(), 0);
await p.getByRole('button', { name: 'Rời bàn', exact: false }).click();
await p.getByRole('button', { name: 'Về trang chủ', exact: false }).click();
await p.waitForTimeout(2500);
await p.screenshot({ path: 'artifacts/browser/ui-welcome-mobile.png' });
await p.locator('#create-game').click();
await p.waitForTimeout(2000);
await p.screenshot({ path: 'artifacts/browser/ui-setup-mobile.png' });
assert.equal(errors.length, 0, errors.join('\n'));
console.log('UI visual and interaction review passed; no console/page errors.');
await b.close();
