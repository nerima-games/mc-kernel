/**
 * Closed value vocabularies, resolved-property types, and defaults for blocks.
 *
 * This module is deliberately data-only. Runtime validation and resolution
 * live in `./block-property-validation` so the table can be read without
 * mixing it with external-input handling.
 */
import { Brand } from 'effect'
import {
  DEFAULT_BLOCK_DROP,
  DEFAULT_HARVEST_TOOL,
  type BlockDropRule,
  type HarvestToolRequirement,
} from './block-harvest-data.js'
import type { SupportRule } from './block-support-data.js'
import { NEEDS_NO_SUPPORT } from './block-support-data.js'

// ---------------------------------------------------------------------------
// Value vocabularies
// ---------------------------------------------------------------------------

/** Meshing bucket and light attenuation class. */
export const BLOCK_OPACITIES = ['transparentSolid', 'fluid', 'opaque'] as const
export type BlockOpacity = (typeof BLOCK_OPACITIES)[number]

/** Which fluid, not whether-fluid. */
export const FLUID_KINDS = ['none', 'water', 'lava'] as const
export type FluidKind = (typeof FLUID_KINDS)[number]

/** Collision hull shape. */
export const COLLISION_SHAPES = ['full', 'slab', 'cactus', 'pressurePlate', 'none'] as const
export type CollisionShape = (typeof COLLISION_SHAPES)[number]

/** Mesh generation shape. */
export const RENDER_KINDS = ['cube', 'cross', 'cactus', 'rail', 'lilyPad', 'fluid'] as const
export type RenderKind = (typeof RENDER_KINDS)[number]

/** Surface material used by the gameplay footstep rule. */
export const FOOTSTEP_MATERIALS = ['default', 'grass', 'wood', 'stone'] as const
export type FootstepMaterial = (typeof FOOTSTEP_MATERIALS)[number]

/** Vehicle running surface. */
export const RAIL_KINDS = ['none', 'normal', 'powered'] as const
export type RailKind = (typeof RAIL_KINDS)[number]

/** Emitted light level. The light grid uses four bits, so the range is 0..15. */
export const LIGHT_LEVEL_MIN = 0
export const LIGHT_LEVEL_MAX = 15

export type LightLevel = number & Brand.Brand<'LightLevel'>

/** Guard for values arriving from save files or a developer console. */
export const isLightLevel = (value: unknown): value is LightLevel =>
  typeof value === 'number' && Number.isInteger(value) && value >= LIGHT_LEVEL_MIN && value <= LIGHT_LEVEL_MAX

export const LightLevel: Brand.Constructor<LightLevel> = Brand.make<LightLevel>(
  (value) =>
    isLightLevel(value)
      ? true
      : `LightLevel must be an integer in [${LIGHT_LEVEL_MIN}, ${LIGHT_LEVEL_MAX}], received ${value}`,
)

/** Non-NaN numeric input to light-level clamping; infinities clamp to the nearest bound. */
export type LightLevelCandidate = number & Brand.Brand<'LightLevelCandidate'>
export const LightLevelCandidate: Brand.Constructor<LightLevelCandidate> = Brand.make<LightLevelCandidate>(
  (value) =>
    !Number.isNaN(value)
      ? true
      : `LightLevelCandidate must not be NaN, received ${value}`,
)

/** Mining resistance. `-1` is the explicit unbreakable sentinel. */
export type BlockHardness = number & Brand.Brand<'BlockHardness'>
export const BlockHardness: Brand.Constructor<BlockHardness> = Brand.make<BlockHardness>(
  (value) =>
    Number.isFinite(value) && (value >= 0 || value === -1)
      ? true
      : `BlockHardness must be finite and non-negative or -1, received ${value}`,
)

/** Surface friction coefficient in [0, 1]. */
export type BlockFriction = number & Brand.Brand<'BlockFriction'>
export const BlockFriction: Brand.Constructor<BlockFriction> = Brand.make<BlockFriction>(
  (value) =>
    Number.isFinite(value) && value >= 0 && value <= 1
      ? true
      : `BlockFriction must be finite and in [0, 1], received ${value}`,
)

/** Explosion power needed to destroy a block; positive infinity is indestructible. */
export type BlockBlastResistance = number & Brand.Brand<'BlockBlastResistance'>
export const BlockBlastResistance: Brand.Constructor<BlockBlastResistance> = Brand.make<BlockBlastResistance>(
  (value) =>
    !Number.isNaN(value) && value >= 0
      ? true
      : `BlockBlastResistance must be non-negative or Infinity, received ${value}`,
)

/** Damage dealt by one contact tick. */
export type BlockContactDamage = number & Brand.Brand<'BlockContactDamage'>
export const BlockContactDamage: Brand.Constructor<BlockContactDamage> = Brand.make<BlockContactDamage>(
  (value) =>
    Number.isFinite(value) && value >= 0
      ? true
      : `BlockContactDamage must be finite and non-negative, received ${value}`,
)

/** Movement slowdown applied while inside the block. */
export type BlockMovementDrag = number & Brand.Brand<'BlockMovementDrag'>
export const BlockMovementDrag: Brand.Constructor<BlockMovementDrag> = Brand.make<BlockMovementDrag>(
  (value) =>
    Number.isFinite(value) && value >= 0
      ? true
      : `BlockMovementDrag must be finite and non-negative, received ${value}`,
)

/** Experience awarded when the block breaks. */
export type BlockExperiencePoints = number & Brand.Brand<'BlockExperiencePoints'>
export const BlockExperiencePoints: Brand.Constructor<BlockExperiencePoints> = Brand.make<BlockExperiencePoints>(
  (value) =>
    Number.isFinite(value) && value >= 0
      ? true
      : `BlockExperiencePoints must be finite and non-negative, received ${value}`,
)

/** Clamp into the four-bit light range. */
export const clampLightLevel = (value: LightLevelCandidate): LightLevel =>
  LightLevel(Math.min(LIGHT_LEVEL_MAX, Math.max(LIGHT_LEVEL_MIN, Math.trunc(value))))

// ---------------------------------------------------------------------------
// The property table
// ---------------------------------------------------------------------------

/** A fully resolved property set with every property present. */
export type BlockProperties = {
  /** Meshing bucket and light attenuation class. */
  readonly opacity: BlockOpacity
  /** Emitted light level, 0..15. */
  readonly lightEmission: LightLevel
  /** Which fluid this block is, if any. */
  readonly fluid: FluidKind
  /** Collision hull. */
  readonly collisionShape: CollisionShape
  /** Mesh shape. */
  readonly renderKind: RenderKind
  /** Sound material selected by the gameplay footstep rule. */
  readonly footstepMaterial: FootstepMaterial
  /** Reference-scale break-time base; -1 is the explicit unbreakable sentinel. */
  readonly hardness: BlockHardness
  /** Surface friction, 0..1. */
  readonly friction: BlockFriction
  /**
   * How much explosive power a normal creeper/TNT-class explosion needs to
   * destroy this block; `Infinity` for a block no such explosion can ever
   * destroy. `./explosion.ts`'s `resistsExplosion(id, power)` reads this
   * column directly.
   */
  readonly blastResistance: BlockBlastResistance
  /** Damage per contact tick. */
  readonly contactDamage: BlockContactDamage
  /** Movement slowdown while inside. */
  readonly movementDrag: BlockMovementDrag
  /** Experience granted on break. */
  readonly xpOnBreak: BlockExperiencePoints
  /** Rail behaviour. */
  readonly railKind: RailKind
  /** Tool family and minimum tier. */
  readonly harvestTool: HarvestToolRequirement
  /** What breaking it yields. */
  readonly drops: BlockDropRule | undefined
  /** What must be in the cell below. */
  readonly supportRule: SupportRule
}

/** Defaults for an ordinary opaque solid cube. */
export const BLOCK_PROPERTY_DEFAULTS: BlockProperties = {
  opacity: 'opaque',
  lightEmission: LightLevel(LIGHT_LEVEL_MIN),
  fluid: 'none',
  collisionShape: 'full',
  renderKind: 'cube',
  footstepMaterial: 'default',
  hardness: BlockHardness(8),
  friction: BlockFriction(0.6),
  blastResistance: BlockBlastResistance(0),
  contactDamage: BlockContactDamage(0),
  movementDrag: BlockMovementDrag(0),
  xpOnBreak: BlockExperiencePoints(0),
  railKind: 'none',
  harvestTool: DEFAULT_HARVEST_TOOL,
  drops: DEFAULT_BLOCK_DROP,
  supportRule: NEEDS_NO_SUPPORT,
}

/** A property key in the resolved table. */
export type BlockPropertyName = keyof BlockProperties

/** Reference-scale hardness sentinel for blocks that cannot be mined. */
export const UNBREAKABLE_HARDNESS = -1

/** Iteration order is the declaration order of `BLOCK_PROPERTY_DEFAULTS`. */
export const BLOCK_PROPERTY_NAMES: ReadonlyArray<BlockPropertyName> = Object.keys(
  BLOCK_PROPERTY_DEFAULTS,
).filter((key): key is BlockPropertyName => Object.hasOwn(BLOCK_PROPERTY_DEFAULTS, key))

/** Optional values a block definition may override. */
export type BlockPropertyOverrides = {
  readonly [K in BlockPropertyName]?: BlockProperties[K]
}
