import { expect, it } from 'vitest';
import { Box3, BoxGeometry, Group, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { fitAsset } from './asset-bounds';
import { makeTerrain } from './Terrain';
import { boundaryRadius } from './world-layout';
it('centers and grounds an imported asset without destroying its existing transforms', () => {
  const source = new Group();
  source.position.set(8, -3, 7);
  source.scale.set(2, 0.5, 3);
  const mesh = new Mesh(new BoxGeometry(4, 6, 2), new MeshBasicMaterial());
  mesh.position.set(-2, 5, 9);
  source.add(mesh);
  const before = source.position.clone(),
    fitted = fitAsset(source, 1, 0.7);
  fitted.updateMatrixWorld(true);
  const b = new Box3().setFromObject(fitted),
    center = b.getCenter(new Vector3()),
    size = b.getSize(new Vector3());
  expect(b.min.y).toBeCloseTo(0);
  expect(center.x).toBeCloseTo(0);
  expect(center.z).toBeCloseTo(0);
  expect(Math.max(size.x, size.z)).toBeLessThanOrEqual(1.000001);
  expect(size.y).toBeLessThanOrEqual(0.700001);
  expect(source.position.equals(before)).toBe(true);
});
it('keeps all rock strata within the island silhouette', () => {
  const geometry = makeTerrain(['pine', 'snow', 'volcano', 'celestial'], true),
    p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i),
      angle = Math.atan2(z, x);
    expect(Math.hypot(x, z)).toBeLessThanOrEqual(boundaryRadius(angle) * 1.031);
  }
  geometry.dispose();
});
