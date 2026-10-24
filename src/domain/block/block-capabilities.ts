import { Result } from 'effect'
import { snapshotInputRecord } from '../../input-snapshot.js'
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
  readonly reason: 'not-object' | 'unknown-key' | 'not-boolean' | 'hostile-input'
  readonly message: string
}

const failure = (
  reason: BlockCapabilityFailure['reason'],
  message: string,
): Result.Result<never, BlockCapabilityFailure> =>
  Result.fail({ _tag: 'BlockCapabilityFailure', reason, message })

function validateOverrideKeys(
  overrides: unknown,
): Result.Result<BlockCapabilityOverrides, BlockCapabilityFailure> {
  const snapshot = snapshotInputRecord(overrides, BLOCK_CAPABILITY_FLAGS, BLOCK_CAPABILITY_FLAGS)
  if (Result.isFailure(snapshot)) {
    if (snapshot.failure.reason === 'unexpected-field') {
      return failure('unknown-key', `unknown block capability ${snapshot.failure.field}`)
    }
    if (snapshot.failure.reason === 'hostile-input') {
      return failure('hostile-input', 'block capability overrides must be readable')
    }
    return failure('not-object', 'block capability overrides must be an object')
  }

  const validated: Partial<Record<BlockCapabilityFlag, boolean>> = {}
  for (const flag of BLOCK_CAPABILITY_FLAGS) {
    if (!Object.hasOwn(snapshot.success, flag)) continue
    const value = snapshot.success[flag]
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
