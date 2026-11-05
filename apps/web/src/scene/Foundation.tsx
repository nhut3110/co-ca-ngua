import { useEffect, useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { terrainHeight } from './world-layout';
import { RockMaterial } from './FantasyWorld';

// Flat upper terrace with a skirt that follows the actual terrain, not a center-height cylinder.
export function Foundation({
  x,
  z,
  radius,
  rz = radius,
  top,
  color = '#818473',
}: {
  x: number;
  z: number;
  radius: number;
  rz?: number;
  top: number;
  color?: string;
}) {
  const geometry = useMemo(() => {
    const p: number[] = [],
      uv: number[] = [],
      ix: number[] = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2,
        dx = Math.cos(a) * radius,
        dz = Math.sin(a) * rz;
      p.push(dx, terrainHeight(x + dx, z + dz) - 0.065, dz, dx, top, dz);
      uv.push(i / 10, 0, i / 10, top * 2);
      if (i < 64) {
        const j = i * 2;
        ix.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
      }
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(p, 3));
    g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    g.setIndex(ix);
    g.computeVertexNormals();
    return g;
  }, [x, z, radius, rz, top]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <RockMaterial color={color} />
      </mesh>
      <mesh position={[0, top - 0.015, 0]} scale={[1, 1, rz / radius]} receiveShadow>
        <cylinderGeometry args={[radius, radius, 0.03, 64]} />
        <RockMaterial color={color} />
      </mesh>
    </group>
  );
}
