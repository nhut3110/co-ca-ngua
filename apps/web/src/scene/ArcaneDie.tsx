import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BackSide,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  CanvasTexture,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { catalogById, diceStyles } from '@skyhoof/catalog';
import { makeDieGeometry } from './dice-geometry';
export const DICE_FACES = [
  { n: [1, 0, 0], value: 1 },
  { n: [-1, 0, 0], value: 6 },
  { n: [0, 1, 0], value: 2 },
  { n: [0, -1, 0], value: 5 },
  { n: [0, 0, 1], value: 3 },
  { n: [0, 0, -1], value: 4 },
];
function runeFace(value: number, ink: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.translate(128, 128);
  ctx.strokeStyle = '#bd9655';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i * Math.PI) / 4,
      x = Math.cos(a) * 111,
      y = Math.sin(a) * 111;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#668780';
  ctx.beginPath();
  ctx.arc(0, 0, 79, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 4);
    ctx.strokeStyle = i % 2 ? '#d5ba80' : '#8ce8d8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-7, -94);
    ctx.lineTo(0, -103);
    ctx.lineTo(7, -94);
    ctx.moveTo(0, -103);
    ctx.lineTo(0, -87);
    ctx.stroke();
    ctx.restore();
  }
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI'][value - 1];
  ctx.font = `bold ${roman.length > 2 ? 92 : 118}px Georgia`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#8edfd0';
  ctx.shadowBlur = 8;
  ctx.fillStyle = ink;
  ctx.fillText(roman, 0, 7);
  const texture = new CanvasTexture(c);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
export function ArcaneDie({
  styleId = 'astral-brass',
  active = false,
  hovered = false,
  paused = false,
  reducedMotion = false,
}: {
  styleId?: string;
  active?: boolean;
  hovered?: boolean;
  paused?: boolean;
  reducedMotion?: boolean;
}) {
  const body = useRef<MeshPhysicalMaterial>(null);
  const rim = useRef<MeshBasicMaterial>(null);
  const runes = useRef<(MeshStandardMaterial | null)[]>([]);
  const time = useRef(0);
  useFrame((_, dt) => {
    if (!paused && !reducedMotion) time.current += Math.min(dt, 0.1);
    const pulse = reducedMotion ? 0.55 : 0.5 + 0.5 * Math.sin(time.current * 2.6);
    if (body.current)
      body.current.emissiveIntensity = active ? 0.22 + pulse * 0.38 + (hovered ? 0.18 : 0) : 0.12;
    if (rim.current) rim.current.opacity = active ? 0.12 + pulse * 0.15 + (hovered ? 0.12 : 0) : 0;
    runes.current.forEach((material) => {
      if (material) material.emissiveIntensity = active ? 0.85 + pulse * 1.2 : 0.75;
    });
  });
  const style = catalogById([...diceStyles], styleId);
  const geometry = useMemo(() => makeDieGeometry(style.id), [style.id]),
    faces = useMemo(() => DICE_FACES.map((f) => runeFace(f.value, style.metal)), [style.id]);
  useEffect(
    () => () => {
      geometry.dispose();
      faces.forEach((t) => t.dispose());
    },
    [geometry, faces],
  );
  return (
    <group>
      <mesh name="relic-body" geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          ref={body}
          color={style.body}
          emissive={style.glow}
          emissiveIntensity={0.12}
          metalness={0.48}
          roughness={style.roughness}
          clearcoat={0.7}
          clearcoatRoughness={0.24}
        />
      </mesh>
      <mesh geometry={geometry} scale={1.055} visible={active} raycast={() => null}>
        <meshBasicMaterial
          ref={rim}
          color={style.glow}
          side={BackSide}
          transparent
          opacity={0.2}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {DICE_FACES.map(({ n, value }, i) => (
        <group
          key={value}
          position={new Vector3(...n).multiplyScalar(0.2605)}
          quaternion={new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(...n))}
        >
          <mesh>
            <planeGeometry args={[0.386, 0.386]} />
            <meshStandardMaterial
              ref={(material) => {
                runes.current[i] = material;
              }}
              map={faces[i]}
              emissiveMap={faces[i]}
              emissive={style.glow}
              emissiveIntensity={0.75}
              metalness={0.55}
              roughness={0.38}
              transparent
              depthWrite={false}
              polygonOffset
              polygonOffsetFactor={-1}
            />
          </mesh>
        </group>
      ))}
      {[-1, 1].flatMap((x) =>
        [-1, 1].flatMap((y) =>
          [-1, 1].map((z) => (
            <mesh key={`${x}${y}${z}`} position={[x * 0.189, y * 0.189, z * 0.189]}>
              <icosahedronGeometry args={[0.045, 1]} />
              <meshStandardMaterial color={style.metal} metalness={0.85} roughness={0.28} />
            </mesh>
          )),
        ),
      )}
    </group>
  );
}
