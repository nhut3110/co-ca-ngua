import { spawn } from 'node:child_process';
const server = spawn('node', ['scripts/edge/bundle-test-server.mjs'], {
  stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
server.stdout.on('data', (d) => {
  log += d;
});
server.stderr.on('data', (d) => {
  log += d;
});
try {
  const deadline = Date.now() + 15000;
  while (!log.includes('edge test ready')) {
    if (server.exitCode !== null || Date.now() > deadline)
      throw new Error(log || 'Server did not start');
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  process.env.API_URL = 'http://127.0.0.1:3109';
  await import('./online-api-e2e.mjs');
} finally {
  server.kill('SIGTERM');
}
