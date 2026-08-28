/**
 * Data-only vocabulary and defaults for block harvesting.
 *
 * Runtime resolution lives in `block-harvest.ts`. Keeping these values here
 * lets registry tables depend on the contract without depending on resolver
 * logic.
 */
import type { ItemType } from './item-type.js'
import { StackCount, type StackCount as StackCountValue } from './quantities.js'

export const HARVEST_TOOL_CATEGORIES = ['none', 'pickaxe', 'axe', 'shovel', 'hoe', 'shears', 'sword'] as const
export type HarvestToolCategory = (typeof HARVEST_TOOL_CATEGORIES)[number]

export const HARVEST_TIERS = ['none', 'wooden', 'stone', 'iron', 'diamond', 'netherite'] as const
export type HarvestTier = (typeof HARVEST_TIERS)[number]

export type HarvestToolRequirement = {
  /** Which tool family mines this fastest. Speed only; never gates the drop. */
  readonly category: HarvestToolCategory
  /** The minimum tier that makes this block drop anything at all. */
  readonly minTier: HarvestTier
}

export const DEFAULT_HARVEST_TOOL: HarvestToolRequirement = {
  category: 'none',
  minTier: 'none',
}

export type BlockDropRule = {
  /** `'self'` means the item form of the block being broken. */
  readonly item: ItemType | 'self'
  /** Item yielded by Silk Touch instead of `item`; omitted when the normal drop is correct. */
  readonly silkTouchItem?: ItemType
  /** Base count before fortune. `0` means that the block drops nothing. */
  readonly count: StackCountValue
  /** Only drops at all when mined with a silk-touch tool. */
  readonly requiresSilkTouch: boolean
  /** Fortune multiplies `count`; the random multiplication belongs to gameplay. */
  readonly affectedByFortune: boolean
}

export type BlockDrop = {
  readonly item: ItemType
  readonly count: StackCountValue
  readonly affectedByFortune: boolean
}

export const DEFAULT_BLOCK_DROP: BlockDropRule = {
  affectedByFortune: false,
  count: StackCount(1),
  item: 'self',
  requiresSilkTouch: false,
}
