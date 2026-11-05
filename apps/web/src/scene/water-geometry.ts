import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, Vector3 } from 'three';
import { LAKE, OUTLET_COURSE } from './landscape';
import { outletShore } from './world-layout';
export const OUTLET_COLUMNS = 9;
/** One connected surface from the lake, around the shore lip, down the cliff. */
export function outletGeometry(sx: number, sz: number, scale = 1) {
  const shore = outletShore(sx, sz, scale);
  const shoreX = Math.abs(shore[0]),
    shoreZ = Math.abs(shore[1]);
  const points = OUTLET_COURSE.filter(([x]) => x < shoreX - 0.16).map(
    ([x, z]) => new Vector3(x, LAKE.level + 0.004, z),
  );
  points.push(new Vector3(shoreX - 0.16, LAKE.level + 0.004, shoreZ));
  const river = new CatmullRomCurve3(points);
  river.arcLengthDivisions = 1024;
  const stations = river.getSpacedPoints(120);
  for (let i = 1; i <= 24; i++) {
    const a = ((i / 24) * Math.PI) / 2;
    stations.push(
      new Vector3(
        shoreX - 0.16 + Math.sin(a) * 0.24,
        LAKE.level + 0.004 - (1 - Math.cos(a)) * 0.24,
        shoreZ,
      ),
    );
  }
  for (let i = 1; i <= 48; i++) {
    const t = i / 48;
    stations.push(
      new Vector3(shoreX + 0.08 + t * 0.13, LAKE.level + 0.004 - 0.24 - t * 1.9, shoreZ),
    );
  }
  const positions: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  let distance = 0;
  stations.forEach((p, i) => {
    if (i) distance += p.distanceTo(stations[i - 1]);
    const tangent = stations[Math.min(i + 1, stations.length - 1)]
      .clone()
      .sub(stations[Math.max(0, i - 1)]);
    const lateral = new Vector3(-tangent.z, 0, tangent.x);
    if (lateral.length() < 0.001) lateral.set(0, 0, 1);
    lateral.normalize();
    const width = 0.255 * (1 - 0.12 * Math.max(0, (i - 144) / 48));
    for (let column = 0; column < OUTLET_COLUMNS; column++) {
      const side = (column / (OUTLET_COLUMNS - 1)) * 2 - 1;
      const ripple = Math.max(0, (i - 144) / 48) * 0.012 * Math.sin(column * 2.3 + i * 0.24);
      positions.push(
        (p.x + lateral.x * side * width + ripple) * sx,
        p.y,
        (p.z + lateral.z * side * width) * sz,
      );
      uvs.push((side + 1) / 2, distance);
    }
    if (i < stations.length - 1) {
      for (let column = 0; column < OUTLET_COLUMNS - 1; column++) {
        const j = i * OUTLET_COLUMNS + column;
        indices.push(
          j,
          j + 1,
          j + OUTLET_COLUMNS,
          j + 1,
          j + OUTLET_COLUMNS + 1,
          j + OUTLET_COLUMNS,
        );
      }
    }
  });
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
