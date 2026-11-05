import type { MapDefinition } from '@skyhoof/catalog';
import { IslandBase } from './IslandBase';
import { useEffect, useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute, Color } from 'three';
import { boundaryRadius, quadrant, terrainHeight, grandTerrainHeight } from './world-layout';
import { TerrainMaterial } from './TerrainMaterial';
import { RockMaterial } from './FantasyWorld';

const palettes: Record<string, [string, string]> = {
  pine: ['#5e8a45', '#828b68'],
  snow: ['#d2ecf2', '#82a7ba'],
  volcano: ['#4c3b44', '#8f5d56'],
  celestial: ['#dcd4b4', '#b0ad92'],
  sakura: ['#829964', '#b5b298'],
  cactus: ['#ccb286', '#e6d3a3'],
  mushroom: ['#47827b', '#6da89e'],
  ruins: ['#7d9674', '#a8b08e'],
};

export function makeTerrain(
  kinds: string[],
  side = false,
  base: MapDefinition['base'] = 'crag',
  grand = false,
) {
  const height = grand ? grandTerrainHeight : terrainHeight;
  const segments = 256,
    rings = side ? 24 : 96,
    vertices: number[] = [],
    colors: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  for (let r = 0; r <= rings; r++)
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2,
        edge = boundaryRadius(a) * (grand ? 1.35 : 1);
      const depth = r / rings;
      const f = side
        ? base === 'citadel'
          ? 1 - depth * 0.18
          : base === 'crystal'
            ? 1 - depth * 0.62
            : 1 - Math.min(depth, 0.45) * 0.16 - Math.max(0, depth - 0.45) * 0.86
        : depth;
      let x = Math.cos(a) * edge * f,
        z = Math.sin(a) * edge * f;
      const y = side
        ? height(Math.cos(a) * edge, Math.sin(a) * edge) -
          Math.pow(r / rings, 1.12) *
            (base === 'citadel' ? 1.35 : base === 'archipelago' ? 1.95 : 2.75) +
          Math.sin(a * 9 + r * 0.35) * 0.065 * (r / rings)
        : height(x, z);
      if (side) {
        const dent = 1 + 0.018 * (Math.sin(a * 7 + r * 0.32) + 0.5 * Math.cos(a * 13 - r * 0.18));
        if (r > 0) {
          const outletClearance = Math.exp(-Math.pow((Math.abs(z) - 1.05) / 0.4, 6));
          x *= dent;
          x -= Math.sign(x) * 0.32 * outletClearance * Math.min(1, r / 2);
          z *= dent;
        }
      }
      vertices.push(x, y, z);
      uvs.push(x * 0.35, z * 0.35 + (side ? r * 0.11 : 0));
      const palette = palettes[kinds[quadrant(x, z)]] ?? palettes.pine;
      const c = new Color(side ? '#747c7b' : palette[0]);
      if (!side) {
        if (Math.abs(x) < 0.55)
          c.lerp(
            new Color((palettes[kinds[quadrant(-x, z)]] ?? palettes.pine)[0]),
            0.5 * (1 - Math.abs(x) / 0.55),
          );
        if (Math.abs(z) < 0.55)
          c.lerp(
            new Color((palettes[kinds[quadrant(x, -z)]] ?? palettes.pine)[0]),
            0.5 * (1 - Math.abs(z) / 0.55),
          );
        c.lerp(
          new Color(palette[1]),
          Math.max(0, Math.min(1, y * 1.2 + 0.15 * Math.sin(x * 11) * Math.sin(z * 8))),
        );
      } else c.multiplyScalar(0.82 + 0.16 * Math.sin(r * 1.2 + i * 0.25));
      colors.push(c.r, c.g, c.b);
      if (r < rings && i < segments) {
        const p = r * (segments + 1) + i,
          q = p + segments + 1;
        indices.push(p, p + 1, q, p + 1, q + 1, q);
      }
    }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute(
    'normal',
    new Float32BufferAttribute(
      vertices.map(() => 0),
      3,
    ),
  );
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function Terrain({
  kinds,
  base = 'crag',
  grand = false,
}: {
  kinds: string[];
  grand?: boolean;
  base?: MapDefinition['base'];
}) {
  const top = useMemo(() => makeTerrain(kinds, false, base, grand), [kinds.join(','), grand]),
    sides = useMemo(() => makeTerrain(kinds, true, base, grand), [kinds.join(','), base, grand]);
  useEffect(
    () => () => {
      top.dispose();
      sides.dispose();
    },
    [top, sides],
  );
  return (
    <group>
      <mesh geometry={top} receiveShadow>
        <TerrainMaterial kinds={kinds} />
      </mesh>
      <mesh geometry={sides} castShadow receiveShadow>
        <RockMaterial vertexColors />
      </mesh>
      <group scale={[grand ? 1.35 : 1, 1, grand ? 1.35 : 1]}>
        <IslandBase kind={base} />
      </group>
    </group>
  );
}
