import type { GameConfig, GameState } from '@skyhoof/game-core';
export interface PlayerSeat {
  name: string;
  tokenHash: string;
}
export interface RoomRecord {
  code: string;
  version: number;
  config: GameConfig;
  botCount?: number;
  players: PlayerSeat[];
  status: 'waiting' | 'playing' | 'finished';
  game: GameState | null;
  expiresAt: string;
}
export interface RoomStore {
  get(code: string): Promise<RoomRecord | null>;
  create(room: RoomRecord): Promise<boolean>;
  compareAndSet(room: RoomRecord, expected: number): Promise<boolean>;
}
export class MemoryRoomStore implements RoomStore {
  private rooms = new Map<string, RoomRecord>();
  async get(code: string) {
    const r = this.rooms.get(code);
    return r ? structuredClone(r) : null;
  }
  async create(room: RoomRecord) {
    if (this.rooms.has(room.code)) return false;
    this.rooms.set(room.code, structuredClone(room));
    return true;
  }
  async compareAndSet(room: RoomRecord, expected: number) {
    if (this.rooms.get(room.code)?.version !== expected) return false;
    this.rooms.set(room.code, structuredClone(room));
    return true;
  }
}
/** Service-role access stays server-side; compare-and-set prevents concurrent lost updates. */
export class SupabaseRoomStore implements RoomStore {
  constructor(
    private url: string,
    private serviceKey: string,
  ) {}
  private async request(path: string, init: RequestInit = {}) {
    const response = await fetch(`${this.url.replace(/\/$/, '')}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: this.serviceKey,
        Authorization: `Bearer ${this.serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        ...init.headers,
      },
    });
    if (!response.ok) throw new Error(`Room storage error (${response.status})`);
    return response.json() as Promise<Array<{ data: RoomRecord }>>;
  }
  async get(code: string) {
    const rows = await this.request(
      `skyhoof_rooms?code=eq.${encodeURIComponent(code)}&select=data&limit=1`,
    );
    return rows[0]?.data ?? null;
  }
  async create(room: RoomRecord) {
    const response = await fetch(`${this.url.replace(/\/$/, '')}/rest/v1/skyhoof_rooms`, {
      method: 'POST',
      headers: {
        apikey: this.serviceKey,
        Authorization: `Bearer ${this.serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        code: room.code,
        version: room.version,
        data: room,
        expires_at: room.expiresAt,
      }),
    });
    if (response.status === 409) return false;
    if (!response.ok) throw new Error(`Room storage error (${response.status})`);
    return true;
  }
  async compareAndSet(room: RoomRecord, expected: number) {
    const rows = await this.request(
      `skyhoof_rooms?code=eq.${encodeURIComponent(room.code)}&version=eq.${expected}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ version: room.version, data: room, expires_at: room.expiresAt }),
      },
    );
    return rows.length === 1;
  }
}
