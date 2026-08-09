/** Shared values used by the canonical block registry fragments. */

import { DEFAULT_BLOCK_DROP, DEFAULT_HARVEST_TOOL } from './block-harvest.js'
import type { SupportRule } from './block-support.js'
import { needsOneOf } from './block-support.js'
import { StackCount } from './quantities.js'

/** A block that yields no item, to any tool. */
export const DROPS_NOTHING = { ...DEFAULT_BLOCK_DROP, count: StackCount(0) } as const

/** The four reference pickaxe tier gates. */
export const NEEDS_WOODEN_PICKAXE = {
  ...DEFAULT_HARVEST_TOOL,
  category: 'pickaxe',
  minTier: 'wooden',
} as const
export const NEEDS_STONE_PICKAXE = {
  ...DEFAULT_HARVEST_TOOL,
  category: 'pickaxe',
  minTier: 'stone',
} as const
export const NEEDS_IRON_PICKAXE = {
  ...DEFAULT_HARVEST_TOOL,
  category: 'pickaxe',
  minTier: 'iron',
} as const
export const NEEDS_DIAMOND_PICKAXE = {
  ...DEFAULT_HARVEST_TOOL,
  category: 'pickaxe',
  minTier: 'diamond',
} as const

/** Category-only requirements: faster with the named tool, but not gated. */
export const FASTER_WITH_SHOVEL = { ...DEFAULT_HARVEST_TOOL, category: 'shovel' } as const
export const FASTER_WITH_AXE = { ...DEFAULT_HARVEST_TOOL, category: 'axe' } as const
export const FASTER_WITH_SHEARS = { ...DEFAULT_HARVEST_TOOL, category: 'shears' } as const

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
