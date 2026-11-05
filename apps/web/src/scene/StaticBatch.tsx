import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { BufferGeometry, Group, Matrix4, Mesh, type Material } from 'three';
import { bakeGeometry } from './batch-geometry';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const properties = [
  'color',
  'emissive',
  'emissiveIntensity',
  'roughness',
  'metalness',
  'opacity',
  'transparent',
  'alphaTest',
  'side',
  'depthWrite',
  'depthTest',
  'vertexColors',
  'flatShading',
  'fog',
  'toneMapped',
  'map',
  'normalMap',
  'roughnessMap',
  'metalnessMap',
  'alphaMap',
  'aoMap',
  'normalScale',
  'polygonOffset',
  'polygonOffsetFactor',
  'polygonOffsetUnits',
];
function materialKey(m: Material) {
  const values = properties.map((key) => {
    const value = (m as unknown as Record<string, unknown>)[key];
    if (value && typeof value === 'object') {
      if ('uuid' in value) return value.uuid;
      if ('toArray' in value && typeof value.toArray === 'function') return value.toArray();
    }
    return value;
  });
  return JSON.stringify([m.type, m.customProgramCacheKey(), values]);
}
/** Merge only opaque, nonanimated standard/basic meshes in explicitly static scenery.
 * Shader uniforms, water groups, transparent foliage, instancing and moving pieces stay live.
 * Local transforms are baked into copied geometries; source assets are never modified. */
export function StaticBatch({ children }: { children: ReactNode }) {
  const root = useRef<Group>(null);
  useLayoutEffect(() => {
    if (new URLSearchParams(location.search).get('renderProfile') === 'baseline') return;
    const group = root.current!;
    group.updateWorldMatrix(true, true);
    const inverse = new Matrix4().copy(group.matrixWorld).invert();
    const buckets = new Map<
      string,
      {
        material: Material;
        sources: Mesh[];
        geometries: BufferGeometry[];
        cast: boolean;
        receive: boolean;
      }
    >();
    group.traverse((object) => {
      if (
        !(object instanceof Mesh) ||
        'isInstancedMesh' in object ||
        'isSkinnedMesh' in object ||
        Array.isArray(object.material) ||
        !object.visible
      )
        return;
      const material = object.material;
      if (
        !['MeshStandardMaterial', 'MeshBasicMaterial'].includes(material.type) ||
        material.transparent ||
        material.name === 'terrain-biomes'
      )
        return;
      // Terrain uses local-position shader coordinates and must remain in its original space.
      if (
        object.geometry.hasAttribute('color') &&
        material.customProgramCacheKey().includes('terrain')
      )
        return;
      const key =
        materialKey(material) +
        JSON.stringify([
          object.castShadow,
          object.receiveShadow,
          Object.keys(object.geometry.attributes).sort(),
        ]);
      const bucket = buckets.get(key) ?? {
        material,
        sources: [] as Mesh[],
        geometries: [] as BufferGeometry[],
        cast: object.castShadow,
        receive: object.receiveShadow,
      };
      const geo = bakeGeometry(
        object.geometry,
        new Matrix4().multiplyMatrices(inverse, object.matrixWorld),
      );
      bucket.sources.push(object);
      bucket.geometries.push(geo);
      buckets.set(key, bucket);
    });
    const merged: Mesh[] = [],
      hidden: Mesh[] = [];
    for (const b of buckets.values()) {
      if (b.sources.length > 1) {
        const geometry = mergeGeometries(b.geometries, false);
        if (geometry) {
          geometry.computeBoundingSphere();
          const mesh = new Mesh(geometry, b.material);
          mesh.castShadow = b.cast;
          mesh.receiveShadow = b.receive;
          mesh.raycast = () => {};
          group.add(mesh);
          merged.push(mesh);
          for (const source of b.sources) {
            source.visible = false;
            hidden.push(source);
          }
        }
      }
      b.geometries.forEach((g) => g.dispose());
    }
    return () => {
      hidden.forEach((m) => {
        m.visible = true;
      });
      merged.forEach((m) => {
        group.remove(m);
        m.geometry.dispose();
      });
    };
  }, [children]);
  return <group ref={root}>{children}</group>;
}
