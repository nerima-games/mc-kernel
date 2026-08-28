/**
 * Pure block breaking, placement, and block-item bridge decisions.
 */
import { BARE_HANDED, type HarvestContext } from './block-harvest.js'
import { blockOfPlaceableItem, isPlaceableItem } from './block-item.js'
import { UNBREAKABLE_HARDNESS } from './block-property-data.js'
import {
  AIR_BLOCK_ID,
  blockIdOf,
  canBlockStaySupported,
  capabilityOfBlockId,
  dropOfBlockId,
  isKnownBlockId,
  resolvedBlockOfId,
} from './block-registry.js'
import {
  BEDROCK_HARDNESS,
  REFERENCE_UNBREAKABLE_HARDNESS,
  type BlockBreakDecision,
  type BlockPlacementDecision,
  type PlaceableBlock,
} from './block-interaction-data.js'
import type { ItemType } from './item-type.js'

export * from './block-interaction-data.js'

type ResolvedBlock = NonNullable<ReturnType<typeof resolvedBlockOfId>>

const isUnbreakable = (block: ResolvedBlock): boolean => {
  const { hardness } = block.properties

  if (hardness === UNBREAKABLE_HARDNESS) return true
  if (hardness >= REFERENCE_UNBREAKABLE_HARDNESS) return true
  return block.capabilities.pistonImmovable && hardness >= BEDROCK_HARDNESS
}

const brokenDecision = (block: ResolvedBlock, context: HarvestContext): BlockBreakDecision => {
  const id = blockIdOf(block.type)
  const drop = dropOfBlockId(id, context)
  const base: Extract<BlockBreakDecision, { kind: 'broken' }> = {
    kind: 'broken',
    id,
    type: block.type,
    experience: block.properties.xpOnBreak,
  }

  return drop === undefined ? base : { ...base, drop }
}

export const breakBlock = (id: number, context: HarvestContext = BARE_HANDED): BlockBreakDecision => {
  const block = resolvedBlockOfId(id)

  if (block === undefined) return { kind: 'blocked', reason: 'unknown' }
  if (block.type === 'air') return { kind: 'blocked', reason: 'air' }
  if (isUnbreakable(block)) return { kind: 'blocked', reason: 'unbreakable' }
  return brokenDecision(block, context)
}

export const canReplaceBlock = (id: number): boolean =>
  id === AIR_BLOCK_ID || (isKnownBlockId(id) && capabilityOfBlockId(id, 'replaceable'))

export const placeBlock = (id: number, supportBelow: number): BlockPlacementDecision => {
  const block = resolvedBlockOfId(id)
  if (block === undefined) return { kind: 'rejected', reason: 'unknown-block' }
  if (block.type === 'air') return { kind: 'rejected', reason: 'air' }
  if (!canBlockStaySupported(id, supportBelow)) return { kind: 'rejected', reason: 'unsupported' }
  return { kind: 'placed', id: blockIdOf(block.type), type: block.type }
}

export const placeableBlockFromItem = (item: ItemType): PlaceableBlock | undefined => {
  if (!isPlaceableItem(item)) return undefined
  const type = blockOfPlaceableItem(item)
  return { id: blockIdOf(type), type }
}
