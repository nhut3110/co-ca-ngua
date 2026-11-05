import { expect, it } from 'vitest';
import { insideIsland, REGION_PLOTS, LANDMARK, terrainHeight } from './world-layout';
import { track, homeLanes } from './layout';
import { diceQuaternion } from './DiceStage';
import { Vector3 } from 'three';
it('keeps complete scenery footprints within the shore in every quadrant', () => {
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const props = [
        ...REGION_PLOTS.map((p) => ({
          ...p,
          radius: p.type === 'tree' ? p.scale * 0.66 : p.radius,
        })),
        { ...LANDMARK, radius: 1.02 },
      ];
      for (const p of props)
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 16) {
          expect(
            insideIsland(sx * p.x + Math.cos(a) * p.radius, sz * p.z + Math.sin(a) * p.radius),
            JSON.stringify(p),
          ).toBe(true);
        }
    }
});
it('preserves level foundations and unobstructed playable tiles', () => {
  for (const [x, z] of [...track, ...homeLanes.flat()]) {
    expect(terrainHeight(x, z)).toBe(0.025);
    for (const p of REGION_PLOTS)
      expect(Math.hypot(Math.abs(x) - p.x, Math.abs(z) - p.z)).toBeGreaterThan(p.radius + 0.235);
  }
});
it('lands all six dice results with the matching face upward', () => {
  const normals = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
    [0, 0, -1],
    [0, -1, 0],
    [-1, 0, 0],
  ];
  normals.forEach((n, i) => {
    expect(
      new Vector3(...n).applyQuaternion(diceQuaternion(i + 1)).distanceTo(new Vector3(0, 1, 0)),
    ).toBeLessThan(1e-6);
  });
});

it('grounds the ruined sanctuary on its terrace without crossing the stable or shore', async () => {
  const { RUIN_SITE: site, footprintHeight } = await import('./world-layout');
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const x = site.x * sx,
        z = site.z * sz;
      const heights = footprintHeight(x, z, site.radius);
      expect(heights.max - heights.min).toBeLessThan(0.36);
      expect(Math.hypot(site.x - 2.35, site.z - 2.35)).toBeGreaterThan(0.99 + site.radius);
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2;
        expect(insideIsland(x + Math.cos(a) * site.radius, z + Math.sin(a) * site.radius)).toBe(
          true,
        );
      }
    }
});
