import { spawn } from 'node:child_process';
const port = process.env.TEST_ONLINE_PORT ?? '3108';
const server = spawn(process.execPath, ['apps/api/dist/main.js'], {
  env: {
    ...process.env,
    PORT: port,
    NODE_ENV: 'test',
    SUPABASE_URL: '',
    SUPABASE_SERVICE_ROLE_KEY: '',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
server.stdout.on('data', (data) => {
  log += data;
});
server.stderr.on('data', (data) => {
  log += data;
});
try {
  const deadline = Date.now() + 15000;
  while (!log.includes('Nest application successfully started')) {
    if (server.exitCode !== null || Date.now() > deadline)
      throw new Error(log || 'API did not start');
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  process.env.API_URL = `http://127.0.0.1:${port}`;
  await import('./online-api-e2e.mjs');
} finally {
  server.kill('SIGTERM');
}
