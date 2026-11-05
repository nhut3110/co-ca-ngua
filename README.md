# Skyhoof

Cá ngựa 3D trên đảo nổi. Vite + React + Three.js, offline bots, and a NestJS foundation for future multiplayer.

## Run

Requires Node.js 22+ and npm.

```sh
npm ci
npm run dev
```

Web: http://localhost:5173 · API: http://localhost:3001/health

```sh
npm run check     # typecheck, engine tests, production builds
npm run dev:web   # frontend only; does not need the API
npm run dev:api
```

## Workspace

- `apps/web`: welcome → create match (players/rules/world) → 3D game; Web Worker bots, local autosave, keyboard-accessible move buttons.
- `apps/api`: NestJS `/health`, `/catalog`, `/rules/default`. No online rooms or authentication yet.
- `packages/game-core`: serializable state, seeded dice, immutable rules, five bot levels. No React/Three.js dependencies.
- `packages/catalog`: cosmetic skin/model, biome and map manifests. Cosmetics never alter rules.

Classic rules are the default. Optional spells, portals and comeback can be enabled independently before starting; match rules are then frozen. Maps, four corner biomes and each player's character can be customized in the world step. The board combines local CC0 horse/architecture models, rock textures and procedural fantasy scenery. See [asset sources](docs/assets.md).

Level 1 is random; 2 uses basic priorities and mistakes; 3 evaluates captures/progress/threats; 4 and 5 sample independent future turns at increasing budgets. Difficulty is an implementation distinction, not a guarantee that each higher level wins every matchup. Strength calibration needs larger tournaments.

Current validation: 45 engine/presentation/geometry tests, formatting/typecheck/build, compiled API smoke and Chromium smoke on development and production preview. Responsive overflow checks cover 320–1440px. Real-device GPU/touch performance is not yet verified. The production build retains a large Three.js chunk warning (about 189 KB gzip for the renderer chunk).

## Controls and factions

Select a piece directly on the board to preview its route/destination, then confirm; tap it again or use Cancel/Escape to clear selection. Enter/Space rolls; 1–4 selects; Enter confirms. Mobile uses the whole screen for the map: corner dice action, temporary confirm strip, mana menu and an optional numbered picker. One finger selects, two fingers rotate/zoom; hand mode enables one-finger exploration. Pause contains rules, log, exit and audio/settings. Mobile requires an installed PWA in landscape; portrait pauses the match. Desktop keeps its panel.

Static scenery is batched and memoized; source quantization is expanded before geometry transforms. Gameplay scenery uses lighter derivatives with the same textures. Idle shadow maps are cached, decorative rendering refreshes at24Hz, and action/camera frames use display cadence. Renderer telemetry is available on `.board-scene[data-render]`; `node scripts/render-profile.mjs baseline` compares the original workload with `node scripts/render-profile.mjs final`. These software-WebGL measurements do not establish physical-phone FPS. `scripts/immersive-review.mjs` covers direct picking, contextual controls, spells/capture, gestures and viewport usage.

Biome factions supply their own metal, cloth, shield and headgear through the catalog. The default knight model wears forest antlers, frost crystals, ember spikes or celestial ornament. Dice use a rune altar and forged, numbered artifact faces. Action banners announce turns, deployment, capture and bonus turns.

## Install and audio

The production build includes a web manifest, standalone icons and a versioned service worker that precaches the app, lazy chunks, fonts and models (~20 MB of public assets). On phones/tablets, the entry screen guides installation via Chrome or Safari. Gameplay requires a standalone app in landscape. Manifest orientation is backed by an in-app gate on platforms that ignore orientation locks; rotating to portrait or hiding the app pauses bot decisions, presentation and audio. Native browser installation/rotation behavior still needs physical iOS/Android verification.

PWA install/offline support requires HTTPS or localhost. `npm run dev:web` is for development; test the worker using `npm run build` then `npm run preview -w @skyhoof/web`. A new service worker waits for existing app windows to close before activating; it does not replace assets during a live match. Offline mode is available after the complete precache finishes successfully.

The original procedural fantasy score and effects use Web Audio and require no remote assets. Harp arpeggios, a soft drone and bells accompany menus/matches; effects cover UI, selection/cancel, dice throw/results, movement, deployment, capture, spells/portals, turns/bonus turns, pass, finish and victory. Audio unlocks on a user gesture. Settings include independent music/effects levels and master mute, persisted locally. Audio suspends when paused, backgrounded or blocked by the mobile gate.

Run `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/skyhoof-browsers node scripts/mobile-audio-review.mjs` for install/orientation gating, measured audio/mute output, preference persistence, offline navigation and gameplay sound QA. Browser tests emulate standalone mode; they cannot perform an actual iOS home-screen installation.

## Extend

See [architecture](docs/architecture.md) for cosmetic registries, rule modules, save versions and the future server boundary, and [rules](docs/rules.md) for this implementation's exact house rules.

## Browser QA

`scripts/web-game-client.mjs` is based on the installed OpenAI `develop-web-game` skill client, with local Playwright resolution and software WebGL launch configuration.

```sh
npx playwright install chromium
node scripts/web-game-client.mjs --url http://localhost:5173 --actions-json '{"steps":[{"buttons":[],"frames":2}]}' --iterations 1 --screenshot-dir artifacts/skill
node scripts/smoke.mjs
```

`render_game_to_text()` exposes the displayed match state. `advanceTime(ms)` advances bot decisions in 750ms steps for QA and waits for React frames. It does not pretend to advance Three.js animation time deterministically.

## Deployment

Frontend: Vercel project root at this repository; build `npm run build`, output `apps/web/dist`. All fonts and built-in assets are local. Backend: build the workspace, start `npm run start -w @skyhoof/api`; configure `PORT`, `HOST` and `WEB_ORIGIN`. The frontend currently does not call the API. No deployment has been created.

### Bộ sưu tập thế giới

Màn tạo ván có bốn nhóm tùy biến: Địa hình, Bốn miền, Đội hình và Xúc xắc. Chọn độc lập 4 kiểu đảo, 4 bầu trời, 8 biome mỗi góc, 10 nhân vật GLTF và 5 xúc xắc La Mã. Chúng chỉ thay đổi hình ảnh; luật và xác suất xúc xắc giữ nguyên. Các cơ chế magic mặc định vẫn tắt.

Nguồn/tác quyền: [assets](docs/assets.md). Danh sách nhân vật đã có và các ứng viên mở rộng: [expedition art direction](docs/expedition-art-direction.md). Kiểm tra giao diện mới: `node scripts/forge-review.mjs`, `node scripts/expedition-review.mjs` (production preview ở cổng 4173, cần Chromium của Playwright).

Trong **Thế giới → Địa hình → Hành trình**, Cổ điển giữ 52 ô và được chọn mặc định. **Đại viễn chinh** mở đảo rộng hơn 35%, đường vành đai 80 ô và bốn nhánh về nhà. Tế đàn vận mệnh ở tâm đảo giữ xúc xắc lơ lửng trên đỉnh tháp; bốn trạm giao giới bổ sung chi tiết giữa các biome. Ván lưu cũ tiếp tục dùng đường cổ điển.
