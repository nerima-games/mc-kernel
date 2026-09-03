# @nerima-games/mc-kernel

## 0.7.1

### Patch Changes

- [#53](https://github.com/nerima-games/mc-kernel/pull/53) [`3c9d9f6`](https://github.com/nerima-games/mc-kernel/commit/3c9d9f6de9a9fe4fe8fc1b29717393720d194e18) Thanks [@takeokunn](https://github.com/takeokunn)! - Fill in `footstepMaterial` for the standable blocks the registry left silent: 92 of 123 rows previously fell through to the silent `default` (only ~15 grass/wood/stone rows were classified), so a player heard footsteps on grass, planks and a handful of stone blocks and nothing anywhere else — deepslate, roughly a quarter of solid terrain, was silent underfoot. All 107 standable rows now carry `grass`, `wood`, or `stone` (the only cues `mc-audio`'s `FOOTSTEP_MATERIALS` maps to a sound); the 16 remaining `default` rows are deliberate — fluids, void/portal blocks, and decorative attachments nobody stands on. Where the real material has no vocabulary member (glass, sand-family, ice, metal and gem storage blocks, lamp glass, shell), the nearest existing material is used rather than staying silent.

## 0.7.0

### Minor Changes

- [#51](https://github.com/nerima-games/mc-kernel/pull/51) [`5647681`](https://github.com/nerima-games/mc-kernel/commit/5647681762ea3ae2ea77535d1d7ab9186b0765ef) Thanks [@takeokunn](https://github.com/takeokunn)! - Merge the player-settings value rules into one settings domain: captionsEnabled joins the type, rebindKey replaces bindKey with conflict-swap semantics (the colliding action gives up its code rather than being silently overwritten), and two defaults change to what a player actually gets — audioEnabled true (the browser autoplay gate already prevents a cold-open blast, so false only produced a silent game) and mouseSensitivity 1, the multiplier identity. Pre-1.0 minor, but note the removed export and the changed defaults: a consumer reading DEFAULT_SETTINGS or normalising an empty object sees different values.

## 0.6.1

### Patch Changes

- [#49](https://github.com/nerima-games/mc-kernel/pull/49) [`63d4e7c`](https://github.com/nerima-games/mc-kernel/commit/63d4e7ccc993a736b74f32c974d52ba28724697a) Thanks [@takeokunn](https://github.com/takeokunn)! - Fix two block-registry drop-rule omissions: `glowstone` now carries `silkTouchItem: 'glowstone'` (silk touch previously still yielded `glowstone_dust`), and `tall_grass`/`fern` now resolve to `drops: DROPS_NOTHING` instead of falling through to "drops one of itself".

## 0.6.0

### Minor Changes

- [#47](https://github.com/nerima-games/mc-kernel/pull/47) [`635b96e`](https://github.com/nerima-games/mc-kernel/commit/635b96ec89e16f2d1ebeb0faa431767058ca7a51) Thanks [@takeokunn](https://github.com/takeokunn)! - Add a `blastResistance` block property and `resistsExplosion(id, power)` predicate to `explosion.ts`. Reproduces mx-gameplay's `block-vocabulary.ts` mirror of `resistsNormalExplosion`, which flags `bedrock` and `obsidian` as immune to normal creeper/TNT explosions; every other block defaults to `blastResistance: 0`.

### Patch Changes

- [#46](https://github.com/nerima-games/mc-kernel/pull/46) [`97bc13a`](https://github.com/nerima-games/mc-kernel/commit/97bc13a2431cbf10f34fcc6e25bcb282a485c8cb) Thanks [@takeokunn](https://github.com/takeokunn)! - Complete the org toolchain devDependency pin set: knip 6.33.0 (its verify gate arrives in Wave 3; the pin belongs to the Wave 0 table) plus @effect/vitest 0.30.0 where it was missing.

## 0.5.1

### Patch Changes

- [#43](https://github.com/nerima-games/mc-kernel/pull/43) [`471591a`](https://github.com/nerima-games/mc-kernel/commit/471591a841679ecbdddd3ec6caff10c43103b4a2) Thanks [@takeokunn](https://github.com/takeokunn)! - Toolchain frozen to org pin set (TypeScript 7.0.2, vitest 4.1.11, effect 3.22.1, node 24, pnpm 11.24.0); build switched to tsc emit; release workflow added

## 0.5.0

### Minor Changes

- [#39](https://github.com/nerima-games/mc-kernel/pull/39) [`b35a300`](https://github.com/nerima-games/mc-kernel/commit/b35a300872458f1f3bc17d1c4ae3b70b9538daf5) Thanks [@takeokunn](https://github.com/takeokunn)! - **Three new shared-vocabulary domains, plus a memory-regression fix with no public-behaviour change.**
  
  ## New domains (MINOR: new types and functions)
  
  `domain/game-mode`, `domain/game-rule`, and `domain/damage-type` are now public, each exported from the
  root barrel and its own `@nerima-games/mc-kernel/domain/*` subpath.
  
  - `game-mode` follows the `status-effect` / `biome` three-file shape (closed vocabulary + a per-member value
    table): `GameMode` (`survival`/`creative`/`adventure`/`spectator`) and `Difficulty`
    (`peaceful`/`easy`/`normal`/`hard`), each with a `*Properties` table (break/place/fly permission, block
    collision, damage, hunger consumption, hostile-spawn eligibility, and damage/hunger multipliers). Mode
    switching permission itself stays with the upper layer.
  - `game-rule` follows the `settings` two-file shape (bounded defaults, normalisation and pure update in one
    module rather than a separate `-validation.ts`): the subset of vanilla gamerules a world-simulation tick
    actually branches on — daylight/weather cycling, mob spawning/griefing, `keepInventory`, fire spread,
    `doInsomnia`, natural regeneration, immediate respawn, the four damage-source toggles, random tick speed,
    entity cramming, the sleep-skip threshold, and the mob spawn radius. Announcement/log/admin rules
    (`showDeathMessages`, `reducedDebugInfo`, …) are excluded — nothing in a physics or entity tick reads them.
  - `damage-type` publishes Java Edition 1.21's closed `DamageType` vocabulary (armour-reduction eligibility,
    invulnerability-bypass, `kind`, difficulty scaling) but deliberately **excludes** the raw-damage-to-final-
    damage mitigation calculation. See `docs/responsibility.md` §3-7 for why the vocabulary passes the kernel-
    admission test (`mc-audio` picks a hurt sound and `mx-ui` renders a death message from the same type, and
    the two cannot reach each other on the dependency graph) while the mitigation arithmetic does not (its only
    identified consumer, `mx-gameplay`, reaches kernel through an ordinary dependency edge) — and the re-open
    condition under which that could change.
  
  ## Internal (PATCH: no public-behaviour change)
  
  **`domain/block-registry-indexes.ts`'s dense id-indexed lookup tables are now sized from the highest
  registered block id, not from `BlockId`'s type ceiling (`BLOCK_ID_MAX`).** The two answer different questions
  — `BLOCK_ID_MAX` is what a `BlockId` may be, the table length is how long the lookup arrays must be — and they
  coincided only while the registry filled the whole 16-bit id space introduced by the `Chunk` v2 wire format
  (previous changeset). Every capability-flag and property column was already pre-filled with that flag's or
  property's documented default before registry rows overwrote their own id, and every accessor now falls back
  to the same documented default for any id outside the (now shorter) table — so the answer for every id is
  unchanged; only resident memory shrinks, restoring `block-registry`'s import cost to its pre-widening value.
  No caller-visible signature, type, or default changed, so this ships as PATCH despite touching a file with a
  public re-export surface.
  
  ## Package is `0.x`
  
  Per `docs/versioning.md` §6, "new type or function" classifies MINOR both before and after `1.0.0`, so the
  three new domains set this changeset's bump. The registry-indexes fix is PATCH on its own and does not raise
  that bump — changesets records the highest classification present in a release, not an additional one.

- [#39](https://github.com/nerima-games/mc-kernel/pull/39) [`b35a300`](https://github.com/nerima-games/mc-kernel/commit/b35a300872458f1f3bc17d1c4ae3b70b9538daf5) Thanks [@takeokunn](https://github.com/takeokunn)! - **Eight new shared-vocabulary domains, and two MAJOR-classified changes buried inside them: a changed default and a changed wire format.**
  
  ## New domains (MINOR: new types and functions)
  
  `domain/random-source`, `domain/status-effect`, `domain/entity-type`, `domain/biome`,
  `domain/light`, `domain/heightmap`, `domain/block-entity`, and `domain/tag-membership` are now
  public, each exported from the root barrel and its own `@nerima-games/mc-kernel/domain/*`
  subpath. Every one satisfies `docs/responsibility.md` §3-2's admission test: at least two
  repositories need the vocabulary and cannot reach each other through the dependency graph
  (`mc-noise` / `mc-meshing` / `mc-physics` / `mc-save` / `mc-audio` are the five repositories with
  no edge but kernel). See `docs/public-api.md` for the full surface of each.
  
  ## Breaking (MAJOR per `docs/versioning.md` §6, shipped as a `0.x` minor bump)
  
  **`ingredientMatches`'s default for an omitted `itemTags` argument changed from an empty map to
  `VANILLA_ITEM_TAG_MEMBERSHIPS`** (`src/domain/recipe-data.ts:466`, consumed at four call sites in
  `src/domain/recipe-matching.ts`). Previously, calling `ingredientMatches` without an explicit
  `itemTags` meant every tag ingredient silently failed to match. It now resolves against the
  kernel's vanilla tag table (`domain/tag-membership.ts`). `docs/versioning.md` §6 classifies a
  default-value change as MAJOR ("下流の挙動が黙って変わる。最も危険") because it changes the
  behaviour of every caller that never wrote anything — exactly the risk that classification exists
  to flag. A caller that depended on the old empty-default behaviour (tag ingredients never
  matching) must now pass an empty `Map` explicitly.
  
  **The `Chunk` wire format gained a v2 encoding** (`src/domain/chunk.ts`). Block elements widen
  from 8-bit to 16-bit; `encodeChunk` always emits v2 and never re-emits v1, though `decodeChunk`
  still reads v1 bytes through a compatibility path. The payload-length header field at byte offset
  20 changes meaning from an element count to a byte count — the two were indistinguishable under
  v1's one-byte elements, but diverge now. `decodeChunk` validates each 16-bit element against the
  block registry before narrowing it to the one-byte-per-element shape `BlockState` stores, so a
  corrupt id above 255 cannot alias a valid id through truncation. `BlockId` numbering itself is
  unchanged (`BLOCK.SAND === 5` still holds). Any code that parses encoded chunk bytes directly
  (rather than through `encodeChunk` / `decodeChunk`) must account for the new element width and
  payload-length semantics.
  
  ## Package is `0.x`
  
  Per `docs/versioning.md` §6, a `0.x` package reads MAJOR-classified changes as a **minor** bump
  (`0.4.0` → `0.5.0`), not a major bump — hence `minor` above for both the tag-matching default and
  the chunk wire format, alongside the eight new domains. `1.0.0` is deferred to a maintainer
  decision made after downstream repositories actually consume this contract
  (`docs/versioning.md` §2, §7).

## 0.4.0

### Minor Changes

- [#31](https://github.com/nerima-games/mc-kernel/pull/31) [`912b059`](https://github.com/nerima-games/mc-kernel/commit/912b05977afcc6c9df49982676abf55f65aa1d4c) Thanks [@takeokunn](https://github.com/takeokunn)! - **Breaking for consumers: `effect` moved from `dependencies` to `peerDependencies`.**
  
  mc-kernel exports a `Context.Tag` (`ClockPort`) and `Effect` values, so the copy
  of `effect` a consumer runs has to be the copy the kernel's values were built
  against. Declaring it as a regular dependency let a second copy be installed
  silently — and `effect` 4.x is already published on the `rc` and `beta`
  dist-tags, so a consumer moving to 4 while this package pinned `^3.22.1` would
  have got exactly that.
  
  A consumer that relied on mc-kernel to pull `effect` in transitively must now
  declare `effect` in its own `package.json`. Every package in the Effect
  organisation that builds on `effect` — `@effect/platform`, `@effect/schema`,
  `@effect/cli`, `@effect/experimental`, `@effect/vitest` — declares it the same
  way; none declares it as a dependency.
  
  `0.x` classifies a breaking change as MINOR, hence the bump level here. See
  `docs/versioning.md` §1-1 and §6.
  
  Nothing else in the public surface changed: the package still exports the same
  158 names. The axis brand constructors were renamed internally from `blockAxis`
  / `chunkAxis` / `localAxis` to `BlockAxis` / `ChunkAxis` / `LocalAxis`, but the
  barrel only ever re-exported the PascalCase spelling, so the boundary is
  unaffected.

- **This is the first release consumers can actually import.**
  
  Every version published so far — 0.2.0 through 0.2.18 — ships raw TypeScript.
  Their manifests point `main`, `types` and `exports` at `./src/index.ts`, `files`
  carries `src` with no `dist`, and no subpath export is declared at all. Installing
  one and importing it fails with `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`,
  because Node does not strip types under `node_modules`, and
  `@nerima-games/mc-kernel/domain/chunk` reports that the subpath is not defined by
  `exports`.
  
  The compiled ESM build that fixes this has been in the repository for a while. It
  never reached the registry: the release workflow decides whether to publish by
  diffing the version against the previous commit, and the version was already at
  its current value when that workflow landed, so no later push could ship it. Both
  halves are fixed now — the workflow splits detection from publishing, and this
  release carries the version change that lets it fire.
  
  Verified by installing from GitHub Packages into an empty project rather than by
  type-checking: the root import resolves, both subpath exports resolve, and
  `fixedClock`, the chunk codec round trip and the coordinate conversions all run.
  Note that `pnpm package:verify` cannot catch this class of defect — it packs a
  tarball from the working tree, so it inspects the manifest about to be shipped and
  never the one already on the registry.

## 0.3.0

### Minor Changes

- **Breaking:** `Chunk.blocks` is now `ChunkBlocks` (an encapsulated `BlockState`), not a raw `Uint8Array`. `chunk()` and `decodeChunk()` still accept a raw `Uint8Array` as input and validate it into a `ChunkBlocks`, but the value stored on `Chunk.blocks` (and returned by `decodeChunk`) no longer supports the `[]` index operator. Use `blocks.get(index)` / `blocks.set(index, blockId)` for element access, `blocks.length` for the count, and `blocks.toBytes()` (copy) or `blocks.copyTo(target, offset?)` (write into a caller-owned buffer) to get raw bytes back out. See `docs/public-api.md` § Chunk バイナリ形式 for the full API.

## 0.2.19

### Patch Changes

- Expose canonical `ChunkKey` encoding and decoding for chunk-coordinate storage.
