// Keep original assets intact; these variants are for repeated small scenery on the board.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, simplify, meshopt } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
for (const [name, ratio] of [
  ['tree_small_02', 0.2],
  ['pine_sapling_small', 0.25],
  ['rock_moss_set_02', 0.3],
  ['fantasy-castle', 0.45],
]) {
  const doc = await io.read(`apps/web/public/assets/models/${name}.glb`);
  await doc.transform(
    dedup(),
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.015 }),
    prune(),
    meshopt({ encoder: MeshoptEncoder, level: 'high' }),
  );
  await io.write(`apps/web/public/assets/models/${name}-game.glb`, doc);
  let triangles = 0;
  for (const m of doc.getRoot().listMeshes())
    for (const p of m.listPrimitives())
      triangles += (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3;
  console.log(name, Math.round(triangles));
}
