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
export const isLightLevel = (value: number): value is LightLevel =>
  Number.isInteger(value) && value >= LIGHT_LEVEL_MIN && value <= LIGHT_LEVEL_MAX

export const LightLevel: Brand.Brand.Constructor<LightLevel> = Brand.refined<LightLevel>(
  isLightLevel,
  (value) =>
    Brand.error(
      `LightLevel must be an integer in [${LIGHT_LEVEL_MIN}, ${LIGHT_LEVEL_MAX}], received ${value}`,
    ),
)

/** Clamp into the four-bit light range. */
export const clampLightLevel = (value: number): LightLevel =>
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
  readonly hardness: number
  /** Surface friction, 0..1. */
  readonly friction: number
  /**
   * How much explosive power a normal creeper/TNT-class explosion needs to
   * destroy this block; `Infinity` for a block no such explosion can ever
   * destroy. `./explosion.ts`'s `resistsExplosion(id, power)` reads this
   * column directly.
   */
  readonly blastResistance: number
  /** Damage per contact tick. */
  readonly contactDamage: number
  /** Movement slowdown while inside. */
  readonly movementDrag: number
  /** Experience granted on break. */
  readonly xpOnBreak: number
  /** Rail behaviour. */
  readonly railKind: RailKind
  /** Tool family and minimum tier. */
  readonly harvestTool: HarvestToolRequirement
  /** What breaking it yields. */
  readonly drops: BlockDropRule
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
  hardness: 8,
  friction: 0.6,
  blastResistance: 0,
  contactDamage: 0,
  movementDrag: 0,
  xpOnBreak: 0,
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
type BlockPropertyOverrideValue<K extends BlockPropertyName> =
  K extends 'lightEmission' ? number | LightLevel : BlockProperties[K]

export type BlockPropertyOverrides = {
  readonly [K in BlockPropertyName]?: BlockPropertyOverrideValue<K>
}
