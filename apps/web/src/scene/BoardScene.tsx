import { t } from '../i18n';
import { WorldVisualContext, WorldEnvironment } from './WorldEnvironment';
import { StaticBatch } from './StaticBatch';
import { RenderBudget } from './RenderBudget';
import { RenderMetrics } from './RenderMetrics';
import { moveIntent } from '../hooks/battle-feedback';
import { Component, Suspense, useEffect, useRef, useState, memo, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sparkles, Environment, Lightformer, Line } from '@react-three/drei';
import { TOUCH, PerspectiveCamera } from 'three';
import { type OrbitControls as OrbitControlsType } from 'three-stdlib';
import { catalogById, biomes, maps, skies } from '@skyhoof/catalog';
import { createGame, boardRules, type GameConfig, type GameState } from '@skyhoof/game-core';
import { Region, Clouds } from './FantasyWorld';
import { Crossroads } from './Crossroads';
import { DiceStage, ActionMagic } from './DiceStage';
import { StaticBoardTiles, DynamicBoardStructures } from './ArcaneBoardTiles';
import type { VisualEvent } from '../hooks/usePresentation';
import { Terrain } from './Terrain';
import { Character } from './Characters';
import { colors, corners, boardLayout, horsePosition } from './layout';

class SceneBoundary extends Component<
  { children: ReactNode; onError?: () => void },
  { error: boolean }
> {
  componentDidCatch() {
    this.props.onError?.();
  }
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="scene-error">
        <strong>{t('Không thể mở bàn cờ 3D')}</strong>
        <p>
          {t(
            'Hãy bật tăng tốc đồ họa trong trình duyệt và tải lại. Bạn vẫn có thể chọn quân bằng các nút bên dưới.',
          )}
        </p>
      </div>
    ) : (
      this.props.children
    );
  }
}

const Scenery = memo(
  function Scenery({ config, reducedMotion }: Pick<SceneProps, 'config' | 'reducedMotion'>) {
    return (
      <StaticBatch>
        <Terrain
          grand={config.board === 'grand'}
          base={catalogById(maps, config.cosmetics.mapId).base}
          kinds={config.cosmetics.biomeIds.map((id) => catalogById(biomes, id).decoration)}
        />
        {corners.map((_, i) => (
          <Region
            key={`${i}-${config.cosmetics.biomeIds[i]}`}
            index={i}
            kind={catalogById(biomes, config.cosmetics.biomeIds[i]).decoration}
            reducedMotion={reducedMotion}
          />
        ))}
        <StaticBoardTiles config={config} />
        <Crossroads grand={config.board === 'grand'} />
      </StaticBatch>
    );
  },
  (a, b) =>
    a.reducedMotion === b.reducedMotion &&
    a.config.board === b.config.board &&
    a.config.modules.portals === b.config.modules.portals &&
    a.config.modules.spells === b.config.modules.spells &&
    a.config.modules.relics === b.config.modules.relics &&
    a.config.cosmetics.mapId === b.config.cosmetics.mapId &&
    a.config.cosmetics.biomeIds.join(',') === b.config.cosmetics.biomeIds.join(','),
);

function Board({
  config,
  game,
  selected,
  legalIds,
  onSelect,
  reducedMotion,
  visualEvent,
  paused,
  canRoll,
  onRoll,
}: SceneProps & { game: GameState }) {
  const board = boardRules(config);
  const map = catalogById(maps, config.cosmetics.mapId);
  const moon = map.environment === 'moonlight';
  const selectedHorse = game.horses.find((h) => h.id === selected);
  const intent = moveIntent(game, selected ?? null);
  const end = intent?.target.progress ?? null;
  const target =
    selectedHorse && end !== null
      ? horsePosition({ ...selectedHorse, progress: end }, config)
      : null;

  return (
    <group position={[0, -0.3, 0]}>
      <Scenery config={config} reducedMotion={reducedMotion} />
      <Clouds />
      <DiceStage
        grand={config.board === 'grand'}
        styleId={config.cosmetics.diceId}
        event={visualEvent}
        paused={paused}
        reducedMotion={reducedMotion}
        value={game.die}
        canRoll={canRoll}
        onRoll={onRoll}
      />
      <DynamicBoardStructures config={config} paused={paused} reducedMotion={reducedMotion} />
      <ActionMagic event={visualEvent} paused={paused} reducedMotion={reducedMotion} />

      {selectedHorse && target && (
        <Line
          points={[
            horsePosition(selectedHorse, config),
            ...Array.from(
              {
                length: Math.max(
                  1,
                  Math.min(board.finish + 1, (end ?? 0) - selectedHorse.progress),
                ),
              },
              (_, i) =>
                horsePosition(
                  {
                    ...selectedHorse,
                    progress: Math.min(end ?? 0, Math.max(0, selectedHorse.progress + i + 1)),
                  },
                  config,
                ),
            ),
          ].map(([x, y, z]) => [x, y + 0.14, z])}
          color={intent?.kind === 'capture' ? '#ff8b54' : '#ffe082'}
          lineWidth={3}
          dashed
          dashSize={0.1}
          gapSize={0.055}
        />
      )}
      {target && end !== board.finish && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[target[0], 0.246, target[2]]}>
          <ringGeometry args={[0.14, 0.21, 32]} />
          <meshBasicMaterial color={intent?.kind === 'capture' ? '#ff7d4d' : '#ffcf66'} />
        </mesh>
      )}
      {target && end !== board.finish && (
        <group position={[target[0], 0.285, target[2]]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.12, 0.15, 48]} />
            <meshBasicMaterial color={intent?.kind === 'capture' ? '#ff8b54' : '#ffe082'} />
          </mesh>
          <mesh position={[0, 0.22, 0]}>
            <coneGeometry args={[0.065, 0.13, 4]} />
            <meshStandardMaterial color="#ffe082" emissive="#ffc847" emissiveIntensity={0.85} />
          </mesh>
        </group>
      )}
      {game.horses.map((h) => (
        <Character
          key={h.id}
          horse={h}
          config={config}
          skinId={config.cosmetics.skinIds[h.owner]}
          biomeId={config.cosmetics.biomeIds[h.owner]}
          color={colors[h.owner]}
          active={legalIds?.includes(h.id) ?? false}
          selected={selected === h.id}
          onSelect={() => onSelect?.(h.id)}
          paused={paused}
          reducedMotion={reducedMotion ?? false}
        />
      ))}
      {!reducedMotion && (
        <Sparkles
          count={48}
          scale={[11, 4.5, 11]}
          position={[0, 1.15, 0]}
          size={2.5}
          color={moon ? '#b8d8ff' : '#ffebb3'}
          speed={0.22}
        />
      )}
    </group>
  );
}

type SceneProps = {
  config: GameConfig;
  composition?: 'welcome';
  onReady?: () => void;
  game?: GameState;
  selected?: string | null;
  legalIds?: string[];
  onSelect?: (id: string) => void;
  reducedMotion?: boolean;
  resetKey?: number;
  visualEvent?: VisualEvent | null;
  paused?: boolean;
  canRoll?: boolean;
  onRoll?: () => void;
  cameraEnabled?: boolean;
  twoFingerOnly?: boolean;
  zoomRequest?: number;
};

function SceneReady({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  const { gl, invalidate } = useThree();
  useEffect(() => {
    gl.shadowMap.needsUpdate = true;
    invalidate();
  }, [gl, invalidate]);
  useFrame(() => {
    if (++frames.current === 1) {
      gl.shadowMap.needsUpdate = true;
      invalidate();
    } else if (frames.current === 2) {
      onReady();
    }
  });
  return null;
}

function viewportZoom(width: number, height: number, composition?: 'welcome') {
  const isPortrait = height > width;
  if (isPortrait) {
    return (
      Math.min(0.95, Math.max(0.5, (width / height) * 1.24)) *
      (composition === 'welcome' ? 0.92 : 1)
    );
  }
  const welcomeFit =
    composition === 'welcome' && width > 760 && width < 1200 && height > 600 ? 0.86 : 1;
  return Math.min(height < 320 ? 1.05 : 1.16, Math.max(0.45, (width / height) * 0.95)) * welcomeFit;
}

function FitViewport({
  viewScale = 1,
  composition,
}: {
  viewScale?: number;
  composition?: 'welcome';
}) {
  const { camera, size } = useThree();
  useEffect(() => {
    camera.zoom = viewportZoom(size.width, size.height, composition) * viewScale;
    if (camera instanceof PerspectiveCamera) {
      if (size.height > size.width) {
        camera.setViewOffset(
          size.width,
          size.height,
          0,
          size.height * (composition === 'welcome' ? 0.14 : 0.08),
          size.width,
          size.height,
        );
      } else if (composition === 'welcome' && size.width > 760 && size.height > 600) {
        camera.setViewOffset(
          size.width,
          size.height,
          -size.width * 0.15,
          0,
          size.width,
          size.height,
        );
      } else {
        camera.clearViewOffset();
      }
    }
    camera.updateProjectionMatrix();
    return () => {
      if (camera instanceof PerspectiveCamera) camera.clearViewOffset();
    };
  }, [camera, size.width, size.height, viewScale, composition]);
  return null;
}

function Controls({
  composition,
  resetKey,
  enabled = true,
  zoomRequest = 0,
  twoFingerOnly = false,
  viewScale = 1,
}: {
  resetKey?: number;
  composition?: 'welcome';
  enabled?: boolean;
  twoFingerOnly?: boolean;
  zoomRequest?: number;
  viewScale?: number;
}) {
  const { camera, size } = useThree();
  const ref = useRef<OrbitControlsType>(null),
    previousZoom = useRef(zoomRequest);
  useEffect(() => {
    const delta = zoomRequest - previousZoom.current;
    previousZoom.current = zoomRequest;
    if (delta > 0) ref.current?.dollyIn(Math.pow(0.8, delta));
    else if (delta < 0) ref.current?.dollyOut(Math.pow(0.8, -delta));
    ref.current?.update();
  }, [zoomRequest]);
  useEffect(() => {
    ref.current?.reset();
    camera.zoom = viewportZoom(size.width, size.height, composition) * viewScale;
    camera.updateProjectionMatrix();
  }, [resetKey, camera, viewScale, composition, size.width, size.height]);
  return (
    <OrbitControls
      ref={ref}
      makeDefault
      enabled={enabled}
      enablePan
      touches={{ ONE: twoFingerOnly ? undefined : TOUCH.ROTATE, TWO: TOUCH.DOLLY_ROTATE }}
      screenSpacePanning={false}
      minDistance={5.8}
      maxDistance={20}
      minPolarAngle={0.22}
      maxPolarAngle={1.18}
      target={[0, -0.75, 0]}
      enableDamping
      dampingFactor={0.08}
    />
  );
}

export function BoardScene(props: SceneProps) {
  const [ready, setReady] = useState(false);
  const [handheld, setHandheld] = useState(
    () => matchMedia('(max-width:760px), (pointer:coarse)').matches,
  );
  useEffect(() => {
    const mq = matchMedia('(max-width:760px), (pointer:coarse)');
    const change = () => setHandheld(mq.matches);
    mq.addEventListener('change', change);
    return () => mq.removeEventListener('change', change);
  }, []);
  const map = catalogById(maps, props.config.cosmetics.mapId);
  const preview = props.game ?? createGame(props.config, 42);
  const sky = catalogById(
    skies,
    props.config.cosmetics.skyId ?? (map.environment === 'moonlight' ? 'astral' : 'daylight'),
  );
  const moon = sky.id === 'astral' || sky.id === 'dusk';

  return (
    <SceneBoundary onError={props.onReady}>
      <div className={`board-scene ${moon ? 'moon' : ''}`} data-ready={ready}>
        {!ready && <div className="scene-loading">{t('Đang đánh thức hòn đảo…')}</div>}
        <Canvas
          shadows
          frameloop="demand"
          dpr={[1, handheld ? 1.25 : 1.6]}
          camera={{ position: [0, 10.6, 15.2], fov: 39 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: handheld ? 'default' : 'high-performance',
          }}
        >
          <WorldVisualContext.Provider
            value={{
              skyId: sky.id,
              paused: !!props.paused,
              reducedMotion: !!props.reducedMotion,
              worldScale: boardLayout(props.config).worldScale,
            }}
          >
            <fog attach="fog" args={[sky.fog, 30, 74]} />
            <Suspense fallback={null}>
              <WorldEnvironment />
            </Suspense>
            <ambientLight intensity={moon ? 0.28 : 0.34} />
            <Environment
              resolution={64}
              environmentIntensity={0.48}
              backgroundIntensity={sky.id === 'astral' ? 0.04 : 0.85}
              backgroundBlurriness={0.02}
              backgroundRotation={[0, sky.id === 'sunset' ? -2.2 : 0, 0]}
            >
              <Lightformer
                form="rect"
                intensity={3.4}
                position={[0, 5, 0]}
                rotation={[Math.PI / 2, 0, 0]}
                scale={[10, 10, 1]}
              />
              <Lightformer
                intensity={2.4}
                color="#9ec5ff"
                position={[-5, 2, 0]}
                scale={[5, 5, 1]}
              />
            </Environment>
            <hemisphereLight args={[moon ? '#bdd2ff' : '#fff8eb', '#2a394f', 0.65]} />
            <directionalLight
              position={[4.5, 10.5, 5.2]}
              intensity={moon ? 2.1 : 2.5}
              color={sky.light}
              castShadow
              shadow-mapSize={handheld ? [1024, 1024] : [2048, 2048]}
              shadow-camera-left={-7.5}
              shadow-camera-right={7.5}
              shadow-camera-top={7.5}
              shadow-camera-bottom={-7.5}
              shadow-normalBias={0.022}
            />
            <directionalLight position={[-5, 3.5, -5]} intensity={1.05} color="#7fd2ff" />
            <Suspense fallback={null}>
              <Board {...props} game={preview} />
              <SceneReady
                onReady={() => {
                  setReady(true);
                  props.onReady?.();
                }}
              />
            </Suspense>
            <RenderMetrics />
            <RenderBudget
              key={JSON.stringify(props.config.cosmetics) + (props.config.board ?? 'classic')}
              active={!!props.visualEvent && !props.paused}
              eventId={props.visualEvent?.id}
              duration={props.visualEvent?.duration}
              paused={props.paused}
              handheld={handheld}
            />
            <FitViewport
              composition={props.composition}
              viewScale={
                (props.composition === 'welcome' ? 0.9 : 1) *
                (props.config.board === 'grand' ? 0.76 : 1) *
                (map.base === 'archipelago' ? 0.87 : 1)
              }
            />
            <Controls
              composition={props.composition}
              viewScale={
                (props.composition === 'welcome' ? 0.9 : 1) *
                (props.config.board === 'grand' ? 0.76 : 1) *
                (map.base === 'archipelago' ? 0.87 : 1)
              }
              resetKey={props.resetKey}
              enabled={props.cameraEnabled}
              zoomRequest={props.zoomRequest}
              twoFingerOnly={props.twoFingerOnly}
            />
          </WorldVisualContext.Provider>
        </Canvas>
        <div className="scene-vignette" />
      </div>
    </SceneBoundary>
  );
}
