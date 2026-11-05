import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  BufferGeometry,
  Float32BufferAttribute,
  DoubleSide,
  CatmullRomCurve3,
  Color,
  InstancedMesh,
  Object3D,
  TubeGeometry,
  Vector3,
} from 'three';
import { LAKE, isWatercourse } from './landscape';
import { FlowMaterial } from './Watershed';
import { LavaMaterial } from './LavaMaterial';
import { terrainHeight, insideIsland } from './world-layout';
const bark = '#514335';
export function Branch({
  points,
  radius = 0.04,
  color = bark,
  glow = false,
}: {
  points: [number, number, number][];
  radius?: number;
  color?: string;
  glow?: boolean;
}) {
  const geometry = useMemo(
    () =>
      new TubeGeometry(
        new CatmullRomCurve3(points.map((p) => new Vector3(...p))),
        12,
        radius,
        7,
        false,
      ),
    [JSON.stringify(points), radius],
  );
  return (
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial
        color={color}
        emissive={glow ? color : undefined}
        emissiveIntensity={glow ? 1.3 : 0}
        roughness={0.95}
      />
    </mesh>
  );
}
export function Broadleaf({
  pink = false,
  scale = 1,
  ancient = false,
}: {
  pink?: boolean;
  scale?: number;
  ancient?: boolean;
}) {
  const leaves = useRef<InstancedMesh>(null),
    count = ancient ? 900 : 420;
  useLayoutEffect(() => {
    if (!leaves.current) return;
    const d = new Object3D(),
      c = new Color();
    for (let i = 0; i < count; i++) {
      const a = i * 2.399,
        cluster = i % 5,
        r = 0.4 * Math.sqrt((i % 83) / 83);
      d.position.set(
        Math.cos(a) * r + Math.sin(cluster * 2.4) * 0.27,
        1.0 + Math.cos(cluster) * 0.16 + Math.sin(i * 8) * 0.18,
        Math.sin(a) * r + Math.cos(cluster * 2.4) * 0.25,
      );
      d.rotation.set(i * 0.9, i * 1.7, i * 2.1);
      d.scale.set(0.05, 0.018, 0.075);
      d.updateMatrix();
      leaves.current.setMatrixAt(i, d.matrix);
      c.set(pink ? '#bd6484' : '#466333').offsetHSL(0, 0, (i % 7) * 0.028);
      leaves.current.setColorAt(i, c);
    }
    leaves.current.instanceMatrix.needsUpdate = true;
  }, [pink, count]);
  return (
    <group scale={scale}>
      <Branch
        points={[
          [0, 0, 0],
          [0.06, 0.35, 0.03],
          [-0.06, 0.75, 0],
          [0.03, 1.02, 0.02],
        ]}
        radius={ancient ? 0.1 : 0.065}
      />
      {Array.from({ length: 5 }, (_, i) => {
        const x = Math.sin(i * 2.4) * 0.38,
          z = Math.cos(i * 2.4) * 0.38;
        return (
          <group key={i}>
            <Branch
              points={[
                [0, 0.42, 0],
                [x * 0.55, 0.78, z * 0.55],
                [x, 1.07, z],
              ]}
              radius={0.025}
            />
            <Branch
              points={[
                [0, 0.14, 0],
                [x * 0.6, 0.03, z * 0.6],
                [x * 0.9, 0, z * 0.9],
              ]}
              radius={0.035}
            />
          </group>
        );
      })}
      <instancedMesh ref={leaves} args={[undefined, undefined, count]} castShadow>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial roughness={0.95} />
      </instancedMesh>
    </group>
  );
}
export function Fir({ snow = false, scale = 1 }: { snow?: boolean; scale?: number }) {
  const foliage = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!foliage.current) return;
    const d = new Object3D();
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 7; j++) {
        const a = (j / 7) * Math.PI * 2,
          r = 0.38 - i * 0.045;
        d.position.set(Math.sin(a) * r * 0.45, 0.31 + i * 0.14, Math.cos(a) * r * 0.45);
        d.rotation.set(0.3 * Math.cos(a), a, 0.3 * Math.sin(a));
        d.scale.set(r * 0.62, 0.35, r * 0.62);
        d.updateMatrix();
        foliage.current.setMatrixAt(i * 7 + j, d.matrix);
        foliage.current.setColorAt(
          i * 7 + j,
          new Color(snow ? (j % 2 ? '#b4d4d9' : '#dbe9e8') : '#355746'),
        );
      }
    foliage.current.instanceMatrix.needsUpdate = true;
  }, [snow]);
  return (
    <group scale={scale}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.065, 1, 8]} />
        <meshStandardMaterial color={bark} />
      </mesh>
      <instancedMesh ref={foliage} args={[undefined, undefined, 42]} castShadow>
        <coneGeometry args={[1, 1, 7]} />
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
    </group>
  );
}
export function Crystal({ color = '#89d6ec', height = 1 }: { color?: string; height?: number }) {
  return (
    <group scale={[1, height, 1]}>
      <mesh position={[0, 0.24, 0]} castShadow>
        <cylinderGeometry args={[0.008, 0.11, 0.48, 5]} />
        <meshPhysicalMaterial
          color={color}
          roughness={0.17}
          metalness={0.3}
          clearcoat={1}
          emissive={color}
          emissiveIntensity={0.45}
        />
      </mesh>
      <mesh position={[0, 0.04, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.11, 0.17, 5]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}
export function Mushroom({ i = 0, color = '#609dd4' }: { i?: number; color?: string }) {
  return (
    <group rotation={[0.07 * Math.sin(i), i * 1.7, 0.08 * Math.cos(i)]}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.025, 0.04, 0.24, 8]} />
        <meshStandardMaterial color="#d0c6ad" />
      </mesh>
      <mesh position={[0, 0.25, 0]} scale={[1, 0.45, 1]} castShadow>
        <sphereGeometry args={[0.16, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={color}
          roughness={0.6}
          emissive={color}
          emissiveIntensity={0.4}
        />
      </mesh>
      {Array.from({ length: 5 }, (_, j) => {
        const a = j * 2.4;
        return (
          <mesh
            key={j}
            position={[Math.sin(a) * 0.095, 0.29 - (j % 2) * 0.012, Math.cos(a) * 0.095]}
          >
            <sphereGeometry args={[0.014, 6, 4]} />
            <meshBasicMaterial color="#caeefa" />
          </mesh>
        );
      })}
    </group>
  );
}
export function Lantern({ color = '#ffcd78', scale = 1 }: { color?: string; scale?: number }) {
  return (
    <group scale={scale}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.035, 0.44, 8]} />
        <meshStandardMaterial color="#665b39" metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.47, 0]}>
        <cylinderGeometry args={[0.07, 0.08, 0.13, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.8} />
      </mesh>
      {[0.39, 0.55].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.025, 8]} />
          <meshStandardMaterial color="#5e543b" metalness={0.65} />
        </mesh>
      ))}
      <mesh position={[0, 0.59, 0]}>
        <coneGeometry args={[0.105, 0.09, 8]} />
        <meshStandardMaterial color="#7d6841" metalness={0.55} />
      </mesh>
    </group>
  );
}
export function GroundScatter({ sx, sz, kind }: { sx: number; sz: number; kind: string }) {
  const grass = useRef<InstancedMesh>(null),
    stones = useRef<InstancedMesh>(null);
  const count = kind === 'volcano' ? 100 : kind === 'snow' ? 170 : 650;
  const tuft = useMemo(() => {
    const vertices: number[] = [],
      indices: number[] = [];
    for (let blade = 0; blade < 7; blade++) {
      const angle = blade * 2.399,
        h = 0.7 + (blade % 3) * 0.18,
        base = vertices.length / 3;
      for (let j = 0; j <= 4; j++) {
        const t = j / 4,
          bend = t * t * 0.4,
          w = 0.12 * (1 - t) + 0.002;
        for (const s of [-1, 1])
          vertices.push(
            Math.cos(angle) * (bend + 0.1) + Math.sin(angle) * w * s,
            t * h,
            Math.sin(angle) * (bend + 0.1) - Math.cos(angle) * w * s,
          );
        if (j < 4) {
          const p = base + j * 2;
          indices.push(p, p + 2, p + 1, p + 1, p + 2, p + 3);
        }
      }
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }, []);
  useLayoutEffect(() => {
    const d = new Object3D(),
      c = new Color();
    let visibleGrass = 0,
      visibleStones = 0;
    for (let i = 0; i < count; i++) {
      const a = 1.08 + ((i * 137.5) % 337) / 100,
        b = 1.1 + ((i * 71.3) % 328) / 100;
      const inStable = Math.hypot(a - 2.35, b - 2.35) < 1.02;
      const x = a * sx,
        z = b * sz,
        y = terrainHeight(x, z);
      const pond = isWatercourse(x, z, 0.08);
      d.position.set(x, y, z);
      d.rotation.set(0, i * 2.4, 0.1 * Math.sin(i));
      const slope =
        Math.hypot(
          terrainHeight(x + 0.025, z) - terrainHeight(x - 0.025, z),
          terrainHeight(x, z + 0.025) - terrainHeight(x, z - 0.025),
        ) / 0.05;
      const s =
        inStable || pond || slope > 1 || !insideIsland(x, z, 0.14) ? 0 : 0.04 + (i % 5) * 0.012;
      if (!s) continue;
      if (kind !== 'snow' && kind !== 'volcano') {
        d.scale.set(s, 0.08 + (i % 7) * 0.015, s);
        d.updateMatrix();
        grass.current?.setMatrixAt(visibleGrass, d.matrix);
        c.set(kind === 'celestial' ? '#a5a96f' : '#537039').offsetHSL(0, 0, (i % 4) * 0.04);
        grass.current?.setColorAt(visibleGrass++, c);
      }
      d.position.y = y + 0.008;
      d.scale.set(s * 0.42, s * 0.18, s * 0.32);
      d.updateMatrix();
      stones.current?.setMatrixAt(visibleStones, d.matrix);
      c.set(kind === 'snow' ? '#a8bec9' : kind === 'volcano' ? '#4d4542' : '#65705a');
      stones.current?.setColorAt(visibleStones++, c);
    }
    if (grass.current) {
      grass.current.count = visibleGrass;
      grass.current.instanceMatrix.needsUpdate = true;
      if (grass.current.instanceColor) grass.current.instanceColor.needsUpdate = true;
      grass.current.computeBoundingSphere();
    }
    if (stones.current) {
      stones.current.count = visibleStones;
      stones.current.instanceMatrix.needsUpdate = true;
      if (stones.current.instanceColor) stones.current.instanceColor.needsUpdate = true;
      stones.current.computeBoundingSphere();
    }
  }, [sx, sz, kind, count]);
  return (
    <>
      <instancedMesh ref={grass} args={[tuft, undefined, count]}>
        <meshStandardMaterial color="#58743d" side={DoubleSide} roughness={1} />
      </instancedMesh>
      <instancedMesh ref={stones} args={[undefined, undefined, count]} receiveShadow>
        <sphereGeometry args={[1, 12, 8]} />
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
    </>
  );
}
export function Water({ lava = false, ice = false }: { lava?: boolean; ice?: boolean }) {
  return (
    <group position={[0, LAKE.level, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1, LAKE.rz / LAKE.rx, 1]}>
        <circleGeometry args={[LAKE.rx, 96]} />
        {lava ? <LavaMaterial /> : <FlowMaterial ice={ice} />}
      </mesh>
    </group>
  );
}
export function Bridge({ length = 0.9 }: { length?: number }) {
  return (
    <group>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh
          key={i}
          position={[0, 0.06 + Math.sin((i / 8) * Math.PI) * 0.07, (i / 8 - 0.5) * length]}
          receiveShadow
          castShadow
        >
          <boxGeometry args={[0.35, 0.045, (length / 9) * 0.9]} />
          <meshStandardMaterial color={i % 2 ? '#82714d' : '#9b8861'} roughness={0.9} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Branch
            points={[
              [s * 0.2, 0.22, -length * 0.5],
              [s * 0.2, 0.3, 0],
              [s * 0.2, 0.22, length * 0.5],
            ]}
            radius={0.012}
            color="#b8a77b"
          />
          {[-1, 0, 1].map((z) => (
            <mesh key={z} position={[s * 0.2, -0.02, (z * length) / 2]}>
              <cylinderGeometry args={[0.018, 0.025, 0.56, 8]} />
              <meshStandardMaterial color="#7f704f" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
