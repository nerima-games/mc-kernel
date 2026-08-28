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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function assertKnownOverrideKeys(
  overrides: unknown,
): asserts overrides is BlockCapabilityOverrides {
  if (!isRecord(overrides)) {
    throw new TypeError('block capability overrides must be an object')
  }

  for (const key of Object.keys(overrides)) {
    if (!BLOCK_CAPABILITY_FLAGS.some((flag) => flag === key)) {
      throw new TypeError(`unknown block capability ${key}`)
    }
  }
}

/**
 * Fill in the defaults for every flag the overrides do not mention.
 *
 * Unknown keys in `overrides` are rejected so that a misspelled or unsupported
 * schema field cannot silently change the meaning of a block definition.
 */
export const resolveBlockCapabilities = (overrides: BlockCapabilityOverrides): BlockCapabilities => {
  assertKnownOverrideKeys(overrides)

  const resolved: { -readonly [capabilityFlag in BlockCapabilityFlag]: boolean } = {
    ...BLOCK_CAPABILITY_DEFAULTS,
  }

  for (const flag of BLOCK_CAPABILITY_FLAGS) {
    const override = overrides[flag]
    if (typeof override !== 'undefined') {
      if (typeof override !== 'boolean') {
        throw new TypeError(`block capability ${flag} must be a boolean`)
      }
      resolved[flag] = override
    }
  }

  return resolved
}

/**
 * Read one flag without materialising the whole set. Semantically identical to
 * `resolveBlockCapabilities(overrides)[flag]`.
 */
export const capabilityOf = (overrides: BlockCapabilityOverrides, flag: BlockCapabilityFlag): boolean => {
  assertKnownOverrideKeys(overrides)

  const override = overrides[flag]
  if (typeof override === 'undefined') {
    return BLOCK_CAPABILITY_DEFAULTS[flag]
  }
  if (typeof override !== 'boolean') {
    throw new TypeError(`block capability ${flag} must be a boolean`)
  }
  return override
}
