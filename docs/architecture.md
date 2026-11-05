# Architecture and extension points

## Dependency boundary

```text
apps/web ──> game-core (rules + bots)
         └─> catalog (cosmetic manifests)
apps/api ──> game-core + catalog
```

The core operates on logical tile positions. The scene maps positions to 3D coordinates (`scene/layout.ts`). Picking selects a piece ID; it cannot decide whether a move is legal. The reducer validates every action. It returns the original state for rejected actions.

`GameConfig` is copied at match creation and not editable during play. Rules are separate from presentation IDs. `GameState` and configuration carry version 1; save migrations must be explicit before changing the schema. The current localStorage autosave stores one active match on this browser; it is not a trusted server save.

## Skins and models

1. Add a `SkinDefinition` to `packages/catalog/src/index.ts` with a stable ID.
2. For procedural models, register a component in `scene/Characters.tsx`; all components use the same position/selection wrapper.
3. For a GLB, put licensed model files in `apps/web/public/assets/characters/` and use:

```ts
{
  id: 'your-character',
  name: 'Your character',
  description: '...',
  accent: '#a5cdb0',
  model: {
    kind: 'gltf', url: '/assets/characters/your-character.glb',
    scale: 0.3, rotationY: 0,
    animations: { idle: 'Idle', move: 'Run' }
  }
}
```

The renderer clones loaded GLTF scenes with `SkeletonUtils.clone` so pieces do not share a skeleton. The animation-name manifest reserves an adapter boundary; GLTF clip playback still needs to be implemented when the first animated external asset is added. Built-in movement currently animates the piece wrapper. The ModelAsset loader normalizes the Box3 horizontal center and lowest point to fit the configured footprint, with feet at y=0; their appearance never changes the engine's tile occupancy.

Asset errors have a scene boundary. A production asset pipeline should validate model geometry, texture dimensions, clip names, file size and license before publishing a catalog entry. Do not accept arbitrary user model URLs without such a pipeline.

## Corner biomes

Each player slot has a `biomeId`. Ground, foliage, rock detail, palette and decoration type are in `BiomeDefinition`. The `Region` renderer in `scene/FantasyWorld.tsx` resolves its decoration. Add a new decoration renderer when adding a new biome family; never put biome effects into movement rules. Four corners can select the same biome.

## Maps

`MapDefinition` chooses environment/surface/rock palette with a `classic-52` layout. Both shipped maps preserve the same path, so they are cosmetic. A future map with a different path is a new logical `BoardLayout`, requiring engine path data, entry positions, portals and tests; a visual map manifest alone must not change the track length.

## Optional rules

The current small engine uses explicit guards for `spells`, `portals`, `comeback`. These are independently enabled by serialized configuration. They are not a generic runtime plugin loader. Before the list grows, extract typed rule handlers into a registry with hooks such as `onLand`, `onCapture`, `onTurnStart` and a fixed ordering. Add dependencies/conflict validation at configuration time. Do not silently enable a module because a cosmetic item references it.

Current landing order: validate → move → capture → portal (if exit is empty and within current lap) → reward the original landing well → finish check → bonus/next turn. Portal arrival does not trigger another landing chain.

## Future online transport

NestJS currently exposes read-only health/catalog/default configuration. It intentionally does not advertise joinable rooms. To add online play:

- Introduce a versioned action envelope with match ID, expected revision, authenticated seat and action ID.
- The server owns RNG and calls the same core reducer, rejecting stale/unauthorized actions.
- Broadcast validated revisions/events; clients render snapshots and animate events.
- Persist snapshots, configuration, accepted actions and secure RNG state on the server.
- Support reconnect by last revision and idempotent action IDs.
- Keep bot computation server-side for online matches. Do not send the server RNG state to clients.

The offline xorshift seed provides reproducible tests, not cryptographic fairness. Online play needs a secure server-side source of randomness and a public snapshot type that omits private RNG state.
