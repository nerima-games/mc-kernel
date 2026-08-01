/**
 * Block PROPERTIES — the non-boolean half of the block behaviour model.
 *
 * Sibling of `./block-capabilities`. Same override-plus-default shape, same
 * additive-safety guarantee, but each property carries its own value type
 * instead of being a boolean. `docs/capability-flag-audit.md` is the
 * authoritative source for the list and for every default below.
 *
 * ---------------------------------------------------------------------------
 * Why this cannot be folded into the boolean flag table
 * ---------------------------------------------------------------------------
 *
 * Audit §5 found that three of the capabilities plan.md §3.1 spelled as
 * booleans are the wrong TYPE, not merely under-specified:
 *
 *   `emissive: boolean`    -> `lightEmission: 0..15`
 *       `light.ts:24-46` already promotes the boolean to a number via
 *       `EMISSIVE_LEVEL_OVERRIDES` (LAVA 15, TORCH 14, NETHER_PORTAL 11,
 *       REDSTONE_ORE 9, REDSTONE_TORCH 7, END_PORTAL_FRAME 1). The boolean was
 *       already a lie in the reference implementation.
 *
 *   `transparent: boolean` -> `opacity: 'opaque'|'transparentSolid'|'fluid'`
 *       `meshing-worker-config.ts:7-13` keeps TWO disjoint sets —
 *       `TRANSPARENT_IDS_ARRAY` (WATER, water shader) and
 *       `TRANSPARENT_SOLID_IDS_ARRAY` (GLASS/LEAVES, atlas + alpha). plan.md
 *       §3.3 independently requires a three-way render priority
 *       `transparentSolid > water > opaque`. One boolean cannot carry three
 *       states.
 *
 *   `fluid: boolean`       -> `'none'|'water'|'lava'`
 *       `greedy-meshing-fluid-state.ts:27` (`fluidTypeForBlockId`),
 *       `block-service-place-commit.ts:16-23`, `bucket-handler.ts:13,16` all
 *       branch on WHICH fluid, not on whether-fluid.
 *
 * Audit §7 adds the general rule: *非 boolean 能力を最初から数値で持つ。boolean
 * から数値へ広げるのは破壊的変更になる。* Widening `emissive: boolean` to
 * `lightEmission: number` after 14 repositories have pinned the kernel is a
 * five-deep republish cascade. Getting the type right now costs nothing.
 *
 * ---------------------------------------------------------------------------
 * Additive safety, restated for properties
 * ---------------------------------------------------------------------------
 *
 * A definition supplies overrides only; anything omitted resolves to the
 * documented default. Adding a property is therefore semver-MINOR.
 *
 * Unlike the flag table, the value types cannot be inferred from the defaults
 * (a default of `'opaque'` would narrow `opacity` to that one literal), so a
 * property costs TWO edits: one line in `BlockProperties` and one line in
 * `BLOCK_PROPERTY_DEFAULTS`. The `satisfies` on the defaults constant makes a
 * property without a default a compile error, so the "cannot exist without a
 * default" guarantee survives the split.
 */
import type { BlockDropRule, HarvestToolRequirement } from './block-harvest'
import { DEFAULT_BLOCK_DROP, DEFAULT_HARVEST_TOOL } from './block-harvest'
import type { SupportRule } from './block-support'
import { NEEDS_NO_SUPPORT } from './block-support'

// ---------------------------------------------------------------------------
// Value vocabularies
// ---------------------------------------------------------------------------

/**
 * Meshing bucket and light attenuation class (audit §4.4).
 *
 * Ordered here as plan.md §3.3 orders the render priority:
 * `transparentSolid > fluid > opaque`.
 */
export const BLOCK_OPACITIES = ['transparentSolid', 'fluid', 'opaque'] as const
export type BlockOpacity = (typeof BLOCK_OPACITIES)[number]

/** Which fluid, not whether-fluid (audit §4.2). */
export const FLUID_KINDS = ['none', 'water', 'lava'] as const
export type FluidKind = (typeof FLUID_KINDS)[number]

/** Collision hull shape (audit §4.1, `block-collision-predicates.ts:136-139`). */
export const COLLISION_SHAPES = ['full', 'slab', 'cactus', 'pressurePlate', 'none'] as const
export type CollisionShape = (typeof COLLISION_SHAPES)[number]

/** Mesh generation shape (audit §4.8, `plant-mesh.ts:18-49`). */
export const RENDER_KINDS = ['cube', 'cross', 'cactus', 'rail', 'lilyPad', 'fluid'] as const
export type RenderKind = (typeof RENDER_KINDS)[number]

/** Vehicle running surface (audit §4.1, `block-collision-predicates.ts:184-201`). */
export const RAIL_KINDS = ['none', 'normal', 'powered'] as const
export type RailKind = (typeof RAIL_KINDS)[number]

/** Emitted light level. 4-bit light grid, so the range is 0..15 inclusive. */
export const LIGHT_LEVEL_MIN = 0
export const LIGHT_LEVEL_MAX = 15

/** Guard for values arriving from save files or a developer console. */
export const isLightLevel = (value: number): boolean =>
  Number.isInteger(value) && value >= LIGHT_LEVEL_MIN && value <= LIGHT_LEVEL_MAX

/** Clamp into the 4-bit light range. Used when combining emission with attenuation. */
export const clampLightLevel = (value: number): number =>
  Math.min(LIGHT_LEVEL_MAX, Math.max(LIGHT_LEVEL_MIN, Math.trunc(value)))

// ---------------------------------------------------------------------------
// The property table
// ---------------------------------------------------------------------------

/**
 * A fully resolved property set: every property present, no ambiguity.
 * Produced by `resolveBlockProperties`; never written by hand — a hand-written
 * literal gains a required key whenever a property is added, which is the
 * breakage this design exists to avoid.
 */
export type BlockProperties = {
  /** Meshing bucket + light attenuation class. Audit §4.4. */
  readonly opacity: BlockOpacity
  /** Emitted light level, 0..15. Audit §4.4, `light.ts:24-46`. */
  readonly lightEmission: number
  /** Which fluid this block is, if any. Audit §4.2. */
  readonly fluid: FluidKind
  /** Collision hull. Audit §4.1. */
  readonly collisionShape: CollisionShape
  /** Mesh shape. Audit §4.8. */
  readonly renderKind: RenderKind
  /** Break-time base, 0..100. Audit §4.5, `break-speed.ts:6-43`. */
  readonly hardness: number
  /** Surface friction, 0..1. Audit §4.5, `block-collision-predicates.ts:61-63,152-161`. */
  readonly friction: number
  /** Damage per contact tick (LAVA 4, CACTUS 1). Audit §4.7. */
  readonly contactDamage: number
  /** Movement slowdown while inside (cobweb). Audit §4.1, `:203-208`. */
  readonly movementDrag: number
  /** Experience granted on break. Audit §4.5, `blocks.config.ores.ts:8-45`. */
  readonly xpOnBreak: number
  /** Rail behaviour. Audit §4.1. */
  readonly railKind: RailKind
  /** Tool family + minimum tier. Audit §4.5. See `./block-harvest`. */
  readonly harvestTool: HarvestToolRequirement
  /** What breaking it yields. Audit §4.5. See `./block-harvest`. */
  readonly drops: BlockDropRule
  /** What must be in the cell below. Audit §4.6. See `./block-support`. */
  readonly supportRule: SupportRule
}

/**
 * THE property defaults. Audit §7: 既定値は「普通の不透明立方体」に倒す — every
 * value below is what an ordinary opaque solid cube would want, so a definition
 * that says nothing describes stone rather than describing nothing.
 *
 * The `: BlockProperties` annotation is load-bearing: a property declared above
 * without a default here fails to compile. It is an annotation rather than
 * `as const satisfies` so that `BLOCK_PROPERTY_DEFAULTS[name]` types as
 * `BlockProperties[K]` for a generic `K`, which is what lets `propertyOf` be
 * generic without a cast.
 */
export const BLOCK_PROPERTY_DEFAULTS: BlockProperties = {
  opacity: 'opaque',
  lightEmission: LIGHT_LEVEL_MIN,
  fluid: 'none',
  collisionShape: 'full',
  renderKind: 'cube',
  /** `blocks.config.terrain.ts:9-14` `defaultBlockProperties`. */
  hardness: 8,
  /** `DEFAULT_BLOCK_FRICTION` in the reference. */
  friction: 0.6,
  contactDamage: 0,
  movementDrag: 0,
  xpOnBreak: 0,
  railKind: 'none',
  harvestTool: DEFAULT_HARVEST_TOOL,
  drops: DEFAULT_BLOCK_DROP,
  /** Audit §4.6: 既定値 `supportRule='none'`. An ordinary cube needs no floor. */
  supportRule: NEEDS_NO_SUPPORT,
}

/** Derived from the defaults table, exactly as `BlockCapabilityFlag` is. */
export type BlockPropertyName = keyof BlockProperties

/** Iteration order is the declaration order of `BLOCK_PROPERTY_DEFAULTS`. */
export const BLOCK_PROPERTY_NAMES: ReadonlyArray<BlockPropertyName> = Object.keys(
  BLOCK_PROPERTY_DEFAULTS,
) as ReadonlyArray<BlockPropertyName>

/**
 * What a block definition actually declares. Every key optional — omission is
 * meaningful and means "take the default".
 */
export type BlockPropertyOverrides = {
  readonly [K in BlockPropertyName]?: BlockProperties[K]
}

/**
 * Fill in the defaults for every property the overrides do not mention.
 *
 * A plain spread is correct here because `exactOptionalPropertyTypes` is on:
 * an optional key is either absent or carries a real value, so `{ opacity:
 * undefined }` is not expressible and cannot blank out a default.
 */
export const resolveBlockProperties = (overrides: BlockPropertyOverrides): BlockProperties => ({
  ...BLOCK_PROPERTY_DEFAULTS,
  ...overrides,
})

/**
 * Read one property without materialising the whole set. Semantically identical
 * to `resolveBlockProperties(overrides)[name]`.
 */
export const propertyOf = <K extends BlockPropertyName>(
  overrides: BlockPropertyOverrides,
  name: K,
): BlockProperties[K] => overrides[name] ?? BLOCK_PROPERTY_DEFAULTS[name]
