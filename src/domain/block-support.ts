/**
 * Public support-rule boundary for blocks.
 *
 * Support-rule vocabulary and registry defaults live in
 * `block-support-data.ts`; this module owns the pure predicates that evaluate
 * those values against a block below.
 */
import { isBlockType, type BlockType } from './block-type.js'
import type { SupportRule } from './block-support-data.js'

export * from './block-support-data.js'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const isSupportRule = (value: unknown): value is SupportRule => {
  if (!isRecord(value) || typeof value['kind'] !== 'string') {
    return false
  }

  switch (value['kind']) {
    case 'none':
    case 'anySupporting':
      return true
    case 'oneOf': {
      const blocks = value['blocks']
      return Array.isArray(blocks) && blocks.every(isBlockType)
    }
    default:
      return false
  }
}

/** Does the rule require the caller to inspect the block below? */
export const isSupportSensitive = (rule: SupportRule): boolean => rule.kind !== 'none'

/**
 * Evaluate a support rule against the available block facts.
 *
 * An unknown block cannot satisfy a named `oneOf` list. The generic
 * `anySupporting` rule is evaluated from the supplied capability because the
 * caller may intentionally use a conservative default for unknown ids.
 */
export function satisfiesSupportRule(
  rule: SupportRule,
  blockBelow: BlockType | undefined,
  belowSupportsAttachments: boolean,
): boolean
export function satisfiesSupportRule(
  rule: SupportRule,
  blockBelow: BlockType | undefined,
  belowSupportsAttachments: boolean,
): boolean {
  if (!isSupportRule(rule)) {
    throw new TypeError('Unknown support rule kind')
  }

  if (rule.kind === 'none') return true
  if (rule.kind === 'anySupporting') return belowSupportsAttachments
  return typeof blockBelow === 'string' && rule.blocks.includes(blockBelow)
}
