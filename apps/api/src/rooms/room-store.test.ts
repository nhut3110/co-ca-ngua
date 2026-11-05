import { afterEach, expect, it, vi } from 'vitest';
import { createGame, DEFAULT_CONFIG } from '@skyhoof/game-core';
import { SupabaseRoomStore, type RoomRecord } from './room-store';
afterEach(() => vi.unstubAllGlobals());
it('uses service-role headers and detects stale updates against PostgREST', async () => {
  const room: RoomRecord = {
    code: 'ABC234',
    version: 0,
    config: structuredClone(DEFAULT_CONFIG),
    players: [{ name: 'An', tokenHash: 'hash' }],
    status: 'waiting',
    game: createGame(DEFAULT_CONFIG, 1),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
  };
  let row: { code: string; version: number; data: RoomRecord } | undefined;
  const fetchMock = vi.fn(async (raw: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(raw));
    const headers = new Headers(init?.headers);
    expect(headers.get('apikey')).toBe('service-secret');
    expect(headers.get('authorization')).toBe('Bearer service-secret');
    if (init?.method === 'POST') {
      if (row) return new Response('', { status: 409 });
      row = JSON.parse(String(init.body));
      return new Response(null, { status: 201 });
    }
    if (init?.method === 'PATCH') {
      const wanted = Number(url.searchParams.get('version')?.replace('eq.', ''));
      if (!row || row.version !== wanted) return Response.json([]);
      const patch = JSON.parse(String(init.body));
      row = { ...row, ...patch };
      return Response.json([{ data: row!.data }]);
    }
    return Response.json(row ? [{ data: row.data }] : []);
  });
  vi.stubGlobal('fetch', fetchMock);
  const store = new SupabaseRoomStore('https://example.supabase.co', 'service-secret');
  expect(await store.create(room)).toBe(true);
  expect(await store.create(room)).toBe(false);
  expect((await store.get(room.code))?.code).toBe(room.code);
  const next = { ...room, version: 1 };
  expect(await store.compareAndSet(next, 0)).toBe(true);
  expect(await store.compareAndSet({ ...next, version: 2 }, 0)).toBe(false);
  expect((await store.get(room.code))?.version).toBe(1);
});
