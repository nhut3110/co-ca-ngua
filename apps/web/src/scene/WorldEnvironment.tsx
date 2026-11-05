import { createContext, useContext, useEffect, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import {
  BufferGeometry,
  EquirectangularReflectionMapping,
  Float32BufferAttribute,
  SRGBColorSpace,
} from 'three';
import { catalogById, skies } from '@skyhoof/catalog';
export const WorldVisualContext = createContext({
  skyId: 'daylight',
  worldScale: 1,
  paused: false,
  reducedMotion: false,
});
export const useWorldVisual = () => useContext(WorldVisualContext);
export function WorldEnvironment() {
  const { skyId } = useWorldVisual(),
    { scene } = useThree();
  const sky = catalogById(skies, skyId),
    texture = useTexture(sky.image);
  const stars = useMemo(() => {
    const p = [];
    for (let i = 0; i < 1100; i++) {
      const a = i * 2.399,
        y = -0.94 + (((i * 71) % 997) / 997) * 1.88,
        r = Math.sqrt(1 - y * y) * 42;
      p.push(Math.cos(a) * r, y * 42, Math.sin(a) * r);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(p, 3));
    return g;
  }, []);
  useEffect(() => () => stars.dispose(), [stars]);
  useEffect(() => {
    texture.mapping = EquirectangularReflectionMapping;
    texture.colorSpace = SRGBColorSpace;
    const old = scene.background;
    scene.background = texture;
    scene.backgroundIntensity = skyId === 'astral' ? 0.025 : 0.8;
    scene.backgroundBlurriness = 0.025;
    return () => {
      scene.background = old;
      scene.backgroundIntensity = 1;
    };
  }, [scene, texture, skyId]);
  return skyId === 'astral' ? (
    <group>
      <points geometry={stars}>
        <pointsMaterial size={0.1} sizeAttenuation color="#e3e6ff" fog={false} toneMapped={false} />
      </points>
      <mesh position={[-13, -7, -26]}>
        <sphereGeometry args={[1, 32, 20]} />
        <meshBasicMaterial color="#eee3b6" fog={false} />
      </mesh>
    </group>
  ) : null;
}
