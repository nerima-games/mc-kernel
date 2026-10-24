/**
 * Public support-rule boundary for blocks.
 *
 * Support-rule vocabulary and registry defaults live in
 * `block-support-data.ts`; this module owns the pure predicates that evaluate
 * those values against a block below.
 */
import { Result } from 'effect'
import { isBlockType, type BlockType } from './block-type.js'
import type { SupportRule } from './block-support-data.js'

export * from './block-support-data.js'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export type SupportRuleFailure = {
  readonly _tag: 'SupportRuleFailure'
  readonly message: string
}

const invalidSupportRule = (): Result.Result<never, SupportRuleFailure> =>
  Result.fail({ _tag: 'SupportRuleFailure', message: 'Unknown support rule kind' })

const snapshotSupportRule = (value: unknown): Result.Result<SupportRule, SupportRuleFailure> => {
  try {
    if (!isRecord(value)) return invalidSupportRule()

    const kind = value['kind']
    if (kind === 'none' || kind === 'anySupporting') {
      return Result.succeed({ kind })
    }
    if (kind !== 'oneOf') return invalidSupportRule()

    const values = value['blocks']
    if (!Array.isArray(values)) return invalidSupportRule()
    const length = values.length
    if (!Number.isSafeInteger(length)) return invalidSupportRule()

    const blocks: Array<BlockType> = []
    for (let index = 0; index < length; index += 1) {
      const block = values[index]
      if (!isBlockType(block)) return invalidSupportRule()
      blocks.push(block)
    }
    return Result.succeed({ kind, blocks })
  } catch {
    return invalidSupportRule()
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
): Result.Result<boolean, SupportRuleFailure>
export function satisfiesSupportRule(
  rule: SupportRule,
  blockBelow: BlockType | undefined,
  belowSupportsAttachments: boolean,
): Result.Result<boolean, SupportRuleFailure> {
  const snapshot = snapshotSupportRule(rule)
  if (Result.isFailure(snapshot)) return Result.fail(snapshot.failure)

  if (snapshot.success.kind === 'none') return Result.succeed(true)
  if (snapshot.success.kind === 'anySupporting') return Result.succeed(belowSupportsAttachments)
  return Result.succeed(typeof blockBelow === 'string' && snapshot.success.blocks.includes(blockBelow))
}
