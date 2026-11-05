import { describe, expect, it } from 'vitest';
import { applyAction, chooseBotAction, createGame, DEFAULT_CONFIG, playableMoves } from './index';

describe('sky events', () => {
  it('keeps old saves and disabled rules classical', () => {
    const g = createGame(DEFAULT_CONFIG, 1);
    expect(g.event).toBeUndefined();
    const rolled = { ...g, phase: 'move' as const, die: 2, rawDie: 2 };
    expect(playableMoves(rolled)).toHaveLength(0);
  });
  it('allows deployment on any unmodified roll during winds', () => {
    const g = createGame(DEFAULT_CONFIG, 1);
    g.config.modules.events = true;
    g.event = 'tailwind';
    g.phase = 'move';
    g.die = g.rawDie = 2;
    expect(playableMoves(g).length).toBeGreaterThan(0);
    expect(applyAction(g, { type: 'move', horseId: 'p0-h0' }).horses[0].progress).toBe(0);
  });
  it('blocks captures during mist but allows other moves', () => {
    const g = createGame(DEFAULT_CONFIG, 2);
    g.config.modules.events = true;
    g.event = 'truce';
    g.phase = 'move';
    g.die = g.rawDie = 2;
    g.horses[0].progress = 15;
    g.horses[1].progress = 2;
    g.horses[4].progress = 4;
    expect(playableMoves(g).map((h) => h.id)).toContain('p0-h1');
    expect(playableMoves(g).map((h) => h.id)).not.toContain('p0-h0');
    expect(applyAction(g, { type: 'move', horseId: 'p0-h0' })).toBe(g);
  });
  it('changes once per full round, never on bonus rolls', () => {
    const g = createGame(DEFAULT_CONFIG, 1);
    g.config.modules.events = true;
    g.event = 'tailwind';
    g.current = 3;
    g.turn = 4;
    g.phase = 'move';
    g.die = g.rawDie = 6;
    let next = applyAction(g, { type: 'move', horseId: 'p3-h0' });
    expect(next.event).toBe('tailwind');
    expect(next.turn).toBe(4);
    next.phase = 'move';
    next.die = next.rawDie = 2;
    next = applyAction(next, { type: 'move', horseId: 'p3-h0' });
    expect(next.event).toBe('truce');
    expect(next.turn).toBe(5);
  });
  it('supports boost, summon, relic tiles, starfall, mana_rain, and live cosmetic updates', () => {
    const config = structuredClone(DEFAULT_CONFIG);
    config.modeId = 'relic';
    config.modules = { spells: true, portals: true, comeback: true, events: true, relics: true };
    config.cosmetics.chromaIds = ['imperial-gold', 'jade-spirit', 'obsidian-void', 'frost-crystal'];
    config.cosmetics.auraIds = ['rune-halo', 'aether-wings', 'grand-crown', 'starlight-shards'];
    config.cosmetics.pedestalIds = ['lotus-jade', 'iron-crown', 'astral-ring', 'classic'];
    let g = createGame(config, 12);

    // Live cosmetic change preserves turn/state
    const recolored = applyAction(g, {
      type: 'cosmetics',
      cosmetics: { skinIds: ['royal-steed', 'astral-unicorn', 'ember-drake', 'spirit-fox'] },
    });
    expect(recolored.config.cosmetics.skinIds[0]).toBe('royal-steed');

    // Summon spell allows launching on a 3
    g.phase = 'move';
    g.die = g.rawDie = 3;
    g.players[0].mana = 3;
    expect(playableMoves(g)).toHaveLength(0);
    g = applyAction(g, { type: 'spell', spell: 'summon' });
    expect(g.summonAura).toBe(true);
    expect(g.players[0].mana).toBe(0);
    expect(playableMoves(g)).toHaveLength(4);

    // Starfall advances newly launched horse to progress 1
    g.event = 'starfall';
    g = applyAction(g, { type: 'move', horseId: 'p0-h0' });
    expect(g.horses[0].progress).toBe(1);

    // Boost spell adds +2 steps on shared track
    g.current = 0;
    g.phase = 'move';
    g.usedSpell = false;
    g.die = g.rawDie = 3;
    g.players[0].mana = 2;
    g.horses[0].progress = 6;
    g = applyAction(g, { type: 'spell', spell: 'boost' });
    expect(g.die).toBe(5);
    // Landing on Relic tile 11 (progress 6 + 5 = 11 for owner 0) triggers blessing
    g = applyAction(g, { type: 'move', horseId: 'p0-h0' });
    expect(g.horses[0].progress >= 11).toBe(true);
  });
  it.each(['classic', 'grand'] as const)(
    'bots complete a match with every module on %s',
    (board) => {
      const config = structuredClone(DEFAULT_CONFIG);
      config.board = board;
      config.horsesPerPlayer = 2;
      config.modules = { spells: true, portals: true, comeback: true, events: true };
      let g = createGame(config, 1925);
      for (let i = 0; i < 10000 && g.phase !== 'finished'; i++) {
        const next = applyAction(
          g,
          chooseBotAction(g, () => 0.41),
        );
        expect(next).not.toBe(g);
        g = next;
      }
      expect(g.phase).toBe('finished');
    },
  );
});
