import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
try {
  await page.goto('http://127.0.0.1:4173');
  await page.waitForTimeout(4000);
  await page.locator('#create-game').click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'artifacts/browser/ui-setup-mobile-full.png', fullPage: true });
  const slider = page.getByRole('slider', { name: 'Độ khó của bot' });
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await slider.inputValue(), '4');
  await page.locator('#next-step').click();
  assert.equal(
    await page.locator('.step-content h1').evaluate((e) => e === document.activeElement),
    true,
  );
  assert.ok(
    await page
      .locator('.step-content h1')
      .evaluate((e) => e.getBoundingClientRect().top < window.innerHeight),
  );
  await page.getByLabel('Tinh thạch & phép', { exact: false }).check();
  await page.screenshot({ path: 'artifacts/browser/ui-rules-mobile-full.png', fullPage: true });
  await page.locator('#next-step').click();
  await page.locator('#start-game').click();
  await page.waitForTimeout(2000);
  const state = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  assert.equal(state.screen, 'game');
  assert.equal(state.config.difficulty, 4);
  assert.equal(state.config.modules.spells, true);
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log(
    'Mobile setup passed: controls remain reachable, keyboard slider, focus/scroll between steps, enabled rules carried into gameplay.',
  );
} finally {
  await browser.close();
}
