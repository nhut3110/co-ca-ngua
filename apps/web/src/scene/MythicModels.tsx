import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Group } from 'three';
import type {
  AuraDefinition,
  ChromaDefinition,
  FactionDefinition,
  PedestalDefinition,
} from '@skyhoof/catalog';

export function CharacterPedestal({
  pedestal,
  faction,
  chroma,
  color,
}: {
  pedestal: PedestalDefinition;
  faction: FactionDefinition;
  chroma: ChromaDefinition;
  color: string;
}) {
  const baseColor =
    chroma.id !== 'default'
      ? chroma.secondary
      : pedestal.id === 'classic'
        ? faction.cloth
        : pedestal.base;
  const trimColor =
    chroma.id !== 'default'
      ? chroma.primary
      : pedestal.id === 'classic'
        ? faction.trim
        : pedestal.trim;
  const glowColor = chroma.id !== 'default' ? chroma.primary : pedestal.glow || color;

  return (
    <group name={`pedestal-${pedestal.style}`}>
      <mesh position={[0, 0.025, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.155, 0.182, 0.05, 48]} />
        <meshPhysicalMaterial color={baseColor} metalness={0.45} clearcoat={0.5} roughness={0.4} />
      </mesh>
      {[0.015, 0.052].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[y < 0.02 ? 0.17 : 0.145, 0.0095, 8, 48]} />
          <meshStandardMaterial color={trimColor} metalness={0.82} roughness={0.22} />
        </mesh>
      ))}

      {pedestal.style === 'lotus' &&
        Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * 0.155, 0.036, Math.sin(a) * 0.155]}
              rotation={[0.35, -a, 0]}
            >
              <coneGeometry args={[0.036, 0.068, 4]} />
              <meshPhysicalMaterial
                color={trimColor}
                emissive={glowColor}
                emissiveIntensity={0.35}
                roughness={0.2}
                metalness={0.55}
              />
            </mesh>
          );
        })}

      {pedestal.style === 'iron' &&
        Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * 0.165, 0.042, Math.sin(a) * 0.165]}
              rotation={[-0.25, -a, 0]}
            >
              <coneGeometry args={[0.022, 0.085, 4]} />
              <meshStandardMaterial
                color={trimColor}
                emissive={glowColor}
                emissiveIntensity={0.45}
                metalness={0.85}
                roughness={0.25}
              />
            </mesh>
          );
        })}

      {pedestal.style === 'astral' && (
        <mesh position={[0, 0.045, 0]} rotation={[Math.PI / 2.2, 0.2, 0]}>
          <torusGeometry args={[0.192, 0.007, 8, 48]} />
          <meshStandardMaterial
            color={trimColor}
            emissive={glowColor}
            emissiveIntensity={0.65}
            metalness={0.88}
            roughness={0.18}
          />
        </mesh>
      )}
    </group>
  );
}

export function CharacterAura({
  aura,
  paused = false,
  reducedMotion = false,
}: {
  aura: AuraDefinition;
  paused?: boolean;
  reducedMotion?: boolean;
}) {
  const ref = useRef<Group>(null);
  const time = useRef(0);

  useFrame((_, dt) => {
    if (paused || reducedMotion || !ref.current || aura.style === 'none') return;
    time.current += dt;
    const t = time.current;
    if (aura.style === 'runes' || aura.style === 'shards') {
      ref.current.rotation.y = t * 1.35;
    } else if (aura.style === 'crown') {
      ref.current.position.y = Math.sin(t * 2.5) * 0.022;
      ref.current.rotation.y = t * 0.9;
    } else if (aura.style === 'wings') {
      ref.current.position.y = Math.sin(t * 2.2) * 0.015;
    }
  });

  if (aura.style === 'none') return null;

  return (
    <group ref={ref} name={`aura-${aura.style}`}>
      {aura.style === 'runes' && (
        <group position={[0, 0.068, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.195, 0.228, 6]} />
            <meshBasicMaterial
              color={aura.color}
              transparent
              opacity={0.78}
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          {Array.from({ length: 6 }, (_, i) => {
            const a = (i / 6) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.21, 0.02, Math.sin(a) * 0.21]}>
                <octahedronGeometry args={[0.018, 0]} />
                <meshStandardMaterial
                  color={aura.secondary}
                  emissive={aura.color}
                  emissiveIntensity={1.1}
                />
              </mesh>
            );
          })}
        </group>
      )}

      {aura.style === 'wings' && (
        <group position={[0, 0.34, -0.08]}>
          {[-1, 1].map((side) => (
            <group
              key={side}
              position={[side * 0.05, 0, 0]}
              rotation={[0, -side * 0.28, side * 0.22]}
            >
              {[0, 1, 2].map((feather) => (
                <mesh
                  key={feather}
                  position={[side * (0.07 + feather * 0.045), 0.04 - feather * 0.035, 0]}
                  rotation={[0, 0, side * (-0.35 - feather * 0.22)]}
                >
                  <coneGeometry args={[0.026, 0.22 - feather * 0.03, 4]} />
                  <meshStandardMaterial
                    color={aura.color}
                    emissive={aura.secondary}
                    emissiveIntensity={0.85}
                    transparent
                    opacity={0.88}
                  />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      )}

      {aura.style === 'crown' && (
        <group position={[0, 0.64, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.068, 0.011, 8, 24]} />
            <meshStandardMaterial
              color={aura.color}
              emissive={aura.secondary}
              emissiveIntensity={0.75}
              metalness={0.9}
              roughness={0.18}
            />
          </mesh>
          {Array.from({ length: 5 }, (_, i) => {
            const a = (i / 5) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.068, 0.026, Math.sin(a) * 0.068]}>
                <coneGeometry args={[0.014, 0.042, 4]} />
                <meshStandardMaterial
                  color={aura.color}
                  emissive={aura.secondary}
                  emissiveIntensity={0.9}
                  metalness={0.85}
                />
              </mesh>
            );
          })}
        </group>
      )}

      {aura.style === 'shards' && (
        <group position={[0, 0.34, 0]}>
          {Array.from({ length: 3 }, (_, i) => {
            const a = (i / 3) * Math.PI * 2;
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * 0.21, (i - 1) * 0.04, Math.sin(a) * 0.21]}
                rotation={[0.3, a, 0.2]}
              >
                <octahedronGeometry args={[0.032, 0]} />
                <meshPhysicalMaterial
                  color={aura.color}
                  emissive={aura.secondary}
                  emissiveIntensity={1.1}
                  clearcoat={1}
                  roughness={0.15}
                />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
}

export function RoyalBarding({
  faction,
  chroma,
}: {
  faction: FactionDefinition;
  chroma: ChromaDefinition;
}) {
  const trim = chroma.id !== 'default' ? chroma.primary : '#f2c86b';
  const cloth = chroma.id !== 'default' ? chroma.secondary : faction.cloth;
  const gem = faction.magic;
  return (
    <group position={[0, 0.065, 0]}>
      {/* Royal saddle cloth & golden trim */}
      <mesh position={[0, 0.25, -0.01]} castShadow>
        <boxGeometry args={[0.145, 0.095, 0.16]} />
        <meshStandardMaterial color={cloth} roughness={0.5} metalness={0.25} />
      </mesh>
      <mesh position={[0, 0.3, -0.01]} castShadow>
        <boxGeometry args={[0.11, 0.035, 0.13]} />
        <meshStandardMaterial color={trim} metalness={0.85} roughness={0.2} />
      </mesh>
      {/* Chest armor plate & gem */}
      <mesh position={[0, 0.24, 0.12]} rotation={[0.3, 0, 0]} castShadow>
        <cylinderGeometry args={[0.058, 0.072, 0.1, 8]} />
        <meshStandardMaterial color={trim} metalness={0.85} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0.24, 0.175]}>
        <octahedronGeometry args={[0.024, 0]} />
        <meshStandardMaterial color={gem} emissive={gem} emissiveIntensity={1.1} />
      </mesh>
      {/* Head plume */}
      <mesh position={[0, 0.48, 0.13]} rotation={[-0.35, 0, 0]}>
        <coneGeometry args={[0.025, 0.11, 6]} />
        <meshStandardMaterial color={gem} emissive={gem} emissiveIntensity={0.55} />
      </mesh>
    </group>
  );
}

export function AstralUnicorn({
  color,
  chroma,
  moving = false,
  paused = false,
  reducedMotion = false,
}: {
  color: string;
  chroma: ChromaDefinition;
  moving?: boolean;
  paused?: boolean;
  reducedMotion?: boolean;
}) {
  const group = useRef<Group>(null);
  const time = useRef(0);
  const bodyColor = chroma.id !== 'default' ? chroma.primary : '#f0f8ff';
  const maneColor = chroma.id !== 'default' ? chroma.secondary : color;
  const hornColor = '#8ef6ff';

  useFrame((_, dt) => {
    if (paused || reducedMotion || !group.current) return;
    time.current += dt * (moving ? 9 : 2.2);
    group.current.position.y = 0.065 + Math.abs(Math.sin(time.current)) * (moving ? 0.035 : 0.008);
    group.current.rotation.x = moving ? Math.sin(time.current) * 0.09 : 0;
  });

  return (
    <group ref={group} position={[0, 0.065, 0]}>
      {/* Torso */}
      <mesh position={[0, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <capsuleGeometry args={[0.072, 0.14, 12, 20]} />
        <meshPhysicalMaterial color={bodyColor} clearcoat={0.7} roughness={0.22} metalness={0.15} />
      </mesh>
      {/* Four sculpted legs */}
      {[
        [-0.045, 0.1, 0.075],
        [0.045, 0.1, 0.075],
        [-0.045, 0.1, -0.075],
        [0.045, 0.1, -0.075],
      ].map(([lx, ly, lz], i) => (
        <group key={i} position={[lx, ly, lz]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.02, 0.016, 0.18, 10]} />
            <meshPhysicalMaterial color={bodyColor} roughness={0.25} />
          </mesh>
          <mesh position={[0, -0.085, 0]}>
            <cylinderGeometry args={[0.022, 0.025, 0.03, 10]} />
            <meshStandardMaterial color="#f5d076" metalness={0.85} roughness={0.2} />
          </mesh>
        </group>
      ))}
      {/* Neck & Head */}
      <mesh position={[0, 0.33, 0.095]} rotation={[-0.42, 0, 0]} castShadow>
        <capsuleGeometry args={[0.046, 0.13, 10, 16]} />
        <meshPhysicalMaterial color={bodyColor} clearcoat={0.7} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0.41, 0.15]} rotation={[0.45, 0, 0]} castShadow>
        <capsuleGeometry args={[0.038, 0.075, 10, 16]} />
        <meshPhysicalMaterial color={bodyColor} clearcoat={0.7} roughness={0.22} />
      </mesh>
      {/* Spiral Astral Horn */}
      <mesh position={[0, 0.51, 0.19]} rotation={[0.48, 0, 0]} castShadow>
        <coneGeometry args={[0.018, 0.16, 8]} />
        <meshStandardMaterial
          color={hornColor}
          emissive={hornColor}
          emissiveIntensity={1.2}
          metalness={0.6}
          roughness={0.1}
        />
      </mesh>
      {/* Starlight Mane & Tail */}
      {[0.3, 0.36, 0.42].map((y, i) => (
        <mesh key={i} position={[0, y, 0.055 + i * 0.018]} rotation={[-0.6, 0, 0]}>
          <coneGeometry args={[0.028, 0.09, 6]} />
          <meshStandardMaterial
            color={maneColor}
            emissive={maneColor}
            emissiveIntensity={0.55}
            roughness={0.3}
          />
        </mesh>
      ))}
      <mesh position={[0, 0.21, -0.14]} rotation={[-0.65, 0, 0]}>
        <coneGeometry args={[0.042, 0.16, 8]} />
        <meshStandardMaterial color={maneColor} emissive={maneColor} emissiveIntensity={0.45} />
      </mesh>
      {/* Golden Saddle Ring */}
      <mesh position={[0, 0.25, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.076, 0.012, 8, 24]} />
        <meshStandardMaterial color="#f5cd70" metalness={0.88} roughness={0.2} />
      </mesh>
    </group>
  );
}

export function EmberDrake({
  color,
  chroma,
  moving = false,
  paused = false,
  reducedMotion = false,
}: {
  color: string;
  chroma: ChromaDefinition;
  moving?: boolean;
  paused?: boolean;
  reducedMotion?: boolean;
}) {
  const root = useRef<Group>(null);
  const leftWing = useRef<Group>(null);
  const rightWing = useRef<Group>(null);
  const time = useRef(0);
  const primary = chroma.id !== 'default' ? chroma.primary : '#c9452c';
  const belly = chroma.id !== 'default' ? chroma.secondary : '#f5b056';
  const glow = color;

  useFrame((_, dt) => {
    if (paused || reducedMotion) return;
    time.current += dt * (moving ? 10 : 4.2);
    const flap = Math.sin(time.current) * (moving ? 0.45 : 0.25);
    if (leftWing.current) leftWing.current.rotation.z = 0.35 + flap;
    if (rightWing.current) rightWing.current.rotation.z = -0.35 - flap;
    if (root.current) {
      root.current.position.y = 0.09 + Math.sin(time.current) * 0.022;
    }
  });

  return (
    <group ref={root} position={[0, 0.09, 0]}>
      {/* Dragon Body */}
      <mesh position={[0, 0.2, 0]} rotation={[-0.35, 0, 0]} castShadow>
        <capsuleGeometry args={[0.082, 0.14, 12, 20]} />
        <meshPhysicalMaterial color={primary} roughness={0.32} metalness={0.35} clearcoat={0.5} />
      </mesh>
      {/* Glowing Ember Chest Core */}
      <mesh position={[0, 0.21, 0.068]} rotation={[-0.35, 0, 0]}>
        <capsuleGeometry args={[0.048, 0.1, 8, 12]} />
        <meshStandardMaterial color={belly} emissive="#ff7b29" emissiveIntensity={0.65} />
      </mesh>
      {/* Head & Horns */}
      <mesh position={[0, 0.37, 0.06]} castShadow>
        <sphereGeometry args={[0.072, 18, 16]} />
        <meshPhysicalMaterial color={primary} roughness={0.3} metalness={0.35} />
      </mesh>
      <mesh position={[0, 0.35, 0.125]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[0.048, 0.09, 6]} />
        <meshPhysicalMaterial color={primary} roughness={0.3} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.045, 0.44, 0.02]} rotation={[-0.5, 0, s * -0.25]} castShadow>
            <coneGeometry args={[0.018, 0.11, 6]} />
            <meshStandardMaterial color="#f5d076" metalness={0.8} roughness={0.22} />
          </mesh>
          <mesh position={[s * 0.035, 0.39, 0.11]}>
            <sphereGeometry args={[0.014, 8, 8]} />
            <meshStandardMaterial color="#fff394" emissive={glow} emissiveIntensity={1.4} />
          </mesh>
        </group>
      ))}
      {/* Articulated Wings */}
      <group ref={leftWing} position={[-0.06, 0.27, -0.02]}>
        <mesh position={[-0.11, 0.05, 0]} rotation={[0.2, 0, -0.5]} castShadow>
          <coneGeometry args={[0.085, 0.24, 4]} />
          <meshStandardMaterial
            color={belly}
            emissive="#ff6a2b"
            emissiveIntensity={0.4}
            roughness={0.4}
          />
        </mesh>
      </group>
      <group ref={rightWing} position={[0.06, 0.27, -0.02]}>
        <mesh position={[0.11, 0.05, 0]} rotation={[0.2, 0, 0.5]} castShadow>
          <coneGeometry args={[0.085, 0.24, 4]} />
          <meshStandardMaterial
            color={belly}
            emissive="#ff6a2b"
            emissiveIntensity={0.4}
            roughness={0.4}
          />
        </mesh>
      </group>
      {/* Tail & Flame Tip */}
      <mesh position={[0, 0.13, -0.13]} rotation={[-1.1, 0, 0]} castShadow>
        <coneGeometry args={[0.045, 0.18, 8]} />
        <meshPhysicalMaterial color={primary} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.19, -0.21]}>
        <octahedronGeometry args={[0.032, 0]} />
        <meshStandardMaterial color="#ffe47a" emissive="#ff6d24" emissiveIntensity={1.3} />
      </mesh>
    </group>
  );
}

export function SpiritFox({ color, chroma }: { color: string; chroma: ChromaDefinition }) {
  const primary = chroma.id !== 'default' ? chroma.primary : color;
  const tailTip = chroma.id !== 'default' ? chroma.secondary : '#fff2d6';
  return (
    <group position={[0, 0.08, 0]}>
      <mesh position={[0, 0.18, 0.02]} scale={[1, 1.12, 0.95]} castShadow>
        <sphereGeometry args={[0.125, 24, 20]} />
        <meshPhysicalMaterial color={primary} clearcoat={1} roughness={0.22} />
      </mesh>
      {/* Nine Fanned Spirit Tails */}
      {[-2, -1, 0, 1, 2].map((tIdx) => (
        <mesh
          key={tIdx}
          position={[tIdx * 0.042, 0.2 + (2 - Math.abs(tIdx)) * 0.025, -0.11]}
          rotation={[-0.55, 0, -tIdx * 0.28]}
          castShadow
        >
          <coneGeometry args={[0.038, 0.22, 8]} />
          <meshStandardMaterial
            color={tailTip}
            emissive={primary}
            emissiveIntensity={0.45}
            roughness={0.3}
          />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.08, 0.34, 0.02]} rotation={[0, 0, s * -0.16]} castShadow>
            <coneGeometry args={[0.052, 0.17, 4]} />
            <meshPhysicalMaterial color={primary} clearcoat={1} roughness={0.22} />
          </mesh>
          <mesh position={[s * 0.048, 0.22, 0.125]}>
            <sphereGeometry args={[0.014, 10, 8]} />
            <meshStandardMaterial color="#7ef9ff" emissive="#5ce6f0" emissiveIntensity={1.1} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.16, 0.135]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.065, 0.12, 4]} />
        <meshStandardMaterial color="#fff3d9" />
      </mesh>
      {/* Golden Spirit Bell */}
      <mesh position={[0, 0.12, 0.115]}>
        <sphereGeometry args={[0.024, 12, 10]} />
        <meshStandardMaterial color="#ffd166" metalness={0.9} roughness={0.18} />
      </mesh>
    </group>
  );
}

export function ArcaneArchon({ color, chroma }: { color: string; chroma: ChromaDefinition }) {
  const robe = chroma.id !== 'default' ? chroma.primary : color;
  const trim = chroma.id !== 'default' ? chroma.secondary : '#f2cd76';
  return (
    <group position={[0, 0.08, 0]}>
      <mesh position={[0, 0.17, 0]} castShadow>
        <cylinderGeometry args={[0.068, 0.145, 0.34, 24]} />
        <meshPhysicalMaterial color={robe} clearcoat={1} roughness={0.22} metalness={0.25} />
      </mesh>
      {/* Golden Pauldrons */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.095, 0.28, 0]} rotation={[0, 0, s * -0.3]} castShadow>
          <sphereGeometry args={[0.042, 12, 10]} />
          <meshStandardMaterial color={trim} metalness={0.85} roughness={0.2} />
        </mesh>
      ))}
      <mesh position={[0, 0.34, 0]}>
        <sphereGeometry args={[0.072, 24, 16]} />
        <meshPhysicalMaterial color="#efe0be" roughness={0.35} />
      </mesh>
      {/* Archon Halo & Hat */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.165, 0.165, 0.026, 32]} />
        <meshPhysicalMaterial color={robe} roughness={0.22} clearcoat={1} />
      </mesh>
      <mesh position={[0, 0.51, 0]} rotation={[0, 0, 0.08]} castShadow>
        <coneGeometry args={[0.115, 0.24, 24]} />
        <meshPhysicalMaterial color={robe} roughness={0.22} clearcoat={1} />
      </mesh>
      <mesh position={[0, 0.36, -0.05]}>
        <torusGeometry args={[0.135, 0.01, 8, 32]} />
        <meshStandardMaterial
          color={trim}
          emissive={trim}
          emissiveIntensity={0.8}
          metalness={0.9}
        />
      </mesh>
      {/* Staff of Eternity */}
      <mesh position={[0.15, 0.25, 0]}>
        <cylinderGeometry args={[0.013, 0.016, 0.42, 8]} />
        <meshStandardMaterial color={trim} metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[0.15, 0.48, 0]}>
        <octahedronGeometry args={[0.036, 0]} />
        <meshStandardMaterial color="#7ef9ff" emissive="#4ce0f5" emissiveIntensity={1.4} />
      </mesh>
    </group>
  );
}
