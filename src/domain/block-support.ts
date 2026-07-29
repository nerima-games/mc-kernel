import type { BlockType } from './block-type.js'

/** A block's requirement for the cell directly below it. */
export type SupportRule =
  | { readonly kind: 'none' }
  | { readonly kind: 'anySupporting' }
  | { readonly kind: 'oneOf'; readonly blocks: ReadonlyArray<BlockType> }

export const NEEDS_NO_SUPPORT: SupportRule = { kind: 'none' }
export const NEEDS_ANY_SUPPORT: SupportRule = { kind: 'anySupporting' }

/** Constructs an explicit whitelist rule for a support-sensitive block. */
export const needsOneOf = (...blocks: ReadonlyArray<BlockType>): SupportRule => ({
  kind: 'oneOf',
  blocks,
})

/** Whether placement must inspect the cell below. */
export const isSupportSensitive = (rule: SupportRule): boolean => rule.kind !== 'none'

/** Evaluates a support rule using already-resolved information about the cell below. */
export const satisfiesSupportRule = (
  rule: SupportRule,
  blockBelow: BlockType | undefined,
  belowSupportsAttachments: boolean,
): boolean => {
  switch (rule.kind) {
    case 'none':
      return true
    case 'anySupporting':
      return belowSupportsAttachments
    case 'oneOf':
      return blockBelow !== undefined && rule.blocks.includes(blockBelow)
  }
}
