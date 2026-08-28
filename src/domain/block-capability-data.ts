/**
 * Block capability data — the boolean half of the block behaviour model.
 *
 * The authoritative source for which capabilities exist, what type each one
 * must have, and what each one must default to, is
 * `historical design audit` (28 rows in its §3 table; its §7 prose says
 * "26", which is an internal inconsistency in the audit — the table is what is
 * implemented against). Every flag below carries the audit reference that
 * justifies it.
 *
 * ---------------------------------------------------------------------------
 * Why there are two mechanisms
 * ---------------------------------------------------------------------------
 *
 * This file holds capabilities whose answer is genuinely yes/no. Capabilities
 * whose answer is a level, a shape, a material or a struct live in
 * `./block-properties` (and, for the two most volatile structs, in
 * `./block-harvest`). The audit is explicit that three of the capabilities
 * the design contract listed as booleans are NOT booleans:
 *
 *   - `emissive: boolean`   -> `lightEmission: 0..15`   (audit §4.4, light.ts:24-46)
 *   - `transparent: boolean`-> `opacity: 3-value enum`  (audit §4.4, meshing-worker-config.ts:7-13)
 *   - `fluid: boolean`      -> `'none'|'water'|'lava'`  (audit §4.2, greedy-meshing-fluid-state.ts:27)
 *
 * They are therefore absent from the table below, and `test/block-capabilities.test.ts`
 * pins their absence so that a future edit cannot quietly re-flatten them.
 *
 * ---------------------------------------------------------------------------
 * Additive safety (the property that makes this whole design worth having)
 * ---------------------------------------------------------------------------
 *
 * A block definition supplies OVERRIDES ONLY (`BlockCapabilityOverrides`, every
 * key optional). Anything it omits resolves to the documented default. Adding a
 * flag therefore means adding exactly one line to `BLOCK_CAPABILITY_DEFAULTS`;
 * every existing block definition in all 15 other repositories keeps compiling
 * and keeps its previous behaviour. That makes flag introduction a semver-MINOR
 * change rather than a breaking change rippling across 14 pinned consumers.
 *
 * `BlockCapabilityFlag` is DERIVED from `BLOCK_CAPABILITY_DEFAULTS` rather than
 * declared alongside it. This is load-bearing: it is structurally impossible to
 * add a flag without also declaring its default.
 *
 * The two things a consumer must NOT do, or the additive guarantee is lost:
 *
 *   1. Do not construct a `BlockCapabilities` literal. Declare a
 *      `BlockCapabilityOverrides` literal and resolve it. A fully-populated
 *      record gains a required key whenever a flag is added, which is exactly
 *      the breakage this design avoids.
 *   2. Do not write an exhaustive `switch` over `BlockCapabilityFlag` without a
 *      `default` branch. Iterate `BLOCK_CAPABILITY_FLAGS` instead.
 *
 * ---------------------------------------------------------------------------
 * Default-choice policy
 * ---------------------------------------------------------------------------
 *
 * Audit §7: 既定値は「普通の不透明立方体」に倒す — every default is the reading an
 * ordinary opaque solid cube would want. For most flags that is `false`, and
 * such a flag is phrased so that `false` is the inert, conservative reading
 * (`passable`, never `solid`).
 *
 * THREE flags default to `true`, because for an ordinary cube the true answer
 * IS true, and the reference implementation correspondingly stores them as
 * negative membership lists rather than positive ones:
 *
 *   - `suffocates`            <- `NON_SUFFOCATING_BLOCKS`      (environment-hazard.config.ts:39-85, ~45 entries)
 *   - `canSupportAttachments` <- `NON_SUPPORTING_BLOCK_TYPES`  (block-support.ts:47-61)
 *   - `validSpawnSurface`     <- `NON_SPAWN_SURFACE_BLOCK_IDS` (spawn-selection-search.ts:41-60)
 *
 * This supersedes the pre-audit "every default is false" rule, which was a
 * property of a guessed 7-flag set rather than of the mechanism. The exact
 * default of every flag, and the exact identity of these three, is pinned
 * value-by-value in `test/block-capabilities.test.ts` — a strictly stronger
 * assertion than the blanket rule it replaces.
 *
 * ---------------------------------------------------------------------------
 * Do NOT collapse these into one `solid` flag (audit §4.9)
 * ---------------------------------------------------------------------------
 *
 * The reference re-lists "the non-solid blocks" in FIVE places with DIFFERENT
 * membership. GLASS is non-suffocating and not a spawn surface but IS solid for
 * collision; LEAVES is not a spawn surface and does not suffocate but IS solid
 * for collision (block-collision-predicates.ts:18-21 records the canopy
 * fall-through bug that listing it caused); SNOW is non-supporting but not
 * passable. `passable`, `suffocates`, `canSupportAttachments`,
 * `validSpawnSurface` and `collisionShape` are therefore five independent
 * capabilities, and `test/block-capabilities.test.ts` pins the GLASS, LEAVES
 * and SNOW rows so a future refactor cannot silently merge them.
 */

/**
 * THE flag table. Adding a flag = adding one line here and its corresponding
 * literal property in `BlockCapabilityDefaults` below.
 *
 * Each entry cites the audit section and the reference-implementation site that
 * justifies its existence and its default.
 */
type BlockCapabilityDefaults = Readonly<{
  readonly passable: false
  readonly fallsWhenUnsupported: false
  readonly replaceable: false
  readonly flammable: false
  readonly fireSource: false
  readonly pistonImmovable: false
  readonly brokenByWaterFlow: false
  readonly climbable: false
  readonly suffocates: true
  readonly canSupportAttachments: true
  readonly validSpawnSurface: true
  readonly tillable: false
}>

const BLOCK_CAPABILITY_DEFAULTS: BlockCapabilityDefaults = {
  /**
   * Entities move through it without collision. `false` = solid.
   * Audit §4.1 — `block-collision-predicates.ts:22-44` (`PASSABLE_BLOCK_IDS`, 19 entries).
   */
  passable: false,

  /**
   * Becomes a falling entity when the block beneath it is removed (sand, gravel).
   * Audit §3 — `falling-block.ts`.
   */
  fallsWhenUnsupported: false,

  /**
   * Placement, falling blocks and fluid flow may overwrite this cell.
   * Audit §4.2 — `block-service-place-load.ts:50`, `falling-block.ts:15-19`.
   */
  replaceable: false,

  /**
   * Can be ignited and can propagate fire to neighbours.
   * Audit §4.3 — `fire-lifecycle.ts:18-30` (`FLAMMABLE_BLOCK_TYPES`, 11 entries).
   */
  flammable: false,

  /**
   * Supports a permanent fire on top of it (NETHERRACK, LAVA). A separate
   * concept from `flammable`: a fire source does not itself burn away.
   * Audit §4.3 — `fire-lifecycle.ts:77-78` (`isFireSourceIndex`).
   */
  fireSource: false,

  /**
   * A piston can neither push nor pull it (bedrock, obsidian-class blocks).
   * the design contract wants this in kernel; the reference had it as a local constant.
   */
  pistonImmovable: false,

  /**
   * Destroyed when flowing water reaches it (torches, crops, plants).
   * Audit §4.6 — `block-support.ts:34-45` -> `isWaterBreakableBlockIndex` (:103).
   */
  brokenByWaterFlow: false,

  /**
   * Can be climbed vertically (ladder, vines).
   * Audit §4.1 — `block-collision-predicates.ts:177-182` (`isInLadder`).
   */
  climbable: false,

  /**
   * An entity whose head is inside this block takes suffocation damage.
   * DEFAULT `true` — the reference stores the NEGATIVE list.
   * Audit §4.7 — `environment-hazard.config.ts:39-85` -> `isSuffocatingBlock`.
   *
   * NOT derivable from `passable && opacity`: the negative list contains GLASS,
   * STONE_SLAB and OAK_STAIRS, none of which are passable and only one of which
   * is non-opaque (audit §4.7 checked this explicitly and concluded derivation is
   * impossible). The audit does note that `passable === true` should imply
   * `suffocates === false`; that one-way implication is documented rather than
   * silently coerced here, so that a definition which states both loudly is a
   * reviewable mistake rather than an invisible one.
   */
  suffocates: true,

  /**
   * Torches, rails, pressure plates and plants may be attached to / stand on it.
   * DEFAULT `true` — the reference stores the NEGATIVE list.
   * Audit §4.6 — `block-support.ts:47-61` (`NON_SUPPORTING_BLOCK_TYPES`).
   */
  canSupportAttachments: true,

  /**
   * Mobs and village placement may use the top face of this block as ground.
   * DEFAULT `true` — the reference stores the NEGATIVE list, twice and
   * inconsistently (`spawn-selection-search.ts:41-60` and
   * `village-placement-surface.ts:6-12` are near-duplicates that disagree).
   * Audit §4.8 / §4.9.
   */
  validSpawnSurface: true,

  /**
   * A hoe can convert this block into farmland.
   * Audit §4.8 / §5-20 — `block-service.config.ts:264-267`.
   */
  tillable: false,
}

export { BLOCK_CAPABILITY_DEFAULTS }

/** Derived from the defaults table — a flag cannot exist without a default. */
export type BlockCapabilityFlag = keyof typeof BLOCK_CAPABILITY_DEFAULTS

/** Iteration order is the declaration order of `BLOCK_CAPABILITY_DEFAULTS`. */
export const BLOCK_CAPABILITY_FLAGS: ReadonlyArray<BlockCapabilityFlag> = Object.keys(
  BLOCK_CAPABILITY_DEFAULTS,
).filter((key): key is BlockCapabilityFlag => Object.hasOwn(BLOCK_CAPABILITY_DEFAULTS, key))

/**
 * The flags whose default is `true` (see the default-choice policy above).
 * Exported so that the rule is data a test can check rather than prose a
 * reviewer has to remember.
 */
export const TRUE_BY_DEFAULT_CAPABILITY_FLAGS: ReadonlyArray<BlockCapabilityFlag> = [
  'suffocates',
  'canSupportAttachments',
  'validSpawnSurface',
]

/**
 * A fully resolved capability set: every flag present, no ambiguity.
 * Produced by `resolveBlockCapabilities`; never written by hand (see rule 1 above).
 */
export type BlockCapabilities = {
  readonly [capabilityFlag in BlockCapabilityFlag]: boolean
}

/**
 * What a block definition actually declares. Every key optional — omission is
 * meaningful and means "take the default".
 */
export type BlockCapabilityOverrides = {
  readonly [capabilityFlag in BlockCapabilityFlag]?: boolean
}
