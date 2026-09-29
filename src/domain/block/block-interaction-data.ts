/**
 * Data-only contracts and registry thresholds for deterministic block
 * interaction decisions.
 *
 * Decision logic lives in `block-interaction.ts`.
 */
import type { BlockDrop } from './block-harvest-data.js'
import type { BlockId } from './block-registry-types.js'
import type { BlockType } from './block-type.js'

export const BEDROCK_HARDNESS = 100
export const REFERENCE_UNBREAKABLE_HARDNESS = 9000

export type BlockBreakDecision =
  | { readonly kind: 'blocked'; readonly reason: 'unknown' | 'air' | 'unbreakable' }
  | {
      readonly kind: 'broken'
      readonly id: BlockId
      readonly type: BlockType
      readonly drop?: BlockDrop
      readonly experience: number
    }

export type BlockPlacementDecision =
  | { readonly kind: 'rejected'; readonly reason: 'unknown-block' | 'air' | 'unsupported' }
  | { readonly kind: 'placed'; readonly id: BlockId; readonly type: BlockType }

export type PlaceableBlock = {
  readonly id: BlockId
  readonly type: BlockType
}
