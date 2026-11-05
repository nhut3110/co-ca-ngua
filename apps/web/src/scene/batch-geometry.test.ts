import { describe, it, expect } from 'vitest';
import { BufferAttribute, BufferGeometry, Matrix4, Vector3 } from 'three';
import { bakeGeometry } from './batch-geometry';
describe('static geometry baking', () => {
  it('expands quantized GLTF positions before applying world transforms without changing the source', () => {
    const source = new BufferGeometry();
    source.setAttribute(
      'position',
      new BufferAttribute(new Int16Array([-32767, 0, 0, 32767, 0, 0, 0, 32767, 0]), 3, true),
    );
    source.setAttribute(
      'normal',
      new BufferAttribute(new Int8Array([0, 0, 127, 0, 0, 127, 0, 0, 127]), 3, true),
    );
    const matrix = new Matrix4()
      .makeScale(2, 3, 1)
      .premultiply(new Matrix4().makeTranslation(4, 2, -3));
    const baked = bakeGeometry(source, matrix);
    baked.computeBoundingBox();
    expect(baked.boundingBox!.min.toArray()).toEqual([2, 2, -3]);
    expect(baked.boundingBox!.max.toArray()).toEqual([6, 5, -3]);
    expect(source.getAttribute('position').getX(0)).toBe(-1);
    expect(baked.getIndex()!.count).toBe(3);
    const n = new Vector3().fromBufferAttribute(baked.getAttribute('normal'), 0);
    expect(n.length()).toBeCloseTo(1);
    source.dispose();
    baked.dispose();
  });
});
