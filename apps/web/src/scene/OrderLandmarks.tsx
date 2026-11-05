import { factionForBiome } from '@skyhoof/catalog';
import { corners } from './layout';
import { Foundation } from './Foundation';
import { footprintHeight } from './world-layout';
import { RockMaterial } from './FantasyWorld';
import { ModelAsset } from './ModelAsset';

const BANNER_MODELS = [
  '/assets/models/banner_green.glb',
  '/assets/models/banner_blue.glb',
  '/assets/models/banner_red.glb',
  '/assets/models/banner_yellow.glb',
];

export function OrderLandmarks({
  index,
  kind,
  sx,
  sz,
}: {
  index: number;
  kind: string;
  sx: number;
  sz: number;
}) {
  const id = kind === 'pine' ? 'forest' : kind === 'cactus' ? 'desert' : kind;
  const f = factionForBiome(id),
    [cx, cz] = corners[index];
  const x = 1.42 * sx,
    z = 1.35 * sz,
    y = footprintHeight(x, z, 0.36).max + 0.015;
  const bx = cx + sx * 0.88,
    bz = cz + sz * 0.18,
    by = 0.3;
  const snow = kind === 'snow';
  const lava = kind === 'volcano';
  const treatment = snow ? 'snow' : lava ? 'basalt' : undefined;

  return (
    <group>
      <Foundation x={x} z={z} radius={0.37} top={y} />
      {/* Open Sculpted Twin-Pillar Shrine Gateway */}
      <group position={[x, y, z]} rotation={[0, -sx * sz * 0.35, 0]}>
        <mesh position={[0, 0.03, 0]} receiveShadow>
          <cylinderGeometry args={[0.27, 0.3, 0.06, 24]} />
          <RockMaterial color={snow ? '#b5bfb9' : '#7d8171'} />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.2, 0.04, 0]}>
            <ModelAsset
              url="/assets/models/pillar_decorated.glb"
              width={0.16}
              height={0.54}
              treatment={treatment}
            />
            <group position={[0, 0.52, 0]}>
              <ModelAsset url="/assets/models/torch_lit.glb" width={0.1} height={0.2} />
            </group>
          </group>
        ))}
        <group position={[0, 0.44, 0]}>
          <ModelAsset url="/assets/models/sword_shield_gold.glb" width={0.22} height={0.24} />
        </group>
        <mesh position={[0, 0.32, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.15, 0.01, 8, 48]} />
          <meshStandardMaterial
            color={f.trim}
            emissive={f.magic}
            emissiveIntensity={0.55}
            metalness={0.8}
            roughness={0.28}
          />
        </mesh>
      </group>

      {/* Sculpted 3D Heraldic Standard & Brazier */}
      <group position={[bx, by, bz]} rotation={[0, sz < 0 ? 0 : Math.PI, 0]}>
        <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.14, 0.17, 0.04, 16]} />
          <RockMaterial color="#747a6e" />
        </mesh>
        <group position={[0, 0.03, 0]}>
          <ModelAsset url="/assets/models/pillar_decorated.glb" width={0.16} height={0.52} />
        </group>
        <group position={[0, 0.42, 0.05]}>
          <ModelAsset url={BANNER_MODELS[index % 4]} width={0.34} height={0.58} />
        </group>
        <group position={[0.14, 0.32, 0.06]}>
          <ModelAsset url="/assets/models/torch_lit.glb" width={0.12} height={0.26} />
        </group>
      </group>
    </group>
  );
}
