import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { biomes, maps, skins, skies, diceStyles } from '../packages/catalog/dist/index.js';
const port = process.env.TEST_API_PORT ?? '3097';
const child = spawn(process.execPath, ['apps/api/dist/main.js'], {
  env: {
    ...process.env,
    PORT: port,
    WEB_ORIGIN: 'https://skyhoof.example, https://preview.example',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
child.stdout.on('data', (d) => (logs += d));
child.stderr.on('data', (d) => (logs += d));
try {
  const start = Date.now();
  while (!logs.includes('Nest application successfully started')) {
    if (child.exitCode !== null || Date.now() - start > 10000)
      throw new Error(logs || 'API startup timed out');
    await new Promise((r) => setTimeout(r, 100));
  }
  const get = async (path) => {
    const response = await fetch(`http://127.0.0.1:${port}/${path}`);
    assert.equal(response.status, 200);
    return response.json();
  };
  const health = await get('health');
  assert.equal(health.status, 'ok');
  assert.equal(health.multiplayer, true);
  assert.equal(health.persistence, 'memory');
  const catalog = await get('catalog');
  assert.equal(catalog.skins.length, skins.length);
  assert.equal(catalog.biomes.length, biomes.length);
  assert.equal(catalog.maps.length, maps.length);
  assert.equal(catalog.skies.length, skies.length);
  assert.equal(catalog.diceStyles.length, diceStyles.length);
  for (const [origin, allowed] of [
    ['https://skyhoof.example', true],
    ['https://preview.example', true],
    ['https://other.example', false],
  ]) {
    const response = await fetch(`http://127.0.0.1:${port}/health`, {
      headers: { Origin: origin },
    });
    assert.equal(response.headers.get('access-control-allow-origin'), allowed ? origin : null);
  }
  const rules = await get('rules/default');
  assert.equal(rules.difficulty, 3);
  assert.ok(Object.values(rules.modules).every((v) => !v));
  console.log('Compiled NestJS API smoke passed: health, cosmetic catalog, default rules.');
} finally {
  child.kill('SIGTERM');
}
