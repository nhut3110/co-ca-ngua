import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useWorldVisual } from './WorldEnvironment';
import { DoubleSide, ShaderMaterial } from 'three';
export function LavaMaterial() {
  const { paused, reducedMotion } = useWorldVisual();
  const ref = useRef<ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ time: { value: 0 } }), []);
  useFrame((_, dt) => {
    if (ref.current && !paused && !reducedMotion) ref.current.uniforms.time.value += dt;
  });
  return (
    <shaderMaterial
      ref={ref}
      side={DoubleSide}
      uniforms={uniforms}
      vertexShader={`varying vec2 vLavaUv;void main(){vLavaUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
      fragmentShader={`
      varying vec2 vLavaUv;uniform float time;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      float fbm(vec2 p){return noise(p)*.6+noise(p*2.1)*.27+noise(p*4.2)*.13;}
      void main(){
        vec2 uv=vLavaUv*5.;uv.y-=time*.12;
        float crust=smoothstep(.012,.065,abs(fbm(uv+vec2(fbm(uv*.6),0))-.48));
        vec3 hot=mix(vec3(.85,.09,.015),vec3(1.6,.36,.035),noise(uv*2.+time*.1));
        float fine=mix(noise(uv*3.),.5,clamp(length(fwidth(uv*3.)),0.,1.));
        vec3 cold=vec3(.11,.035,.025)*(1.+fine*.3);
        gl_FragColor=vec4(mix(hot,cold,crust),1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`}
    />
  );
}
