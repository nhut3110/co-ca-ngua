import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  applyAction,
  chooseBotAction,
  createGame,
  type GameAction,
  type GameConfig,
} from '@skyhoof/game-core';
import type { RoomRecord, RoomStore } from './room-store.js';

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
function validName(name: unknown): string {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 24)
    throw new BadRequestException('Tên người chơi phải từ 1 đến 24 ký tự.');
  return name.trim();
}
function checkAction(value: unknown): GameAction {
  if (!value || typeof value !== 'object') throw new BadRequestException('Hành động không hợp lệ.');
  const a = value as Record<string, unknown>;
  if (a.type === 'roll' || a.type === 'pass') return { type: a.type };
  if (
    (a.type === 'move' || a.type === 'shield') &&
    typeof a.horseId === 'string' &&
    /^p[0-3]-h[0-3]$/.test(a.horseId)
  )
    return { type: a.type, horseId: a.horseId };
  if (
    a.type === 'spell' &&
    typeof a.spell === 'string' &&
    ['reroll', 'plus', 'minus', 'boost', 'summon'].includes(a.spell)
  )
    return { type: 'spell', spell: a.spell as 'reroll' | 'plus' | 'minus' | 'boost' | 'summon' };
  throw new BadRequestException('Hành động không hợp lệ.');
}
export class RoomService {
  constructor(private store: RoomStore) {}
  private token() {
    return randomBytes(32).toString('base64url');
  }
  private code() {
    return Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('');
  }
  private async read(code: string) {
    if (!/^[A-Z2-9]{6}$/.test(code)) throw new NotFoundException('Không tìm thấy phòng.');
    const r = await this.store.get(code);
    if (!r || Date.parse(r.expiresAt) <= Date.now())
      throw new NotFoundException('Phòng không tồn tại hoặc đã hết hạn.');
    return r;
  }
  private seat(r: RoomRecord, token: string) {
    if (typeof token !== 'string' || token.length !== 43) throw new UnauthorizedException();
    const actual = Buffer.from(hash(token), 'hex');
    const idx = r.players.findIndex((p) =>
      timingSafeEqual(actual, Buffer.from(p.tokenHash, 'hex')),
    );
    if (idx < 0) throw new UnauthorizedException();
    return idx;
  }
  private view(r: RoomRecord, seat: number) {
    // The core seed determines future rolls and must not be shared with a client.
    const game = r.game ? { ...r.game, seed: 0 } : null;
    return {
      code: r.code,
      version: r.version,
      status: r.status,
      players: [
        ...r.players.map((p, i) => ({ seat: i, name: p.name, bot: false })),
        ...Array.from({ length: r.botCount ?? 0 }, (_, i) => ({
          seat: r.players.length + i,
          name: `Bot ${i + 1}`,
          bot: true,
        })),
      ],
      capacity: r.config.playerCount,
      config: r.config,
      game,
      seat,
      expiresAt: r.expiresAt,
    };
  }
  async create(config: GameConfig, name: unknown, botCount: unknown = 0) {
    const player = validName(name);
    let validated;
    try {
      validated = createGame({ ...config, playerName: player }, randomInt(1, 2 ** 32));
    } catch {
      throw new BadRequestException('Thiết lập ván không hợp lệ.');
    }
    if (
      !Number.isInteger(botCount) ||
      (botCount as number) < 0 ||
      (botCount as number) >= validated.config.playerCount
    )
      throw new BadRequestException('Số bot không hợp lệ.');
    const token = this.token();
    for (let i = 0; i < 12; i++) {
      const r: RoomRecord = {
        code: this.code(),
        version: 0,
        config: validated.config,
        botCount: botCount as number,
        players: [{ name: player, tokenHash: hash(token) }],
        status: 'waiting',
        game: null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
      if (await this.store.create(r)) return { ...this.view(r, 0), token };
    }
    throw new ConflictException('Không thể tạo mã phòng.');
  }
  async join(code: string, name: unknown) {
    const player = validName(name),
      token = this.token();
    for (let i = 0; i < 5; i++) {
      const r = await this.read(code),
        version = r.version;
      if (r.status !== 'waiting') throw new ConflictException('Ván đã bắt đầu.');
      if (r.players.length >= r.config.playerCount - (r.botCount ?? 0))
        throw new ConflictException('Phòng đã đầy.');
      const seat = r.players.length;
      r.players.push({ name: player, tokenHash: hash(token) });
      r.version++;
      if (await this.store.compareAndSet(r, version)) return { ...this.view(r, seat), token };
    }
    throw new ConflictException('Phòng vừa thay đổi, vui lòng thử lại.');
  }
  async snapshot(code: string, token: string) {
    let r = await this.read(code);
    const seat = this.seat(r, token);
    if (r.status === 'playing' && r.game && r.game.current >= r.players.length) {
      const version = r.version;
      const source = structuredClone(r.game);
      const action = chooseBotAction(source);
      if (action.type === 'roll' || (action.type === 'spell' && action.spell === 'reroll'))
        source.seed = randomInt(1, 2 ** 32);
      const next = applyAction(source, action);
      if (next !== source) {
        r.game = next;
        r.status = next.phase === 'finished' ? 'finished' : 'playing';
        r.version++;
        if (!(await this.store.compareAndSet(r, version))) r = await this.read(code);
      }
    }
    return this.view(r, seat);
  }
  async leaveWaiting(code: string, token: string) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const room = await this.read(code);
      const seat = this.seat(room, token),
        version = room.version;
      if (room.status !== 'waiting') throw new ConflictException('Ván đã bắt đầu.');
      room.players.splice(seat, 1);
      if (!room.players.length) room.expiresAt = new Date(0).toISOString();
      room.version++;
      if (await this.store.compareAndSet(room, version)) return { ok: true };
    }
    throw new ConflictException('Phòng vừa thay đổi, vui lòng thử lại.');
  }
  async start(code: string, token: string) {
    const r = await this.read(code),
      seat = this.seat(r, token),
      version = r.version;
    if (seat !== 0) throw new ForbiddenException('Chỉ chủ phòng được bắt đầu.');
    if (r.status !== 'waiting') throw new ConflictException('Ván đã bắt đầu.');
    if (r.players.length !== r.config.playerCount - (r.botCount ?? 0))
      throw new ConflictException('Chưa đủ người chơi.');
    r.game = createGame(r.config, randomInt(1, 2 ** 32));
    r.players.forEach((p, i) => {
      r.game!.players[i].name = p.name;
    });
    for (let i = 0; i < (r.botCount ?? 0); i++)
      r.game.players[r.players.length + i].name = `Bot ${i + 1}`;
    r.status = 'playing';
    r.version++;
    if (!(await this.store.compareAndSet(r, version)))
      throw new ConflictException('Phòng vừa thay đổi, vui lòng thử lại.');
    return this.view(r, seat);
  }
  async action(code: string, token: string, revision: unknown, input: unknown) {
    const action = checkAction(input),
      r = await this.read(code),
      seat = this.seat(r, token),
      version = r.version;
    if (!Number.isInteger(revision) || revision !== version)
      throw new ConflictException('Trạng thái đã thay đổi.');
    if (r.status !== 'playing' || !r.game) throw new ConflictException('Ván chưa bắt đầu.');
    if (r.game.current !== seat) throw new ForbiddenException('Chưa đến lượt của bạn.');
    const source = structuredClone(r.game);
    if (action.type === 'roll' || (action.type === 'spell' && action.spell === 'reroll'))
      source.seed = randomInt(1, 2 ** 32);
    const next = applyAction(source, action);
    if (next === source) throw new BadRequestException('Nước đi không hợp lệ.');
    r.game = next;
    r.status = next.phase === 'finished' ? 'finished' : 'playing';
    r.version++;
    if (!(await this.store.compareAndSet(r, version)))
      throw new ConflictException('Trạng thái đã thay đổi.');
    return this.view(r, seat);
  }
}
