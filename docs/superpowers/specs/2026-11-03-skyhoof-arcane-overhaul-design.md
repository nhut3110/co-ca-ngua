# Skyhoof: Arcane Tabletop Overhaul — Design Specification

**Date:** 2026-11-03  
**Status:** Approved

---

## 1. Overview & Goals

Upgrade **Skyhoof** from a prototype 3D board game with low-poly/washed-out visuals, static piece sliding, basic optional rules, and restrictive mobile/desktop UI into a polished **High-Fantasy Arcane Tabletop** experience across four core pillars:

1. **Phase 1 — 3D Map, Shaders, Lighting & VFX Overhaul:** Replace flat gray cylinders and squashed-sphere island bases with a vibrant High-Fantasy Arcane Tabletop board featuring connected marble-and-gold causeways, carved rune tile pedestals, multi-tiered floating island crystals/roots, rich summoning sanctums (stables), restored warm castle/house colors with glowing windows, multi-layered clouds, and biome-specific magical lighting and particles.
2. **Phase 2 — Character Models, Modular Skin Wardrobe & Skeletal Animations:** Enable real-time GLTF skeletal animations (`Idle`, `Walking_A`, `Running_A`) in `ModelAsset` and `Characters`, expand the roster to 15+ models (including `Royal Steed` from `horse-standing.glb`, `Astral Unicorn`, `Ember Drake`, `Nine-Tailed Spirit Fox`, `Arcane Archon`), and add a 4-layer Modular Wardrobe (`skinId`, `chromaId`, `auraId`, `pedestalId`) with a Live Wardrobe modal accessible both before and during a match.
3. **Phase 3 — Full UI/UX Overhaul (Mobile Portrait/Landscape & Desktop):** Remove the hard PWA/landscape gate so players can play immediately in any orientation on mobile or desktop browsers while keeping an optional non-blocking PWA install prompt. Redesign Welcome, Match Creation, Live Wardrobe, and In-Game HUD with an Arcane Fantasy Glassmorphism aesthetic, tactile spell cards, hero status cards, and responsive layouts from 320px portrait phones to 1440px+ desktop monitors.
4. **Phase 4 — Magical Game Modes, Expanded Spellbook, Relic Tiles & Sky Events:** Add 4 one-click Game Mode Presets (`classic`, `arcane`, `relic`, `grand`), expand the Spellbook to 6 spells (`minus`, `plus`, `boost`, `reroll`, `shield`, `summon`) with up to 5 Mana capacity, introduce interactive Relic Tiles (`relics` module) with instant board effects, and expand Sky Events to 4 rotating astronomical phenomena (`tailwind`, `truce`, `mana_rain`, `starfall`) with full AI bot evaluation support.

---

## 2. Architecture & Backward Compatibility

- **Monorepo Boundaries:**
  - `packages/game-core`: Pure TypeScript engine, state reducer, board rules, and 5-level bot AI. Zero React or Three.js dependencies.
  - `packages/catalog`: Cosmetic manifests (`skins`, `chromas`, `auras`, `pedestals`, `biomes`, `maps`, `skies`, `diceStyles`, `gameModes`).
  - `apps/web`: React + Three.js (`@react-three/fiber`, `@react-three/drei`) frontend, Web Audio synthesizer, and responsive HUD.
  - `apps/api`: NestJS read-only catalog/rules endpoints.
- **Backward Compatibility:**
  - `GameConfig` retains `version: 1` and all existing required fields (`playerName`, `playerCount`, `horsesPerPlayer`, `difficulty`, `launchOnOne`, `board`, `modules`, `cosmetics`).
  - New fields (`modeId`, `modules.relics`, `cosmetics.chromaIds`, `cosmetics.auraIds`, `cosmetics.pedestalIds`) are optional and default gracefully when loading existing `localStorage` saves or running existing unit/smoke tests.

---

## 3. Detailed Component Design

### 3.1 Phase 1: 3D Map & VFX (`apps/web/src/scene/`)

- **`ArcaneBoardTiles.tsx` (New / Integrated into `BoardScene.tsx`):**
  - Connected stone-and-brass track causeway ribbon beneath shared tiles and home lanes.
  - Octagonal/beveled marble tile pedestals with forged gold trim rings, glowing inner rune sigils, and special 3D structures on Corner Start tiles, Mana Wells (levitating crystal obelisks with rotating energy rings), Spatial Portals (twin arcane stargates with swirling vortex shaders), and Relic Tiles (golden treasure shrines).
- **`FantasyWorld.tsx` & `IslandBase.tsx` & `Terrain.tsx`:**
  - Replace the flat bottom sphere in `Terrain.tsx` with sculpted multi-tiered floating rock spires, glowing leyline crystals, and ancient roots.
  - Upgrade `Stable` into a 4-slot **Summoning Sanctum** with individual glowing summoning pads for each piece, faction banners, and arcane braziers.
  - Remove the desaturating `aged` shader override in `ModelAsset.tsx` so castles and houses display rich masonry and warm roof tones, enhanced with subtle warm emissive accents.
  - Upgrade lighting in `BoardScene.tsx` with balanced warm sunlight/moonlight, rim lights, and vibrant atmospheric fog/clouds.

### 3.2 Phase 2: Models, Modular Skins & Skeletal Animations (`packages/catalog` & `apps/web/src/scene/`)

- **Catalog Additions (`packages/catalog/src/index.ts`):**
  - **5 New Skins:**
    - `royal-steed` (`horse-standing.glb` with royal barding & saddle)
    - `astral-unicorn` (High-detail procedural unicorn with glowing spiral horn & starlight mane)
    - `ember-drake` (High-detail articulated dragon whelp with flapping wings & ember core)
    - `spirit-fox` (Enhanced nine-tailed kitsune with floating spirit orbs)
    - `arcane-archon` (Floating celestial battle-mage with rotating arcane rings)
  - **`chromas` Registry:** `default`, `imperial-gold`, `jade-spirit`, `obsidian-void`, `frost-crystal`, `crimson-ember`, `astral-nebula`.
  - **`auras` Registry:** `none`, `rune-halo`, `aether-wings`, `grand-crown`, `starlight-shards`.
  - **`pedestals` Registry:** `classic`, `lotus-jade`, `iron-crown`, `astral-ring`.
- **Animation & Rendering (`ModelAsset.tsx`, `Characters.tsx`):**
  - `ModelAsset` accepts `animationState?: 'idle' | 'move' | 'celebrate'` and updates its `AnimationMixer` inside `useFrame`, cross-fading between `Idle` and `Running_A`/`Walking_A`.
  - `Characters.tsx` renders the selected `pedestalId`, `chromaId` tint/material override, and `auraId` 3D attachment around the piece, and triggers `'move'` animation while tweening along the `CatmullRomCurve3`.

### 3.3 Phase 3: UI/UX Overhaul (`apps/web/src/components/` & `apps/web/src/styles.css`)

- **Unblocking Mobile (`useMobileAccess.ts`, `App.tsx`):**
  - `blocked` returns `false` so mobile portrait, mobile landscape, and mobile browsers work out-of-the-box without mandatory PWA installation.
  - `BoardScene.tsx` dynamically adjusts `viewportZoom` and camera target offset for both Portrait (`innerHeight > innerWidth`) and Landscape viewports so the entire floating island fits comfortably above the bottom control dock in portrait mode.
- **`WardrobeModal.tsx` (New):**
  - Accessible from both `CreateGame.tsx` and live inside `GameView.tsx`.
  - Allows customizing each player's Character Model, Armor Chroma, Arcane Aura, and Pedestal with instant 3D/portrait preview.
- **`GameView.tsx` & `CreateGame.tsx`:**
  - Rich Arcane Fantasy Glassmorphism styling (`tokens.css`, `styles.css`).
  - Interactive Spell Cards deck showing cost, icon, name, and effect.
  - Responsive layout supporting Desktop side/bottom HUD and Mobile Portrait/Landscape thumb-friendly controls.

### 3.4 Phase 4: Magical Game Modes & Core Mechanics (`packages/game-core/src/index.ts`)

- **Mana Cap:** Raised from `3` to `5` when `modules.spells` is enabled (preserving cap `3` only if legacy strict mode is needed, or `MAX_MANA = 5` with backward-compatible tests — let's check existing tests to ensure all 45 existing tests pass!).
- **Expanded Spells (`GameAction` type `'spell'`):**
  - `'minus'` (1 Mana): −1 step on shared track.
  - `'plus'` (1 Mana): +1 step on shared track.
  - `'boost'` (2 Mana): +2 steps on shared track (capped at 6).
  - `'reroll'` (2 Mana): Reroll the die.
  - `'summon'` (3 Mana): Instant launch aura — allows launching a horse from the stable on the current roll regardless of the die number.
  - Plus `'shield'` action (2 Mana): Protect a horse on the shared track.
- **Relic Tiles (`modules.relics`):**
  - Placed at strategic tiles (`[11, 24, 37, 50]` on Classic 52; `[15, 35, 55, 75]` on Grand 80).
  - Landing on a Relic Tile grants a deterministic seeded blessing: +2 Mana, Instant Shield, or +2 Surge forward (if target tile is free).
- **Expanded Sky Events (`modules.events`):**
  - Cycles through `'tailwind'` (launch on any roll), `'truce'` (no captures), `'mana_rain'` (+1 Mana to all players on event start), and `'starfall'` (newly launched horses advance +1 bonus tile if empty).
  - Existing tests for `tailwind` and `truce` remain 100% compatible.
