import { build } from 'esbuild';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const code = `import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setSize(320,400);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;document.body.replaceChildren(renderer.domElement);document.body.style.margin='0';document.body.style.background='transparent';
const scene=new THREE.Scene();const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;
scene.environmentIntensity=.45;scene.add(new THREE.HemisphereLight(0xe3efff,0x433d35,.72));const key=new THREE.DirectionalLight(0xffefd3,2.0);key.position.set(3,5,4);scene.add(key);const rim=new THREE.DirectionalLight(0x91bdf0,.95);rim.position.set(-3,2,-2);scene.add(rim);
const camera=new THREE.PerspectiveCamera(32,.8,.1,50);camera.position.set(1.8,1.35,3.8);camera.lookAt(0,.8,0);
const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);let previous;
window.renderPortrait=async(name)=>{if(previous){scene.remove(previous);previous.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}})}
const gltf=await loader.loadAsync('/assets/models/'+name+'.glb');const model=gltf.scene;const idle=gltf.animations.find(a=>a.name==='Idle');if(idle){const mixer=new THREE.AnimationMixer(model);mixer.clipAction(idle).play();mixer.update(.05);}
model.updateMatrixWorld(true);model.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();o.computeBoundingSphere();}});
const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
const holder=new THREE.Group(),scale=1.5/size.y;model.scale.multiplyScalar(scale);model.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);holder.add(model);scene.add(holder);previous=holder;renderer.render(scene,camera);await new Promise(requestAnimationFrame);renderer.render(scene,camera);return {name,width:size.x,height:size.y};};`;

const bundled = await build({
  stdin: { contents: code, resolveDir: process.cwd() },
  bundle: true,
  format: 'iife',
  write: false,
});

const mimeTypes = {
  '.glb': 'model/gltf-binary',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  if (url.pathname === '/portrait-render') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<!doctype html><html><body></body></html>');
    return;
  }
  try {
    const filePath = join(process.cwd(), 'apps/web/public', url.pathname);
    const data = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': mimeTypes[extname(filePath)] ?? 'application/octet-stream',
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end();
  }
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({ viewport: { width: 320, height: 400 } });
  page.on('pageerror', (e) => console.error(e));
  await page.goto(`http://127.0.0.1:${port}/portrait-render`);
  await page.addScriptTag({ content: bundled.outputFiles[0].text });
  for (const name of [
    'chess-knight',
    'horse-standing',
    'Knight',
    'Mage',
    'Barbarian',
    'Rogue',
    'Rogue_Hooded',
    'Skeleton_Mage',
    'Skeleton_Minion',
    'Skeleton_Rogue',
    'Skeleton_Warrior',
    'Paladin',
    'Druid',
    'FrostGolem',
    'Werewolf_Wolf',
    'Witch',
    'Tiefling',
    'Necromancer',
    'Skeleton_Golem',
    'BlackKnight',
    'horse_statue_01',
  ]) {
    console.log(await page.evaluate((n) => window.renderPortrait(n), name));
    const buffer = await page.screenshot({ omitBackground: true });
    await sharp(buffer)
      .trim()
      .resize(240, 300, { fit: 'contain', background: '#00000000' })
      .webp({ quality: 92 })
      .toFile('apps/web/public/assets/portraits/' + name + '.webp');
  }
} finally {
  await browser.close();
  server.close();
}
