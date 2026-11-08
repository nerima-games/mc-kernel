import { Brand, Result, Schema } from 'effect'
import { BLOCK_REGISTRY } from './block-registry-entries.js'
import { BlockId } from './block-registry-types.js'
import type { BlockType } from './block-type.js'
import { BLOCK_STATE_DEFINITION_DATA } from './block-state-definition-data.js'
import type { BlockStateSlotDefinition } from './block-state-definition-data.js'
import {
  BlockStateValuesSchema,
  type BlockStateValues,
} from './block-state-values.js'

export const BLOCK_STATE_CODEC_VERSION = 1
export const BLOCK_STATE_ENCODING_BITS = 32
const MAX_ENCODED_BLOCK_STATE = 0xffff_ffff
const MIN_BLOCK_ID = 0

export type EncodedBlockState = number & Brand.Brand<'EncodedBlockState'>
export const EncodedBlockStateSchema: Schema.Codec<EncodedBlockState, number> = Schema.Int
  .check(Schema.isBetween({ minimum: MIN_BLOCK_ID, maximum: MAX_ENCODED_BLOCK_STATE }))
  .pipe(Schema.brand('EncodedBlockState'))

export type BlockStateCodecFailure = {
  readonly _tag: 'BlockStateCodecFailure'
  readonly reason:
    | 'invalid-block-id'
    | 'unknown-block-id'
    | 'invalid-state'
    | 'unsupported-property'
    | 'invalid-property-value'
    | 'invalid-encoded-value'
    | 'reserved-code'
}

export type BlockStateDefinition = {
  readonly blockType: BlockType
  readonly slots: ReadonlyArray<BlockStateSlotDefinition>
  readonly defaultState: BlockStateValues
}

type InternalBlockStateDefinition = BlockStateDefinition & { readonly bitWidth: number }

const failureValue = (
  reason: BlockStateCodecFailure['reason'],
): BlockStateCodecFailure => ({ _tag: 'BlockStateCodecFailure', reason })

const failure = (
  reason: BlockStateCodecFailure['reason'],
): Result.Result<never, BlockStateCodecFailure> => Result.fail(failureValue(reason))

const bitsFor = (valueCount: number): number => Math.ceil(Math.log2(valueCount))

const stateDataByType = new Map(BLOCK_STATE_DEFINITION_DATA.map((definition) => [
  definition.blockType,
  definition,
]))

export const BLOCK_STATE_TYPES: ReadonlyArray<BlockType> = Object.freeze(
  BLOCK_STATE_DEFINITION_DATA.map((definition) => definition.blockType),
)

const readSlotValue = (state: BlockStateValues, slot: BlockStateSlotDefinition): unknown => {
  if (slot.property === 'connections') {
    return state.connections?.[slot.direction]
  }
  return state[slot.property]
}

const writeSlotValue = (
  state: Record<string, unknown>,
  connections: Record<string, unknown>,
  slot: BlockStateSlotDefinition,
  value: unknown,
): void => {
  if (slot.property === 'connections') {
    connections[slot.direction] = value
  } else {
    state[slot.property] = value
  }
}

const freezeBlockStateValues = (state: BlockStateValues): BlockStateValues => {
  if (state.connections !== undefined) Object.freeze(state.connections)
  return Object.freeze(state)
}

const createDefaultState = (slots: ReadonlyArray<BlockStateSlotDefinition>): BlockStateValues => {
  const state: Record<string, unknown> = {}
  const connections: Record<string, unknown> = {}

  for (const slot of slots) {
    writeSlotValue(state, connections, slot, slot.values[0])
  }

  if (Object.keys(connections).length > 0) state['connections'] = Object.freeze(connections)
  return freezeBlockStateValues(Schema.decodeUnknownSync(BlockStateValuesSchema)(Object.freeze(state)))
}

const createDefinition = (
  blockType: BlockType,
  slots: ReadonlyArray<BlockStateSlotDefinition>,
): InternalBlockStateDefinition => {
  const immutableSlots: ReadonlyArray<BlockStateSlotDefinition> = Object.freeze([...slots])
  const bitWidth = immutableSlots.reduce((width, slot) => width + bitsFor(slot.values.length), 0)

  return Object.freeze({
    blockType,
    slots: immutableSlots,
    bitWidth,
    defaultState: createDefaultState(immutableSlots),
  })
}

const DEFINITION_BY_ID = new Map<number, InternalBlockStateDefinition>(
  BLOCK_REGISTRY.map((entry) => {
    const data = stateDataByType.get(entry.definition.type)
    return [entry.id, createDefinition(entry.definition.type, data?.slots ?? [])]
  }),
)

export const BLOCK_STATE_MAX_USED_BITS: number = Math.max(
  ...Array.from(DEFINITION_BY_ID.values(), (definition) => definition.bitWidth),
)

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

const validatePlainDataKeys = (
  value: Record<string, unknown>,
  allowedKeys: ReadonlyArray<string>,
): Result.Result<void, BlockStateCodecFailure> => {
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !allowedKeys.includes(key)) {
      return failure('unsupported-property')
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (descriptor === undefined || !('value' in descriptor) || descriptor.value === undefined) {
      return failure('invalid-state')
    }
  }
  return Result.succeed(undefined)
}

const VALUE_KEYS = [
  'facing',
  'half',
  'hinge',
  'open',
  'age',
  'level',
  'powered',
  'delay',
  'shape',
  'connections',
  'axis',
  'distance',
  'enabled',
  'extended',
  'face',
  'has_bottle_0',
  'has_bottle_1',
  'has_bottle_2',
  'layers',
  'lit',
  'locked',
  'mode',
  'moisture',
  'occupied',
  'part',
  'persistent',
  'power',
  'rotation',
  'short',
  'snowy',
  'stage',
  'triggered',
  'type',
  'unstable',
  'waterlogged',
] as const
const CONNECTION_KEYS = ['down', 'north', 'east', 'south', 'west', 'up'] as const

const parseBlockStateValues = (value: unknown): Result.Result<BlockStateValues, BlockStateCodecFailure> => {
  const inspected = Result.try({
    try: () => {
      if (!isPlainRecord(value)) {
        return failure('invalid-state')
      }

      const validTopLevelKeys = validatePlainDataKeys(value, VALUE_KEYS)
      if (Result.isFailure(validTopLevelKeys)) return Result.fail(validTopLevelKeys.failure)

      if (Object.hasOwn(value, 'connections')) {
        const connections = value['connections']
        if (!isPlainRecord(connections)) {
          return failure('invalid-property-value')
        }
        const validConnectionKeys = validatePlainDataKeys(connections, CONNECTION_KEYS)
        if (Result.isFailure(validConnectionKeys)) return Result.fail(validConnectionKeys.failure)
      }

      const decoded = Schema.decodeUnknownResult(BlockStateValuesSchema)(value)
      return decoded._tag === 'Success'
        ? Result.succeed(decoded.success)
        : failure('invalid-property-value')
    },
    catch: (): BlockStateCodecFailure => ({
      _tag: 'BlockStateCodecFailure',
      reason: 'invalid-state',
    }),
  })
  return Result.isFailure(inspected) ? Result.fail(inspected.failure) : inspected.success
}

const getDefinition = (blockId: BlockId): Result.Result<InternalBlockStateDefinition, BlockStateCodecFailure> => {
  if (typeof blockId !== 'number') return failure('invalid-block-id')

  const validatedBlockId = BlockId.result(blockId)
  if (Result.isFailure(validatedBlockId)) {
    return failure('invalid-block-id')
  }

  const definition = DEFINITION_BY_ID.get(validatedBlockId.success)
  return definition === undefined
    ? failure('unknown-block-id')
    : Result.succeed(definition)
}

const validateSupportedProperties = (
  definition: BlockStateDefinition,
  state: BlockStateValues,
): Result.Result<void, BlockStateCodecFailure> => {
  const supportedProperties = new Set<string>(definition.slots.map((slot) => slot.property))

  for (const property of VALUE_KEYS) {
    if (Object.hasOwn(state, property) && !supportedProperties.has(property)) {
      return failure('unsupported-property')
    }
  }

  const connections = state.connections
  if (connections !== undefined) {
    for (const direction of Object.keys(connections)) {
      if (!definition.slots.some((slot) => slot.property === 'connections' && slot.direction === direction)) {
        return failure('unsupported-property')
      }
    }
  }

  for (const slot of definition.slots) {
    const value = readSlotValue(state, slot)
    if (value !== undefined && !slot.values.some((allowed) => allowed === value)) {
      return failure('invalid-property-value')
    }
  }

  return Result.succeed(undefined)
}

export const blockStateDefinitionOf = (
  blockId: BlockId,
): Result.Result<BlockStateDefinition, BlockStateCodecFailure> => Result.map(
  getDefinition(blockId),
  ({ blockType, slots, defaultState }) => Object.freeze({ blockType, slots, defaultState }),
)

export const defaultBlockState = (
  blockId: BlockId,
): Result.Result<BlockStateValues, BlockStateCodecFailure> =>
  Result.map(getDefinition(blockId), (definition) => definition.defaultState)

export const encodeBlockState = (
  blockId: BlockId,
  values: unknown,
): Result.Result<EncodedBlockState, BlockStateCodecFailure> => {
  const definition = getDefinition(blockId)
  if (Result.isFailure(definition)) return Result.fail(definition.failure)

  const parsed = parseBlockStateValues(values)
  if (Result.isFailure(parsed)) return Result.fail(parsed.failure)

  const supported = validateSupportedProperties(definition.success, parsed.success)
  if (Result.isFailure(supported)) return Result.fail(supported.failure)

  let encoded = 0
  let offset = 0
  for (const slot of definition.success.slots) {
    const value = readSlotValue(parsed.success, slot)
    const fieldIndex = value === undefined ? 0 : slot.values.findIndex((allowed) => allowed === value)
    const fieldBits = bitsFor(slot.values.length)
    encoded += fieldIndex * (2 ** offset)
    offset += fieldBits
  }

  return Result.succeed(Schema.decodeUnknownSync(EncodedBlockStateSchema)(encoded))
}

const parseEncodedBlockState = (value: unknown): Result.Result<EncodedBlockState, BlockStateCodecFailure> => {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < MIN_BLOCK_ID ||
    value > MAX_ENCODED_BLOCK_STATE
  ) {
    return failure('invalid-encoded-value')
  }

  return Result.succeed(Schema.decodeUnknownSync(EncodedBlockStateSchema)(value))
}

export const decodeBlockState = (
  blockId: BlockId,
  encodedValue: unknown,
): Result.Result<BlockStateValues, BlockStateCodecFailure> => {
  const definition = getDefinition(blockId)
  if (Result.isFailure(definition)) return Result.fail(definition.failure)

  const parsed = parseEncodedBlockState(encodedValue)
  if (Result.isFailure(parsed)) return Result.fail(parsed.failure)

  let offset = 0
  let state: Record<string, unknown> = {}
  const connections: Record<string, unknown> = {}
  for (const slot of definition.success.slots) {
    const fieldBits = bitsFor(slot.values.length)
    const fieldCapacity = 2 ** fieldBits
    const fieldIndex = Math.floor(parsed.success / (2 ** offset)) % fieldCapacity
    if (fieldIndex >= slot.values.length) {
      return failure('reserved-code')
    }
    writeSlotValue(state, connections, slot, slot.values[fieldIndex])
    offset += fieldBits
  }

  if (parsed.success >= 2 ** offset) {
    return failure('reserved-code')
  }

  if (Object.keys(connections).length > 0) state['connections'] = Object.freeze(connections)
  const decoded = Schema.decodeUnknownSync(BlockStateValuesSchema)(Object.freeze(state))
  return Result.succeed(freezeBlockStateValues(decoded))
}
