/**
 * Public harvesting boundary for block drops and tool requirements.
 *
 * The vocabulary and defaults live in `block-harvest-data.ts` so registry
 * tables can depend on data without importing resolution logic. This module
 * owns the pure decisions that combine those values.
 */
import { itemOfBlock } from './block-item.js'
import {
  HARVEST_TIERS,
  type BlockDrop,
  type BlockDropRule,
  type HarvestTier,
  type HarvestToolRequirement,
} from './block-harvest-data.js'
import type { BlockType } from './block-type.js'
import type { ItemType } from './item-type.js'

export * from './block-harvest-data.js'

/** Does a held tool tier satisfy the block's minimum tier requirement? */
export const satisfiesHarvestTier = (requirement: HarvestToolRequirement, heldTier: HarvestTier): boolean =>
  HARVEST_TIERS.indexOf(heldTier) >= HARVEST_TIERS.indexOf(requirement.minTier)

/**
 * Resolve the `'self'` sentinel against the block being broken.
 *
 * A block such as air can have no item form, so the general overload is
 * partial. The narrower overload remains total for callers that already know
 * the block has an item representation.
 */
export function resolveDropItem(rule: BlockDropRule, brokenBlock: ItemType & BlockType, silkTouch?: boolean): ItemType
export function resolveDropItem(rule: BlockDropRule, brokenBlock: BlockType, silkTouch?: boolean): ItemType | undefined
export function resolveDropItem(
  rule: BlockDropRule,
  brokenBlock: BlockType,
  silkTouch = false,
): ItemType | undefined {
  const item = silkTouch && rule.silkTouchItem !== undefined ? rule.silkTouchItem : rule.item
  return item === 'self' ? itemOfBlock(brokenBlock) : item
}

/** Context that affects whether a block produces an inventory drop. */
export type HarvestContext = {
  readonly heldTier?: HarvestTier
  readonly silkTouch?: boolean
}

/** Bare hands with no enchantments. */
export const BARE_HANDED: HarvestContext = {}

/**
 * Resolve a block's drop rule without applying random Fortune multiplication.
 *
 * Fortune belongs to the gameplay layer, so the kernel reports the base count
 * and whether Fortune applies. `undefined` means that no item reaches the
 * inventory.
 */
export const resolveDrop = (
  ...[requirement, rule, brokenBlock, context = BARE_HANDED]: [
    HarvestToolRequirement,
    BlockDropRule,
    BlockType,
    HarvestContext?,
  ]
): BlockDrop | undefined => {
  if (rule.count <= 0) {
    return undefined
  }
  if (!satisfiesHarvestTier(requirement, context.heldTier ?? 'none')) {
    return undefined
  }
  if (rule.requiresSilkTouch && context.silkTouch !== true) {
    return undefined
  }

  const item = resolveDropItem(rule, brokenBlock, context.silkTouch === true)

  return item === undefined ? undefined : { item, count: rule.count, affectedByFortune: rule.affectedByFortune }
}
