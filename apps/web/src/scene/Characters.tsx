import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { CatmullRomCurve3, Group, MeshBasicMaterial, Quaternion, Euler, Vector3 } from 'three';
import { ModelAsset } from './ModelAsset';
import { FactionEquipment } from './FactionEquipment';
import {
  ArcaneArchon,
  AstralUnicorn,
  CharacterAura,
  CharacterPedestal,
  EmberDrake,
  RoyalBarding,
  SpiritFox,
} from './MythicModels';
import {
  auras,
  catalogById,
  chromas,
  factionForBiome,
  legacySkins,
  pedestals,
  skins,
} from '@skyhoof/catalog';
import type { Horse } from '@skyhoof/game-core';
import { boardRules, type GameConfig } from '@skyhoof/game-core';
import { horsePosition } from './layout';

type Motion = {
  curve: CatmullRomCurve3;
  elapsed: number;
  duration: number;
  capture: boolean;
  delay: number;
  target: Vector3;
};

export function Character({
  horse,
  config,
  skinId,
  biomeId,
  color,
  active,
  selected,
  onSelect,
  reducedMotion,
  paused = false,
}: {
  horse: Horse;
  config: GameConfig;
  skinId: string;
  biomeId: string;
  color: string;
  active: boolean;
  selected: boolean;
  onSelect: () => void;
  reducedMotion: boolean;
  paused?: boolean;
}) {
  const root = useRef<Group>(null),
    body = useRef<Group>(null),
    glow = useRef<MeshBasicMaterial>(null);
  const [animState, setAnimState] = useState<'idle' | 'move' | 'celebrate'>('idle');
  const faction = factionForBiome(biomeId);
  const skin = catalogById([...skins, ...legacySkins], skinId);
  const chroma = catalogById(chromas, config.cosmetics.chromaIds?.[horse.owner]);
  const aura = catalogById(auras, config.cosmetics.auraIds?.[horse.owner]);
  const pedestal = catalogById(pedestals, config.cosmetics.pedestalIds?.[horse.owner]);

  const initial = useRef(horsePosition(horse, config)),
    previous = useRef(horse),
    motion = useRef<Motion | null>(null);
  const targetRotation = useMemo(() => new Quaternion(), []),
    direction = useMemo(() => new Vector3(), []),
    ahead = useMemo(() => new Vector3(), []);

  useEffect(() => {
    const old = previous.current;
    previous.current = horse;
    if (old.progress === horse.progress) return;
    const target = new Vector3(...horsePosition(horse, config));
    if (reducedMotion) {
      root.current?.position.copy(target);
      motion.current = null;
      setAnimState('idle');
      return;
    }
    const points = [root.current?.position.clone() ?? new Vector3(...horsePosition(old, config))];
    if (
      old.progress >= 0 &&
      horse.progress > old.progress &&
      horse.progress < boardRules(config).finish
    ) {
      for (let p = old.progress + 1; p <= horse.progress; p++)
        points.push(new Vector3(...horsePosition({ ...horse, progress: p }, config)));
    } else points.push(target);
    const capture =
      old.progress >= 0 && (horse.progress < 0 || horse.progress === boardRules(config).finish);
    setAnimState(capture ? 'celebrate' : 'move');
    motion.current = {
      curve: new CatmullRomCurve3(points, false, 'centripetal', 0.2),
      elapsed: 0,
      duration: capture ? 0.65 : Math.min(1.3, 0.35 + (points.length - 1) * 0.14),
      capture,
      delay: capture ? 1.3 : 0,
      target,
    };
  }, [horse, reducedMotion, config]);

  useFrame(({ clock }, delta) => {
    if (glow.current)
      glow.current.opacity = reducedMotion ? 0.78 : 0.58 + Math.sin(clock.elapsedTime * 3.2) * 0.2;
    const m = motion.current;
    if (!root.current || !m || paused) return;
    m.elapsed += delta;
    const t = Math.min(1, Math.max(0, (m.elapsed - m.delay) / m.duration));
    if (m.capture) {
      if (m.elapsed < m.delay) return;
      const scale = t < 0.45 ? 1 - t / 0.45 : (t - 0.45) / 0.55;
      body.current?.scale.setScalar(Math.max(0.01, scale));
      if (t >= 0.45) root.current.position.copy(m.target);
    } else {
      const ease = t * t * (3 - 2 * t);
      m.curve.getPointAt(ease, root.current.position);
      root.current.position.y += Math.sin(t * Math.PI) * 0.045;
      m.curve.getTangentAt(Math.min(0.999, ease), ahead);
      direction.set(ahead.x, 0, ahead.z);
      if (direction.lengthSq() > 0.001) {
        targetRotation.setFromEuler(new Euler(0, Math.atan2(direction.x, direction.z), 0));
        root.current.quaternion.slerp(targetRotation, 1 - Math.exp(-12 * delta));
      }
      if (body.current) body.current.rotation.z = Math.sin(t * Math.PI * 2) * 0.02;
    }
    if (t >= 1) {
      root.current.position.copy(m.target);
      body.current?.scale.setScalar(1);
      if (body.current) body.current.rotation.z = 0;
      motion.current = null;
      setAnimState('idle');
    }
  });

  const modelTint =
    skin.model.kind === 'gltf' && !skin.model.miniature
      ? chroma.id !== 'default'
        ? chroma.primary
        : faction.metal
      : undefined;

  return (
    <group
      ref={root}
      userData={{ horseId: horse.id, active }}
      position={initial.current}
      rotation={[0, (-horse.owner * Math.PI) / 2, 0]}
      onClick={(e) => {
        if (!active) return;
        e.stopPropagation();
        if (active && e.delta < 6) onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (active) document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      {active && (
        <mesh position={[0, 0.27, 0]}>
          <cylinderGeometry args={[0.23, 0.23, 0.54, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
      )}
      <group ref={body}>
        <CharacterPedestal pedestal={pedestal} faction={faction} chroma={chroma} color={color} />
        <CharacterAura aura={aura} paused={paused} reducedMotion={reducedMotion} />

        <Suspense fallback={null}>
          {skin.model.kind === 'gltf' ? (
            <group position={[0, 0.065, 0]} rotation={[0, skin.model.rotationY, 0]}>
              <ModelAsset
                url={skin.model.url}
                width={skin.model.scale * 1.12}
                height={0.62}
                tint={modelTint}
                surface={skin.model.miniature ? undefined : 'forged'}
                chroma={chroma}
                animationState={animState}
                paused={paused}
                reducedMotion={reducedMotion}
              />
            </group>
          ) : skin.model.renderer === 'unicorn' ? (
            <AstralUnicorn
              color={color}
              chroma={chroma}
              moving={animState === 'move'}
              paused={paused}
              reducedMotion={reducedMotion}
            />
          ) : skin.model.renderer === 'drake' ? (
            <EmberDrake
              color={color}
              chroma={chroma}
              moving={animState === 'move'}
              paused={paused}
              reducedMotion={reducedMotion}
            />
          ) : skin.model.renderer === 'fox' ? (
            <SpiritFox color={color} chroma={chroma} />
          ) : (
            <ArcaneArchon color={color} chroma={chroma} />
          )}
        </Suspense>

        {skin.model.kind === 'gltf' && !skin.model.miniature && !skin.model.barding && (
          <group position={[0, 0.065, 0]}>
            <FactionEquipment faction={faction} />
          </group>
        )}
        {skin.model.kind === 'gltf' && skin.model.barding && (
          <RoyalBarding faction={faction} chroma={chroma} />
        )}

        <mesh position={[0, 0.049, 0.138]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.02, 0.036, 4]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.65} />
        </mesh>
      </group>

      {(active || selected) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
          <ringGeometry args={[0.192, 0.228, 48]} />
          <meshBasicMaterial
            ref={glow}
            color={selected ? '#ffe082' : color}
            transparent
            opacity={0.78}
          />
        </mesh>
      )}
      {horse.comeback && horse.progress < 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
          <ringGeometry args={[0.15, 0.175, 24]} />
          <meshStandardMaterial color="#ffb347" emissive="#ff8826" emissiveIntensity={0.95} />
        </mesh>
      )}
      {horse.shield && (
        <group position={[0, 0.3, 0]}>
          <mesh>
            <sphereGeometry args={[0.31, 32, 24]} />
            <meshPhysicalMaterial
              color="#7ef2ff"
              emissive="#3ac8e0"
              emissiveIntensity={0.25}
              transparent
              opacity={0.18}
              metalness={0.2}
              roughness={0.15}
              depthWrite={false}
            />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.18, 0]}>
            <torusGeometry args={[0.24, 0.008, 8, 32]} />
            <meshStandardMaterial color="#9ef9ff" emissive="#5ae8f7" emissiveIntensity={1} />
          </mesh>
        </group>
      )}
    </group>
  );
}
