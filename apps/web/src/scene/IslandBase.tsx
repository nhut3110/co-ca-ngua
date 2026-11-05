import type { MapDefinition } from '@skyhoof/catalog';
import { RockMaterial } from './FantasyWorld';
import { ModelAsset } from './ModelAsset';

export function IslandBase({ kind }: { kind: MapDefinition['base'] }) {
  return (
    <group name={`island-base-${kind}`}>
      {/* Sculpted multi-tiered stone under-crown replacing the old flat sphere */}
      <group position={[0, kind === 'citadel' ? -1.15 : kind === 'archipelago' ? -1.45 : -1.75, 0]}>
        {[
          [3.65, 2.75, 0.55, 0],
          [2.75, 1.85, 0.65, -0.52],
          [1.85, 0.92, 0.72, -1.1],
          [0.92, 0.14, 0.85, -1.75],
        ].map(([topR, botR, h, y], idx) => (
          <mesh key={idx} position={[0, y, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[topR, botR, h, 14]} />
            <RockMaterial color={idx % 2 ? '#5d6d6d' : '#6c7c78'} />
          </mesh>
        ))}
        {/* Carved golden arcane containment ring around the island's core */}
        <mesh position={[0, -0.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.95, 0.045, 8, 64]} />
          <meshStandardMaterial
            color="#d8b56c"
            metalness={0.82}
            roughness={0.25}
            emissive="#8a6421"
            emissiveIntensity={0.35}
          />
        </mesh>
        {/* Glowing core heart crystal under the island */}
        <mesh position={[0, -2.28, 0]}>
          <octahedronGeometry args={[0.36, 0]} />
          <meshStandardMaterial
            color="#7ef2e0"
            emissive="#4adbc4"
            emissiveIntensity={1.1}
            roughness={0.18}
            metalness={0.4}
          />
        </mesh>
      </group>

      {kind === 'crystal' &&
        Array.from({ length: 14 }, (_, i) => {
          const a = i * 2.399,
            r = 1.15 + (i % 4) * 0.78,
            h = 1.35 + (i % 4) * 0.45;
          return (
            <group
              key={i}
              position={[Math.cos(a) * r, -1.55, Math.sin(a) * r]}
              rotation={[Math.PI, 0.14 * Math.sin(i), 0.12 * Math.cos(i)]}
            >
              <mesh position={[0, h / 2, 0]} castShadow>
                <cylinderGeometry args={[0.02, 0.22 + (i % 3) * 0.06, h, 6]} />
                <meshPhysicalMaterial
                  color={i % 2 ? '#7ad7f0' : '#a99bf5'}
                  metalness={0.35}
                  roughness={0.18}
                  clearcoat={0.8}
                  emissive={i % 2 ? '#3189a8' : '#5844a3'}
                  emissiveIntensity={0.45}
                />
              </mesh>
              <mesh position={[0, h * 0.84, 0]}>
                <torusGeometry args={[0.1, 0.012, 6, 24]} />
                <meshStandardMaterial color="#ffd984" emissive="#e8b24a" emissiveIntensity={0.7} />
              </mesh>
            </group>
          );
        })}

      {kind === 'citadel' && (
        <>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0, -0.95 - i * 0.22, 0]} receiveShadow castShadow>
              <cylinderGeometry args={[4.68 - i * 0.18, 4.74 - i * 0.18, 0.22, 48]} />
              <RockMaterial color="#7d8680" />
            </mesh>
          ))}
          <mesh position={[0, -1.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[4.68, 0.038, 8, 64]} />
            <meshStandardMaterial color="#d4b16a" metalness={0.8} roughness={0.28} />
          </mesh>
          {Array.from({ length: 16 }, (_, i) => {
            const a = (i / 16) * Math.PI * 2;
            return (
              <group
                key={i}
                position={[Math.cos(a) * 4.45, -0.68, Math.sin(a) * 4.45]}
                rotation={[0, -a, 0]}
              >
                <mesh castShadow>
                  <boxGeometry args={[0.36, 1.18, 0.4]} />
                  <RockMaterial color="#969a8b" />
                </mesh>
                <mesh position={[0, -0.6, 0]}>
                  <boxGeometry args={[0.5, 0.14, 0.52]} />
                  <RockMaterial color="#b5b197" />
                </mesh>
                <mesh position={[0.2, -0.18, 0]} rotation={[0, 0, 0.3]}>
                  <boxGeometry args={[0.3, 0.78, 0.28]} />
                  <RockMaterial color="#7d8579" />
                </mesh>
              </group>
            );
          })}
        </>
      )}

      {kind === 'archipelago' &&
        [
          [6.1, -0.75, 2.3],
          [-5.8, -0.95, -3.4],
          [3.4, -1.15, -5.9],
          [-4.9, -0.85, 4.2],
        ].map(([x, y, z], i) => (
          <group key={i} position={[x, y, z]}>
            <mesh scale={[0.92, 0.42, 0.78]} castShadow>
              <cylinderGeometry args={[0.95, 0.65, 0.7, 12]} />
              <RockMaterial color="#8f9982" />
            </mesh>
            <mesh position={[0, -0.58, 0]} rotation={[Math.PI, 0, 0.08]} castShadow>
              <coneGeometry args={[0.62, 1.55, 10]} />
              <RockMaterial color="#687b72" />
            </mesh>
            <mesh position={[0, -0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.82, 0.025, 6, 32]} />
              <meshStandardMaterial color="#d4b26c" metalness={0.75} roughness={0.3} />
            </mesh>
            <group position={[0, 0.2, 0]}>
              <ModelAsset url="/assets/models/pine_sapling_small.glb" width={0.44} height={0.9} />
            </group>
          </group>
        ))}

      {kind === 'crag' &&
        Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2 + (i % 2) * 0.2,
            r = 1.45 + (i % 3) * 0.92,
            h = 1.35 + (i % 4) * 0.48;
          return (
            <group
              key={i}
              position={[Math.cos(a) * r, -1.55, Math.sin(a) * r]}
              rotation={[Math.PI, 0.2 * i, 0.08 * Math.sin(i)]}
            >
              <mesh position={[0, h * 0.45, 0]} castShadow>
                <coneGeometry args={[0.42 + (i % 3) * 0.14, h, 7, 2]} />
                <RockMaterial color={i % 2 ? '#617570' : '#73857d'} />
              </mesh>
              {i % 3 === 0 && (
                <mesh position={[0, h * 0.85, 0]}>
                  <octahedronGeometry args={[0.14, 0]} />
                  <meshStandardMaterial
                    color="#7be8d8"
                    emissive="#47c4b3"
                    emissiveIntensity={0.85}
                  />
                </mesh>
              )}
            </group>
          );
        })}
    </group>
  );
}
