import { useMemo } from 'react';
import { useTexture, Sparkles } from '@react-three/drei';
import {
  BufferGeometry,
  Float32BufferAttribute,
  CanvasTexture,
  DoubleSide,
  RepeatWrapping,
  SRGBColorSpace,
  Color,
} from 'three';
import { EdgeOutpost } from './EdgeOutpost';
import { OrderLandmarks } from './OrderLandmarks';
import { Watershed } from './Watershed';
import { Foundation } from './Foundation';
import { LAKE, isWatercourse } from './landscape';
import { LavaMaterial } from './LavaMaterial';
import { BiomeLandmarks } from './BiomeLandmarks';
import { BiomeDetails } from './BiomeDetails';
import { ModelAsset } from './ModelAsset';
import { corners, colors } from './layout';
import { LANDMARK, REGION_PLOTS, terrainHeight, footprintHeight } from './world-layout';
import { Crystal, Mushroom, Lantern, GroundScatter, Water, Bridge, Branch } from './Scenery';
export { Crystal } from './Scenery';
export function RockMaterial({
  color = '#8c9388',
  vertexColors = false,
  ground = false,
}: {
  color?: string;
  vertexColors?: boolean;
  ground?: boolean;
}) {
  const [diff, normal] = useTexture([
    '/assets/textures/rock-color.jpg',
    '/assets/textures/rock-normal.jpg',
  ]);
  useMemo(() => {
    diff.colorSpace = SRGBColorSpace;
    for (const t of [diff, normal]) {
      t.wrapS = t.wrapT = RepeatWrapping;
      t.repeat.set(1.5, 1.5);
    }
  }, [diff, normal]);
  return (
    <meshStandardMaterial
      color={vertexColors ? '#ffffff' : color}
      map={vertexColors ? undefined : diff}
      normalMap={normal}
      normalScale={ground ? [0.32, 0.32] : [0.65, 0.65]}
      side={DoubleSide}
      roughness={0.93}
      vertexColors={vertexColors}
    />
  );
}
function Stairway({ sx, sz }: { sx: number; sz: number }) {
  const top = footprintHeight(LANDMARK.x * sx, LANDMARK.z * sz, 0.8).max + 0.015;
  const start = terrainHeight(3.6 * sx, 2.25 * sz);
  return (
    <group>
      {Array.from({ length: 10 }, (_, i) => {
        const t = i / 9,
          x = (3.6 - 0.16 * t) * sx,
          z = (2.25 + 0.63 * t) * sz,
          y = start + (top - start) * t;
        return (
          <group key={i}>
            <Foundation x={x} z={z} radius={0.2} rz={0.085} top={y + 0.025} />
            <mesh position={[x, y + 0.025, z]} castShadow receiveShadow>
              <boxGeometry args={[0.4, 0.05, 0.15]} />
              <RockMaterial color="#a5a38d" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
function Stable({ index, snow }: { index: number; snow: boolean }) {
  const factionColor = colors[index];
  return (
    <group>
      {/* Stepped Sanctum Terrace */}
      <mesh position={[0, 0.11, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.96, 1.04, 0.14, 32]} />
        <RockMaterial color={snow ? '#b4cad4' : '#a8a48c'} />
      </mesh>
      <mesh position={[0, 0.21, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.89, 0.95, 0.14, 64]} />
        <RockMaterial color={snow ? '#cce0e8' : '#c8c3ab'} />
      </mesh>
      {/* Polished Sanctum Floor */}
      <mesh position={[0, 0.286, 0]} receiveShadow>
        <cylinderGeometry args={[0.82, 0.85, 0.028, 64]} />
        <meshStandardMaterial
          color={new Color('#2d3a38').lerp(new Color(factionColor), 0.28)}
          roughness={0.52}
          metalness={0.28}
        />
      </mesh>
      {/* Outer & Inner Forged Gold Rings */}
      {[0.855, 0.75, 0.18].map((r, idx) => (
        <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.304 + idx * 0.001, 0]}>
          <ringGeometry args={[r, r + (idx === 0 ? 0.026 : 0.018), 64]} />
          <meshStandardMaterial
            color={idx === 1 ? factionColor : '#e2be72'}
            emissive={idx === 1 ? factionColor : '#000000'}
            emissiveIntensity={idx === 1 ? 0.45 : 0}
            metalness={0.78}
            roughness={0.25}
          />
        </mesh>
      ))}
      {/* Four Individual Summoning Pads for the 4 Pieces */}
      {[
        [-0.3, -0.3],
        [0.3, -0.3],
        [-0.3, 0.3],
        [0.3, 0.3],
      ].map(([px, pz], slot) => (
        <group key={slot} position={[px, 0.303, pz]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.165, 0.205, 32]} />
            <meshStandardMaterial color="#e0bd72" metalness={0.82} roughness={0.22} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
            <ringGeometry args={[0.08, 0.145, 6]} />
            <meshStandardMaterial
              color={factionColor}
              emissive={factionColor}
              emissiveIntensity={0.55}
            />
          </mesh>
        </group>
      ))}
      {/* Four Corner Sculpted 3D Pillars & Lit Torches */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <group
            key={i}
            position={[Math.cos(a) * 0.88, 0.28, Math.sin(a) * 0.88]}
            rotation={[0, -a, 0]}
          >
            <ModelAsset
              url="/assets/models/pillar_decorated.glb"
              width={0.14}
              height={0.26}
              treatment={snow ? 'snow' : undefined}
            />
            <group position={[0, 0.24, 0]}>
              <ModelAsset url="/assets/models/torch_lit.glb" width={0.11} height={0.22} />
            </group>
            <mesh position={[0, 0.36, 0]}>
              <octahedronGeometry args={[0.026, 0]} />
              <meshStandardMaterial
                color="#fff3c4"
                emissive={factionColor}
                emissiveIntensity={1.2}
              />
            </mesh>
          </group>
        );
      })}
      {/* Center Sanctum Heraldic Emblem */}
      <group position={[0, 0.3, 0]}>
        <ModelAsset url="/assets/models/sword_shield_gold.glb" width={0.22} height={0.24} />
      </group>
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.9, 0.3, Math.sin(a) * 0.9]}
            rotation={[0, -a, 0]}
          >
            <boxGeometry args={[0.014, 0.014, 0.085]} />
            <meshStandardMaterial color="#c9b482" metalness={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}
function Crater() {
  const geometry = useMemo(() => {
    const vertices: number[] = [],
      indices: number[] = [];
    const radii = [0.34, 0.45, 0.62, 0.88],
      heights = [0.36, 0.58, 0.26, -0.1],
      segments = 96;
    radii.forEach((radius, r) => {
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2,
          variation = 1 + 0.1 * Math.sin(a * 7) + 0.055 * Math.cos(a * 11);
        vertices.push(
          Math.cos(a) * radius * variation,
          heights[r] + Math.sin(a * 7) * 0.08,
          Math.sin(a) * radius * variation,
        );
        if (r < 3 && i < segments) {
          const p = r * (segments + 1) + i,
            q = p + segments + 1;
          indices.push(p, p + 1, q, p + 1, q + 1, q);
        }
      }
    });
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    g.setAttribute(
      'uv',
      new Float32BufferAttribute(
        vertices.flatMap((_, i) => (i % 3 === 0 ? [vertices[i] * 1.5, vertices[i + 2] * 1.5] : [])),
        2,
      ),
    );
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <RockMaterial color="#75635f" />
      </mesh>
      <mesh position={[0, 0.37, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.34, 40]} />
        <LavaMaterial />
      </mesh>
      {Array.from({ length: 5 }, (_, i) => (
        <mesh
          key={i}
          position={[Math.sin(i * 2.4) * 0.57, 0.24, Math.cos(i * 2.4) * 0.57]}
          scale={[0.2, 0.35 + (i % 3) * 0.1, 0.18]}
          rotation={[0.1, i, 0.15]}
          castShadow
        >
          <dodecahedronGeometry args={[1, 1]} />
          <RockMaterial color="#625158" />
        </mesh>
      ))}
      <Sparkles
        count={16}
        scale={[0.8, 1.4, 0.8]}
        position={[0, 1, 0]}
        color="#ffad4f"
        size={2}
        speed={0.8}
      />
    </group>
  );
}
function Temple({ sx, sz, snow = false }: { sx: number; sz: number; snow?: boolean }) {
  const x = LANDMARK.x * sx,
    z = LANDMARK.z * sz,
    y = footprintHeight(x, z, 0.8).max + 0.015;
  return (
    <>
      <Foundation x={x} z={z} radius={0.81} top={y} color={snow ? '#9faeb1' : '#858671'} />
      <group position={[x, y, z]} rotation={[0, sz < 0 ? 0 : Math.PI, 0]}>
        {[0.78, 0.69, 0.6].map((r, i) => (
          <mesh key={i} position={[0, 0.035 + i * 0.055, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[r, r + 0.035, 0.07, 8]} />
            <RockMaterial color={snow ? '#c6d7df' : '#ded7b9'} />
          </mesh>
        ))}
        <group position={[0, 0.18, 0]}>
          <ModelAsset
            url="/assets/models/fantasy-castle.glb"
            aged
            width={1.12}
            height={1.45}
            treatment={snow ? 'snow' : undefined}
          />
        </group>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.53, 0.16, 0.49]}>
            <Lantern color={snow ? '#82e4f6' : '#f6ce74'} scale={0.65} />
          </group>
        ))}
      </group>
    </>
  );
}
export function Region({
  index,
  kind,
  reducedMotion = false,
}: {
  index: number;
  kind: string;
  reducedMotion?: boolean;
}) {
  const [cx, cz] = corners[index],
    sx = Math.sign(cx),
    sz = Math.sign(cz);
  const forest = kind === 'pine' || kind === 'mushroom' || kind === 'ruins',
    snow = kind === 'snow',
    lava = kind === 'volcano',
    celestial = kind === 'celestial',
    pink = kind === 'sakura';
  const landmarkX = LANDMARK.x * sx,
    landmarkZ = LANDMARK.z * sz;
  const h = terrainHeight(landmarkX, landmarkZ);
  return (
    <group>
      <BiomeLandmarks sx={sx} sz={sz} kind={kind} />
      <EdgeOutpost sx={sx} sz={sz} kind={kind} />
      <GroundScatter sx={sx} sz={sz} kind={kind} />
      <BiomeDetails sx={sx} sz={sz} kind={kind} />
      <OrderLandmarks index={index} kind={kind} sx={sx} sz={sz} />
      <Watershed sx={sx} sz={sz} kind={kind} />
      <group position={[cx, 0, cz]}>
        <Stable index={index} snow={snow} />
      </group>
      {(snow || celestial) && <Stairway sx={sx} sz={sz} />}
      {(snow || celestial) && <Temple sx={sx} sz={sz} snow={snow} />}
      {lava && (
        <>
          <group position={[landmarkX, h, landmarkZ]}>
            <Crater />
          </group>
          <Foundation
            x={sx * 2.1}
            z={sz * 4.1}
            radius={0.35}
            top={footprintHeight(sx * 2.1, sz * 4.1, 0.35).max}
          />
          <group position={[sx * 2.1, footprintHeight(sx * 2.1, sz * 4.1, 0.35).max, sz * 4.1]}>
            <ModelAsset
              url="/assets/models/fantasy-castle.glb"
              aged
              width={0.65}
              height={0.9}
              tint="#897575"
            />
          </group>
        </>
      )}
      {((forest && !['mushroom', 'ruins'].includes(kind)) || pink || kind === 'cactus') && (
        <>
          <group position={[landmarkX, h, landmarkZ]}>
            <ModelAsset
              url="/assets/models/tree_small_02.glb"
              width={1.8}
              height={2.25}
              treatment={pink ? 'celestial' : undefined}
            />
            <group position={[0.3, 0.65, 0.12]}>
              <Lantern scale={0.6} color={pink ? '#ef9edb' : '#88e2c0'} />
            </group>
          </group>
          <Foundation
            x={sx * 2.7}
            z={sz * 4.08}
            radius={0.42}
            top={footprintHeight(sx * 2.7, sz * 4.08, 0.42).max}
          />
          <group
            position={[sx * 2.7, footprintHeight(sx * 2.7, sz * 4.08, 0.42).max, sz * 4.08]}
            rotation={[0, sz < 0 ? 0 : Math.PI, 0]}
          >
            <ModelAsset aged url="/assets/models/fantasy-castle.glb" width={0.76} height={0.95} />
          </group>
        </>
      )}
      <group position={[sx * 3.95, 0, sz * 1.6]}>
        <Water lava={lava} ice={snow} />
        {!lava && (
          <group
            position={[0, footprintHeight(sx * 3.95, sz * 1.6, 0.84, 0.18).max + 0.01, 0.04]}
            rotation={[0, Math.PI * 0.55, 0]}
          >
            <Bridge length={1.65} />
          </group>
        )}
        {forest &&
          [-1, 1].map((s, i) => (
            <mesh
              key={s}
              rotation={[-Math.PI / 2, 0, 0.2]}
              position={[s * 0.27, LAKE.level + 0.008, 0.17 - i * 0.35]}
            >
              <circleGeometry args={[0.09, 12, 0, Math.PI * 1.8]} />
              <meshStandardMaterial color="#7d9b56" roughness={0.7} />
            </mesh>
          ))}
      </group>
      {REGION_PLOTS.map((plot, i) => {
        const x = plot.x * sx,
          z = plot.z * sz,
          y =
            plot.type === 'rock'
              ? footprintHeight(x, z, plot.radius * 0.65).min
              : terrainHeight(x, z) - (plot.type === 'tree' ? 0.035 : 0),
          s = plot.scale;
        if (isWatercourse(x, z, plot.radius * 0.5)) return null;
        return (
          <group key={i} position={[x, y, z]} rotation={[0, i * 2.4, 0]}>
            {plot.type === 'tree' &&
              (snow ? (
                <ModelAsset
                  url="/assets/models/pine_sapling_small.glb"
                  width={s * 0.72}
                  height={s * 1.55}
                  treatment="snow"
                />
              ) : lava ? (
                <group scale={s}>
                  <Branch
                    points={[
                      [0, 0, 0],
                      [0.05, 0.45, 0],
                      [-0.06, 0.8, 0],
                    ]}
                    radius={0.045}
                    color="#403b3d"
                  />
                  <Branch
                    points={[
                      [0, 0.3, 0],
                      [0.2, 0.55, 0.07],
                      [0.25, 0.7, 0.1],
                    ]}
                    radius={0.025}
                    color="#403b3d"
                  />
                </group>
              ) : (
                <ModelAsset
                  url="/assets/models/tree_small_02.glb"
                  width={s * (celestial ? 0.7 : 1.05)}
                  height={s * 1.5}
                  treatment={pink || celestial ? 'celestial' : undefined}
                />
              ))}
            {plot.type === 'rock' && (
              <ModelAsset
                url="/assets/models/rock_moss_set_02.glb"
                nodeName={
                  ['rock_moss_set_02_rock08', 'rock_moss_set_02_rock12', 'rock_moss_set_02_rock10'][
                    i % 3
                  ]
                }
                width={s * 1.9}
                height={s * 1.2}
                treatment={snow ? 'snow' : lava ? 'basalt' : undefined}
              />
            )}
            {plot.type === 'crystal' && (
              <group scale={s}>
                {[-1, 0, 1].map((j) => (
                  <group key={j} position={[j * 0.14, 0, Math.abs(j) * 0.05]}>
                    <Crystal
                      color={
                        lava ? '#e89842' : snow ? '#a2e8ff' : celestial ? '#edcf7f' : '#89c8b0'
                      }
                      height={j ? 1 : 1.5}
                    />
                  </group>
                ))}
              </group>
            )}
            {plot.type === 'mushroom' &&
              (forest || pink ? (
                <group scale={s * 1.7}>
                  {[0, 1, 2].map((j) => (
                    <group key={j} position={[j * 0.17, 0, 0.1 * Math.sin(j)]} scale={1 - j * 0.17}>
                      <Mushroom i={i + j} color={j % 2 ? '#a978c2' : '#64a8be'} />
                    </group>
                  ))}
                </group>
              ) : (
                <group scale={s}>
                  <Crystal color={lava ? '#ef9a41' : '#a3d9ed'} />
                </group>
              ))}
            {plot.type === 'lantern' && (
              <Lantern scale={s} color={snow ? '#91d9ef' : lava ? '#ff9c5b' : '#f1d28b'} />
            )}
          </group>
        );
      })}
      {!reducedMotion && (
        <Sparkles
          count={18}
          scale={[2.8, 1.5, 2.8]}
          position={[cx, 0.7, cz]}
          size={1.6}
          color={lava ? '#f4a76a' : snow ? '#d7f4ff' : '#c7edb9'}
          speed={lava ? 0.6 : 0.18}
        />
      )}
    </group>
  );
}
export function Heart() {
  return (
    <group>
      {[0.25, 0.22, 0.18].map((r, i) => (
        <mesh key={i} position={[0, 0.16 + i * 0.065, 0]} receiveShadow>
          <cylinderGeometry args={[r, r + 0.025, 0.07, 16]} />
          <meshStandardMaterial color="#b2ac97" roughness={0.6} metalness={0.35} />
        </mesh>
      ))}
      <group position={[0, 0.28, 0]} rotation={[0, Math.PI / 5, 0]}>
        <mesh position={[0, 0.32, 0]} castShadow>
          <boxGeometry args={[0.06, 0.64, 0.025]} />
          <meshStandardMaterial color="#becbc8" metalness={0.85} roughness={0.27} />
        </mesh>
        <mesh position={[0, 0.32, 0.014]}>
          <boxGeometry args={[0.009, 0.63, 0.003]} />
          <meshStandardMaterial color="#a6d6ca" emissive="#9bdccb" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0, 0.66, 0]} castShadow>
          <boxGeometry args={[0.29, 0.038, 0.05]} />
          <meshStandardMaterial color="#b89d62" metalness={0.8} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.77, 0]}>
          <cylinderGeometry args={[0.024, 0.028, 0.19, 16]} />
          <meshStandardMaterial color="#42322e" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.89, 0]}>
          <octahedronGeometry args={[0.047, 1]} />
          <meshStandardMaterial color="#bba56d" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.6 + i * 0.1, 0]} rotation={[0.5 + i * 0.5, 0, i * 0.7]}>
          <torusGeometry args={[0.18 + i * 0.025, 0.009, 6, 48]} />
          <meshStandardMaterial color="#cbbb83" metalness={0.85} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}
export function Clouds() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const c = canvas.getContext('2d')!,
      g = c.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, 'rgba(244,248,255,.46)');
    g.addColorStop(0.5, 'rgba(210,228,242,.22)');
    g.addColorStop(1, 'rgba(181,207,218,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
    return new CanvasTexture(canvas);
  }, []);
  return (
    <group>
      {Array.from({ length: 20 }, (_, i) => {
        const a = (i / 20) * Math.PI * 2;
        const radius = i % 2 === 0 ? 5.1 : 6.4;
        const y = i % 2 === 0 ? -1.55 : -2.35;
        return (
          <sprite
            key={i}
            position={[Math.cos(a) * radius, y, Math.sin(a) * radius]}
            scale={[i % 2 === 0 ? 3.8 : 4.8, i % 2 === 0 ? 1.25 : 1.55, 1]}
          >
            <spriteMaterial
              map={texture}
              transparent
              opacity={i % 2 === 0 ? 0.38 : 0.28}
              depthWrite={false}
            />
          </sprite>
        );
      })}
    </group>
  );
}
