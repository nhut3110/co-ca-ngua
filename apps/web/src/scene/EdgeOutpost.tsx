import { terrainHeight, footprintHeight } from './world-layout';
import { Foundation } from './Foundation';
import { RockMaterial } from './FantasyWorld';
import { ModelAsset } from './ModelAsset';

/** A sculpted provision camp on the quiet shoreline strip, outside the tile and water lanes. */
export function EdgeOutpost({ sx, sz, kind }: { sx: number; sz: number; kind: string }) {
  const x = 4.47 * sx,
    z = 0.38 * sz,
    top = footprintHeight(x, z, 0.31).max + 0.025;
  const snow = kind === 'snow';
  const treatment = snow ? 'snow' : kind === 'volcano' ? 'basalt' : undefined;

  return (
    <group name="shore-provision-camp">
      <Foundation x={x} z={z} radius={0.32} top={top} />
      <group position={[x, top, z]} rotation={[0, sx * sz * 0.28, 0]}>
        <mesh position={[0, 0.02, 0]} receiveShadow>
          <cylinderGeometry args={[0.29, 0.31, 0.04, 24]} />
          <RockMaterial color={snow ? '#b7c8ca' : '#858674'} />
        </mesh>
        <group position={[-0.08, 0.03, -0.04]}>
          <ModelAsset
            url="/assets/models/crates_stacked.glb"
            width={0.34}
            height={0.32}
            treatment={treatment}
          />
        </group>
        <group position={[0.16, 0.03, 0.11]}>
          <ModelAsset
            url="/assets/models/barrel_large_decorated.glb"
            width={0.19}
            height={0.24}
            treatment={treatment}
          />
        </group>
        <group position={[0.12, 0.03, -0.12]} rotation={[0, -0.5, 0]}>
          <ModelAsset url="/assets/models/chest_gold.glb" width={0.2} height={0.17} />
        </group>
        <group position={[-0.2, 0.03, 0.14]}>
          <ModelAsset url="/assets/models/torch_lit.glb" width={0.12} height={0.28} />
        </group>
      </group>
      {[0, 1, 2].map((i) => {
        const px = (4.05 + i * 0.12) * sx,
          pz = 0.38 * sz;
        return (
          <mesh
            key={i}
            position={[px, terrainHeight(px, pz) + 0.02, pz]}
            rotation={[0, i * 0.2, 0]}
            receiveShadow
          >
            <boxGeometry args={[0.11, 0.035, 0.16]} />
            <RockMaterial color="#92947e" />
          </mesh>
        );
      })}
    </group>
  );
}
