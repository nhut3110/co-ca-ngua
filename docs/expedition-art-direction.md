# Expedition character and world library

## Available in this build

The 10 selectable models below are real local GLTF assets, not preview-only concepts. Characters share tile grounding and normalization; source Idle poses are preserved. Movement currently follows the board's piece tween; walking/running clips are retained in the files for a later animation pass.

| Character    | Model                           | Art direction / future biome pairing           |
| ------------ | ------------------------------- | ---------------------------------------------- |
| Chess knight | Classic Chess Essentials Knight | Forged faction equipment, classical board game |
| Knight       | KayKit Knight                   | Citadel, heraldic shield                       |
| Mage         | KayKit Mage                     | Astral garden, spell staff                     |
| Barbarian    | KayKit Barbarian                | Volcanic frontier, heavy weapons               |
| Rogue        | KayKit Rogue                    | Ruined sanctuary, scout                        |
| Ranger       | KayKit Rogue_Hooded             | Forest, cloaked explorer                       |
| Bone knight  | KayKit Skeleton_Warrior         | Haunted ruins, armored sentinel                |
| Necromancer  | KayKit Skeleton_Mage            | Mushroom grove, forbidden magic                |
| Bone rogue   | KayKit Skeleton_Rogue           | Dusk, agile undead                             |
| Bone guard   | KayKit Skeleton_Minion          | Ancient dungeon, skeletal infantry             |

Sources: [KayKit Adventures](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0), [KayKit Skeletons](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Skeletons-1.0), [chess knight](https://3dassets.dev/assets/classic-chess-essentials-knight-814c8552). KayKit packs and chess model are CC0. Source licenses are shipped in public/assets/licenses. Portraits are rendered from the actual local models with scripts/render-recruit-portraits.mjs.

These are miniature fantasy characters with a deliberately stylized silhouette. They are not photorealistic characters. Legacy procedural fox/mage remain compatible with older saves, but are no longer presented as new recruits.

## Additional researched candidates — not installed

[Quaternius Ultimate Animated Animals](https://quaternius.com/packs/ultimateanimatedanimals.html) supplies CC0 animated GLTF animals. Suggested skins and identities:

| Candidate   | Identity                    |
| ----------- | --------------------------- |
| Horse       | Original mounted expedition |
| White horse | Snow / celestial paladin    |
| Wolf        | Frost hunter                |
| Fox         | Autumn trickster            |
| Stag        | Forest guardian             |
| Husky       | Tundra courier              |
| Shiba       | Friendly starter mascot     |
| Alpaca      | Cloud meadow caravan        |
| Bull        | Volcanic bruiser            |
| Donkey      | Merchant / desert caravan   |
| Cow         | Pastoral festival skin      |

These require an animation/bounds review before inclusion. The pack is also indexed at [Poly Pizza](https://poly.pizza/bundle/Animated-Animal-Pack-ILAPXeUYiS). A later premium art pass could replace these with a consistently authored set of mounted heroes; mixing realistic animals and stylized heroes indiscriminately would weaken the visual language.

## World collection

Four island bases keep the same playable topology: rocky hanging roots, suspended crystals, stone citadel rings, and an archipelago with satellite islands. Each corner independently selects one of eight biomes. Four independent sky choices use real equirectangular sky photography: daylight, sunset, dusk, and a darkened astral variant with stars/moon.

Five Roman-numeral dice share the same fair RNG: brass, ivory, obsidian, frostglass and ember. Geometry profiles vary between rounded, beveled and faceted; palettes and surfaces vary per relic. They remain readable D6 dice rather than introducing alternate probabilities.

Keep scenery outside the readable track: shore camps, barrels, tent ropes, retaining stones, trees/understory, ruins, riverbanks and waterfalls. Additional detail should build a place with paths, supplies and landmarks, rather than random scatter over selectable tiles.

## Fate Sanctum and Grand Expedition

The board center now contains an original dark stone observatory with a forked crown, gilded ribs, rune inlays and a suspended D6 relic. The provided tower image guides the silhouette and mood; no film model or texture is redistributed. Rolling lifts the die above the crown, spins it, then lowers it to a readable Roman-numeral result. Pausing and reduced motion are respected. The grand version has a wider stepped altar.

Four paired border shrines fill the cardinal gaps between biomes. Their colors represent neighboring realms; their footprints are tested against every playable tile.

The default Classical journey retains 52 shared tiles and exact finish at progress57. Optional Grand Expedition has 80 shared tiles around an outer square circuit, four inward private lanes, and exact finish at progress85. Island horizontal extent increases35%; terrain flattens under the route and the river outlets reach the new shoreline. Skins/island form/sky remain independent cosmetic choices. Grand changes the rules topology and is explicitly stored as config.board, outside cosmetics. Older saves without that field continue using Classical.
