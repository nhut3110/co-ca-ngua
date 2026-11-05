# Skyhoof: Arcane Tabletop Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Skyhoof's 3D map visuals & VFX, character/skin customization & skeletal animations, magical gameplay modes/spells/relics/events, and responsive UI/UX across mobile (portrait & landscape) and desktop.

**Architecture:** Preserve the clean monorepo separation (`@skyhoof/catalog` for manifests, `@skyhoof/game-core` for deterministic rules & AI bots, `@skyhoof/web` for Three.js scene & React UI) while extending `GameConfig` backward-compatibly. Use instanced/batched geometry, custom PBR/emissive shaders, real-time `AnimationMixer` playback, and Arcane Glassmorphism UI layouts.

**Tech Stack:** TypeScript, React, Three.js, `@react-three/fiber`, `@react-three/drei`, Vitest, Vite.

## Global Constraints

- Preserve `GameConfig` version 1 backward compatibility and keep `DEFAULT_CONFIG.modules` as `{ spells: false, portals: false, comeback: false }` so all existing unit tests pass without regression.
- Keep `terrainHeight`, `footprintHeight`, `boundaryRadius`, `DICE_TRAY`, and `REGION_PLOTS` mathematical invariants intact so all 69 existing geometry/grounding/layout tests continue to pass.
- All assets and shaders must run locally without external network requests.

---

### Task 1: Phase 1 — 3D Map, Arcane Causeways, Tile Pedestals, Sanctums & Lighting Overhaul

**Files:**

- Create: `apps/web/src/scene/ArcaneBoardTiles.tsx`
- Modify: `apps/web/src/scene/BoardScene.tsx`
- Modify: `apps/web/src/scene/FantasyWorld.tsx`
- Modify: `apps/web/src/scene/IslandBase.tsx`
- Modify: `apps/web/src/scene/Terrain.tsx`
- Modify: `apps/web/src/scene/ModelAsset.tsx`
- Modify: `apps/web/src/scene/Scenery.tsx`

- [ ] **Step 1: Restore rich colors in `ModelAsset.tsx` and add real-time `AnimationMixer` support**
- [ ] **Step 2: Create `ArcaneBoardTiles.tsx` with connected causeway ribbons, carved marble/gold rune pedestals, 3D Mana Wells, Twin Arcane Portals, and Relic Shrines**
- [ ] **Step 3: Upgrade `Stable` into Summoning Sanctums, enhance `IslandBase.tsx` & `Terrain.tsx` underside spires/leyline rings, and upgrade lighting/clouds in `BoardScene.tsx` & `FantasyWorld.tsx`**
- [ ] **Step 4: Run `npm test` to verify all scene/grounding/layout tests pass**

---

### Task 2: Phase 2 — Expanded Character Models, Modular 4-Layer Wardrobe & Skeletal Animations

**Files:**

- Modify: `packages/catalog/src/index.ts`
- Create: `apps/web/src/scene/MythicModels.tsx`
- Modify: `apps/web/src/scene/Characters.tsx`
- Modify: `apps/web/src/scene/ModelAsset.tsx`

- [ ] **Step 1: Expand `packages/catalog/src/index.ts` with 5 new skins (`royal-steed`, `astral-unicorn`, `ember-drake`, `spirit-fox`, `arcane-archon`), plus `chromas`, `auras`, `pedestals`, and `gameModes` registries**
- [ ] **Step 2: Create `MythicModels.tsx` with high-detail articulated 3D procedural/hybrid models (`AstralUnicorn`, `EmberDrake`, `SpiritFox`, `ArcaneArchon`) and modular `CharacterAura` & `CharacterPedestal` components**
- [ ] **Step 3: Update `Characters.tsx` to drive skeletal animation states (`idle`, `move`, `celebrate`), apply `chromaId` armor/tint overrides, and render `auraId` and `pedestalId`**
- [ ] **Step 4: Write unit tests for catalog registries and run `npm test`**

---

### Task 3: Phase 4 — Magical Game Modes, Expanded Spellbook, Relic Tiles & Sky Events (`@skyhoof/game-core`)

**Files:**

- Modify: `packages/game-core/src/index.ts`
- Modify: `packages/game-core/src/engine.test.ts`
- Modify: `packages/game-core/src/sky-events.test.ts`

- [ ] **Step 1: Add unit tests for new spells (`boost`, `summon`), Relic Tiles (`modules.relics`), expanded Sky Events (`mana_rain`, `starfall`), and optional `chromaIds`/`auraIds`/`pedestalIds`/`modeId` validation**
- [ ] **Step 2: Implement expanded spells, Relic Tile blessings, 4-event Sky Event cycle, and bot AI evaluation in `packages/game-core/src/index.ts`**
- [ ] **Step 3: Run `npm test` to verify all existing and new core tests pass**

---

### Task 4: Phase 3 — Full UI/UX Overhaul (Mobile Portrait/Landscape, Desktop HUD, Wardrobe Modal & Mode Cards)

**Files:**

- Modify: `apps/web/src/hooks/useMobileAccess.ts`
- Modify: `apps/web/src/App.tsx`
- Create: `apps/web/src/components/WardrobeModal.tsx`
- Modify: `apps/web/src/components/Welcome.tsx`
- Modify: `apps/web/src/components/CreateGame.tsx`
- Modify: `apps/web/src/components/GameView.tsx`
- Modify: `apps/web/src/tokens.css`
- Modify: `apps/web/src/styles.css`
- Modify: `apps/web/src/en.json`

- [ ] **Step 1: Unblock mobile portrait/browser access in `useMobileAccess.ts` and make `BoardScene.tsx` camera responsive to portrait and landscape aspect ratios**
- [ ] **Step 2: Create `WardrobeModal.tsx` for customizing Model, Chroma, Aura, and Pedestal per player both in setup and live during matches**
- [ ] **Step 3: Upgrade `Welcome.tsx`, `CreateGame.tsx` (with 1-click Game Mode Presets & Wardrobe integration), and `GameView.tsx` (with Arcane Spell Cards, Hero Status Cards, Live Wardrobe button, and responsive Desktop/Mobile HUD)**
- [ ] **Step 4: Upgrade `tokens.css` and `styles.css` with High-Fantasy Arcane Tabletop Glassmorphism styling**
- [ ] **Step 5: Run `npm run check` (typecheck, tests, build) and verify in headless browser across Desktop and Mobile viewports**
