import { useThree } from '@react-three/fiber';
import { Mesh, MeshPhysicalMaterial, Vector3 } from 'three';
import { useEffect } from 'react';
export function RenderMetrics() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const previous = scene.onAfterRender;
    let frames = 0,
      elapsed = performance.now(),
      renders = 0;
    scene.onAfterRender = (...args) => {
      previous.apply(scene, args);
      frames++;
      renders++;
      const now = performance.now();
      if (now - elapsed < 1000 && renders > 1) return;
      const fps = Math.round((frames * 1000) / Math.max(1, now - elapsed));
      const fpsLabel = gl.domElement.closest('.game-layout')?.querySelector('[data-fps]');
      if (fpsLabel) fpsLabel.textContent = String(fps);
      let meshes = 0;
      const pieces: { id: string; active: boolean; x: number; y: number }[] = [];
      const rect = gl.domElement.getBoundingClientRect();
      scene.traverseVisible((o) => {
        if (o.userData.horseId) {
          const point = o.getWorldPosition(new Vector3());
          point.y += 0.25;
          point.project(args[2]);
          pieces.push({
            id: o.userData.horseId,
            active: o.userData.active,
            x: rect.x + ((point.x + 1) * rect.width) / 2,
            y: rect.y + ((1 - point.y) * rect.height) / 2,
          });
        }
        if ('isMesh' in o) meshes++;
      });
      const relic = scene.getObjectByName('die');
      if (relic) {
        const point = relic.getWorldPosition(new Vector3()).project(args[2]);
        const body = relic.getObjectByName('relic-body') as Mesh | undefined;
        gl.domElement.closest<HTMLElement>('.board-scene')!.dataset.die = JSON.stringify({
          x: rect.x + ((point.x + 1) * rect.width) / 2,
          y: rect.y + ((1 - point.y) * rect.height) / 2,
          canRoll: relic.userData.canRoll,
          glow: (body?.material as MeshPhysicalMaterial | undefined)?.emissiveIntensity,
          scale: relic.scale.x,
        });
      }
      gl.domElement.closest<HTMLElement>('.board-scene')!.dataset.pieces = JSON.stringify(pieces);
      gl.domElement.closest<HTMLElement>('.board-scene')!.dataset.render = JSON.stringify({
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
        meshes,
        fps,
        dpr: gl.getPixelRatio(),
        renders,
        shadowAutoUpdate: gl.shadowMap.autoUpdate,
      });
      elapsed = now;
      frames = 0;
    };
    return () => {
      scene.onAfterRender = previous;
    };
  }, [gl, scene]);
  return null;
}
