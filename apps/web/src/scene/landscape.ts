import { CatmullRomCurve3, Vector3 } from 'three';
// Shared by terrain carving, water meshes and vegetation placement.
export const LAKE = { x: 3.95, z: 1.6, rx: 0.74, rz: 0.56, level: -0.025 };
export const STREAM: [number, number][] = [
  [4.46, 3.75],
  [4.72, 3.15],
  [4.7, 2.55],
  [4.57, 2.08],
  [4.14, 1.65],
];
export const OUTLET: [number, number][] = [
  [4.25, 1.5],
  [4.83, 1.23],
  [5.1, 1.05],
  [5.6, 1.05],
];
function smoothCourse(points: [number, number][]): [number, number][] {
  const c = new CatmullRomCurve3(points.map(([x, z]) => new Vector3(x, 0, z)));
  return c.getPoints(40).map((p) => [p.x, p.z]);
}
export const STREAM_COURSE = smoothCourse(STREAM);
export const OUTLET_COURSE = smoothCourse(OUTLET);
export function nearestOnPath(x: number, z: number, path: [number, number][]) {
  let distance = Infinity,
    px = 0,
    pz = 0;
  for (let i = 1; i < path.length; i++) {
    const [ax, az] = path[i - 1],
      [bx, bz] = path[i];
    const t = Math.max(
      0,
      Math.min(
        1,
        ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2),
      ),
    );
    const qx = ax + t * (bx - ax),
      qz = az + t * (bz - az),
      d = Math.hypot(x - qx, z - qz);
    if (d < distance) {
      distance = d;
      px = qx;
      pz = qz;
    }
  }
  return { distance, x: px, z: pz };
}
export function pathDistance(x: number, z: number, path: [number, number][]) {
  return nearestOnPath(x, z, path).distance;
}
export function lakeDistance(x: number, z: number) {
  return Math.hypot((Math.abs(x) - LAKE.x) / LAKE.rx, (Math.abs(z) - LAKE.z) / LAKE.rz);
}
export function isWatercourse(x: number, z: number, margin = 0) {
  const a = Math.abs(x),
    b = Math.abs(z);
  return (
    lakeDistance(x, z) < 1 + margin ||
    pathDistance(a, b, STREAM_COURSE) < 0.17 + margin ||
    pathDistance(a, b, OUTLET_COURSE) < 0.28 + margin
  );
}
