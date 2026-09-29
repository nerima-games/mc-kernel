/**
 * Data-only vocabulary and defaults for block support rules.
 *
 * Predicates live in `block-support.ts`; registry tables can import this
 * module without depending on support-resolution logic.
 */
import type { BlockType } from './block-type.js'

export type SupportRule =
  | { readonly kind: 'none' }
  | { readonly kind: 'anySupporting' }
  | { readonly kind: 'oneOf'; readonly blocks: ReadonlyArray<BlockType> }

export const NEEDS_NO_SUPPORT: SupportRule = { kind: 'none' }
export const NEEDS_ANY_SUPPORT: SupportRule = { kind: 'anySupporting' }

export const needsOneOf = (...blocks: ReadonlyArray<BlockType>): SupportRule => ({
  blocks,
  kind: 'oneOf',
})
