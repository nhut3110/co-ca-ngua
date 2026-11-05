import { useEffect, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, Vector2 } from 'three';

const surface = (kind: string) =>
  kind === 'snow'
    ? 'snow'
    : kind === 'volcano'
      ? 'volcanic'
      : ['celestial', 'sakura', 'cactus', 'mushroom', 'ruins'].includes(kind)
        ? 'meadow'
        : 'forest';

export function TerrainMaterial({ kinds }: { kinds: string[] }) {
  const { gl } = useThree();
  const names = kinds.map(surface);
  const textures = useTexture(
    names.flatMap((n) =>
      ['color', 'normal', 'roughness'].map((t) => `/assets/textures/${n}-${t}.webp`),
    ),
  );
  const cliff = useTexture('/assets/textures/rock-color.jpg');

  const tint = (i: number) => {
    const c = `texture2D(terrain${i}_0,uv).rgb`;
    const palette: Record<string, string> = {
      pine: 'vec3(.22,.39,.18)',
      snow: 'vec3(.72,.85,.92)',
      cactus: 'vec3(.74,.56,.32)',
      sakura: 'vec3(.45,.48,.29)',
      volcano: 'vec3(.14,.09,.10)',
      celestial: 'vec3(.62,.57,.38)',
      mushroom: 'vec3(.13,.32,.29)',
      ruins: 'vec3(.34,.45,.28)',
    };
    return `mix(${palette[kinds[i]] ?? palette.pine},${c},.34)`;
  };

  const material = useMemo(() => {
    textures.forEach((t, i) => {
      t.wrapS = t.wrapT = RepeatWrapping;
      t.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
      if (i % 3 === 0) t.colorSpace = SRGBColorSpace;
    });
    cliff.wrapS = cliff.wrapT = RepeatWrapping;
    cliff.colorSpace = SRGBColorSpace;
    cliff.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    const m = new MeshStandardMaterial({
      roughness: 0.88,
      normalMap: textures[1],
      normalScale: new Vector2(0.28, 0.28),
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.cliffTex = { value: cliff };
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 3; j++)
          shader.uniforms[`terrain${i}_${j}`] = { value: textures[i * 3 + j] };
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          '#include <common>\nvarying vec3 vTerrain; varying vec3 vTerrainNormal;',
        )
        .replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\nvTerrain=position; vTerrainNormal=normal;',
        );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
        varying vec3 vTerrain; varying vec3 vTerrainNormal; uniform sampler2D cliffTex;
        ${Array.from({ length: 4 }, (_, i) => Array.from({ length: 3 }, (_, j) => `uniform sampler2D terrain${i}_${j};`).join('\n')).join('\n')}
        vec4 biomeWeights(){
          float x=smoothstep(-.28,.28,vTerrain.x+.09*sin(vTerrain.z*3.));
          float z=smoothstep(-.28,.28,vTerrain.z+.09*sin(vTerrain.x*3.));
          return vec4((1.-x)*z,(1.-x)*(1.-z),x*(1.-z),x*z);
        }
        vec3 terrainSample(int channel){
          vec2 uv=vTerrain.xz*.8;
          vec4 w=biomeWeights();
          if(channel==0)return ${Array.from({ length: 4 }, (_, i) => `${tint(i)}*w.${'xyzw'[i]}`).join('+')};
          if(channel==1)return ${Array.from({ length: 4 }, (_, i) => `texture2D(terrain${i}_1,uv).rgb*w.${'xyzw'[i]}`).join('+')};
          return ${Array.from({ length: 4 }, (_, i) => `texture2D(terrain${i}_2,uv).rgb*w.${'xyzw'[i]}`).join('+')};
        }
      `,
      );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <map_fragment>',
          `
          vec3 cliffW=pow(abs(normalize(vTerrainNormal)),vec3(4.));cliffW/=cliffW.x+cliffW.y+cliffW.z;
          vec3 cliffColor=texture2D(cliffTex,vTerrain.yz*1.2).rgb*cliffW.x+texture2D(cliffTex,vTerrain.xz*1.2).rgb*cliffW.y+texture2D(cliffTex,vTerrain.xy*1.2).rgb*cliffW.z;
          vec4 bw=biomeWeights();
          float snowWeight=${kinds.map((k, i) => (k === 'snow' ? `bw.${'xyzw'[i]}` : '0.')).join('+')};
          float volcanicWeight=${kinds.map((k, i) => (k === 'volcano' ? `bw.${'xyzw'[i]}` : '0.')).join('+')};
          float rockLuma=dot(cliffColor,vec3(.2126,.7152,.0722));
          cliffColor=mix(vec3(rockLuma)*vec3(.76,.74,.68),vec3(rockLuma)*vec3(.98,1.08,1.18)+.11,snowWeight);
          cliffColor=mix(cliffColor,vec3(rockLuma)*vec3(.34,.27,.29),volcanicWeight);
          float slope=smoothstep(.26,.66,1.-abs(normalize(vTerrainNormal).y));
          vec3 ground=terrainSample(0);
          float centerGlow=exp(-dot(vTerrain.xz,vTerrain.xz)*.16)*.08;
          ground += vec3(centerGlow*1.1, centerGlow*.95, centerGlow*.6);

          diffuseColor.rgb *= mix(ground,cliffColor,slope*.88);
        `,
        )
        .replace(
          '#include <roughnessmap_fragment>',
          'float roughnessFactor = clamp(terrainSample(2).r,.42,.95);',
        )
        .replace(
          '#include <normal_fragment_maps>',
          `vec3 mapN=terrainSample(1)*2.-1.;mapN.xy*=normalScale * (1.-smoothstep(5.,19.,length(vViewPosition))*.8);normal=normalize(tbn*mapN);`,
        );
    };
    m.customProgramCacheKey = () => `terrain-arcane-pbr-${kinds.join('-')}`;
    return m;
  }, [textures, cliff, gl, names.join(','), kinds.join(',')]);
  useEffect(() => () => material.dispose(), [material]);
  return <primitive object={material} attach="material" />;
}
