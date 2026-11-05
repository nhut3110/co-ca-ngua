import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { StaticBatch } from './StaticBatch';
import { RockMaterial } from './FantasyWorld';
import { FateSanctum } from './FateSanctum';
import { ArcaneDie, DICE_FACES } from './ArcaneDie';
export { diceSupportHeight } from './dice-geometry';
import {
  AdditiveBlending,
  Group,
  Mesh,
  MeshBasicMaterial,
  Euler,
  Quaternion,
  Vector3,
  PointLight,
} from 'three';
import type { VisualEvent } from '../hooks/usePresentation';
export function diceQuaternion(value: number) {
  const normal = DICE_FACES.find((f) => f.value === value)!.n;
  return new Quaternion().setFromUnitVectors(new Vector3(...normal), new Vector3(0, 1, 0));
}
export const DICE_TRAY = { x: 0, z: 0, radius: 0.24, scale: 1, top: 1.38 };
export function DiceStage({
  event,
  paused,
  reducedMotion,
  value,
  onRoll,
  canRoll = false,
  styleId = 'astral-brass',
  grand = false,
}: {
  event?: VisualEvent | null;
  paused?: boolean;
  reducedMotion?: boolean;
  value: number | null;
  onRoll?: () => void;
  canRoll?: boolean;
  styleId?: string;
  grand?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const die = useRef<Group>(null),
    elapsed = useRef(2),
    time = useRef(0),
    settled = useRef(value ?? 1);
  const target = useMemo(() => diceQuaternion(value ?? settled.current), [value]);
  const light = useRef<PointLight>(null);
  useEffect(() => {
    if (!canRoll) {
      document.body.style.cursor = 'auto';
      setHovered(false);
    }
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [canRoll]);
  const start = useRef(new Quaternion());
  const spin = useMemo(() => new Quaternion(), []);
  const spinEuler = useMemo(() => new Euler(), []);
  useEffect(() => {
    if (event?.kind === 'roll') {
      if (die.current) start.current.copy(die.current.quaternion);
      elapsed.current = reducedMotion ? 2 : 0;
      settled.current = event.die;
    }
  }, [event, reducedMotion]);
  useFrame((_, dt) => {
    if (!die.current) return;
    if (!paused) {
      elapsed.current += dt;
      if (!reducedMotion) time.current += dt;
    }
    if (light.current)
      light.current.intensity = canRoll ? 1.25 + Math.sin(time.current * 3) * 0.4 : 0.65;
    const t = Math.min(1, elapsed.current / 1.55);
    const ease = t * t * (3 - 2 * t);
    const turn = 2 * Math.PI * (1 - Math.pow(1 - t, 3));
    spin.setFromEuler(spinEuler.set(turn * 3, turn * 2, turn));
    die.current.quaternion.slerpQuaternions(start.current, target, ease).multiply(spin);
    if (t === 1) {
      die.current.quaternion.copy(target);
      if (canRoll && !reducedMotion)
        die.current.quaternion.multiply(
          spin.setFromEuler(
            spinEuler.set(
              Math.sin(time.current * 1.25) * 0.035,
              Math.sin(time.current * 0.95) * 0.065,
              0,
            ),
          ),
        );
    }
    die.current.scale.setScalar(
      canRoll
        ? 1 + (hovered ? 0.035 : 0) + (reducedMotion ? 0 : Math.sin(time.current * 2.6) * 0.008)
        : 1,
    );
    die.current.position.set(
      Math.sin(t * Math.PI * 2) * 0.06,
      1.78 +
        Math.sin(t * Math.PI) * 0.55 +
        (reducedMotion ? 0 : Math.sin(time.current * 1.5) * (canRoll ? 0.045 : 0.018)),
      0,
    );
  });
  return (
    <group name="dice-stage" scale={grand ? 1.35 : 1} position={[0, grand ? 0.12 : 0, 0]}>
      {grand && (
        <StaticBatch>
          <group>
            {[0.7, 0.59, 0.47].map((r, i) => (
              <mesh key={r} position={[0, -0.1 + i * 0.035, 0]} receiveShadow castShadow>
                <cylinderGeometry args={[r, r + 0.025, 0.06, 64]} />
                <RockMaterial color="#747b74" />
              </mesh>
            ))}
            {Array.from({ length: 24 }, (_, i) => {
              const a = (i * Math.PI) / 12;
              return (
                <mesh
                  key={i}
                  position={[Math.cos(a) * 0.63, -0.065, Math.sin(a) * 0.63]}
                  rotation={[0, -a, 0]}
                >
                  <boxGeometry args={[0.032, 0.005, 0.008]} />
                  <meshStandardMaterial
                    color="#c6a874"
                    emissive="#c28b31"
                    emissiveIntensity={0.4}
                    metalness={0.7}
                  />
                </mesh>
              );
            })}
          </group>
        </StaticBatch>
      )}
      <FateSanctum />
      <group
        name="die"
        userData={{ canRoll }}
        ref={die}
        position={[0, 1.78, 0]}
        onClick={(e) => {
          e.stopPropagation();
          if (canRoll) onRoll?.();
        }}
        onPointerOver={() => {
          if (canRoll) {
            document.body.style.cursor = 'pointer';
            setHovered(true);
          }
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
          setHovered(false);
        }}
      >
        <ArcaneDie
          styleId={styleId}
          active={canRoll}
          hovered={hovered}
          paused={paused}
          reducedMotion={reducedMotion}
        />
        {canRoll && (
          <mesh>
            <sphereGeometry args={[0.46, 12, 8]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        )}
      </group>
      <mesh position={[0, 1.36, 0]}>
        <cylinderGeometry args={[0.011, 0.024, 0.26, 16]} />
        <meshBasicMaterial
          color="#eac383"
          transparent
          opacity={0.65}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      <pointLight
        ref={light}
        position={[0, 1.7, 0.1]}
        color="#ffc06a"
        intensity={canRoll ? 1.4 : 0.65}
        distance={2.1}
        decay={2}
      />
    </group>
  );
}
export function MagicBurst({
  position,
  color = '#8ee3dc',
  paused,
  reducedMotion,
  delay = 0,
}: {
  position: [number, number, number];
  color?: string;
  paused?: boolean;
  reducedMotion?: boolean;
  delay?: number;
}) {
  const root = useRef<Group>(null),
    ring = useRef<Mesh>(null),
    material = useRef<MeshBasicMaterial>(null),
    elapsed = useRef(0);
  useFrame((_, dt) => {
    if (!paused) elapsed.current += dt;
    const t = (elapsed.current - delay) / (reducedMotion ? 0.2 : 1.1);
    if (!root.current) return;
    root.current.visible = t >= 0 && t < 1;
    if (t < 0 || t >= 1) return;
    if (ring.current) {
      ring.current.scale.setScalar(0.8 + t * 1.5);
      ring.current.rotation.z = t * 0.6;
    }
    if (material.current) material.current.opacity = (1 - t) * 0.8;
    root.current.children.slice(1).forEach((p, i) => {
      const a = i * 2.399;
      p.position.set(
        Math.cos(a) * (0.35 + t * 0.8),
        0.05 + Math.sin(t * Math.PI) * (0.3 + (i % 3) * 0.1),
        Math.sin(a) * (0.35 + t * 0.8),
      );
      p.scale.setScalar((1 - t) * 0.8);
    });
  });
  return (
    <group ref={root} position={position}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.585, 64]} />
        <meshBasicMaterial
          ref={material}
          color={color}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      {Array.from({ length: 24 }, (_, i) => (
        <mesh key={i}>
          <octahedronGeometry args={[0.055]} />
          <meshBasicMaterial color={color} transparent opacity={0.8} blending={AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}
function CombatImpact({
  position,
  paused,
  reducedMotion,
}: {
  position: [number, number, number];
  paused?: boolean;
  reducedMotion?: boolean;
}) {
  const root = useRef<Group>(null),
    slash = useRef<Mesh>(null),
    material = useRef<MeshBasicMaterial>(null),
    time = useRef(0);
  useFrame((_, dt) => {
    if (!paused) time.current += dt;
    const t = (time.current - (reducedMotion ? 0 : 1.05)) / (reducedMotion ? 0.3 : 0.8);
    if (!root.current) return;
    root.current.visible = t >= 0 && t < 1;
    if (t < 0 || t >= 1) return;
    if (slash.current) {
      slash.current.scale.setScalar(0.5 + t * 1.5);
      slash.current.rotation.z = t * 0.7;
    }
    if (material.current) material.current.opacity = (1 - t) * 0.95;
  });
  return (
    <group ref={root} position={[position[0], position[1] + 0.18, position[2]]}>
      <mesh ref={slash} rotation={[0.5, 0.3, 0.5]}>
        <torusGeometry args={[0.29, 0.021, 8, 64, Math.PI * 1.35]} />
        <meshBasicMaterial
          ref={material}
          color="#ffd3a0"
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      <MagicBurst
        position={[0, -0.13, 0]}
        delay={reducedMotion ? 0 : 1.05}
        color="#f9a66d"
        paused={paused}
        reducedMotion={reducedMotion}
      />
    </group>
  );
}
export function ActionMagic({
  event,
  paused,
  reducedMotion,
}: {
  event?: VisualEvent | null;
  paused?: boolean;
  reducedMotion?: boolean;
}) {
  if (!event || event.kind === 'roll') return null;
  const points = event.points.length
    ? event.points
    : [[DICE_TRAY.x, 0.25, DICE_TRAY.z] as [number, number, number]];
  return (
    <group key={event.id}>
      {event.impact && (
        <CombatImpact position={event.impact} paused={paused} reducedMotion={reducedMotion} />
      )}
      {points.map((p, i) => (
        <MagicBurst
          key={i}
          position={p}
          delay={i % 2 ? 0.65 : 0}
          paused={paused}
          reducedMotion={reducedMotion}
          color={event.kind === 'spell' ? '#b5bdff' : i > 1 ? '#ffb887' : '#8ee3dc'}
        />
      ))}
    </group>
  );
}
