import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, playableMoves } from '../packages/game-core/dist/index.js';
const base = process.env.API_URL ?? 'http://127.0.0.1:3109';
async function call(path, { method = 'GET', body, token } = {}) {
  const r = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { 'x-room-token': token } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await r.json();
  assert.ok(r.ok, JSON.stringify({ status: r.status, data }));
  return data;
}
const config = structuredClone(DEFAULT_CONFIG);
config.playerCount = 4;
config.horsesPerPlayer = 2;
config.modules = { spells: true, portals: true, comeback: true, events: true, relics: true };
const host = await call('/rooms', { method: 'POST', body: { name: 'An', config, botCount: 2 } });
const code = host.code;
const guest = await call(`/rooms/${code}/join`, { method: 'POST', body: { name: 'Binh' } });
assert.equal(guest.players.filter((p) => p.bot).length, 2);
let room = await call(`/rooms/${code}/start`, { method: 'POST', token: host.token });
let steps = 0;
const actions = [0, 0, 0, 0];
while (room.status === 'playing' && steps++ < 3000) {
  const game = room.game;
  actions[game.current]++;
  if (game.current >= 2) {
    room = await call(`/rooms/${code}`, { token: guest.token });
    continue;
  }
  let action;
  if (game.phase === 'roll') action = { type: 'roll' };
  else {
    const legal = playableMoves(game);
    action = legal.length
      ? { type: 'move', horseId: legal.sort((a, b) => b.progress - a.progress)[0].id }
      : { type: 'pass' };
  }
  room = await call(`/rooms/${code}/actions`, {
    method: 'POST',
    token: game.current === 0 ? host.token : guest.token,
    body: { version: room.version, action },
  });
}
assert.equal(room.status, 'finished');
assert.ok(actions.every((n) => n > 0));
const guestView = await call(`/rooms/${code}`, { token: guest.token });
assert.equal(guestView.game.winner, room.game.winner);
assert.deepEqual(guestView.game.horses, room.game.horses);
console.log(
  JSON.stringify({ hybrid: true, steps, winner: room.game.winner, actionsPerSeat: actions }),
);
