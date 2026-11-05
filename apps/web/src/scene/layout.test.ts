import { describe, it, expect } from 'vitest';
import { track, homeLanes, horsePosition, CELL, TILE_TOP, STABLE_TOP } from './layout';

describe('board geometry contract', () => {
  it('provides 52 unique slots and four identical rotated quarters', () => {
    expect(track).toHaveLength(52);
    expect(new Set(track.map(([x, z]) => `${x},${z}`)).size).toBe(52);
    track.forEach(([x, z], i) => {
      const rotated = track[(i + 13) % 52];
      expect(rotated[0]).toBeCloseTo(-z);
      expect(rotated[1]).toBeCloseTo(x);
      const next = track[(i + 1) % 52];
      expect(Math.hypot(x - next[0], z - next[1])).toBeLessThanOrEqual(Math.SQRT2 * CELL + 0.0001);
    });
  });
  it('joins each private lane to the preceding shared slot and exposes all six steps', () => {
    expect(new Set(homeLanes.flat().map(([x, z]) => `${x},${z}`)).size).toBe(24);
    homeLanes.forEach((lane, owner) => {
      expect(lane).toHaveLength(6);
      const entry = track[(owner * 13 + 51) % 52];
      expect(Math.hypot(entry[0] - lane[0][0], entry[1] - lane[0][1])).toBeCloseTo(CELL);
      lane
        .slice(1)
        .forEach(([x, z], i) =>
          expect(Math.hypot(x - lane[i][0], z - lane[i][1])).toBeCloseTo(CELL),
        );
    });
  });
  it('places the foot of every piece on the exact playable surface', () => {
    for (let owner = 0; owner < 4; owner++)
      for (let progress = -1; progress <= 57; progress++) {
        const h = { id: 'qa', owner, index: 0, progress, shield: false, comeback: false };
        const p = horsePosition(h);
        expect(p[1]).toBe(progress < 0 || progress === 57 ? STABLE_TOP : TILE_TOP);
        if (progress >= 0 && progress < 52)
          expect([p[0], p[2]]).toEqual(track[(owner * 13 + progress) % 52]);
      }
  });
});
