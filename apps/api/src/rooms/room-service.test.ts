import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '@skyhoof/game-core';
import { RoomService } from './room-service';
import { MemoryRoomStore } from './room-store';

describe('online room service', () => {
  it('creates and joins a room; only its host can start; actions are authoritative', async () => {
    const service = new RoomService(new MemoryRoomStore());
    const config = structuredClone(DEFAULT_CONFIG);
    config.playerCount = 2;
    const host = await service.create(config, 'An');
    expect(host.code).toMatch(/^[A-Z2-9]{6}$/);
    expect(host.token).toHaveLength(43);
    const guest = await service.join(host.code, 'Bình');
    expect(guest.seat).toBe(1);
    await expect(service.join(host.code, 'Ba')).rejects.toThrow('đầy');
    await expect(service.start(host.code, guest.token)).rejects.toThrow();
    const started = await service.start(host.code, host.token);
    expect(started.game?.players.map((p) => p.name)).toEqual(['An', 'Bình']);
    expect(started.game?.seed).toBe(0);
    await expect(
      service.action(host.code, guest.token, started.version, { type: 'roll' }),
    ).rejects.toThrow();
    const rolled = await service.action(host.code, host.token, started.version, { type: 'roll' });
    expect(rolled.game?.die).toBeGreaterThanOrEqual(1);
    expect(rolled.game?.die).toBeLessThanOrEqual(6);
    expect(rolled.game?.seed).toBe(0);
    await expect(
      service.action(host.code, host.token, started.version, { type: 'roll' }),
    ).rejects.toThrow();
    await expect(service.snapshot(host.code, 'x'.repeat(43))).rejects.toThrow();
    expect((await service.snapshot(host.code, guest.token)).game?.die).toBe(rolled.game?.die);
  });
  it('does not allow a double join or two concurrent moves to overwrite each other', async () => {
    const service = new RoomService(new MemoryRoomStore());
    const config = structuredClone(DEFAULT_CONFIG);
    config.playerCount = 2;
    const h = await service.create(config, 'An');
    const results = await Promise.allSettled([
      service.join(h.code, 'Bình'),
      service.join(h.code, 'Chi'),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const started = await service.start(h.code, h.token);
    const moves = await Promise.allSettled([
      service.action(h.code, h.token, started.version, { type: 'roll' }),
      service.action(h.code, h.token, started.version, { type: 'roll' }),
    ]);
    expect(moves.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });
});

it('releases waiting seats and transfers host without breaking reconnect tokens', async () => {
  const store = new MemoryRoomStore();
  const service = new RoomService(store);
  const config = structuredClone(DEFAULT_CONFIG);
  config.playerCount = 3;
  const host = await service.create(config, 'An');
  const guest = await service.join(host.code, 'Bình');
  await service.leaveWaiting(host.code, host.token);
  const promoted = await service.snapshot(host.code, guest.token);
  expect(promoted.seat).toBe(0);
  await expect(service.snapshot(host.code, host.token)).rejects.toThrow();
  const newcomer = await service.join(host.code, 'Chi');
  expect(newcomer.seat).toBe(1);
  await service.leaveWaiting(host.code, newcomer.token);
  await service.leaveWaiting(host.code, guest.token);
  await expect(service.snapshot(host.code, guest.token)).rejects.toThrow();
});
