---
"@nerima-games/mc-kernel": minor
---

**Three new shared-vocabulary domains, plus a memory-regression fix with no public-behaviour change.**

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
