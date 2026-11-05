import { expect, it } from 'vitest';
import { outletGeometry, OUTLET_COLUMNS as C } from './water-geometry';
import { LAKE } from './landscape';
import { outletShore } from './world-layout';
it('keeps a connected, full-width river through the curved lip in every quadrant', () => {
  for (const scale of [1, 1.35])
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const g = outletGeometry(sx, sz, scale),
          p = g.attributes.position;
        const center = (i: number) => [
          (p.getX(i * C) + p.getX(i * C + C - 1)) / 2,
          (p.getY(i * C) + p.getY(i * C + C - 1)) / 2,
          (p.getZ(i * C) + p.getZ(i * C + C - 1)) / 2,
        ];
        const count = p.count / C;
        expect(center(0)[1]).toBeCloseTo(LAKE.level + 0.004);
        expect(center(count - 1)[1]).toBeLessThan(-2);
        const [shore] = outletShore(sx, sz, scale);
        expect(Math.abs(center(120)[0])).toBeCloseTo(Math.abs(shore) - 0.16, 4);
        expect(Math.abs(center(count - 1)[0])).toBeGreaterThan(Math.abs(shore));
        for (let i = 0; i < count; i++) {
          const width = Math.hypot(
            p.getX(i * C) - p.getX(i * C + C - 1),
            p.getZ(i * C) - p.getZ(i * C + C - 1),
          );
          expect(width).toBeGreaterThan(0.44);
          expect(width).toBeLessThan(0.52);
          if (i) {
            const a = center(i),
              b = center(i - 1);
            expect(Math.hypot(...a.map((v, j) => v - b[j]))).toBeLessThan(0.06);
            expect(a[1]).toBeLessThanOrEqual(b[1] + 0.00001);
          }
        }
        expect(g.index?.count).toBe((count - 1) * (C - 1) * 6);
        g.dispose();
      }
});
