import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, Group } from 'three';
import { boardRules, type GameConfig } from '@skyhoof/game-core';
import { RockMaterial } from './FantasyWorld';
import { ModelAsset } from './ModelAsset';
import { boardLayout, colors } from './layout';

export function StaticBoardTiles({ config }: { config: GameConfig }) {
  const { track, homeLanes } = boardLayout(config);
  const board = boardRules(config);
  const portals = new Set<number>(config.modules.portals ? board.portals : []);
  const wells = new Set<number>(config.modules.spells ? board.wells : []);
  const relics = new Set<number>(config.modules.relics ? board.relics : []);

  return (
    <group name="arcane-board-tiles">
      {/* Connected causeway stones linking adjacent track tiles */}
      {track.map(([x, z], i) => {
        const [nx, nz] = track[(i + 1) % track.length];
        const dx = nx - x;
        const dz = nz - z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.95) return null;
        const mx = (x + nx) / 2;
        const mz = (z + nz) / 2;
        const angle = Math.atan2(dx, dz);
        const quarterOwner = Math.floor(i / board.quarter) % 4;
        return (
          <group key={`road-${i}`} position={[mx, 0.085, mz]} rotation={[0, angle, 0]}>
            <mesh receiveShadow castShadow>
              <boxGeometry args={[0.31, 0.09, dist]} />
              <RockMaterial color="#9e9b89" />
            </mesh>
            <mesh position={[0, 0.048, 0]} receiveShadow>
              <boxGeometry args={[0.25, 0.012, dist * 0.92]} />
              <meshStandardMaterial color="#c9bfa2" roughness={0.65} metalness={0.15} />
            </mesh>
            {[-1, 1].map((side) => (
              <mesh key={side} position={[side * 0.142, 0.052, 0]}>
                <boxGeometry args={[0.018, 0.014, dist * 0.95]} />
                <meshStandardMaterial color="#c7a563" metalness={0.72} roughness={0.28} />
              </mesh>
            ))}
            <mesh position={[0, 0.056, 0]}>
              <boxGeometry args={[0.024, 0.006, dist * 0.7]} />
              <meshStandardMaterial
                color={colors[quarterOwner]}
                emissive={colors[quarterOwner]}
                emissiveIntensity={0.32}
              />
            </mesh>
          </group>
        );
      })}

      {/* Connected causeway for home lanes */}
      {homeLanes.map((lane, owner) =>
        lane.map(([x, z], i) => {
          if (i === lane.length - 1) return null;
          const [nx, nz] = lane[i + 1];
          const dx = nx - x;
          const dz = nz - z;
          const dist = Math.hypot(dx, dz);
          const angle = Math.atan2(dx, dz);
          return (
            <group
              key={`home-road-${owner}-${i}`}
              position={[(x + nx) / 2, 0.095, (z + nz) / 2]}
              rotation={[0, angle, 0]}
            >
              <mesh receiveShadow>
                <boxGeometry args={[0.29, 0.1, dist]} />
                <RockMaterial color="#969a92" />
              </mesh>
              <mesh position={[0, 0.054, 0]}>
                <boxGeometry args={[0.06, 0.01, dist * 0.85]} />
                <meshStandardMaterial
                  color={colors[owner]}
                  emissive={colors[owner]}
                  emissiveIntensity={0.45}
                />
              </mesh>
            </group>
          );
        }),
      )}

      {/* Shared Track Tile Pedestals */}
      {track.map(([x, z], i) => {
        const isStart = i % board.quarter === 0;
        const owner = Math.floor(i / board.quarter) % 4;
        const isPortal = portals.has(i);
        const isWell = wells.has(i);
        const isRelic = relics.has(i);
        const topColor = isStart
          ? colors[owner]
          : isRelic
            ? '#d9a44e'
            : isPortal
              ? '#7e6bb8'
              : isWell
                ? '#57a8a3'
                : '#cfc5aa';
        const trimColor = isStart || isRelic ? '#f0ca78' : '#c4a262';

        return (
          <group key={`tile-${i}`} position={[x, 0, z]}>
            {/* Stepped octagonal stone base */}
            <mesh position={[0, 0.08, 0]} receiveShadow castShadow>
              <cylinderGeometry args={[0.252, 0.275, 0.12, 16]} />
              <RockMaterial color="#8f8e82" />
            </mesh>
            <mesh position={[0, 0.165, 0]} receiveShadow castShadow>
              <cylinderGeometry args={[0.232, 0.246, 0.09, 32]} />
              <RockMaterial color="#b8b39e" />
            </mesh>
            {/* Polished marble/gemstone cap */}
            <mesh position={[0, 0.224, 0]} receiveShadow>
              <cylinderGeometry args={[0.21, 0.216, 0.032, 32]} />
              <meshStandardMaterial
                color={topColor}
                roughness={isStart || isWell || isPortal || isRelic ? 0.35 : 0.58}
                metalness={isStart || isRelic ? 0.32 : 0.12}
              />
            </mesh>
            {/* Outer forged gold rim */}
            <mesh position={[0, 0.242, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.178, 0.208, 32]} />
              <meshStandardMaterial color={trimColor} metalness={0.78} roughness={0.24} />
            </mesh>
            {/* Inner carved arcane rune ring */}
            <mesh position={[0, 0.243, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
              <ringGeometry args={[0.095, 0.112, 8]} />
              <meshStandardMaterial
                color={isStart ? '#fff4c2' : '#baa982'}
                metalness={0.62}
                roughness={0.32}
              />
            </mesh>
            {/* Center rune sigil */}
            <mesh position={[0, 0.245, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
              <ringGeometry args={[0.028, 0.052, isStart ? 6 : 4]} />
              <meshStandardMaterial
                color={isStart ? '#fff7d1' : isWell ? '#98f5eb' : isRelic ? '#ffe494' : '#d6c69e'}
                emissive={
                  isStart
                    ? colors[owner]
                    : isWell
                      ? '#4adbc4'
                      : isPortal
                        ? '#9d7ef7'
                        : isRelic
                          ? '#f5b042'
                          : '#000000'
                }
                emissiveIntensity={isStart || isWell || isPortal || isRelic ? 0.65 : 0}
              />
            </mesh>
          </group>
        );
      })}

      {/* Home Lane Ascension Pedestals */}
      {homeLanes.map((lane, owner) =>
        lane.map(([x, z], i) => {
          const factionColor = new Color(colors[owner]);
          const capColor = new Color('#364440').lerp(factionColor, 0.42);
          return (
            <group key={`home-${owner}-${i}`} position={[x, 0, z]}>
              <mesh position={[0, 0.085, 0]} receiveShadow castShadow>
                <cylinderGeometry args={[0.248, 0.268, 0.13, 16]} />
                <RockMaterial color="#949890" />
              </mesh>
              <mesh position={[0, 0.17, 0]} receiveShadow castShadow>
                <cylinderGeometry args={[0.228, 0.24, 0.085, 32]} />
                <RockMaterial color="#b4b8b0" />
              </mesh>
              <mesh position={[0, 0.226, 0]} receiveShadow>
                <cylinderGeometry args={[0.208, 0.212, 0.032, 32]} />
                <meshStandardMaterial color={capColor} roughness={0.42} metalness={0.28} />
              </mesh>
              <mesh position={[0, 0.243, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.17, 0.202, 32]} />
                <meshStandardMaterial color="#e0be75" metalness={0.8} roughness={0.22} />
              </mesh>
              <mesh position={[0, 0.244, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.115, 0.132, 6]} />
                <meshStandardMaterial
                  color={colors[owner]}
                  emissive={colors[owner]}
                  emissiveIntensity={0.45}
                  metalness={0.5}
                />
              </mesh>
              {Array.from({ length: i + 1 }, (_, j) => (
                <mesh key={j} position={[(j - i / 2) * 0.038, 0.246, 0]}>
                  <octahedronGeometry args={[0.013, 0]} />
                  <meshStandardMaterial
                    color="#fff2c4"
                    emissive={colors[owner]}
                    emissiveIntensity={0.6}
                  />
                </mesh>
              ))}
            </group>
          );
        }),
      )}
    </group>
  );
}

export function DynamicBoardStructures({
  config,
  paused = false,
  reducedMotion = false,
}: {
  config: GameConfig;
  paused?: boolean;
  reducedMotion?: boolean;
}) {
  const { track } = boardLayout(config);
  const board = boardRules(config);
  const rootRef = useRef<Group>(null);
  const timeRef = useRef(0);

  useFrame((_, dt) => {
    if (paused || reducedMotion || !rootRef.current) return;
    timeRef.current += dt;
    const t = timeRef.current;
    rootRef.current.traverse((obj) => {
      if (obj.userData.animKind === 'spin-slow') {
        obj.rotation.y = t * 1.1;
      } else if (obj.userData.animKind === 'spin-reverse') {
        obj.rotation.z = -t * 1.4;
      } else if (obj.userData.animKind === 'bob') {
        obj.position.y =
          (obj.userData.baseY ?? 0.36) + Math.sin(t * 2.4 + (obj.userData.phase ?? 0)) * 0.035;
        obj.rotation.y = t * 1.3;
      }
    });
  });

  return (
    <group ref={rootRef} name="dynamic-board-structures">
      {/* Spatial Portals: Twin Arcane Stargates */}
      {config.modules.portals &&
        board.portals.map((tileIdx, j) => {
          const [x, z] = track[tileIdx];
          const primary = j ? '#c99eff' : '#6ef2e0';
          const trim = '#e6c273';
          return (
            <group key={`portal-${tileIdx}`} position={[x, 0.24, z]}>
              {/* Base rune ring */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
                <ringGeometry args={[0.14, 0.205, 32]} />
                <meshBasicMaterial
                  color={primary}
                  transparent
                  opacity={0.75}
                  blending={AdditiveBlending}
                  depthWrite={false}
                />
              </mesh>
              {/* Outer carved stone stargate pillars */}
              {[-1, 1].map((side) => (
                <group key={side} position={[side * 0.21, 0, 0]}>
                  <ModelAsset
                    url="/assets/models/pillar_decorated.glb"
                    width={0.11}
                    height={0.34}
                  />
                </group>
              ))}
              {/* Floating outer stargate ring */}
              <group position={[0, 0.19, 0]}>
                <mesh>
                  <torusGeometry args={[0.175, 0.024, 10, 32]} />
                  <meshStandardMaterial
                    color={trim}
                    metalness={0.85}
                    roughness={0.2}
                    emissive={primary}
                    emissiveIntensity={0.35}
                  />
                </mesh>
                <mesh userData={{ animKind: 'spin-reverse' }}>
                  <torusGeometry args={[0.138, 0.012, 8, 6]} />
                  <meshStandardMaterial
                    color={primary}
                    emissive={primary}
                    emissiveIntensity={1.2}
                  />
                </mesh>
                <mesh>
                  <circleGeometry args={[0.132, 24]} />
                  <meshBasicMaterial
                    color={primary}
                    transparent
                    opacity={0.38}
                    blending={AdditiveBlending}
                    depthWrite={false}
                  />
                </mesh>
              </group>
            </group>
          );
        })}

      {/* Mana Wells: Levitating Crystal Obelisks */}
      {config.modules.spells &&
        board.wells.map((tileIdx, idx) => {
          const [x, z] = track[tileIdx];
          return (
            <group key={`well-${tileIdx}`} position={[x, 0.24, z]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
                <ringGeometry args={[0.11, 0.165, 24]} />
                <meshBasicMaterial
                  color="#6ef2e0"
                  transparent
                  opacity={0.65}
                  blending={AdditiveBlending}
                  depthWrite={false}
                />
              </mesh>
              <group
                position={[0, 0.16, 0]}
                userData={{ animKind: 'bob', baseY: 0.16, phase: idx * 1.4 }}
              >
                <mesh castShadow>
                  <octahedronGeometry args={[0.088, 0]} />
                  <meshPhysicalMaterial
                    color="#7ef9ec"
                    emissive="#3ad4c4"
                    emissiveIntensity={0.85}
                    roughness={0.12}
                    metalness={0.25}
                    clearcoat={1}
                  />
                </mesh>
                <mesh rotation={[Math.PI / 3, Math.PI / 4, 0]}>
                  <torusGeometry args={[0.125, 0.009, 6, 24]} />
                  <meshStandardMaterial
                    color="#f2cd78"
                    metalness={0.85}
                    roughness={0.2}
                    emissive="#c49435"
                    emissiveIntensity={0.4}
                  />
                </mesh>
              </group>
            </group>
          );
        })}

      {/* Relic Shrines: Sculpted 3D Golden Treasure Chests */}
      {config.modules.relics &&
        board.relics.map((tileIdx, idx) => {
          const [x, z] = track[tileIdx];
          return (
            <group key={`relic-${tileIdx}`} position={[x, 0.24, z]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
                <ringGeometry args={[0.12, 0.185, 8]} />
                <meshBasicMaterial
                  color="#ffd166"
                  transparent
                  opacity={0.78}
                  blending={AdditiveBlending}
                  depthWrite={false}
                />
              </mesh>
              <group
                position={[0, 0.08, 0]}
                userData={{ animKind: 'bob', baseY: 0.08, phase: idx * 1.9 }}
              >
                <ModelAsset url="/assets/models/chest_gold.glb" width={0.21} height={0.18} />
                <mesh position={[0, 0.21, 0]}>
                  <octahedronGeometry args={[0.036, 0]} />
                  <meshStandardMaterial
                    color="#fff0a6"
                    emissive="#ffae36"
                    emissiveIntensity={1.25}
                  />
                </mesh>
              </group>
            </group>
          );
        })}
    </group>
  );
}
