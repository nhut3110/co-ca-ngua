import { useEffect, useMemo, useRef } from 'react';
import { useTexture } from '@react-three/drei';
import { useWorldVisual } from './WorldEnvironment';
import { catalogById, skies } from '@skyhoof/catalog';
import { useFrame } from '@react-three/fiber';
import {
  BufferGeometry,
  CatmullRomCurve3,
  Float32BufferAttribute,
  ShaderMaterial,
  DoubleSide,
  Vector3,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import { LAKE, STREAM_COURSE, OUTLET_COURSE } from './landscape';
import { streamSurface, boundaryRadius } from './world-layout';
import { outletGeometry } from './water-geometry';
import { LavaMaterial } from './LavaMaterial';

export function FlowMaterial({ ice = false, flow = false }: { ice?: boolean; flow?: boolean }) {
  const { skyId, paused, reducedMotion } = useWorldVisual();
  const [normalMap, skyMap] = useTexture([
    '/assets/textures/water-normal.webp',
    catalogById(skies, skyId).image,
  ]);
  normalMap.wrapS = normalMap.wrapT = RepeatWrapping;
  skyMap.colorSpace = SRGBColorSpace;
  const ref = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      ice: { value: ice ? 1 : 0 },
      flow: { value: flow ? 1 : 0 },
      normalMap: { value: normalMap },
      skyMap: { value: skyMap },
    }),
    [ice, flow, normalMap, skyMap],
  );
  useFrame((_, dt) => {
    if (ref.current && !paused && !reducedMotion) ref.current.uniforms.time.value += dt;
  });
  return (
    <shaderMaterial
      ref={ref}
      uniforms={uniforms}
      side={DoubleSide}
      transparent
      depthWrite={false}
      polygonOffset
      polygonOffsetFactor={-1}
      polygonOffsetUnits={-1}
      vertexShader={`varying vec2 v;varying vec3 world;varying vec3 surfaceNormal;
    void main(){v=uv;world=(modelMatrix*vec4(position,1.)).xyz;surfaceNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}`}
      fragmentShader={`varying vec2 v;varying vec3 world;varying vec3 surfaceNormal;
    uniform float time;uniform float ice;uniform float flow;uniform sampler2D normalMap;uniform sampler2D skyMap;
    vec3 sky(vec3 r){vec2 uv=vec2(atan(r.z,r.x)*.15915494+.5,asin(clamp(r.y,-1.,1.))*.31830989+.5);return texture2D(skyMap,uv).rgb;}
    void main(){
      float t=time*(1.-ice*.65);
      vec2 uv=mix(world.xz*.9,vec2(v.x*1.5,v.y*2.2),flow);
      vec3 a=texture2D(normalMap,uv+vec2(t*.055,-t*.3)).xyz*2.-1.;
      vec3 b=texture2D(normalMap,uv*1.37+vec2(-t*.04,-t*.19)).xyz*2.-1.;
      vec3 base=normalize(surfaceNormal);if(!gl_FrontFacing)base=-base;
      vec3 axis=abs(base.y)>.9?vec3(0.,0.,1.):vec3(0.,1.,0.);
      vec3 tangent=normalize(cross(axis,base));
      vec3 binormal=normalize(cross(base,tangent));
      vec3 n=normalize(base+(tangent*(a.x+b.x)+binormal*(a.y+b.y))*.23);
      vec3 eye=normalize(cameraPosition-world);
      float fresnel=.18+.6*pow(1.-max(dot(n,eye),0.),3.);
      vec3 water=mix(vec3(.035,.19,.18),vec3(.18,.3,.34),ice);
      vec3 c=mix(water,sky(reflect(-eye,n)),fresnel*.75);
      float spec=pow(max(dot(n,normalize(eye+normalize(vec3(4.,10.,5.)))),0.),64.);
      float fall=1.-smoothstep(.15,.75,abs(base.y));
      float bank=pow(abs(v.x-.5)*2.,14.)*flow;
      // Two independently advected normal textures break up foam without periodic stripes.
      float filaments=smoothstep(.34,.78,a.y*.55+b.x*.45);
      float foam=flow*(bank*.16+fall*(.08+filaments*.3));
      c=mix(c,vec3(.49,.65,.63),foam*(1.-ice));c+=spec*.18;
      float edge=mix(1.,smoothstep(0.,.065,v.x)*smoothstep(0.,.065,1.-v.x),flow);
      gl_FragColor=vec4(c,edge*mix(.96,.78,fall)*mix(1.,smoothstep(-2.18,-1.65,world.y),fall));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`}
    />
  );
}

function Ribbon({
  sx,
  sz,
  outlet,
  lava,
  ice,
}: {
  sx: number;
  sz: number;
  outlet?: boolean;
  lava: boolean;
  ice: boolean;
}) {
  const { worldScale } = useWorldVisual();
  const geometry = useMemo(() => {
    if (outlet) return outletGeometry(sx, sz, worldScale);
    const points = (outlet ? OUTLET_COURSE : STREAM_COURSE).map(
      ([x, z]) => new Vector3(x * sx, 0, z * sz),
    );
    const curve = new CatmullRomCurve3(points),
      p: number[] = [],
      uv: number[] = [],
      ix: number[] = [];
    for (let i = 0; i <= 160; i++) {
      const t = i / 160,
        c = curve.getPoint(t),
        tangent = curve.getTangent(t);
      const width = outlet ? 0.255 + 0.012 * Math.sin(t * 17) : 0.145 + 0.008 * Math.sin(t * 11);
      const y = outlet ? LAKE.level : streamSurface(c.x, c.z);
      for (const s of [-1, 1]) {
        let x = c.x - tangent.z * width * s,
          z = c.z + tangent.x * width * s;
        const radius = Math.hypot(x, z),
          edge = boundaryRadius(Math.atan2(z, x)) - 0.018;
        if (radius > edge) {
          x *= edge / radius;
          z *= edge / radius;
        }
        p.push(x, y, z);
        uv.push((s + 1) / 2, t);
      }
      if (i < 160) {
        const j = i * 2;
        ix.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
      }
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(p, 3));
    g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    g.setIndex(ix);
    g.computeVertexNormals();
    return g;
  }, [sx, sz, outlet, worldScale]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} name={outlet ? 'water-outlet' : 'mountain-stream'}>
      {lava ? <LavaMaterial /> : <FlowMaterial ice={ice} flow />}
    </mesh>
  );
}
export function Watershed({ sx, sz, kind }: { sx: number; sz: number; kind: string }) {
  return (
    <group>
      <mesh
        position={[
          sx * STREAM_COURSE[0][0],
          streamSurface(...STREAM_COURSE[0]),
          sz * STREAM_COURSE[0][1],
        ]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[0.17, 48]} />
        {kind === 'volcano' ? <LavaMaterial /> : <FlowMaterial ice={kind === 'snow'} />}
      </mesh>
      <Ribbon sx={sx} sz={sz} lava={kind === 'volcano'} ice={kind === 'snow'} />
      <Ribbon sx={sx} sz={sz} outlet lava={kind === 'volcano'} ice={kind === 'snow'} />
    </group>
  );
}
