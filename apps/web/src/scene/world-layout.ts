import { grandTrack, grandHomeLanes, corners, homeLanes, track } from './layout';
import {
  LAKE,
  STREAM_COURSE,
  OUTLET_COURSE,
  lakeDistance,
  pathDistance,
  nearestOnPath,
} from './landscape';
export const WORLD_EXTENT = 5.25;
export const REGION_LIMIT = 4.55;
export const RUIN_SITE = { x: 3.43, z: 3.58, radius: 0.64, scale: 0.83 };
export function boundaryRadius(angle: number) {
  const c = Math.abs(Math.cos(angle)),
    s = Math.abs(Math.sin(angle));
  return (
    (WORLD_EXTENT / Math.pow(c ** 4 + s ** 4, 0.25)) *
    (1 + 0.012 * Math.sin(angle * 9) + 0.009 * Math.cos(angle * 13))
  );
}
export function outletShore(sx: number, sz: number, scale = 1) {
  let x = 5.25;
  for (let i = 0; i < 12; i++) {
    const a = Math.atan2(sz * 1.05, sx * x),
      r = boundaryRadius(a) * scale;
    x = Math.sqrt(r * r - 1.05 ** 2);
  }
  return [sx * x, sz * 1.05] as [number, number];
}
export function insideIsland(x: number, z: number, margin = 0) {
  return Math.hypot(x, z) + margin < boundaryRadius(Math.atan2(z, x)) - 0.12;
}
export function quadrant(x: number, z: number) {
  return x < 0 ? (z > 0 ? 0 : 1) : z < 0 ? 2 : 3;
}
const slots = [...track, ...homeLanes.flat()];
export function dryTerrainHeight(x: number, z: number) {
  const a = Math.abs(x),
    b = Math.abs(z);
  if (slots.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 0.34)) return 0.025;
  if (corners.some(([cx, cz]) => Math.hypot(x - cx, z - cz) < 1.04)) return 0.09;
  const hill = 0.72 * Math.exp(-((a - 3.65) ** 2 + (b - 3.65) ** 2) / 0.68);
  const ridge = 0.24 * Math.exp(-((a - 4.45) ** 2 + (b - 2.85) ** 2) / 0.35);
  // A connected outer mountain spine; the inner courts and track stay level.
  const peaks =
    1.45 * Math.exp(-((a - 4.18) ** 2 / 0.32 + (b - 4.12) ** 2 / 0.36)) +
    1.1 * Math.exp(-((a - 2.65) ** 2 / 0.5 + (b - 4.75) ** 2 / 0.22)) +
    0.85 * Math.exp(-((a - 4.75) ** 2 / 0.12 + (b - 3.25) ** 2 / 0.42));
  const crags = 1 + 0.12 * Math.sin(x * 12 + z * 4) * Math.sin(z * 9 - x * 3);
  const noise = 0.045 * Math.sin(x * 6.1 + z * 2) * Math.cos(z * 5.4 - x);
  let y = 0.07 + hill + ridge + noise + peaks * crags;
  const smooth = (v: number) => {
    const t = Math.max(0, Math.min(1, v));
    return t * t * (3 - 2 * t);
  };
  // Authored construction terraces sit within the hills. Do not raise buildings
  // to the highest nearby peak and leave them on tall cylindrical columns.
  const terrace = smooth((Math.hypot(a - 3.3, b - 3.45) - 0.83) / 0.27);
  y = 0.42 * (1 - terrace) + y * terrace;
  const cottage = smooth((Math.hypot(a - 2.7, b - 4.08) - 0.44) / 0.2);
  return 0.2 * (1 - cottage) + y * cottage;
}
export function terrainHeight(x: number, z: number) {
  const dry = dryTerrainHeight(x, z);
  const lake = lakeDistance(x, z);
  // A real basin with a bank, rather than a water disk laid over solid ground.
  const basinT = Math.max(0, Math.min(1, (1.08 - lake) / 0.26));
  const basin = basinT * basinT * (3 - 2 * basinT);
  let y = dry * (1 - basin) + (LAKE.level - 0.16) * basin;
  const a = Math.abs(x),
    b = Math.abs(z);
  const stream = nearestOnPath(a, b, STREAM_COURSE);
  const water = streamSurface(stream.x, stream.z);
  if (stream.distance < 0.29) {
    const t = Math.max(0, Math.min(1, (stream.distance - 0.14) / 0.15));
    const smooth = t * t * (3 - 2 * t);
    const channel = (water - 0.105) * (1 - smooth) + Math.max(y, water + 0.035) * smooth;
    y = lake < 1.12 ? Math.min(y, channel) : channel;
  }
  const outlet = Math.max(0, Math.min(1, (0.29 - pathDistance(a, b, OUTLET_COURSE)) / 0.15));
  y = y * (1 - outlet) + (LAKE.level - 0.1) * outlet;
  return y;
}
export function streamSurface(x: number, z: number) {
  const p = nearestOnPath(Math.abs(x), Math.abs(z), STREAM_COURSE);
  const t = Math.max(0, Math.min(1, (lakeDistance(p.x, p.z) - 0.85) / 0.5));
  return (
    LAKE.level +
    (Math.max(LAKE.level, dryTerrainHeight(p.x, p.z) - 0.07) - LAKE.level) * t * t * (3 - 2 * t)
  );
}
export function footprintHeight(x: number, z: number, rx: number, rz = rx) {
  let min = terrainHeight(x, z),
    max = min;
  for (let ring = 1; ring <= 3; ring++)
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2,
        h = terrainHeight(x + (Math.cos(a) * rx * ring) / 3, z + (Math.sin(a) * rz * ring) / 3);
      min = Math.min(min, h);
      max = Math.max(max, h);
    }
  return { min, max };
}
export type Plot = {
  type: 'tree' | 'rock' | 'crystal' | 'mushroom' | 'lantern';
  x: number;
  z: number;
  scale: number;
  radius: number;
};
// Outer scenery has a silhouette; inner areas remain low to preserve tile visibility.
export const REGION_PLOTS: Plot[] = [
  { type: 'tree', x: 1.35, z: 3.8, scale: 1.1, radius: 0.35 },
  { type: 'tree', x: 1.7, z: 4.25, scale: 0.9, radius: 0.32 },
  { type: 'tree', x: 3.85, z: 3.1, scale: 1.15, radius: 0.45 },
  { type: 'tree', x: 4.35, z: 2.75, scale: 0.8, radius: 0.3 },
  { type: 'tree', x: 2.65, z: 4.3, scale: 0.7, radius: 0.28 },
  { type: 'rock', x: 4.2, z: 3.4, scale: 0.45, radius: 0.5 },
  { type: 'rock', x: 3.5, z: 4.05, scale: 0.42, radius: 0.45 },
  { type: 'rock', x: 4.45, z: 2.25, scale: 0.32, radius: 0.3 },
  { type: 'crystal', x: 1.3, z: 3.05, scale: 0.5, radius: 0.2 },
  { type: 'crystal', x: 3.25, z: 1.15, scale: 0.5, radius: 0.2 },
  { type: 'mushroom', x: 3.2, z: 2.8, scale: 0.38, radius: 0.16 },
  { type: 'mushroom', x: 1.45, z: 2.4, scale: 0.33, radius: 0.14 },
  { type: 'lantern', x: 1.45, z: 1.65, scale: 0.6, radius: 0.15 },
  { type: 'lantern', x: 3.05, z: 3.05, scale: 0.7, radius: 0.15 },
  { type: 'lantern', x: 3.1, z: 2.35, scale: 0.55, radius: 0.12 },
];
export const LANDMARK = { x: 3.3, z: 3.45, radius: 1.02 };

const grandSlots = [...grandTrack, ...grandHomeLanes.flat()];
/** Grand board preserves authored biome terrain and carves a flat outer raceway. */
export function grandTerrainHeight(x: number, z: number) {
  const nearTile = grandSlots.some(([a, b]) => Math.hypot(x - a, z - b) < 0.34);
  const channel = Math.abs(z) > 0.8 && Math.abs(z) < 1.3 && Math.abs(x) > 4.8;
  if (channel) return -0.13;
  return nearTile ? 0.025 : terrainHeight(x, z);
}
