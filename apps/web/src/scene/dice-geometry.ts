import { CylinderGeometry, Quaternion } from 'three';
import { catalogById, diceStyles } from '@skyhoof/catalog';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
export const DIE_HALF = 0.26;
export const DIE_RADIUS = 0.055;
export const DIE_CLEARANCE = 0.003;
export const ALTAR_FLOOR_THICKNESS = 0.045;
export function makeDieGeometry(styleId = 'astral-brass') {
  const style = catalogById([...diceStyles], styleId);
  const radius = style.shape === 'faceted' ? 0.085 : style.shape === 'beveled' ? 0.025 : DIE_RADIUS;
  return new RoundedBoxGeometry(0.52, 0.52, 0.52, style.shape === 'faceted' ? 1 : 5, radius);
}
const collisionVertices = new Map<string, Float32Array>();
export function makeAltarFloorGeometry() {
  return new CylinderGeometry(0.74, 0.76, ALTAR_FLOOR_THICKNESS, 64);
}
export function diceSupportHeight(q: Quaternion, styleId = 'astral-brass') {
  let vertices = collisionVertices.get(styleId);
  if (!vertices) {
    const g = makeDieGeometry(styleId);
    vertices = new Float32Array(g.attributes.position.array);
    collisionVertices.set(styleId, vertices);
    g.dispose();
  }
  const nx = 2 * (q.x * q.y + q.w * q.z),
    ny = 1 - 2 * (q.x * q.x + q.z * q.z),
    nz = 2 * (q.y * q.z - q.w * q.x);
  let support = 0;
  for (let i = 0; i < vertices.length; i += 3)
    support = Math.max(support, -(vertices[i] * nx + vertices[i + 1] * ny + vertices[i + 2] * nz));
  return support + DIE_CLEARANCE;
}
