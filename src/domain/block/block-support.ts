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
import {
  MAX_GENERIC_INPUT_ARRAY_LENGTH,
  snapshotInputArray,
  snapshotInputRecord,
} from '../../input-snapshot.js'

export * from './block-support-data.js'

export type SupportRuleFailure = {
  readonly _tag: 'SupportRuleFailure'
  readonly message: string
}

const invalidSupportRule = (): Result.Result<never, SupportRuleFailure> =>
  Result.fail({ _tag: 'SupportRuleFailure', message: 'Unknown support rule kind' })

const supportRuleFromInput = (value: unknown): Result.Result<SupportRule, SupportRuleFailure> => {
  const record = snapshotInputRecord(value, ['kind', 'blocks'])
  if (Result.isFailure(record)) return invalidSupportRule()

  const kind = record.success['kind']
  if (kind === 'none' || kind === 'anySupporting') {
    return Result.succeed({ kind })
  }
  if (kind !== 'oneOf') return invalidSupportRule()

  const values = snapshotInputArray(
    record.success['blocks'],
    MAX_GENERIC_INPUT_ARRAY_LENGTH,
  )
  if (Result.isFailure(values)) return invalidSupportRule()
  const blocks: Array<BlockType> = []
  for (const block of values.success) {
    if (!isBlockType(block)) return invalidSupportRule()
    blocks.push(block)
  }
  return Result.succeed({ kind, blocks })
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
  const snapshot = supportRuleFromInput(rule)
  if (Result.isFailure(snapshot)) return Result.fail(snapshot.failure)

  if (snapshot.success.kind === 'none') return Result.succeed(true)
  if (snapshot.success.kind === 'anySupporting') return Result.succeed(belowSupportsAttachments)
  return Result.succeed(typeof blockBelow === 'string' && snapshot.success.blocks.includes(blockBelow))
}
