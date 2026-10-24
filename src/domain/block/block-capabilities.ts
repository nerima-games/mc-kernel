import { Result } from 'effect'
import {
  BLOCK_CAPABILITY_DEFAULTS,
  BLOCK_CAPABILITY_FLAGS,
} from './block-capability-data.js'
import type {
  BlockCapabilities,
  BlockCapabilityFlag,
  BlockCapabilityOverrides,
} from './block-capability-data.js'

export * from './block-capability-data.js'

export type BlockCapabilityFailure = {
  readonly _tag: 'BlockCapabilityFailure'
  readonly reason: 'not-object' | 'unknown-key' | 'not-boolean'
  readonly message: string
}

const failure = (
  reason: BlockCapabilityFailure['reason'],
  message: string,
): Result.Result<never, BlockCapabilityFailure> =>
  Result.fail({ _tag: 'BlockCapabilityFailure', reason, message })

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function validateOverrideKeys(
  overrides: unknown,
): Result.Result<BlockCapabilityOverrides, BlockCapabilityFailure> {
  if (!isRecord(overrides)) {
    return failure('not-object', 'block capability overrides must be an object')
  }

  const validated: Partial<Record<BlockCapabilityFlag, boolean>> = {}
  for (const key of Object.keys(overrides)) {
    const flag = BLOCK_CAPABILITY_FLAGS.find((candidate) => candidate === key)
    if (flag === undefined) {
      return failure('unknown-key', `unknown block capability ${key}`)
    }
    const value = overrides[key]
    if (value === undefined) continue
    if (typeof value !== 'boolean') {
      return failure('not-boolean', `block capability ${flag} must be a boolean`)
    }
    validated[flag] = value
  }

  return Result.succeed(validated)
}

/**
 * Fill in the defaults for every flag the overrides do not mention.
 *
 * Unknown keys in `overrides` are rejected so that a misspelled or unsupported
 * schema field cannot silently change the meaning of a block definition.
 */
export const resolveBlockCapabilities = (
  overrides: BlockCapabilityOverrides,
): Result.Result<BlockCapabilities, BlockCapabilityFailure> =>
  Result.flatMap(validateOverrideKeys(overrides), (validated) => {
    const resolved: { -readonly [capabilityFlag in BlockCapabilityFlag]: boolean } = {
      ...BLOCK_CAPABILITY_DEFAULTS,
    }

    for (const flag of BLOCK_CAPABILITY_FLAGS) {
      const override = validated[flag]
      if (typeof override !== 'undefined') {
        resolved[flag] = override
      }
    }

    return Result.succeed(resolved)
  })

/**
 * Read one flag without materialising the whole set. Semantically identical to
 * `resolveBlockCapabilities(overrides)[flag]`.
 */
export const capabilityOf = (
  overrides: BlockCapabilityOverrides,
  flag: BlockCapabilityFlag,
): Result.Result<boolean, BlockCapabilityFailure> =>
  Result.flatMap(validateOverrideKeys(overrides), (validated) => {
    const override = validated[flag]
    if (typeof override === 'undefined') {
      return Result.succeed(BLOCK_CAPABILITY_DEFAULTS[flag])
    }
    return Result.succeed(override)
  })
