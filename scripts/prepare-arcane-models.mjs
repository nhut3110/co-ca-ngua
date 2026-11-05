import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, simplify, textureCompress, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready]);

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });

const destModels = 'apps/web/public/assets/models';
await mkdir(destModels, { recursive: true });

async function fetchBinary(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

function copyAnimation(targetDoc, sourceDoc, sourceName, targetName) {
  const srcAnim = sourceDoc
    .getRoot()
    .listAnimations()
    .find((a) => a.getName() === sourceName);
  if (!srcAnim) throw new Error(`Missing animation ${sourceName}`);
  const nodeByName = new Map(
    targetDoc
      .getRoot()
      .listNodes()
      .map((n) => [n.getName(), n]),
  );
  const buf = targetDoc.getRoot().listBuffers()[0] ?? targetDoc.createBuffer();
  const dstAnim = targetDoc.createAnimation(targetName);
  const samplerMap = new Map();

  for (const s of srcAnim.listSamplers()) {
    const inAcc = s.getInput();
    const outAcc = s.getOutput();
    const newIn = targetDoc
      .createAccessor()
      .setBuffer(buf)
      .setType(inAcc.getType())
      .setArray(inAcc.getArray().slice());
    const newOut = targetDoc
      .createAccessor()
      .setBuffer(buf)
      .setType(outAcc.getType())
      .setArray(outAcc.getArray().slice());
    const newSampler = targetDoc
      .createAnimationSampler()
      .setInput(newIn)
      .setOutput(newOut)
      .setInterpolation(s.getInterpolation());
    dstAnim.addSampler(newSampler);
    samplerMap.set(s, newSampler);
  }

  let matched = 0;
  for (const ch of srcAnim.listChannels()) {
    const srcNode = ch.getTargetNode();
    const dstNode = srcNode ? nodeByName.get(srcNode.getName()) : null;
    if (!dstNode) continue;
    const newCh = targetDoc
      .createAnimationChannel()
      .setTargetNode(dstNode)
      .setTargetPath(ch.getTargetPath())
      .setSampler(samplerMap.get(ch.getSampler()));
    dstAnim.addChannel(newCh);
    matched++;
  }
  return matched;
}

const jamBase = 'https://media.githubusercontent.com/media/series-ai/jam-ready-assets/main/';
console.log('Downloading shared KayKit animation rigs...');
const [medGenDoc, medMovDoc, lrgGenDoc, lrgMovDoc] = await Promise.all([
  fetchBinary(
    `${jamBase}kaykit-adventurers/3D/characters/Animations/gltf/Rig_Medium/Rig_Medium_General.glb`,
  ).then((b) => io.readBinary(b)),
  fetchBinary(
    `${jamBase}kaykit-adventurers/3D/characters/Animations/gltf/Rig_Medium/Rig_Medium_MovementBasic.glb`,
  ).then((b) => io.readBinary(b)),
  fetchBinary(
    `${jamBase}kaykit-adventurers/3D/characters/Animations/gltf/Rig_Large/Rig_Large_General.glb`,
  ).then((b) => io.readBinary(b)),
  fetchBinary(
    `${jamBase}kaykit-adventurers/3D/characters/Animations/gltf/Rig_Large/Rig_Large_MovementBasic.glb`,
  ).then((b) => io.readBinary(b)),
]);

const characters = [
  {
    name: 'Paladin',
    rig: 'medium',
    path: 'kaykit-mystery-monthly-4/3D/misc/10 - April 2024 - Paladin/characters/gltf/Paladin_with_Helmet.glb',
  },
  {
    name: 'Druid',
    rig: 'medium',
    path: 'kaykit-adventurers/3D/characters/Characters/gltf/Druid.glb',
  },
  {
    name: 'FrostGolem',
    rig: 'large',
    path: 'kaykit-mystery-monthly-5/3D/misc/7 - January 2025 - FrostGolem/characters/FrostGolem.glb',
  },
  {
    name: 'Werewolf_Wolf',
    rig: 'medium',
    path: 'kaykit-mystery-monthly-4/3D/misc/4 - October 2023 - Werewolf/characters/gltf/Werewolf_Wolf.glb',
  },
  {
    name: 'Witch',
    rig: 'medium',
    path: 'kaykit-mystery-monthly-5/3D/misc/5 - November 2024 - Witch/characters/Witch.glb',
  },
  {
    name: 'Tiefling',
    rig: 'medium',
    path: 'kaykit-mystery-monthly-5/3D/misc/12 - June 2025 - Tiefling/characters/Tiefling.glb',
  },
  {
    name: 'Necromancer',
    rig: 'medium',
    path: 'kaykit-skeletons/3D/characters/characters/gltf/Necromancer.glb',
  },
  {
    name: 'Skeleton_Golem',
    rig: 'large',
    path: 'kaykit-skeletons/3D/characters/characters/gltf/Skeleton_Golem.glb',
  },
  {
    name: 'BlackKnight',
    rig: 'large',
    path: 'kaykit-mystery-monthly-5/3D/misc/3 - September 2024 - Black Knight/characters/BlackKnight.glb',
  },
];

for (const char of characters) {
  const buf = await fetchBinary(jamBase + encodeURI(char.path));
  const doc = await io.readBinary(buf);
  const genDoc = char.rig === 'large' ? lrgGenDoc : medGenDoc;
  const movDoc = char.rig === 'large' ? lrgMovDoc : medMovDoc;

  copyAnimation(doc, genDoc, 'Idle_A', 'Idle');
  copyAnimation(doc, movDoc, 'Walking_A', 'Walking_A');
  copyAnimation(doc, movDoc, 'Running_A', 'Running_A');

  await doc.transform(
    dedup(),
    prune(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [512, 512], quality: 92 }),
    meshopt({ encoder: MeshoptEncoder, level: 'high' }),
  );

  const outPath = `${destModels}/${char.name}.glb`;
  await io.write(outPath, doc);
  console.log(
    `Saved character ${char.name}.glb with animations:`,
    doc
      .getRoot()
      .listAnimations()
      .map((a) => a.getName()),
  );
}

const dungeonBase =
  'https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0/main/addons/kaykit_dungeon_remastered/Assets/gltf/';
const props = [
  ['chest_gold', 'chest_gold.glb'],
  ['torch_lit', 'torch_lit.gltf.glb'],
  ['pillar_decorated', 'pillar_decorated.gltf.glb'],
  ['wall_arched', 'wall_arched.gltf.glb'],
  ['wall_archedwindow_open', 'wall_archedwindow_open.gltf.glb'],
  ['rubble_large', 'rubble_large.gltf.glb'],
  ['barrel_large_decorated', 'barrel_large_decorated.gltf.glb'],
  ['crates_stacked', 'crates_stacked.gltf.glb'],
  ['sword_shield_gold', 'sword_shield_gold.gltf.glb'],
  ['banner_blue', 'banner_patternA_blue.gltf.glb'],
  ['banner_red', 'banner_patternA_red.gltf.glb'],
  ['banner_green', 'banner_patternA_green.gltf.glb'],
  ['banner_yellow', 'banner_patternA_yellow.gltf.glb'],
];

for (const [targetName, srcFile] of props) {
  const buf = await fetchBinary(dungeonBase + srcFile);
  const doc = await io.readBinary(buf);
  await doc.transform(
    dedup(),
    prune(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [512, 512], quality: 92 }),
    meshopt({ encoder: MeshoptEncoder, level: 'high' }),
  );
  const outPath = `${destModels}/${targetName}.glb`;
  await io.write(outPath, doc);
  console.log(`Saved prop ${targetName}.glb`);
}

// Download Poly Haven horse_statue_01 (1k PBR sculpted statue)
const tmpStatueDir = '/private/tmp/skyhoof-statue';
await mkdir(join(tmpStatueDir, 'textures'), { recursive: true });
const phFiles = await (await fetch('https://api.polyhaven.com/files/horse_statue_01')).json();
const gltfInfo = phFiles.gltf['1k'].gltf;
await writeFile(join(tmpStatueDir, 'source.gltf'), await fetchBinary(gltfInfo.url));
for (const [relPath, info] of Object.entries(gltfInfo.include)) {
  await writeFile(join(tmpStatueDir, relPath), await fetchBinary(info.url));
}
const statueDoc = await io.read(join(tmpStatueDir, 'source.gltf'));
await statueDoc.transform(
  dedup(),
  prune(),
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.25, error: 0.005 }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 88 }),
  meshopt({ encoder: MeshoptEncoder, level: 'high' }),
  prune(),
);
await io.write(`${destModels}/horse_statue_01.glb`, statueDoc);
console.log('Saved Poly Haven PBR horse_statue_01.glb');
