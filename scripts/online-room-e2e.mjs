import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { mkdir, writeFile } from 'node:fs/promises';
const output = 'artifacts/online-room';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const contexts = await Promise.all([
  browser.newContext({ viewport: { width: 1280, height: 850 }, serviceWorkers: 'block' }),
  browser.newContext({ viewport: { width: 1280, height: 850 }, serviceWorkers: 'block' }),
]);
const [host, guest] = await Promise.all(contexts.map((c) => c.newPage()));
const errors = [];
for (const page of [host, guest]) {
  page.setDefaultTimeout(50000);
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
}
const state = (page) => page.evaluate(() => JSON.parse(window.render_game_to_text()));
try {
  await host.goto('http://127.0.0.1:4198');
  await host.getByRole('button', { name: 'Chơi online cùng bạn bè' }).click();
  await host.getByLabel('Tên của bạn').fill('An');
  await host.getByRole('checkbox', { name: 'Biến cố bầu trời' }).check();
  await host.getByRole('button', { name: 'Tạo phòng', exact: true }).click();
  await host.getByRole('heading', { name: 'Phòng chờ' }).waitFor();
  const code = await host.locator('.room-code').textContent();
  assert.match(code, /^[A-Z2-9]{6}$/);
  assert.equal(await host.getByRole('button', { name: 'Bắt đầu ván' }).isEnabled(), false);
  const qr = host.getByRole('img', { name: 'Mã QR mời vào phòng' });
  await qr.waitFor();
  const data = await qr.getAttribute('src');
  const png = PNG.sync.read(Buffer.from(data.split(',')[1], 'base64'));
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  assert.equal(decoded?.data, `http://127.0.0.1:4198/?room=${code}`);
  await host.screenshot({ path: `${output}/host-lobby.png` });
  await guest.goto(decoded.data);
  await guest.getByLabel('Tên của bạn').fill('Bình');
  assert.equal(await guest.getByLabel('Mã phòng').inputValue(), code);
  await guest.getByRole('button', { name: 'Vào phòng', exact: true }).click();
  await guest.getByRole('heading', { name: 'Phòng chờ' }).waitFor();
  await host.getByText('Bình').waitFor();
  assert.equal(await guest.getByRole('button', { name: 'Bắt đầu ván' }).count(), 0);
  await host.getByRole('button', { name: 'Bắt đầu ván' }).click();
  await host.bringToFront();
  await host.locator('.board-scene[data-ready=true]').waitFor();
  await host.waitForFunction(() => {
    const s = JSON.parse(window.render_game_to_text());
    return s.screen === 'game' && !s.presenting;
  });
  await guest.bringToFront();
  await guest.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).screen === 'game',
    null,
    { polling: 500 },
  );
  assert.equal((await state(host)).players[1].name, 'Bình');
  assert.equal((await state(guest)).config.modules.events, true);
  await host.bringToFront();
  await host.getByRole('button', { name: 'Tung xúc xắc', exact: true }).click();
  await host.waitForFunction(() => {
    const s = JSON.parse(window.render_game_to_text());
    return s.phase === 'move' && !s.presenting;
  });
  await guest.bringToFront();
  await guest.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).phase === 'move',
    null,
    { polling: 500 },
  );
  const h = await state(host),
    g = await state(guest);
  assert.equal(h.die, g.die);
  assert.equal(h.current, 0);
  await host.bringToFront();
  const legal = h.legalMoves;
  if (legal.length) {
    const index = Number(legal[0].split('-h')[1]) + 1;
    await host.getByRole('button', { name: `Chọn quân ${index}`, exact: true }).click();
    await host.locator('#confirm-move').click();
  } else {
    await host.getByRole('button', { name: 'Qua lượt', exact: false }).click();
  }
  await guest.bringToFront();
  await guest.waitForFunction(
    () => {
      const s = JSON.parse(window.render_game_to_text());
      return s.turn > 1 || (s.phase === 'roll' && s.current === 0);
    },
    null,
    { polling: 500 },
  );
  const beforeReload = await state(guest);
  await guest.reload();
  await guest.waitForFunction(
    () => JSON.parse(window.render_game_to_text()).screen === 'game',
    null,
    { polling: 500 },
  );
  const restored = await state(guest);
  assert.equal(restored.players[1].name, 'Bình');
  assert.deepEqual(restored.horses, beforeReload.horses);
  await guest.screenshot({ path: `${output}/guest-game.png` });
  assert.deepEqual(errors, []);
  await writeFile(
    `${output}/result.json`,
    JSON.stringify(
      {
        code,
        qr: decoded.data,
        hostStart: true,
        guestJoined: true,
        rollSynchronized: true,
        moveOrPass: true,
        reload: true,
        errors,
      },
      null,
      2,
    ),
  );
  console.log('Online room UI flow passed');
} catch (e) {
  for (const [name, page] of [
    ['host', host],
    ['guest', guest],
  ]) {
    console.log(
      name,
      'url',
      page.url(),
      'body',
      (await page.locator('body').innerText()).slice(0, 800),
    );
    await page.screenshot({ path: `${output}/failure-${name}.png` });
  }
  console.log('errors', errors);
  throw e;
} finally {
  await browser.close();
}
