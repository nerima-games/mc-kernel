/** Shared values used by the canonical block registry fragments. */

import type { BlockDropRule } from './block-harvest-data.js'
import type { SupportRule } from './block-support-data.js'
import { needsOneOf } from './block-support-data.js'
import { StackCount } from './quantities.js'

/** A block that yields no item, to any tool. */
export const DROPS_NOTHING: BlockDropRule = {
  affectedByFortune: false,
  count: StackCount(0),
  item: 'self',
  requiresSilkTouch: false,
}

/** The four reference pickaxe tier gates. */
export const NEEDS_WOODEN_PICKAXE = {
  category: 'pickaxe',
  minTier: 'wooden',
} as const
export const NEEDS_STONE_PICKAXE = {
  category: 'pickaxe',
  minTier: 'stone',
} as const
export const NEEDS_IRON_PICKAXE = {
  category: 'pickaxe',
  minTier: 'iron',
} as const
export const NEEDS_DIAMOND_PICKAXE = {
  category: 'pickaxe',
  minTier: 'diamond',
} as const

/** Category-only requirements: faster with the named tool, but not gated. */
export const FASTER_WITH_SHOVEL = { category: 'shovel', minTier: 'none' } as const
export const FASTER_WITH_AXE = { category: 'axe', minTier: 'none' } as const
export const FASTER_WITH_SHEARS = { category: 'shears', minTier: 'none' } as const

/** Shared capabilities for the small surface plants. */
export const SURFACE_PLANT_CAPABILITIES = {
  passable: true,
  brokenByWaterFlow: true,
  canSupportAttachments: false,
  suffocates: false,
  validSpawnSurface: false,
} as const

/** Shared properties for the small plant rows. */
export const PLANT_PROPERTIES = {
  opacity: 'transparentSolid',
  collisionShape: 'none',
  hardness: 0,
  friction: 0,
} as const

/** Named support rules transcribed from the reference. */
export const NEEDS_FARMLAND: SupportRule = needsOneOf('farmland')
export const NEEDS_SOUL_SAND: SupportRule = needsOneOf('soul_sand')
export const NEEDS_PLANTABLE_GROUND: SupportRule = needsOneOf('dirt', 'grass_block', 'farmland')
export const NEEDS_SUGAR_CANE_GROUND: SupportRule = needsOneOf('dirt', 'grass_block', 'sand', 'sugar_cane')
export const NEEDS_SAND_OR_CACTUS: SupportRule = needsOneOf('sand', 'cactus')
export const NEEDS_WATER: SupportRule = needsOneOf('water')
