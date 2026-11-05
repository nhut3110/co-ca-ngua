import { expect, it } from 'vitest';
import { applyAction, createGame, DEFAULT_CONFIG } from '@skyhoof/game-core';
import { moveIntent, transitionCue } from './battle-feedback';
it('previews and announces deployment, then exact finish using the authoritative result', () => {
  const g = createGame(DEFAULT_CONFIG, 42);
  g.phase = 'move';
  g.die = g.rawDie = 6;
  expect(moveIntent(g, g.horses[0].id)?.label).toBe('Xuất quân 1');
  expect(transitionCue(g, applyAction(g, { type: 'move', horseId: g.horses[0].id })).kind).toBe(
    'deploy',
  );
  g.die = g.rawDie = 1;
  g.horses[0].progress = 56;
  expect(moveIntent(g, g.horses[0].id)?.target.progress).toBe(57);
  expect(moveIntent(g, g.horses[0].id)?.kind).toBe('finish');
});
it('calls out a capture of the correct opponent and previews portal travel', () => {
  const g = createGame(DEFAULT_CONFIG, 42);
  g.phase = 'move';
  g.die = g.rawDie = 6;
  g.horses[0].progress = 11;
  g.horses[4].progress = 4;
  const cue = transitionCue(g, applyAction(g, { type: 'move', horseId: g.horses[0].id }));
  expect(cue.kind).toBe('capture');
  expect(cue.detail).toContain(g.players[1].name);
  expect(moveIntent(g, g.horses[0].id)?.label).toContain('Đá quân');
  g.config.modules.portals = true;
  g.die = g.rawDie = 1;
  g.horses[0].progress = 7;
  expect(moveIntent(g, g.horses[0].id)?.target.progress).toBe(34);
});
it('does not offer a confirmation for an illegal or shield-blocked move', () => {
  const g = createGame(DEFAULT_CONFIG, 42);
  g.phase = 'move';
  g.die = g.rawDie = 2;
  expect(moveIntent(g, g.horses[0].id)).toBeNull();
  g.horses[0].progress = 15;
  g.horses[4].progress = 4;
  g.horses[4].shield = true;
  expect(moveIntent(g, g.horses[0].id)).toBeNull();
});
