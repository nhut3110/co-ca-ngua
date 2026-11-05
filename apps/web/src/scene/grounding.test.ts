import { diceStyles } from '@skyhoof/catalog';
import { expect, it } from 'vitest';
import { Euler, Quaternion, Vector3 } from 'three';
import { diceSupportHeight, DICE_TRAY, diceQuaternion } from './DiceStage';
import {
  dryTerrainHeight,
  footprintHeight,
  terrainHeight,
  outletShore,
  boundaryRadius,
  streamSurface,
} from './world-layout';
import { makeDieGeometry, makeAltarFloorGeometry, ALTAR_FLOOR_THICKNESS } from './dice-geometry';
import { LAKE, STREAM, OUTLET, STREAM_COURSE } from './landscape';

it.each(diceStyles)(
  'rests $id on the real altar without penetration in every rolling pose',
  (style) => {
    const die = makeDieGeometry(style.id),
      floor = makeAltarFloorGeometry();
    floor.computeBoundingBox();
    const renderedTop = floor.boundingBox!.max.y + DICE_TRAY.top - ALTAR_FLOOR_THICKNESS / 2;
    expect(renderedTop).toBeCloseTo(DICE_TRAY.top, 7);
    const p = die.attributes.position,
      v = new Vector3();
    const poses = Array.from({ length: 401 }, (_, i) =>
      new Quaternion().setFromEuler(new Euler(i * 0.13, i * 0.17, i * 0.09)),
    );
    poses.push(...[1, 2, 3, 4, 5, 6].map(diceQuaternion));
    for (const q of poses) {
      const support = diceSupportHeight(q, style.id);
      let bottom = Infinity;
      for (let j = 0; j < p.count; j++) {
        v.fromBufferAttribute(p, j).applyQuaternion(q);
        bottom = Math.min(bottom, v.y + DICE_TRAY.top + support);
      }
      expect(bottom).toBeGreaterThanOrEqual(renderedTop - 1e-6);
      expect(bottom - renderedTop).toBeLessThan(0.012);
    }
    die.dispose();
    floor.dispose();
  },
);
it('carves a submerged lake bed and connected stream beds in all four quadrants', () => {
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      expect(terrainHeight(LAKE.x * sx, LAKE.z * sz)).toBeLessThan(LAKE.level - 0.1);
      for (const [x, z] of STREAM)
        expect(terrainHeight(x * sx, z * sz)).toBeLessThan(dryTerrainHeight(x * sx, z * sz) - 0.1);
      for (const [x, z] of OUTLET)
        expect(terrainHeight(x * sx, z * sz)).toBeLessThan(LAKE.level - 0.05);
    }
});

it('keeps the whole stream bed below its water surface and attaches falls to the real shoreline', () => {
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      for (const [x, z] of STREAM_COURSE)
        expect(terrainHeight(x * sx, z * sz)).toBeLessThan(streamSurface(x * sx, z * sz) - 0.06);
      const [x, z] = outletShore(sx, sz);
      expect(Math.hypot(x, z)).toBeCloseTo(boundaryRadius(Math.atan2(z, x)), 6);
    }
});
it('limits retaining-wall heights around construction terraces', () => {
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const palace = footprintHeight(3.3 * sx, 3.45 * sz, 0.8);
      // A protected stable court meets the edge of the higher castle terrace.
      expect(palace.max).toBeLessThanOrEqual(0.421);
      expect(palace.max - palace.min).toBeLessThanOrEqual(0.331);
      const house = footprintHeight(2.7 * sx, 4.08 * sz, 0.42);
      expect(house.max - house.min).toBeLessThan(0.001);
    }
});

it('keeps the central tower foundation clear of all playable tiles', async () => {
  const { track, homeLanes } = await import('./layout');
  for (const [x, z] of [...track, ...homeLanes.flat()])
    expect(Math.hypot(x - DICE_TRAY.x, z - DICE_TRAY.z)).toBeGreaterThan(
      DICE_TRAY.radius + 0.25 + 0.005,
    );
});
