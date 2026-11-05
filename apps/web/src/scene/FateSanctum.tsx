import { RockMaterial } from './FantasyWorld';
import { ModelAsset } from './ModelAsset';
import { StaticBatch } from './StaticBatch';
/** Four stone buttresses frame a suspended relic; the narrow foot clears the home lanes. */
export function FateSanctum() {
  return (
    <StaticBatch>
      <group name="fate-sanctum" raycast={() => null}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, 0.035 + i * 0.055, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.33 - i * 0.035, 0.065, 0.33 - i * 0.035]} />
            <RockMaterial color="#667076" />
          </mesh>
        ))}
        <mesh position={[0, 0.65, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.105, 0.16, 1.05, 4]} />
          <RockMaterial color="#525d65" />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <group key={i} rotation={[0, (i * Math.PI) / 2, 0]}>
            <group position={[0, 0.16, 0.105]}>
              <ModelAsset url="/assets/models/pillar_decorated.glb" width={0.12} height={0.88} />
            </group>
            <group position={[0, 0.68, 0.145]}>
              <ModelAsset url="/assets/models/sword_shield_gold.glb" width={0.19} height={0.22} />
            </group>
            <mesh position={[0, 0.7, 0.15]}>
              <boxGeometry args={[0.012, 0.5, 0.008]} />
              <meshStandardMaterial color="#b8c9bb" emissive="#7ab8b5" emissiveIntensity={0.55} />
            </mesh>
            <mesh position={[0, 1.14, 0.12]} rotation={[0.24, 0, 0]} castShadow>
              <boxGeometry args={[0.075, 0.36, 0.09]} />
              <RockMaterial color="#727b7b" />
            </mesh>
            <mesh position={[0, 1.47, 0.41]} rotation={[-0.12, 0, 0]} castShadow>
              <cylinderGeometry args={[0.012, 0.065, 0.48, 4]} />
              <RockMaterial color="#626f76" />
            </mesh>
            {[0.27, 0.98, 1.1].map((y) => (
              <mesh key={y} position={[0, y, 0.13]}>
                <boxGeometry args={[0.08, 0.025, 0.08]} />
                <meshStandardMaterial color="#998963" metalness={0.65} roughness={0.55} />
              </mesh>
            ))}
          </group>
        ))}
        <mesh position={[0, 1.18, 0]}>
          <cylinderGeometry args={[0.14, 0.14, 0.035, 8]} />
          <meshStandardMaterial color="#748c89" metalness={0.65} roughness={0.4} />
        </mesh>
      </group>
    </StaticBatch>
  );
}
