import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import {
  AnimationAction,
  AnimationMixer,
  Color,
  Mesh,
  MeshStandardMaterial,
  SkinnedMesh,
} from 'three';
import { fitAsset } from './asset-bounds';

export interface ChromaMaterialOverride {
  id: string;
  primary: string;
  secondary: string;
  emissive: string;
  metalness: number;
  roughness: number;
}

/** Normalize every asset by its real bounds: horizontal center, lowest foot at y=0. */
export function ModelAsset({
  url,
  width,
  height,
  tint,
  surface,
  nodeName,
  treatment,
  aged = false,
  chroma,
  animationState = 'idle',
  paused = false,
  reducedMotion = false,
}: {
  url: string;
  width: number;
  height?: number;
  tint?: string;
  surface?: 'ice' | 'lacquer' | 'forged';
  nodeName?: string;
  aged?: boolean;
  treatment?: 'snow' | 'celestial' | 'basalt';
  chroma?: ChromaMaterialOverride;
  animationState?: 'idle' | 'move' | 'celebrate';
  paused?: boolean;
  reducedMotion?: boolean;
}) {
  const gameUrl = url.replace(
    /(tree_small_02|pine_sapling_small|rock_moss_set_02|fantasy-castle)\.glb$/,
    '$1-game.glb',
  );
  const baseline = new URLSearchParams(location.search).get('renderProfile') === 'baseline';
  const { scene, animations } = useGLTF(baseline ? url : gameUrl);
  const mixerRef = useRef<AnimationMixer | null>(null);
  const actionsRef = useRef<Record<string, AnimationAction>>({});
  const currentClipRef = useRef<string>('');

  const instance = useMemo(() => {
    let source = (nodeName && scene.getObjectByName(nodeName)) || scene;
    const idle = animations.find((a) => a.name === 'Idle');
    let mixer: AnimationMixer | null = null;
    const actionMap: Record<string, AnimationAction> = {};

    if (idle) {
      source = clone(source);
      mixer = new AnimationMixer(source);
      for (const clip of animations) {
        actionMap[clip.name] = mixer.clipAction(clip);
      }
      const idleAction = actionMap['Idle'];
      if (idleAction) {
        idleAction.play();
        mixer.update(0.05);
      }
      source.updateMatrixWorld(true);
      source.traverse((o) => {
        if (o instanceof SkinnedMesh) {
          o.skeleton.update();
          o.computeBoundingBox();
          o.computeBoundingSphere();
        }
      });
    }

    mixerRef.current = mixer;
    actionsRef.current = actionMap;
    currentClipRef.current = idle ? 'Idle' : '';

    const object = fitAsset(source, width, height);
    object.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        const colorize = (m: MeshStandardMaterial) => {
          const copy = m.clone();
          // MSAA coverage smooths cutout foliage without transparent sorting artifacts.
          copy.alphaToCoverage = copy.alphaTest > 0;
          if (tint || surface) copy.color.set(tint ?? '#c8e8f3');
          if (treatment === 'basalt') copy.color.set('#44404a');
          if (treatment === 'celestial' && /leav|twig/i.test(m.name)) {
            copy.onBeforeCompile = (shader) => {
              shader.fragmentShader = shader.fragmentShader.replace(
                '#include <map_fragment>',
                '#include <map_fragment>\nfloat leafLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=leafLuma*vec3(1.65,.92,1.38);',
              );
            };
            copy.customProgramCacheKey = () => 'silver-pink-leaves-v2';
          }
          if (treatment === 'snow') {
            copy.onBeforeCompile = (shader) => {
              shader.vertexShader = shader.vertexShader
                .replace('#include <common>', '#include <common>\nvarying vec3 vSnowNormal;')
                .replace(
                  '#include <beginnormal_vertex>',
                  '#include <beginnormal_vertex>\nvSnowNormal=normalize(mat3(modelMatrix)*normal);',
                );
              shader.fragmentShader = shader.fragmentShader
                .replace('#include <common>', '#include <common>\nvarying vec3 vSnowNormal;')
                .replace(
                  '#include <map_fragment>',
                  '#include <map_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(.84,.93,.98),smoothstep(.12,.7,vSnowNormal.y)*.94);',
                );
            };
            copy.customProgramCacheKey = () => 'snow-cover-v2';
          }
          if (surface) {
            copy.map = null;
            copy.normalMap = null;
            copy.roughness = surface === 'forged' ? 0.34 : surface === 'ice' ? 0.2 : 0.24;
            copy.metalness = surface === 'forged' ? 0.76 : 0.38;
          }
          if (tint && !surface && !treatment) {
            copy.metalness = 0.42;
            copy.roughness = 0.35;
          }
          if (chroma && chroma.id !== 'default') {
            if (copy.map) {
              copy.color.set('#ffffff').lerp(new Color(chroma.primary), 0.32);
              copy.emissive.set(chroma.emissive);
              copy.emissiveIntensity = 0.18;
              copy.metalness = Math.min(0.55, chroma.metalness * 0.65);
              copy.roughness = Math.max(0.28, chroma.roughness);
            } else {
              copy.color.set(chroma.primary);
              copy.emissive.set(chroma.emissive);
              copy.emissiveIntensity = 0.35;
              copy.metalness = chroma.metalness;
              copy.roughness = chroma.roughness;
            }
          }
          if (aged) {
            const base = copy.onBeforeCompile;
            copy.onBeforeCompile = (shader, renderer) => {
              base.call(copy, shader, renderer);
              shader.fragmentShader = shader.fragmentShader.replace(
                '#include <map_fragment>',
                '#include <map_fragment>\nfloat warmWindow=smoothstep(.14,.32,diffuseColor.r-diffuseColor.b)*smoothstep(.06,.24,diffuseColor.g-diffuseColor.b);diffuseColor.rgb=mix(diffuseColor.rgb*vec3(1.06,1.03,.98),vec3(1.18,.92,.52),warmWindow*.42);',
              );
            };
            copy.customProgramCacheKey = () => `arcane-architecture-${treatment ?? 'stone'}-v2`;
          }
          return copy;
        };
        child.material = Array.isArray(child.material)
          ? child.material.map(colorize)
          : colorize(child.material);
      }
    });
    return object;
  }, [scene, animations, width, height, tint, surface, nodeName, treatment, aged, chroma?.id]);

  useEffect(() => {
    const actions = actionsRef.current;
    const mixer = mixerRef.current;
    if (!mixer || !Object.keys(actions).length) return;
    const desired =
      animationState === 'move'
        ? actions['Running_A']
          ? 'Running_A'
          : actions['Walking_A']
            ? 'Walking_A'
            : 'Idle'
        : animationState === 'celebrate'
          ? actions['Walking_A']
            ? 'Walking_A'
            : 'Idle'
          : 'Idle';
    if (desired === currentClipRef.current) return;
    const prevAction = actions[currentClipRef.current];
    const nextAction = actions[desired];
    if (nextAction) {
      nextAction.reset().fadeIn(0.18).play();
      if (prevAction && prevAction !== nextAction) prevAction.fadeOut(0.18);
      currentClipRef.current = desired;
    }
  }, [animationState]);

  useFrame((_, delta) => {
    if (paused || reducedMotion || !mixerRef.current) return;
    const speed = animationState === 'move' ? 1.35 : 0.85;
    mixerRef.current.update(Math.min(0.05, delta) * speed);
  });

  useEffect(
    () => () => {
      mixerRef.current?.stopAllAction();
      instance.traverse((child) => {
        if (child instanceof Mesh) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((m) => m.dispose());
        }
      });
    },
    [instance, tint, surface, treatment, aged, chroma?.id],
  );
  return <primitive object={instance} />;
}
