import { useEffect, useMemo } from 'react';
import { LatheGeometry, Vector2 } from 'three';
import { RockMaterial } from './FantasyWorld';
import { Foundation } from './Foundation';
import { ModelAsset } from './ModelAsset';
import { footprintHeight, terrainHeight, insideIsland, RUIN_SITE } from './world-layout';
import { isWatercourse } from './landscape';

/** Authored compositions: clear silhouettes, a focal landmark and a readable approach. */
export function BiomeLandmarks({ sx, sz, kind }: { sx: number; sz: number; kind: string }) {
  const mushroom = kind === 'mushroom',
    ruins = kind === 'ruins';
  const cap = useMemo(
    () =>
      new LatheGeometry(
        [
          [0, 0.025],
          [0.12, 0.015],
          [0.31, 0.025],
          [0.44, 0.075],
          [0.42, 0.12],
          [0.34, 0.23],
          [0.2, 0.34],
          [0.06, 0.38],
          [0, 0.38],
        ].map(([x, y]) => new Vector2(x, y)),
        40,
      ),
    [],
  );
  useEffect(() => () => cap.dispose(), [cap]);
  const at = (x: number, z: number): [number, number, number] => [
    x * sx,
    terrainHeight(x * sx, z * sz),
    z * sz,
  ];
  const x = RUIN_SITE.x * sx,
    z = RUIN_SITE.z * sz,
    top = footprintHeight(x, z, RUIN_SITE.radius).max + 0.02;
  const stone = kind === 'snow' ? '#b7c8ca' : kind === 'volcano' ? '#575158' : '#96937a';
  return (
    <group>
      {/* A short stone approach ties each settlement to the lakeside, rather than random debris. */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const px = (1.48 + i * 0.15) * sx,
          pz = (3.75 + i * 0.06) * sz;
        return (
          <mesh
            key={i}
            position={[px, terrainHeight(px, pz) + 0.025, pz]}
            rotation={[0, 0.12 * Math.sin(i), 0]}
            receiveShadow
          >
            <boxGeometry args={[0.24, 0.055, 0.19]} />
            <RockMaterial color={stone} />
          </mesh>
        );
      })}
      {/* Riverbank reeds/cairns occur in small groups with open water between them. */}
      {[
        [3.3, 1.38],
        [4.36, 1.99],
        [4.52, 2.48],
        [4.9, 2.97],
      ].map(([a, b], i) => {
        if (!insideIsland(a * sx, b * sz, 0.16) || isWatercourse(a * sx, b * sz, 0.13)) return null;
        return (
          <group key={i} position={at(a, b)}>
            {[0, 1, 2, 3, 4].map((j) => (
              <mesh
                key={j}
                position={[
                  Math.sin(j * 2.4) * 0.07,
                  0.09 + (j % 2) * 0.025,
                  Math.cos(j * 2.4) * 0.07,
                ]}
                rotation={[0.12 * Math.sin(j), j, 0.1]}
              >
                <cylinderGeometry args={[0.009, 0.016, 0.18 + (j % 2) * 0.05, 6]} />
                <meshStandardMaterial
                  color={kind === 'snow' ? '#b7cacf' : kind === 'volcano' ? '#62534b' : '#687852'}
                  roughness={1}
                />
              </mesh>
            ))}
          </group>
        );
      })}
      {ruins && (
        <>
          <Foundation x={x} z={z} radius={RUIN_SITE.radius} top={top} />
          <group position={[x, top, z]} rotation={[0, 0.22, 0]} scale={RUIN_SITE.scale}>
            {[0, 1, 2].map((i) => (
              <mesh key={i} position={[0, 0.035 + i * 0.045, 0]} receiveShadow castShadow>
                <cylinderGeometry args={[0.7 - i * 0.07, 0.73 - i * 0.07, 0.07, 48]} />
                <RockMaterial color={stone} />
              </mesh>
            ))}
            {[0, 1, 2, 3, 4].map((i) => {
              const a = (i / 6) * Math.PI * 2,
                h = [0.85, 0.98, 0.56, 0.72, 0.92][i];
              return (
                <group
                  key={i}
                  position={[Math.cos(a) * 0.49, 0.14, Math.sin(a) * 0.49]}
                  rotation={[0, -a, 0]}
                >
                  <ModelAsset
                    url="/assets/models/pillar_decorated.glb"
                    width={0.26}
                    height={h}
                    aged
                  />
                </group>
              );
            })}
            <group position={[0, 0.14, -0.18]}>
              <ModelAsset
                url="/assets/models/wall_archedwindow_open.glb"
                width={0.72}
                height={0.85}
                aged
              />
            </group>
            <group position={[0.24, 0.14, 0.28]} rotation={[0, 0.6, 0]}>
              <ModelAsset url="/assets/models/rubble_large.glb" width={0.44} height={0.24} />
            </group>
            <group position={[0, 0.18, 0.12]}>
              <ModelAsset url="/assets/models/chest_gold.glb" width={0.28} height={0.24} />
            </group>
            <mesh position={[0, 0.18, 0.12]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.16, 0.22, 32]} />
              <meshStandardMaterial color="#80c5b0" emissive="#559f8a" emissiveIntensity={0.55} />
            </mesh>
          </group>
        </>
      )}
      {mushroom && (
        <>
          {[
            [3.45, 3.15, 1.6],
            [3.95, 3.35, 0.95],
            [3.1, 3.7, 0.7],
            [1.5, 4.15, 0.65],
            [4.1, 2.3, 0.55],
          ].map(([a, b, s], i) => (
            <group key={i} position={at(a, b)} scale={s} rotation={[0, i, 0]}>
              <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.06, 0.1, 0.76, 24, 4]} />
                <meshStandardMaterial color="#c5bdad" roughness={0.85} />
              </mesh>
              <mesh geometry={cap} position={[0, 0.72, 0]} castShadow receiveShadow>
                <meshStandardMaterial color={i % 2 ? '#775986' : '#387e7d'} roughness={0.65} />
              </mesh>
              <mesh position={[0, 0.75, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.36, 40]} />
                <meshStandardMaterial
                  color="#87c8ad"
                  emissive="#5fbaa1"
                  emissiveIntensity={0.4}
                  roughness={0.8}
                />
              </mesh>
              {Array.from({ length: 16 }, (_, j) => (
                <mesh
                  key={j}
                  position={[
                    Math.cos((j * Math.PI) / 8) * 0.23,
                    0.745,
                    Math.sin((j * Math.PI) / 8) * 0.23,
                  ]}
                  rotation={[0, (-j * Math.PI) / 8, 0]}
                >
                  <boxGeometry args={[0.22, 0.012, 0.008]} />
                  <meshStandardMaterial color="#4a8d82" />
                </mesh>
              ))}
              {[0, 1, 2, 3, 4].map((j) => (
                <mesh
                  key={j}
                  position={[Math.cos(j * 2.4) * 0.21, 1.056, Math.sin(j * 2.4) * 0.21]}
                  scale={[1, 0.28, 1]}
                >
                  <sphereGeometry args={[0.034, 12, 8]} />
                  <meshStandardMaterial
                    color="#bbdcc7"
                    emissive="#8fc5b1"
                    emissiveIntensity={0.3}
                  />
                </mesh>
              ))}
            </group>
          ))}
        </>
      )}
    </group>
  );
}
