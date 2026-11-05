# Asset sources

All assets are served locally. No account, external asset requests or paid services are required at runtime.

| Local file                                                             | Author / source                                                                                                                   | License                                       |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `apps/web/public/assets/models/horse-standing.glb`                     | [Horse standing — Innerscene](https://www.innerscene.com/tools/library/3d-parts/horse-standing-365496af)                          | CC0, original model dedication on source page |
| `apps/web/public/assets/models/fantasy-house.glb`                      | [Fantasy House — Quaternius](https://poly.pizza/m/he3p42mUTH), [original pack](https://quaternius.com/packs/medievalvillage.html) | CC0 1.0                                       |
| `apps/web/public/assets/models/fantasy-castle.glb`                     | [Fantasy Castle — AutoSprite](https://www.autosprite.io/free-3d-models/fantasy-castle)                                            | CC0; embedded texture resized to 2048px JPEG  |
| `apps/web/public/assets/textures/rock-color.jpg` and `rock-normal.jpg` | [Mossy Rock — Rob Tuytel / Poly Haven](https://polyhaven.com/a/mossy_rock)                                                        | CC0                                           |

Downloaded 2026-11-02. House and castle models retain embedded textures with an aged masonry/roof shader; snow adds an upward-facing accumulation layer. The horse is a static model: locomotion moves the game piece along tile centers rather than playing a skeletal walk cycle. At that stage other characters were procedural; the Expedition collection below supersedes them. Leaf instances, crystals, terrain, dice and cloud sprite are code-generated in the repository. The supplied visual reference is an art direction reference and is not redistributed as game artwork.

The default horse now uses [Classic Chess Essentials Knight — 3DAssets](https://3dassets.dev/assets/classic-chess-essentials-knight-814c8552), CC0, downloaded 2026-11-02 as `apps/web/public/assets/models/chess-knight.glb` (53 KB). The renderer replaces its material with biome-faction forged metal and adds procedural faction equipment, normalizes its real bounds, and grounds its base on the tile. Movement is a sliding chess figurine animation, without a skeletal walking cycle. The former standing horse is retained as an unused source asset.

## Detailed biome assets

The following Poly Haven assets are CC0 and are downloaded/served locally; the game does not call the live Poly Haven API. Source metadata was obtained using the [Poly Haven public API](https://github.com/Poly-Haven/Public-API).

| File / use                                | Original source                                                  | Web processing                                                                                    |
| ----------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `tree_small_02.glb` — broadleaf trees     | [Tree Small 02](https://polyhaven.com/a/tree_small_02)           | 93,045 triangles; 3.33 MB; original bark/leaf textures retained, Meshopt geometry + WebP textures |
| `pine_sapling_small.glb` — snowy conifers | [Pine Sapling Small](https://polyhaven.com/a/pine_sapling_small) | One variant, 34,294 triangles; 2.06 MB; upward-facing surfaces receive procedural snow            |
| `fern_02.glb` — understory                | [Fern 02](https://polyhaven.com/a/fern_02)                       | Four source variants, 6,232 triangles total; 285 KB                                               |
| `rock_moss_set_02.glb` — boulders         | [Rock Moss Set 02](https://polyhaven.com/a/rock_moss_set_02)     | Seven rocks, 57,647 triangles total; 1.25 MB; each placed by its individual real bounds           |
| `forest-*.webp` — forest ground           | [Forest Floor](https://polyhaven.com/a/forest_floor)             | Color 2K, normal 1K, roughness 512px                                                              |
| `snow-*.webp` — snow surface              | [Snow 02](https://polyhaven.com/a/snow_02)                       | Color 2K, normal 1K, roughness 512px                                                              |
| `volcanic-*.webp` — rocky volcanic ground | [Rocky Terrain 02](https://polyhaven.com/a/rocky_terrain_02)     | Color 2K, normal 1K, roughness 512px                                                              |
| `meadow-*.webp` — celestial/sakura garden | [Aerial Grass Rock](https://polyhaven.com/a/aerial_grass_rock)   | Color 2K, normal 1K, roughness 512px                                                              |
| `bark-*.webp` — fallen log                | Pine Sapling Small bark textures above                           | 2K WebP color/normal                                                                              |

Geometry/texture preparation is in `scripts/prepare-biome-assets.mjs`. Original downloads are work files under `/private/tmp/skyhoof-detail`, not shipped. LOD simplification, texture channel sizing and geometry compression keep authored detail while avoiding the original multi-million-triangle model cost. All four ground materials blend in world space and retain separate physical normals/roughness. Additional flowers, grass blades, log end rings, ice, basalt columns, orrery and lava shaders are repository-authored geometry/effects.

## Original audio and application icons

The Web Audio score and sound synthesis in `apps/web/src/audio/GameAudio.ts` are original code-generated audio. They use no sampled recordings, hosted tracks or external audio API. The PWA knight icons in `apps/web/public/icons` are original code-drawn artwork rasterized with Sharp.

The mobile menu poster `apps/web/public/assets/previews/welcome-board.webp` is a static render of the game's own scene using the local models/textures credited above. It replaces continuous WebGL rendering on the phone welcome screen and player/rules setup; the world customization step retains the live preview.

## Gameplay geometry variants

`*-game.glb` files are simplified derivatives of the corresponding credited CC0 source models; textures and material treatment are retained. `scripts/prepare-game-lods.mjs` generates these without replacing the originals. Broadleaf trees: 93,045 → 18,537 triangles; pine: 34,294 → 8,485; rock set: 57,647 → 17,290; castle: 49,438 → 22,243. Repeated board scenery uses these variants. The diagnostic baseline URL uses original assets.

The mushroom grove (lathed caps, radial gills and stems), ruined-column sanctuary, stone approaches and riverbank clusters are original repository-authored geometry in `BiomeLandmarks.tsx`. The continuous river/curved waterfall uses shared geometry and shader code, with shared geometry; the Expedition collection below adds a real water normal texture. Eight catalog biomes are selectable independently per corner; new factions remain cosmetic.

## Expedition collection (2026-11-03)

Nine textured, skinned characters are from [KayKit Adventures](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0) and [KayKit Skeletons](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0), CC0. Local GLBs retain Idle/Walking_A/Running_A where supplied and use Meshopt + 512px WebP textures. Source license texts are in `public/assets/licenses`. Portraits are local renders of these models, not the pack contact sheets. See [character shortlist](expedition-art-direction.md) for shipped and future candidates.

The local sky JPEGs are derived from Poly Haven's CC0 [Kloofendal 48d Partly Cloudy Puresky](https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky), [Qwantani Sunset Puresky](https://polyhaven.com/a/qwantani_sunset_puresky), and [Qwantani Dusk 2 Puresky](https://polyhaven.com/a/qwantani_dusk_2_puresky). Source 2K HDRs are tone-mapped to web JPEGs by `scripts/prepare-expedition-assets.mjs`.

`water-normal.webp` derives from [Three.js waternormals.jpg](https://github.com/mrdoob/three.js/blob/dev/examples/textures/waternormals.jpg), distributed under the [Three.js MIT license](https://github.com/mrdoob/three.js/blob/dev/LICENSE). The local license is in `public/assets/licenses/threejs-MIT.txt`. Moving normal layers, sky reflection, foam, waterfall surfaces, island bases, shore camps, Roman dice artwork, and ritual SVG illustrations are repository-authored effects/geometry.
