import { colors } from './layout';
import { RockMaterial } from './FantasyWorld';
import { Foundation } from './Foundation';
import { footprintHeight } from './world-layout';
import { ModelAsset } from './ModelAsset';

/** Four border shrines mark the meeting of neighboring realms, outside every playable lane. */
export const crossroadsSites = (grand = false) =>
  Array.from({ length: 4 }, (_, q) => {
    const a = (q * Math.PI) / 2;
    return [Math.sin(a) * (grand ? 1.35 : 4.45), Math.cos(a) * (grand ? 1.35 : 4.45)] as [
      number,
      number,
    ];
  });

export function Crossroads({ grand = false }: { grand?: boolean }) {
  return (
    <group name="four-border-shrines">
      {crossroadsSites(grand).map(([x, z], q) => {
        const y = footprintHeight(x, z, 0.29).max + 0.025;
        return (
          <group key={q}>
            <Foundation x={x} z={z} radius={0.3} top={y} />
            <group position={[x, y, z]} rotation={[0, (q * Math.PI) / 2, 0]}>
              <mesh receiveShadow>
                <cylinderGeometry args={[0.27, 0.29, 0.045, 32]} />
                <RockMaterial color="#767c76" />
              </mesh>
              <mesh position={[0, 0.028, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.2, 0.215, 48]} />
                <meshStandardMaterial color="#c2a570" metalness={0.7} />
              </mesh>
              {[-1, 1].map((s, i) => (
                <group key={s} position={[s * 0.16, 0.02, 0]}>
                  <ModelAsset
                    url="/assets/models/pillar_decorated.glb"
                    width={0.14}
                    height={0.38}
                  />
                  <group position={[0, 0.36, 0]}>
                    <ModelAsset url="/assets/models/torch_lit.glb" width={0.1} height={0.2} />
                  </group>
                  <mesh position={[0, 0.42, 0]}>
                    <sphereGeometry args={[0.032, 16, 12]} />
                    <meshStandardMaterial
                      color={colors[(q + i) % 4]}
                      emissive={colors[(q + i) % 4]}
                      emissiveIntensity={1.4}
                    />
                  </mesh>
                </group>
              ))}
              <group position={[0, 0.08, 0]}>
                <ModelAsset url="/assets/models/sword_shield_gold.glb" width={0.22} height={0.26} />
              </group>
            </group>
          </group>
        );
      })}
    </group>
  );
}
