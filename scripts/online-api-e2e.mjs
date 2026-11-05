import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, playableMoves } from '../packages/game-core/dist/index.js';
const base = process.env.API_URL ?? 'http://127.0.0.1:3098';
const call = async (path, { method = 'GET', token, body } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { 'x-room-token': token } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: res.status, data: await res.json() };
};
const config = structuredClone(DEFAULT_CONFIG);
config.playerCount = 2;
config.horsesPerPlayer = 2;
config.modules = { spells: true, portals: true, comeback: true, events: true, relics: true };
const host = await call('/rooms', { method: 'POST', body: { name: 'An', config } });
assert.equal(host.status, 201);
const code = host.data.code;
assert.match(code, /^[A-Z2-9]{6}$/);
const join = await call(`/rooms/${code}/join`, { method: 'POST', body: { name: 'Binh' } });
assert.equal(join.status, 201);
assert.equal(
  (await call(`/rooms/${code}/join`, { method: 'POST', body: { name: 'Chi' } })).status,
  409,
);
assert.equal(
  (await call(`/rooms/${code}/start`, { method: 'POST', token: join.data.token })).status,
  403,
);
const started = await call(`/rooms/${code}/start`, { method: 'POST', token: host.data.token });
assert.equal(started.status, 201);
let room = started.data;
assert.equal(room.game.seed, 0);
assert.deepEqual(
  room.game.players.map((p) => p.name),
  ['An', 'Binh'],
);
assert.equal(
  (
    await call(`/rooms/${code}/actions`, {
      method: 'POST',
      token: join.data.token,
      body: { version: room.version, action: { type: 'roll' } },
    })
  ).status,
  403,
);
const badToken = await call(`/rooms/${code}`, { token: 'x'.repeat(43) });
assert.equal(badToken.status, 401);
let steps = 0;
while (room.status === 'playing' && steps++ < 3000) {
  const game = room.game;
  let action;
  if (game.phase === 'roll') action = { type: 'roll' };
  else {
    const legal = playableMoves(game);
    action = legal.length
      ? { type: 'move', horseId: legal.sort((a, b) => b.progress - a.progress)[0].id }
      : { type: 'pass' };
  }
  const token = game.current === 0 ? host.data.token : join.data.token;
  const response = await call(`/rooms/${code}/actions`, {
    method: 'POST',
    token,
    body: { version: room.version, action },
  });
  assert.equal(response.status, 201, JSON.stringify(response));
  assert.equal(
    (
      await call(`/rooms/${code}/actions`, {
        method: 'POST',
        token,
        body: { version: room.version, action },
      })
    ).status,
    409,
  );
  room = response.data;
  assert.equal(room.game.seed, 0);
}
assert.equal(room.status, 'finished', `match did not complete after ${steps} actions`);
const restored = await call(`/rooms/${code}`, { token: join.data.token });
assert.equal(restored.data.game.winner, room.game.winner);
assert.deepEqual(restored.data.game.horses, room.game.horses);
console.log(
  JSON.stringify({
    room: code,
    steps,
    winner: room.game.winner,
    concurrentRevision: true,
    secretSeedHidden: true,
    seatAuthorization: true,
    reconnect: true,
  }),
);
