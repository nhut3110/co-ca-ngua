import { it, expect } from 'vitest';
import { grandTrack, grandHomeLanes, boardLayout, horsePosition } from './layout';
import { boundaryRadius, grandTerrainHeight } from './world-layout';
import { crossroadsSites } from './Crossroads';
import { createGame, DEFAULT_CONFIG, boardRules } from '@skyhoof/game-core';
it('renders 80 unique connected track tiles and 24 distinct home tiles inside the expanded island', () => {
  const slots = [...grandTrack, ...grandHomeLanes.flat()];
  expect(grandTrack).toHaveLength(80);
  expect(new Set(slots.map((p) => p.map((v) => v.toFixed(4)).join(','))).size).toBe(104);
  for (let i = 0; i < 80; i++)
    expect(
      Math.hypot(
        grandTrack[i][0] - grandTrack[(i + 1) % 80][0],
        grandTrack[i][1] - grandTrack[(i + 1) % 80][1],
      ),
    ).toBeCloseTo(0.56);
  for (const [x, z] of slots) {
    expect(Math.hypot(x, z) + 0.25).toBeLessThan(boundaryRadius(Math.atan2(z, x)) * 1.35);
    expect(grandTerrainHeight(x, z)).toBeLessThanOrEqual(0.025);
  }
});
it('places every progress value on a valid tile for every grand player', () => {
  const config = { ...structuredClone(DEFAULT_CONFIG), board: 'grand' as const },
    g = createGame(config);
  for (const h of g.horses)
    for (let progress = -1; progress <= boardRules(config).finish; progress++)
      expect(horsePosition({ ...h, progress }, config).every(Number.isFinite)).toBe(true);
});
it('keeps four transition shrines away from playable lanes on both boards', () => {
  for (const grand of [false, true])
    for (const [x, z] of crossroadsSites(grand))
      for (const [a, b] of [
        ...boardLayout({ board: grand ? 'grand' : 'classic' }).track,
        ...boardLayout({ board: grand ? 'grand' : 'classic' }).homeLanes.flat(),
      ])
        expect(Math.hypot(x - a, z - b)).toBeGreaterThan(0.3 + 0.25 + 0.08);
});
