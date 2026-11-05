// Source downloads and CC0 attribution: docs/assets.md. Run after downloading to the source directory.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, simplify, textureCompress, meshopt } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { readdir, stat } from 'node:fs/promises';
const source = process.env.SKYHOOF_ASSET_SOURCE ?? '/private/tmp/skyhoof-detail';
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
await Promise.all([MeshoptSimplifier.ready, MeshoptEncoder.ready]);
for (const [name, ratio] of [
  ['tree_small_02', 0.045],
  ['pine_sapling_small', 0.28],
  ['fern_02', 1],
  ['rock_moss_set_02', 1],
]) {
  const doc = await io.read(`${source}/${name}/source.gltf`);
  if (name === 'pine_sapling_small') {
    const nodes = doc.getRoot().listNodes();
    nodes.filter((n) => n.getName() !== 'pine_sapling_small_b').forEach((n) => n.dispose());
  }
  await doc.transform(
    dedup(),
    prune(),
    weld(),
    ...(ratio < 1 ? [simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.003 })] : []),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [2048, 2048], quality: 86 }),
    textureCompress({
      encoder: sharp,
      targetFormat: 'webp',
      slots: /normalTexture/,
      resize: [1024, 1024],
      quality: 86,
    }),
    textureCompress({
      encoder: sharp,
      targetFormat: 'webp',
      slots: /occlusionTexture|metallicRoughnessTexture/,
      resize: [512, 512],
      quality: 84,
    }),
    meshopt({ encoder: MeshoptEncoder, level: 'high' }),
    prune(),
  );
  let triangles = 0;
  doc
    .getRoot()
    .listMeshes()
    .forEach((m) =>
      m.listPrimitives().forEach((p) => (triangles += (p.getIndices()?.getCount() ?? 0) / 3)),
    );
  const target = `apps/web/public/assets/models/${name}.glb`;
  await io.write(target, doc);
  console.log(name, Math.round(triangles), 'triangles', (await stat(target)).size, 'bytes');
}
if (process.env.SKYHOOF_COMPRESS_TERRAIN === '1')
  for (const name of await readdir('apps/web/public/assets/textures')) {
    if (!/^(forest|snow|volcanic|meadow)-.*\.jpg$/.test(name)) continue;
    const path = `apps/web/public/assets/textures/${name}`;
    const buffer = await sharp(path)
      .jpeg({ quality: name.includes('normal') ? 86 : 83, mozjpeg: true })
      .toBuffer();
    await (await import('node:fs/promises')).writeFile(path, buffer);
    console.log(name, buffer.length);
  }
