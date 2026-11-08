import * as fc from 'fast-check'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Result, Schema } from 'effect'
import { describe, expect, it } from 'vitest'
import * as kernel from '../src/index.js'
import { blockIdOf, BLOCK_IDS, BLOCK_REGISTRY } from '../src/domain/block/block-registry.js'
import { BlockId } from '../src/domain/block/block-registry-types.js'
import type { BlockStateDefinition } from '../src/domain/block/block-state-codec.js'
import type { BlockStateSlotDefinition } from '../src/domain/block/block-state-definition-data.js'
import { optionValue, resultValue } from './block-result-helpers.js'

type VanillaBlockState = {
  readonly properties: Readonly<Record<string, readonly string[]>>
  readonly defaults: Readonly<Record<string, string>>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string')

const isStringRecord = (value: unknown): value is Record<string, string> =>
  isRecord(value) && Object.values(value).every((entry) => typeof entry === 'string')

const readVanillaBlockStates = (input: unknown): Readonly<Record<string, VanillaBlockState>> => {
  if (!isRecord(input)) throw new Error('Vanilla block-state golden must be an object')

  const entries: [string, VanillaBlockState][] = []
  for (const [blockId, rawState] of Object.entries(input)) {
    if (!Array.isArray(rawState) || rawState.length !== 2) {
      throw new Error(`Vanilla block-state golden has an invalid row for ${blockId}`)
    }

    const [rawProperties, defaults] = rawState
    if (!isRecord(rawProperties) || !isStringRecord(defaults)) {
      throw new Error(`Vanilla block-state golden has invalid properties for ${blockId}`)
    }

    const properties: Record<string, readonly string[]> = {}
    for (const [property, values] of Object.entries(rawProperties)) {
      if (!isStringArray(values)) {
        throw new Error(`Vanilla block-state golden has invalid ${blockId}.${property} values`)
      }
      properties[property] = values
    }
    entries.push([blockId, { properties, defaults }])
  }
  return Object.fromEntries(entries)
}

const vanillaBlockStates = readVanillaBlockStates(
  JSON.parse(readFileSync(join(process.cwd(), 'test/golden/vanilla-block.json'), 'utf8')),
)

const VANILLA_ID_ALIASES = new Map<string, string>([
  ['bed', 'white_bed'],
  ['door', 'oak_door'],
  ['door_open', 'oak_door'],
  ['end_portal_frame_filled', 'end_portal_frame'],
  ['nether_brick', 'nether_bricks'],
  ['nether_wart_crop', 'nether_wart'],
  ['potato_crop', 'potatoes'],
  ['pressure_plate', 'stone_pressure_plate'],
  ['redstone_lamp_lit', 'redstone_lamp'],
  ['sapling', 'oak_sapling'],
  ['wheat_crop', 'wheat'],
])

const ID_FIXED_PROPERTIES = new Map<string, ReadonlySet<string>>([
  ['door_open', new Set(['open'])],
  ['end_portal_frame', new Set(['eye'])],
  ['end_portal_frame_filled', new Set(['eye'])],
  ['redstone_lamp', new Set(['lit'])],
  ['redstone_lamp_lit', new Set(['lit'])],
])

const blockId = (blockType: kernel.BlockType) => optionValue(blockIdOf(blockType))

const bitWidthOf = (definition: BlockStateDefinition): number =>
  definition.slots.reduce((width, slot) => width + Math.ceil(Math.log2(slot.values.length)), 0)

const valuesWithSlot = (
  definition: BlockStateDefinition,
  slot: BlockStateSlotDefinition,
  value: unknown,
): Record<string, unknown> => {
  const values: Record<string, unknown> = { ...definition.defaultState }
  if (slot.property === 'connections') {
    const connections: Record<string, unknown> = { ...definition.defaultState.connections }
    values['connections'] = { ...connections, [slot.direction]: value }
  } else {
    values[slot.property] = value
  }
  return values
}

const expectCodecFailure = <Value>(
  result: Result.Result<Value, kernel.BlockStateCodecFailure>,
  reason?: kernel.BlockStateCodecFailure['reason'],
): void => {
  expect(Result.isFailure(result)).toBe(true)
  if (Result.isFailure(result)) {
    expect(result.failure._tag).toBe('BlockStateCodecFailure')
    if (reason !== undefined) expect(result.failure.reason).toBe(reason)
  }
}

describe('block-state codec', () => {
  it('defines state for all 59 stateful block types and defaults every id to zero', () => {
    expect(BLOCK_IDS).toHaveLength(123)
    expect(kernel.BLOCK_STATE_TYPES).toHaveLength(59)
    expect(new Set(kernel.BLOCK_STATE_TYPES).size).toBe(59)
    expect(kernel.BLOCK_STATE_MAX_USED_BITS).toBe(12)

    for (const entry of BLOCK_REGISTRY) {
      const definition = resultValue(kernel.blockStateDefinitionOf(entry.id))
      expect(definition.blockType).toBe(entry.definition.type)
      expect(bitWidthOf(definition)).toBeLessThanOrEqual(kernel.BLOCK_STATE_ENCODING_BITS)

      const defaults = resultValue(kernel.defaultBlockState(entry.id))
      expect(defaults).toStrictEqual(definition.defaultState)
      expect(Object.isFrozen(defaults)).toBe(true)
      if (defaults.connections !== undefined) expect(Object.isFrozen(defaults.connections)).toBe(true)
      const encoded = resultValue(kernel.encodeBlockState(entry.id, {}))
      expect(encoded).toBe(0)
      const decoded = resultValue(kernel.decodeBlockState(entry.id, encoded))
      expect(decoded).toStrictEqual(defaults)
      expect(Object.isFrozen(decoded)).toBe(true)
      if (decoded.connections !== undefined) expect(Object.isFrozen(decoded.connections)).toBe(true)

      const schemaDecoded = Schema.decodeUnknownResult(kernel.BlockStateValuesSchema)(defaults)
      expect(Result.isSuccess(schemaDecoded)).toBe(true)
    }
  })

  it('matches all 123 kernel block types against vanilla properties, values, and defaults', () => {
    expect(BLOCK_REGISTRY).toHaveLength(123)

    for (const entry of BLOCK_REGISTRY) {
      const blockType = entry.definition.type
      const definition = resultValue(kernel.blockStateDefinitionOf(entry.id))
      const vanillaId = blockType === 'end_crystal'
        ? undefined
        : VANILLA_ID_ALIASES.get(blockType) ?? blockType

      if (vanillaId === undefined) {
        expect(blockType).toBe('end_crystal')
        expect(definition.slots).toStrictEqual([])
        continue
      }

      const vanillaState = vanillaBlockStates[vanillaId]
      expect(vanillaState, `missing vanilla block state for ${blockType} -> ${vanillaId}`).toBeDefined()
      if (vanillaState === undefined) continue

      const fixedProperties = ID_FIXED_PROPERTIES.get(blockType) ?? new Set<string>()
      const expectedProperties = Object.keys(vanillaState.properties)
        .filter((property) => !fixedProperties.has(property))
        .sort()
      const slotProperties = definition.slots
        .map((slot) => slot.property === 'connections' ? slot.direction : slot.property)
        .sort()
      expect(slotProperties, `property coverage for ${blockType}`).toEqual(expectedProperties)

      for (const slot of definition.slots) {
        const property = slot.property === 'connections' ? slot.direction : slot.property
        expect(slot.values.map(String).sort(), `${blockType}.${property} values`).toEqual(
          [...(vanillaState.properties[property] ?? [])].sort(),
        )
        expect(String(slot.values[0]), `${blockType}.${property} default`).toBe(
          vanillaState.defaults[property],
        )
      }
    }
  })

  it('round-trips every allowed value in every block-specific slot', () => {
    for (const entry of BLOCK_REGISTRY) {
      const definition = resultValue(kernel.blockStateDefinitionOf(entry.id))
      for (const slot of definition.slots) {
        for (const value of slot.values) {
          const input = valuesWithSlot(definition, slot, value)
          const encoded = resultValue(kernel.encodeBlockState(entry.id, input))
          const decoded = resultValue(kernel.decodeBlockState(entry.id, encoded))
          expect(decoded).toStrictEqual(input)
          expect(Result.isSuccess(Schema.decodeUnknownResult(kernel.BlockStateValuesSchema)(decoded))).toBe(true)
        }
      }
    }
  })

  it('accepts each numeric domain boundary and rejects the adjacent values', () => {
    const cases = [
      { block: 'kelp', property: 'age', minimum: 0, maximum: 25 },
      { block: 'wheat_crop', property: 'age', minimum: 0, maximum: 7 },
      { block: 'water', property: 'level', minimum: 0, maximum: 15 },
      { block: 'water_cauldron', property: 'level', minimum: 1, maximum: 3 },
      { block: 'repeater', property: 'delay', minimum: 1, maximum: 4 },
      { block: 'oak_leaves', property: 'distance', minimum: 1, maximum: 7 },
      { block: 'snow', property: 'layers', minimum: 1, maximum: 8 },
      { block: 'farmland', property: 'moisture', minimum: 0, maximum: 7 },
      { block: 'redstone_wire', property: 'power', minimum: 0, maximum: 15 },
      { block: 'wither_skeleton_skull', property: 'rotation', minimum: 0, maximum: 15 },
      { block: 'sapling', property: 'stage', minimum: 0, maximum: 1 },
    ] as const

    for (const { block, property, minimum, maximum } of cases) {
      const id = blockId(block)
      for (const value of [minimum, maximum]) {
        expect(Result.isSuccess(kernel.encodeBlockState(id, { [property]: value }))).toBe(true)
      }
      expectCodecFailure(kernel.encodeBlockState(id, { [property]: minimum - 1 }), 'invalid-property-value')
      expectCodecFailure(kernel.encodeBlockState(id, { [property]: maximum + 1 }), 'invalid-property-value')
    }
  })

  it('rejects properties and values that the selected block does not support', () => {
    expectCodecFailure(kernel.encodeBlockState(blockId('stone'), { age: 1 }), 'unsupported-property')
    expectCodecFailure(kernel.encodeBlockState(blockId('oak_log'), { axis: 'w' }), 'invalid-property-value')
    expectCodecFailure(kernel.encodeBlockState(blockId('redstone_wire'), { connections: { down: 'none' } }), 'unsupported-property')
    expectCodecFailure(kernel.encodeBlockState(blockId('chorus_plant'), { connections: { north: 'side' } }), 'invalid-property-value')
    expectCodecFailure(kernel.encodeBlockState(blockId('redstone_wire'), { connections: { north: true } }), 'invalid-property-value')
    expectCodecFailure(kernel.encodeBlockState(blockId('door'), { facing: 'up' }), 'invalid-property-value')
    expectCodecFailure(kernel.encodeBlockState(blockId('door_open'), { open: false }), 'unsupported-property')
    expectCodecFailure(kernel.encodeBlockState(blockId('end_portal_frame_filled'), { eye: true }), 'unsupported-property')
    expectCodecFailure(kernel.encodeBlockState(blockId('redstone_lamp_lit'), { lit: true }), 'unsupported-property')
  })

  it('rejects unknown ids, reserved field codes, unused high bits, and malformed integers', () => {
    const unknownBlockId = resultValue(BlockId.result(123))
    expectCodecFailure(kernel.encodeBlockState(unknownBlockId, {}), 'unknown-block-id')

    const wireId = blockId('redstone_wire')
    expectCodecFailure(kernel.decodeBlockState(wireId, 3), 'reserved-code')
    expectCodecFailure(kernel.decodeBlockState(wireId, 2 ** kernel.BLOCK_STATE_MAX_USED_BITS), 'reserved-code')

    for (const value of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 32]) {
      expectCodecFailure(kernel.decodeBlockState(wireId, value), 'invalid-encoded-value')
    }
  })

  it('rejects accessors and hostile objects without throwing', () => {
    const getterState = Object.defineProperty({}, 'power', {
      enumerable: true,
      get: () => {
        throw new Error('getter must not be invoked')
      },
    })
    const prototypeProxy = new Proxy({}, {
      getPrototypeOf: () => {
        throw new Error('prototype trap must be contained')
      },
    })
    const keysProxy = new Proxy({}, {
      ownKeys: () => {
        throw new Error('ownKeys trap must be contained')
      },
    })

    for (const input of [null, [], new Date(), getterState, prototypeProxy, keysProxy, { connections: { diagonal: true } }]) {
      expectCodecFailure(kernel.encodeBlockState(blockId('redstone_wire'), input))
    }
  })

  it('returns a typed failure or schema-valid output for arbitrary inputs', () => {
    const wireId = blockId('redstone_wire')
    fc.assert(
      fc.property(fc.anything(), fc.anything(), (values, encodedValue) => {
        const encoded = kernel.encodeBlockState(wireId, values)
        if (Result.isFailure(encoded)) {
          expect(encoded.failure._tag).toBe('BlockStateCodecFailure')
        } else {
          expect(Result.isSuccess(Schema.decodeUnknownResult(kernel.EncodedBlockStateSchema)(encoded.success))).toBe(true)
        }

        const decoded = kernel.decodeBlockState(wireId, encodedValue)
        if (Result.isFailure(decoded)) {
          expect(decoded.failure._tag).toBe('BlockStateCodecFailure')
        } else {
          expect(Result.isSuccess(Schema.decodeUnknownResult(kernel.BlockStateValuesSchema)(decoded.success))).toBe(true)
        }
        return true
      }),
      { numRuns: 500 },
    )
  })
})
