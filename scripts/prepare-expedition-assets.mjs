import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, textureCompress, meshopt } from '@gltf-transform/functions';
import { readFile, mkdir, copyFile } from 'node:fs/promises';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { FloatType } from 'three';
import sharp from 'sharp';
import { MeshoptEncoder } from 'meshoptimizer';
await MeshoptEncoder.ready;
const source = '/private/tmp/skyhoof-expedition',
  dest = 'apps/web/public/assets';
await mkdir(`${dest}/portraits`, { recursive: true });
await mkdir(`${dest}/skies`, { recursive: true });
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
for (const name of [
  'Knight',
  'Mage',
  'Barbarian',
  'Rogue',
  'Rogue_Hooded',
  'Skeleton_Mage',
  'Skeleton_Minion',
  'Skeleton_Rogue',
  'Skeleton_Warrior',
]) {
  const doc = await io.read(`${source}/${name}.glb`);
  doc
    .getRoot()
    .listAnimations()
    .filter((a) => !['Idle', 'Walking_A', 'Running_A'].includes(a.getName()))
    .forEach((a) => a.dispose());
  await doc.transform(
    dedup(),
    prune(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [512, 512], quality: 90 }),
    meshopt({ encoder: MeshoptEncoder, level: 'high' }),
  );
  await io.write(`${dest}/models/${name}.glb`, doc);
  console.log(
    name,
    doc
      .getRoot()
      .listAnimations()
      .map((a) => a.getName()),
  );
  // Generate single-character portraits with render-recruit-portraits.mjs after build.
}
for (const name of [
  'kloofendal_48d_partly_cloudy_puresky',
  'qwantani_sunset_puresky',
  'qwantani_dusk_2_puresky',
]) {
  const buffer = await readFile(`${source}/${name}.hdr`);
  const parsed = new RGBELoader()
    .setDataType(FloatType)
    .parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
  const pixels = Buffer.alloc(parsed.width * parsed.height * 3);
  for (let i = 0; i < parsed.width * parsed.height; i++)
    for (let j = 0; j < 3; j++) {
      const c = parsed.data[i * 4 + j] * 0.8;
      pixels[i * 3 + j] = Math.round(Math.pow(c / (1 + c), 1 / 2.2) * 255);
    }
  await sharp(pixels, { raw: { width: parsed.width, height: parsed.height, channels: 3 } })
    .flip()
    .jpeg({ quality: 88 })
    .toFile(`${dest}/skies/${name}.jpg`);
}
await sharp(`${source}/waternormals.jpg`)
  .resize(1024, 1024)
  .webp({ quality: 94 })
  .toFile(`${dest}/textures/water-normal.webp`);
await mkdir(`${dest}/licenses`, { recursive: true });
for (const name of ['KayKit-Character-Pack-Adventures-1.0', 'KayKit-Character-Pack-Skeletons-1.0'])
  await copyFile(`${source}/${name}-LICENSE.txt`, `${dest}/licenses/${name}.txt`);
