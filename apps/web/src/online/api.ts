import type { GameAction, GameConfig, GameState } from '@skyhoof/game-core';
export interface Room {
  code: string;
  version: number;
  status: 'waiting' | 'playing' | 'finished';
  players: { seat: number; name: string }[];
  capacity: number;
  config: GameConfig;
  game: GameState | null;
  seat: number;
  expiresAt: string;
}
export interface Session {
  code: string;
  token: string;
}
const base = (
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://127.0.0.1:3001' : '')
).replace(/\/$/, '');
export async function roomRequest<T>(
  path: string,
  options: { method?: string; token?: string; body?: unknown } = {},
): Promise<T> {
  if (!base) throw new Error('Máy chủ online chưa được cấu hình.');
  const response = await fetch(`${base}/rooms${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { 'x-room-token': options.token } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message ?? `Lỗi kết nối (${response.status})`);
  }
  return response.json() as Promise<T>;
}
export const createRoom = (config: GameConfig, name: string) =>
  roomRequest<Room & { token: string }>('', { method: 'POST', body: { config, name } });
export const joinRoom = (code: string, name: string) =>
  roomRequest<Room & { token: string }>(`/${encodeURIComponent(code)}/join`, {
    method: 'POST',
    body: { name },
  });
export const getRoom = (s: Session) =>
  roomRequest<Room>(`/${encodeURIComponent(s.code)}`, { token: s.token });
export const startRoom = (s: Session) =>
  roomRequest<Room>(`/${encodeURIComponent(s.code)}/start`, { method: 'POST', token: s.token });
export const sendAction = (s: Session, version: number, action: GameAction) =>
  roomRequest<Room>(`/${encodeURIComponent(s.code)}/actions`, {
    method: 'POST',
    token: s.token,
    body: { version, action },
  });

export const leaveWaitingRoom = (s: Session) =>
  roomRequest<{ ok: boolean }>(`/${encodeURIComponent(s.code)}/leave`, {
    method: 'POST',
    token: s.token,
  });
