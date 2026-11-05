import { useLayoutEffect, useMemo, useRef } from 'react';
import { useTexture } from '@react-three/drei';
import { Color, InstancedMesh, Object3D, SphereGeometry, SRGBColorSpace } from 'three';
import { ModelAsset } from './ModelAsset';
import { RockMaterial } from './FantasyWorld';
import { Branch, Crystal, Lantern } from './Scenery';
import { LAKE, isWatercourse } from './landscape';
import { Foundation } from './Foundation';
import { terrainHeight, insideIsland, footprintHeight, boundaryRadius } from './world-layout';
export const FERN_SPOTS = [
  [3.24, 1.3],
  [4.5, 1.35],
  [3.55, 2.1],
  [4.48, 1.98],
  [1.25, 4.23],
  [2.0, 4.5],
  [3.85, 3.68],
  [1.22, 2.5],
];
function Stones({
  sx,
  sz,
  snow = false,
  lava = false,
}: {
  sx: number;
  sz: number;
  snow?: boolean;
  lava?: boolean;
}) {
  const ref = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => {
    const g = new SphereGeometry(1, 24, 16),
      p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i),
        n =
          1 + 0.09 * Math.sin(x * 13 + y * 7) * Math.cos(z * 12) + 0.05 * Math.sin(z * 23 + y * 11);
      p.setXYZ(i, x * n, y * n, z * n);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const d = new Object3D();
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2,
        r = 1.02 + (i % 3) * 0.025,
        x = (3.95 + Math.cos(a) * r * LAKE.rx) * sx,
        z = (1.6 + Math.sin(a) * r * LAKE.rz) * sz;
      d.position.set(x, terrainHeight(x, z) + 0.025, z);
      d.rotation.set(i * 0.3, i * 2.4, 0);
      const s = 0.06 + (i % 4) * 0.014;
      d.scale.set(s * 1.4, s * 0.65, s);
      if (isWatercourse(x, z, 0.015)) d.scale.setScalar(0);
      if (!insideIsland(x, z, 0.13)) d.scale.setScalar(0);
      d.updateMatrix();
      ref.current.setMatrixAt(i, d.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  }, [sx, sz]);
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, 26]} receiveShadow castShadow>
      <RockMaterial color={snow ? '#d1e2e6' : lava ? '#50434a' : '#a1a591'} />
    </instancedMesh>
  );
}
function Flowers({ sx, sz, celestial = false }: { sx: number; sz: number; celestial?: boolean }) {
  const petals = useRef<InstancedMesh>(null),
    stems = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!petals.current || !stems.current) return;
    const d = new Object3D();
    for (let i = 0; i < 80; i++) {
      const cluster = i % 4,
        cx = [1.22, 3.25, 4.42, 2.62][cluster],
        cz = [1.7, 1.18, 2.4, 4.35][cluster];
      const a = i * 2.4,
        r = 0.19 * Math.sqrt((i % 19) / 19),
        x = (cx + Math.cos(a) * r * LAKE.rx) * sx,
        z = (cz + Math.sin(a) * r) * sz;
      const y = terrainHeight(x, z),
        h = 0.07 + (i % 4) * 0.02;
      d.position.set(x, y + h / 2, z);
      d.rotation.set(0, 0, 0);
      d.scale.set(0.006, h, 0.006);
      d.updateMatrix();
      stems.current.setMatrixAt(i, d.matrix);
      for (let j = 0; j < 5; j++) {
        const a = (j / 5) * Math.PI * 2;
        d.position.set(x + Math.cos(a) * 0.018, y + h, z + Math.sin(a) * 0.018);
        d.rotation.set(0, -a, 0);
        d.scale.set(0.027, 0.009, 0.012);
        d.updateMatrix();
        petals.current.setMatrixAt(i * 5 + j, d.matrix);
        petals.current.setColorAt(
          i * 5 + j,
          new Color(celestial ? (i % 3 ? '#c7b5f0' : '#f5ddae') : i % 3 ? '#d9e8b5' : '#ddd1f4'),
        );
      }
    }
    petals.current.instanceMatrix.needsUpdate = true;
    stems.current.instanceMatrix.needsUpdate = true;
  }, [sx, sz, celestial]);
  return (
    <>
      <instancedMesh ref={petals} args={[undefined, undefined, 400]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial roughness={0.65} />
      </instancedMesh>
      <instancedMesh ref={stems} args={[undefined, undefined, 80]}>
        <cylinderGeometry args={[1, 1, 1, 5]} />
        <meshStandardMaterial color="#395a2c" />
      </instancedMesh>
    </>
  );
}
function FallenLog() {
  const [map, normal] = useTexture([
    '/assets/textures/bark-color.webp',
    '/assets/textures/bark-normal.webp',
  ]);
  map.colorSpace = SRGBColorSpace;
  return (
    <group rotation={[0, 0.6, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.095, 0.12, 0.82, 32, 6]} />
        <meshStandardMaterial
          map={map}
          normalMap={normal}
          normalScale={[0.7, 0.7]}
          roughness={0.96}
        />
      </mesh>
      {[-1, 1].map((s) => (
        <group
          key={s}
          position={[0, s * 0.414, 0]}
          rotation={[s === 1 ? -Math.PI / 2 : Math.PI / 2, 0, 0]}
        >
          <mesh>
            <circleGeometry args={[s === 1 ? 0.092 : 0.115, 32]} />
            <meshStandardMaterial color="#b39b70" />
          </mesh>
          {[0.03, 0.055, 0.079].map((r) => (
            <mesh key={r} position={[0, 0, 0.001]}>
              <ringGeometry args={[r, r + 0.003, 48]} />
              <meshStandardMaterial color="#6d583c" />
            </mesh>
          ))}
        </group>
      ))}
      <Branch
        radius={0.027}
        points={[
          [0, 0.08, 0],
          [0.2, 0.13, 0.01],
          [0.27, 0.22, 0.03],
        ]}
      />
    </group>
  );
}
export function BasaltCluster() {
  return (
    <group>
      {Array.from({ length: 13 }, (_, i) => {
        const a = i * 2.4,
          r = i === 0 ? 0 : 0.16 + Math.floor(i / 6) * 0.13,
          h = 0.25 + (i % 5) * 0.09;
        return (
          <group key={i} position={[Math.cos(a) * r, h / 2, Math.sin(a) * r]}>
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.075, 0.085, h, 6, 4]} />
              <RockMaterial color="#49434b" />
            </mesh>
            {[1, 2, 3].map((j) => (
              <mesh key={j} position={[0, h * (j / 4 - 0.5), 0]}>
                <cylinderGeometry args={[0.079, 0.079, 0.007, 6]} />
                <meshStandardMaterial color="#2d2930" />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}
function Observatory() {
  return (
    <group>
      {[0.43, 0.37, 0.31].map((r, i) => (
        <mesh key={i} position={[0, i * 0.045, 0]} receiveShadow>
          <cylinderGeometry args={[r, r + 0.025, 0.05, 48]} />
          <RockMaterial color="#c9c2ac" />
        </mesh>
      ))}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.055, 0.11, 0.6, 32]} />
        <meshStandardMaterial color="#d8cdaf" roughness={0.6} />
      </mesh>
      <group position={[0, 0.7, 0]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[i * 0.85, 0.4 + i * 0.5, i * 0.6]}>
            <torusGeometry args={[0.24 + i * 0.025, 0.012, 12, 96]} />
            <meshStandardMaterial color="#c1a76b" metalness={0.85} roughness={0.22} />
          </mesh>
        ))}
        <Crystal color="#c7c9ff" height={0.55} />
      </group>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.31, 0.14, 0.23]}>
          <Lantern scale={0.45} color="#b8dce8" />
        </group>
      ))}
    </group>
  );
}
function Glacier() {
  return (
    <group>
      <ModelAsset
        url="/assets/models/rock_moss_set_02.glb"
        nodeName="rock_moss_set_02_rock09"
        width={0.7}
        height={0.5}
        treatment="snow"
      />
      {[0, 1, 2].map((i) => (
        <group
          key={i}
          position={[(i - 1) * 0.14, 0.09, Math.sin(i * 2.4) * 0.14]}
          rotation={[0.1, i, 0.07]}
          scale={0.7 + i * 0.16}
        >
          <Crystal color="#b4e4ee" height={0.65 + i * 0.3} />
        </group>
      ))}
    </group>
  );
}
function MountainDetails({ sx, sz, kind }: { sx: number; sz: number; kind: string }) {
  const snow = kind === 'snow',
    lava = kind === 'volcano',
    pink = kind === 'celestial' || kind === 'sakura';
  const rocks = [
    [4.18, 4.12, 0.72],
    [2.65, 4.75, 0.6],
    [4.85, 3.43, 0.42],
    [1.3, 4.8, 0.3],
    [4.9, 1.85, 0.24],
  ];
  const trees = [
    [1.55, 4.6],
    [2.05, 4.65],
    [3.45, 4.45],
    [4.2, 3.65],
    [4.1, 2.8],
  ];
  return (
    <group>
      {rocks.map(([a, b, size], i) => {
        const x = a * sx,
          z = b * sz;
        if (!insideIsland(x, z, size * 0.5) || isWatercourse(x, z, size * 0.4)) return null;
        return (
          <group
            key={i}
            position={[x, footprintHeight(x, z, size * 0.36).min - 0.025, z]}
            rotation={[0, i * 1.7, 0]}
          >
            <ModelAsset
              url="/assets/models/rock_moss_set_02.glb"
              nodeName={i % 2 ? 'rock_moss_set_02_rock12' : 'rock_moss_set_02_rock08'}
              width={size}
              height={size * 0.9}
              treatment={snow ? 'snow' : lava ? 'basalt' : undefined}
            />
          </group>
        );
      })}
      {!lava &&
        trees.map(([a, b], i) => {
          const x = a * sx,
            z = b * sz;
          if (!insideIsland(x, z, 0.36) || isWatercourse(x, z, 0.19)) return null;
          return (
            <group
              key={i}
              position={[x, footprintHeight(x, z, 0.075).min - 0.018, z]}
              rotation={[0, i * 2.4, 0]}
            >
              <ModelAsset
                url={
                  snow
                    ? '/assets/models/pine_sapling_small.glb'
                    : '/assets/models/tree_small_02.glb'
                }
                width={snow ? 0.48 : 0.58}
                height={0.85 + (i % 3) * 0.22}
                treatment={snow ? 'snow' : pink ? 'celestial' : undefined}
              />
            </group>
          );
        })}
    </group>
  );
}
export function BiomeDetails({ sx, sz, kind }: { sx: number; sz: number; kind: string }) {
  const snow = kind === 'snow',
    lava = kind === 'volcano',
    celestial = kind === 'celestial',
    forest = ['pine', 'sakura', 'mushroom', 'ruins'].includes(kind);
  const at = (x: number, z: number): [number, number, number] => [
    x * sx,
    terrainHeight(x * sx, z * sz),
    z * sz,
  ];
  return (
    <group>
      <MountainDetails sx={sx} sz={sz} kind={kind} />
      <Stones sx={sx} sz={sz} snow={snow} lava={lava} />
      {(forest || celestial) && (
        <>
          <Flowers sx={sx} sz={sz} celestial={celestial} />
          {FERN_SPOTS.filter(([x, z]) => !isWatercourse(x * sx, z * sz, 0.05)).map(([x, z], i) => (
            <group key={i} position={at(x, z)} rotation={[0, i * 2.4, 0]}>
              <ModelAsset
                url="/assets/models/fern_02.glb"
                nodeName={i % 2 ? 'fern_02_a' : 'fern_02_d'}
                width={0.28 + (i % 3) * 0.05}
                height={0.3}
                treatment={celestial ? 'celestial' : undefined}
              />
            </group>
          ))}
        </>
      )}
      {forest && (
        <group position={[sx * 1.25, terrainHeight(sx * 1.25, sz * 3.4) + 0.11, sz * 3.4]}>
          <FallenLog />
        </group>
      )}
      {snow && (
        <>
          <group position={at(1.35, 4.3)}>
            <Glacier />
          </group>
          <group position={at(4.35, 2.5)} scale={0.65}>
            <Glacier />
          </group>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <mesh
              key={i}
              position={[
                sx * Math.cos(0.53 + i * 0.014) * boundaryRadius(0.53 + i * 0.014),
                terrainHeight(
                  sx * Math.cos(0.53 + i * 0.014) * boundaryRadius(0.53 + i * 0.014),
                  sz * Math.sin(0.53 + i * 0.014) * boundaryRadius(0.53 + i * 0.014),
                ) - 0.12,
                sz * Math.sin(0.53 + i * 0.014) * boundaryRadius(0.53 + i * 0.014),
              ]}
              rotation={[Math.PI, 0, 0.05]}
            >
              <coneGeometry args={[0.028, 0.24 + (i % 3) * 0.06, 12]} />
              <meshPhysicalMaterial color="#b5e4ee" roughness={0.12} clearcoat={1} />
            </mesh>
          ))}
        </>
      )}
      {lava && (
        <>
          <group position={at(1.45, 4.1)}>
            <BasaltCluster />
          </group>
          <group position={at(4.3, 2.65)} scale={0.65}>
            <BasaltCluster />
          </group>
        </>
      )}
      {celestial && (
        <>
          <Foundation
            x={1.4 * sx}
            z={4.1 * sz}
            radius={0.46}
            top={footprintHeight(1.4 * sx, 4.1 * sz, 0.46).max + 0.025}
          />
          <group
            position={[1.4 * sx, footprintHeight(1.4 * sx, 4.1 * sz, 0.46).max + 0.025, 4.1 * sz]}
          >
            <Observatory />
          </group>
        </>
      )}
    </group>
  );
}
