import { useEffect, useMemo } from 'react';
import { CatmullRomCurve3, DoubleSide, ExtrudeGeometry, Shape, TubeGeometry, Vector3 } from 'three';
import type { FactionDefinition } from '@skyhoof/catalog';
function Antler({ side, metal }: { side: number; metal: string }) {
  const geometry = useMemo(
    () =>
      new TubeGeometry(
        new CatmullRomCurve3([
          new Vector3(side * 0.045, 0.45, -0.018),
          new Vector3(side * 0.08, 0.51, -0.035),
          new Vector3(side * 0.12, 0.57, -0.04),
          new Vector3(side * 0.15, 0.61, -0.02),
        ]),
        12,
        0.0075,
        8,
        false,
      ),
    [side],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <group>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial color={metal} metalness={0.7} roughness={0.4} />
      </mesh>
      {[0, 1].map((i) => (
        <mesh
          key={i}
          position={[side * (0.09 + i * 0.035), 0.56 + i * 0.035, -0.02]}
          rotation={[0, 0, side * -0.4]}
        >
          <coneGeometry args={[0.006, 0.065, 8]} />
          <meshStandardMaterial color={metal} metalness={0.65} roughness={0.45} />
        </mesh>
      ))}
    </group>
  );
}
export function FactionEquipment({ faction: f }: { faction: FactionDefinition }) {
  const shield = useMemo(() => {
    const s = new Shape();
    s.moveTo(-0.045, 0.065);
    s.lineTo(0.045, 0.065);
    s.lineTo(0.042, -0.015);
    s.quadraticCurveTo(0.028, -0.055, 0, -0.075);
    s.quadraticCurveTo(-0.03, -0.055, -0.042, -0.015);
    s.closePath();
    const g = new ExtrudeGeometry(s, {
      depth: 0.012,
      bevelEnabled: true,
      bevelThickness: 0.003,
      bevelSize: 0.004,
      bevelSegments: 2,
      steps: 1,
    });
    return g;
  }, []);
  useEffect(() => () => shield.dispose(), [shield]);
  return (
    <group>
      <mesh position={[0, 0.19, 0]} castShadow>
        <cylinderGeometry args={[0.063, 0.097, 0.09, 32]} />
        <meshStandardMaterial color={f.metal} metalness={0.75} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.235, 0]}>
        <torusGeometry args={[0.064, 0.008, 8, 32]} />
        <meshStandardMaterial color={f.trim} metalness={0.8} roughness={0.35} />
      </mesh>
      {[-1, 1].map((side) => (
        <group
          key={side}
          position={[side * 0.078, 0.21, 0.01]}
          rotation={[0, (side * Math.PI) / 2, 0]}
        >
          <mesh geometry={shield} castShadow>
            <meshStandardMaterial color={f.trim} metalness={0.78} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.018]} scale={[0.78, 0.78, 1]} geometry={shield}>
            <meshStandardMaterial color={f.cloth} metalness={0.15} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.005, 0.035]}>
            <octahedronGeometry args={[0.023, 0]} />
            <meshStandardMaterial
              color={f.magic}
              emissive={f.magic}
              emissiveIntensity={0.6}
              metalness={0.35}
              roughness={0.3}
            />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.18, -0.065]} rotation={[0.18, 0, 0]} scale={[1, 1, 0.42]} castShadow>
        <coneGeometry args={[0.095, 0.26, 32, 1, true, 0, Math.PI]} />
        <meshStandardMaterial color={f.cloth} side={DoubleSide} roughness={0.9} />
      </mesh>
      {f.crest === 'antlers' &&
        [-1, 1].map((side) => <Antler key={side} side={side} metal={f.trim} />)}
      {f.crest === 'frost' &&
        [-1, 0, 1].map((i) => (
          <mesh
            key={i}
            position={[i * 0.052, 0.47 - Math.abs(i) * 0.025, -0.015]}
            scale={[0.018, 0.07 - Math.abs(i) * 0.02, 0.023]}
            rotation={[0, 0, i * -0.3]}
          >
            <octahedronGeometry args={[1, 0]} />
            <meshPhysicalMaterial
              color={f.magic}
              metalness={0.2}
              roughness={0.2}
              emissive={f.magic}
              emissiveIntensity={0.25}
              clearcoat={1}
            />
          </mesh>
        ))}
      {f.crest === 'embers' &&
        [0, 1, 2].map((i) => (
          <mesh key={i} position={[0, 0.32 + i * 0.07, -0.07 - i * 0.006]} rotation={[-0.6, 0, 0]}>
            <coneGeometry args={[0.023, 0.1, 12]} />
            <meshStandardMaterial
              color={i === 2 ? f.magic : f.trim}
              emissive={f.magic}
              emissiveIntensity={i === 2 ? 0.7 : 0.05}
              metalness={0.7}
              roughness={0.45}
            />
          </mesh>
        ))}
      {(f.crest === 'wings' || f.crest === 'petals') &&
        [-1, 1].flatMap((side) =>
          [0, 1, 2, 3].map((i) => (
            <mesh
              key={`${side}-${i}`}
              position={[side * (0.075 + i * 0.018), 0.34 + i * 0.025, -0.04 - i * 0.008]}
              rotation={[0, 0, side * (-0.5 - i * 0.1)]}
              scale={[0.018, 0.09 - i * 0.006, 0.012]}
              castShadow
            >
              <sphereGeometry args={[1, 16, 10]} />
              <meshStandardMaterial
                color={i % 2 ? f.metal : f.trim}
                metalness={0.65}
                roughness={0.35}
              />
            </mesh>
          )),
        )}
      {(f.crest === 'wings' || f.crest === 'sun') && (
        <mesh position={[0, 0.49, -0.035]} rotation={[Math.PI / 7, 0, 0]}>
          <torusGeometry args={[0.078, 0.006, 8, 48]} />
          <meshStandardMaterial
            color={f.trim}
            emissive={f.magic}
            emissiveIntensity={0.25}
            metalness={0.8}
            roughness={0.3}
          />
        </mesh>
      )}
    </group>
  );
}
