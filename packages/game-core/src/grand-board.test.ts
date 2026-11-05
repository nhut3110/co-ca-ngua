import { expect, it } from 'vitest';
import {
  createGame,
  DEFAULT_CONFIG,
  boardRules,
  absoluteTile,
  applyAction,
  playableMoves,
  chooseBotAction,
} from './index';
const config = () => ({ ...structuredClone(DEFAULT_CONFIG), board: 'grand' as const });
function rolled(die: number) {
  return { ...createGame(config(), 123), phase: 'move' as const, die, rawDie: die };
}
it('defaults legacy saves to the unchanged classical topology', () => {
  expect(boardRules(DEFAULT_CONFIG).trackLength).toBe(52);
  expect(boardRules(DEFAULT_CONFIG).finish).toBe(57);
  expect(boardRules(config()).trackLength).toBe(80);
  expect(() => createGame({ ...config(), board: 'invalid' as 'grand' })).toThrow();
});
it('captures across an 80-tile wrap without conflating the private home lanes', () => {
  const g = rolled(1);
  g.horses[0].progress = 58;
  g.horses[4].progress = 39;
  expect(absoluteTile(g.horses[4], g.config)).toBe(59);
  const next = applyAction(g, { type: 'move', horseId: g.horses[0].id });
  expect(next.horses[4].progress).toBe(-1);
  g.horses[0].progress = 79;
  const home = applyAction(g, { type: 'move', horseId: g.horses[0].id });
  expect(home.horses[0].progress).toBe(80);
  expect(absoluteTile(home.horses[0], g.config)).toBeNull();
});
it('requires exact grand finish and declares a winner only at 85', () => {
  const g = rolled(2);
  g.horses.filter((h) => h.owner === 0).forEach((h) => (h.progress = 85));
  g.horses[0].progress = 84;
  expect(playableMoves(g)).toHaveLength(0);
  g.die = g.rawDie = 1;
  const next = applyAction(g, { type: 'move', horseId: g.horses[0].id });
  expect(next.winner).toBe(0);
  expect(next.phase).toBe('finished');
});
it('uses grand portals, wells and modified-roll boundaries', () => {
  const g = rolled(1);
  g.config.modules = { spells: true, portals: true, comeback: true };
  g.players[0].mana = 1;
  g.horses[0].progress = 11;
  expect(applyAction(g, { type: 'move', horseId: g.horses[0].id }).horses[0].progress).toBe(52);
  g.horses[0].progress = 6;
  expect(applyAction(g, { type: 'move', horseId: g.horses[0].id }).players[0].mana).toBe(2);
  g.horses[0].progress = 79;
  g.rawDie = 2;
  expect(playableMoves(g)).toHaveLength(0);
});
it('lets medium bots complete an entire grand match without illegal transitions', () => {
  let g = createGame({ ...config(), playerCount: 2, horsesPerPlayer: 2 }, 7);
  for (let n = 0; n < 12000 && g.phase !== 'finished'; n++) {
    const action = chooseBotAction(g, () => 0.42),
      next = applyAction(g, action);
    expect(next).not.toBe(g);
    g = next;
    expect(g.horses.every((h) => h.progress >= -1 && h.progress <= 85)).toBe(true);
  }
  expect(g.phase).toBe('finished');
});
