import { Float32BufferAttribute, Matrix4, type BufferGeometry } from 'three';
/** GLTF quantization may store normalized Int16 positions/normals. Transforming
 * those in place clips/wraps world coordinates; expand only these attributes first. */
export function bakeGeometry(source: BufferGeometry, matrix: Matrix4) {
  const geometry = source.clone();
  for (const name of ['position', 'normal', 'tangent']) {
    const attribute = geometry.getAttribute(name);
    if (!attribute || attribute.array instanceof Float32Array) continue;
    const values: number[] = [];
    for (let i = 0; i < attribute.count; i++) {
      values.push(attribute.getX(i), attribute.getY(i), attribute.getZ(i));
      if (attribute.itemSize === 4) values.push(attribute.getW(i));
    }
    geometry.setAttribute(name, new Float32BufferAttribute(values, attribute.itemSize));
  }
  if (!geometry.index)
    geometry.setIndex(Array.from({ length: geometry.getAttribute('position').count }, (_, i) => i));
  geometry.applyMatrix4(matrix);
  return geometry;
}
