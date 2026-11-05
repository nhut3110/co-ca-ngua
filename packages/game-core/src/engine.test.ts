import { describe, expect, it } from 'vitest';
import {
  applyAction,
  chooseBotAction,
  chooseBotMove,
  createGame,
  DEFAULT_CONFIG,
  FINISH,
  legalMoves,
  playableMoves,
  type Difficulty,
  type GameState,
} from './index';

function rolled(die: number, patch: Partial<GameState> = {}) {
  return { ...createGame(DEFAULT_CONFIG, 123), phase: 'move' as const, die, rawDie: die, ...patch };
}
describe('classical rules', () => {
  it('rejects malformed or incomplete match configuration', () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.cosmetics.biomeIds = [];
    expect(() => createGame(config)).toThrow('Thiết lập ván không hợp lệ.');
  });
  it('accepts older cosmetics and rejects malformed new cosmetic fields', () => {
    const config = structuredClone(DEFAULT_CONFIG);
    delete config.cosmetics.skyId;
    delete config.cosmetics.diceId;
    expect(createGame(config).config.cosmetics.skyId).toBeUndefined();
    for (const key of ['skyId', 'diceId'] as const) {
      const invalid = structuredClone(config);
      Object.assign(invalid.cosmetics, { [key]: 42 });
      expect(() => createGame(invalid)).toThrow('Thiết lập ván không hợp lệ.');
    }
  });
  it('defaults to medium bots and all magic disabled', () => {
    const s = createGame();
    expect(s.config.difficulty).toBe(3);
    expect(Object.values(s.config.modules)).toEqual([false, false, false]);
    expect(s.horses).toHaveLength(16);
    expect(s.players.every((p) => p.mana === 0)).toBe(true);
  });
  it('never mutates config or previous state', () => {
    const config = structuredClone(DEFAULT_CONFIG);
    const s = createGame(config, 123);
    const before = JSON.stringify(s);
    const next = applyAction(s, { type: 'roll' });
    expect(JSON.stringify(s)).toBe(before);
    expect(next).not.toBe(s);
    next.config.playerName = 'Other';
    expect(config.playerName).toBe('Bạn');
  });
  it('is replayable with a fixed random seed', () => {
    expect(applyAction(createGame(DEFAULT_CONFIG, 19), { type: 'roll' })).toEqual(
      applyAction(createGame(DEFAULT_CONFIG, 19), { type: 'roll' }),
    );
  });
  it('allows launch on 1 or 6, consuming the full roll', () => {
    for (const die of [1, 6]) {
      const s = rolled(die);
      expect(legalMoves(s)).toHaveLength(4);
      expect(applyAction(s, { type: 'move', horseId: 'p0-h0' }).horses[0].progress).toBe(0);
    }
    expect(legalMoves(rolled(3))).toHaveLength(0);
  });
  it('respects six-only launch configuration', () => {
    const s = rolled(1);
    s.config.launchOnOne = false;
    expect(legalMoves(s)).toHaveLength(0);
  });
  it('keeps a bonus on 6, including when there is no legal move', () => {
    const s = rolled(6);
    s.horses.filter((h) => h.owner === 0).forEach((h) => (h.progress = 56));
    const next = applyAction(s, { type: 'pass' });
    expect(next.current).toBe(0);
    expect(next.phase).toBe('roll');
    expect(applyAction(rolled(2), { type: 'pass' }).current).toBe(1);
  });
  it('rejects arbitrary moves and invalid phase actions', () => {
    const s = rolled(2);
    expect(applyAction(s, { type: 'move', horseId: 'p1-h0' })).toBe(s);
    expect(applyAction(s, { type: 'roll' })).toBe(s);
    expect(applyAction(rolled(1), { type: 'pass' }).current).toBe(0);
  });
  it('allows passing a piece but blocks landing on your own piece', () => {
    const s = rolled(2);
    s.horses[0].progress = 0;
    s.horses[1].progress = 1;
    expect(legalMoves(s).map((h) => h.id)).toContain('p0-h0');
    s.horses[1].progress = 2;
    expect(legalMoves(s).map((h) => h.id)).not.toContain('p0-h0');
  });
  it('captures across player-relative track coordinates', () => {
    const s = rolled(2);
    s.horses[0].progress = 15;
    s.horses[4].progress = 4;
    const next = applyAction(s, { type: 'move', horseId: 'p0-h0' });
    expect(next.horses[4].progress).toBe(-1);
    expect(next.current).toBe(1);
  });
  it('requires exact finish and removes completed pieces from lane occupancy', () => {
    const s = rolled(2);
    s.horses[0].progress = 56;
    expect(legalMoves(s)).toHaveLength(0);
    s.die = s.rawDie = 1;
    s.horses[1].progress = FINISH;
    const next = applyAction(s, { type: 'move', horseId: 'p0-h0' });
    expect(next.horses[0].progress).toBe(FINISH);
  });
  it('ends when the entire team finishes and rejects further actions', () => {
    const s = rolled(1);
    s.horses.filter((h) => h.owner === 0).forEach((h) => (h.progress = FINISH));
    s.horses[0].progress = 56;
    const next = applyAction(s, { type: 'move', horseId: 'p0-h0' });
    expect(next.winner).toBe(0);
    expect(next.phase).toBe('finished');
    expect(applyAction(next, { type: 'roll' })).toBe(next);
  });
});
describe('optional modules', () => {
  it('never allows spells in a classical match', () => {
    const s = rolled(3);
    s.players[0].mana = 3;
    expect(applyAction(s, { type: 'spell', spell: 'plus' })).toBe(s);
  });
  it('uses mana once per main turn; modified 6 does not award bonus', () => {
    const s = rolled(5);
    s.config.modules.spells = true;
    s.players[0].mana = 3;
    s.horses[0].progress = 2;
    const spell = applyAction(s, { type: 'spell', spell: 'plus' });
    expect(spell.die).toBe(6);
    expect(spell.players[0].mana).toBe(2);
    expect(applyAction(spell, { type: 'spell', spell: 'minus' })).toBe(spell);
    expect(applyAction(spell, { type: 'move', horseId: 'p0-h0' }).current).toBe(1);
  });
  it('prevents modified rolls from launching or entering home and permits pass', () => {
    const s = rolled(5);
    s.config.modules.spells = true;
    s.players[0].mana = 3;
    s.horses[0].progress = 50;
    const spell = applyAction(s, { type: 'spell', spell: 'plus' });
    expect(playableMoves(spell)).toHaveLength(0);
    expect(applyAction(spell, { type: 'pass' }).current).toBe(1);
  });
  it('protects a piece until its next main turn, not just a bonus roll', () => {
    let s = createGame();
    s.config.modules.spells = true;
    s.players[0].mana = 2;
    s.horses[0].progress = 17;
    s = applyAction(s, { type: 'shield', horseId: 'p0-h0' });
    expect(s.horses[0].shield).toBe(true);
    s.phase = 'move';
    s.current = 1;
    s.die = s.rawDie = 2;
    s.horses[4].progress = 2;
    expect(legalMoves(s).some((h) => h.id === 'p1-h0')).toBe(false);
    s.current = 3;
    s.horses.filter((h) => h.owner === 3).forEach((h) => (h.progress = -1));
    s = applyAction(s, { type: 'pass' });
    expect(s.current).toBe(0);
    expect(s.horses[0].shield).toBe(false);
  });
  it('portals activate only when enabled, do not cross the home entry', () => {
    const s = rolled(2);
    s.horses[0].progress = 6;
    expect(applyAction(s, { type: 'move', horseId: 'p0-h0' }).horses[0].progress).toBe(8);
    s.config.modules.portals = true;
    expect(applyAction(s, { type: 'move', horseId: 'p0-h0' }).horses[0].progress).toBe(34);
    s.horses[0].progress = 32;
    expect(applyAction(s, { type: 'move', horseId: 'p0-h0' }).horses[0].progress).toBe(34);
  });
  it('blocked portal exits stay put without taking a second capture', () => {
    const s = rolled(2);
    s.config.modules.portals = true;
    s.horses[0].progress = 6;
    s.horses[4].progress = 21;
    expect(applyAction(s, { type: 'move', horseId: 'p0-h0' }).horses[0].progress).toBe(8);
  });
  it('grants capture compensation and one-use comeback only when enabled', () => {
    const s = rolled(2);
    s.config.modules = { spells: true, comeback: true, portals: false };
    s.horses[0].progress = 15;
    s.horses[4].progress = 4;
    let next = applyAction(s, { type: 'move', horseId: 'p0-h0' });
    expect(next.horses[4].comeback).toBe(true);
    expect(next.players[1].mana).toBe(1);
    next = { ...next, phase: 'move', die: 3, rawDie: 3 };
    next = applyAction(next, { type: 'move', horseId: 'p1-h0' });
    expect(next.horses[4].progress).toBe(0);
    expect(next.horses[4].comeback).toBe(false);
  });
  it('cosmetic changes do not change game outcomes', () => {
    const a = rolled(1),
      b = structuredClone(a);
    b.config.cosmetics = { mapId: 'moon-garden', skinIds: ['little-mage'], biomeIds: ['snow'] };
    expect(applyAction(a, { type: 'move', horseId: 'p0-h0' }).horses).toEqual(
      applyAction(b, { type: 'move', horseId: 'p0-h0' }).horses,
    );
  });
});
describe('bots and full-match invariants', () => {
  it.each([1, 2, 3, 4, 5] as Difficulty[])('level %i always chooses a legal move', (level) => {
    const s = rolled(3);
    s.config.difficulty = level;
    s.horses[0].progress = 15;
    s.horses[1].progress = 5;
    s.horses[4].progress = 5;
    expect(playableMoves(s).map((h) => h.id)).toContain(chooseBotMove(s, () => 0.42));
  });
  it('medium takes an immediate winning move', () => {
    const s = rolled(1);
    s.horses.filter((h) => h.owner === 0).forEach((h) => (h.progress = FINISH));
    s.horses[0].progress = 56;
    expect(chooseBotMove(s)).toBe('p0-h0');
  });
  it.each([false, true])('plays a complete 4-player match without deadlock (magic=%s)', (magic) => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.horsesPerPlayer = 2;
    config.modules = { spells: magic, portals: magic, comeback: magic };
    let s = createGame(config, 1925);
    for (let i = 0; i < 6000 && s.phase !== 'finished'; i++) {
      const next = applyAction(
        s,
        chooseBotAction(s, () => 0.41),
      );
      expect(next).not.toBe(s);
      s = next;
      expect(s.players.every((p) => p.mana >= 0 && p.mana <= 3)).toBe(true);
      expect(s.horses.every((h) => h.progress >= -1 && h.progress <= 57)).toBe(true);
    }
    expect(s.phase).toBe('finished');
    expect(s.winner).not.toBeNull();
  });
});
