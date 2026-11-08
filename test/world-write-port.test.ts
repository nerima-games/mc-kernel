import * as fc from 'fast-check'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Result, Schema } from 'effect'
import { describe, expect, it } from 'vitest'
import { BLOCK_IDS, blockIdOf } from '../src/domain/block/block-registry.js'
import { BLOCK_TYPES } from '../src/domain/block/block-type.js'
import {
  BlockEditSchema,
  WorldWriteBatchSchema,
  WorldWriteCommitSchema,
  WorldWriteChunkUnavailable,
  WorldWriteChunkUnavailableSchema,
  WorldWriteConflict,
  WorldWriteInvalidBatch,
} from '../src/domain/world/world-write-port.js'
import { optionValue } from './block-result-helpers.js'

const STATELESS_BLOCK = {
  name: 'stone' as const,
  id: optionValue(blockIdOf('stone')),
}
const CROP_BLOCK = {
  name: 'wheat_crop' as const,
  id: optionValue(blockIdOf('wheat_crop')),
}
const DOOR_BLOCK = {
  name: 'door' as const,
  id: optionValue(blockIdOf('door')),
}
const TEST_BLOCKS = [STATELESS_BLOCK, CROP_BLOCK, DOOR_BLOCK] as const
const EDIT_POSITION = { x: 1, y: 2, z: 3 }

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

const readVanillaBlockProperties = (input: unknown): Readonly<Record<string, ReadonlyArray<string>>> => {
  if (!isPlainRecord(input)) throw new Error('Vanilla block-state golden must be an object')

  const entries: Array<[string, ReadonlyArray<string>]> = []
  for (const [blockId, rawState] of Object.entries(input)) {
    if (!Array.isArray(rawState) || rawState.length !== 2 || !isPlainRecord(rawState[0])) {
      throw new Error(`Vanilla block-state golden has an invalid row for ${blockId}`)
    }
    entries.push([blockId, Object.keys(rawState[0])])
  }
  return Object.fromEntries(entries)
}

const VANILLA_BLOCK_PROPERTIES = readVanillaBlockProperties(
  JSON.parse(readFileSync(join(process.cwd(), 'test/golden/vanilla-block.json'), 'utf8')),
)

const VANILLA_ID_ALIASES: Readonly<Record<string, string>> = {
  bed: 'white_bed',
  door: 'oak_door',
  door_open: 'oak_door',
  end_portal_frame_filled: 'end_portal_frame',
  nether_brick: 'nether_bricks',
  nether_wart_crop: 'nether_wart',
  potato_crop: 'potatoes',
  pressure_plate: 'stone_pressure_plate',
  redstone_lamp_lit: 'redstone_lamp',
  sapling: 'oak_sapling',
  wheat_crop: 'wheat',
}

const ID_FIXED_PROPERTIES: Readonly<Record<string, ReadonlyArray<string>>> = {
  door_open: ['open'],
  end_portal_frame: ['eye'],
  end_portal_frame_filled: ['eye'],
  redstone_lamp: ['lit'],
  redstone_lamp_lit: ['lit'],
}

const KERNEL_EXTENSION_STATE_OVERRIDES: Readonly<Record<string, ReadonlyArray<string>>> = {
  end_crystal: [],
}

const REGISTERED_BLOCKS = BLOCK_TYPES.map((name) => ({
  id: optionValue(blockIdOf(name)),
  name,
}))

const referenceStatePropertiesFor = (blockName: string): ReadonlyArray<string> | undefined => {
  const vanillaId = VANILLA_ID_ALIASES[blockName] ?? blockName
  const properties = VANILLA_BLOCK_PROPERTIES[vanillaId] ?? KERNEL_EXTENSION_STATE_OVERRIDES[blockName]
  if (properties === undefined) return undefined

  const fixedProperties = ID_FIXED_PROPERTIES[blockName] ?? []
  return properties.filter((property) => !fixedProperties.includes(property))
}

const hasOnlyDefinedValues = (value: Record<string, unknown>, allowed: ReadonlyArray<string>): boolean =>
  Reflect.ownKeys(value).every((key) => {
    if (typeof key !== 'string' || !allowed.includes(key)) return false
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    return descriptor !== undefined && 'value' in descriptor && descriptor.value !== undefined
  })

// This oracle is intentionally test-owned: vanilla stone has no block state,
// wheat has age 0..7, and oak doors expose only these five properties.
const referenceStateIsCompatible = (
  blockName: (typeof TEST_BLOCKS)[number]['name'],
  state: unknown,
): boolean => {
  if (state === undefined) return true
  if (blockName === 'stone') return false
  if (!isPlainRecord(state)) return false

  if (blockName === 'wheat_crop') {
    if (!hasOnlyDefinedValues(state, ['age'])) return false
    const age = Object.getOwnPropertyDescriptor(state, 'age')
    return age === undefined || (
      'value' in age &&
      typeof age.value === 'number' &&
      Number.isInteger(age.value) &&
      age.value >= 0 &&
      age.value <= 7
    )
  }

  if (!hasOnlyDefinedValues(state, ['facing', 'half', 'hinge', 'open', 'powered'])) return false
  const propertyValues: Readonly<Record<string, ReadonlyArray<unknown>>> = {
    facing: ['north', 'east', 'south', 'west'],
    half: ['lower', 'upper'],
    hinge: ['left', 'right'],
    open: [true, false],
    powered: [true, false],
  }
  return Reflect.ownKeys(state).every((key) => {
    if (typeof key !== 'string') return false
    const descriptor = Object.getOwnPropertyDescriptor(state, key)
    return descriptor !== undefined && 'value' in descriptor && propertyValues[key]?.includes(descriptor.value) === true
  })
}

describe('world write port schemas', () => {
  it('decodes a block edit', () => {
    expect(Schema.decodeUnknownSync(BlockEditSchema)({
      position: { x: 1, y: 2, z: 3 },
      block: 1,
    })).toStrictEqual({
      position: { x: 1, y: 2, z: 3 },
      block: 1,
    })
  })

  it.each([
    { name: 'wheat crop minimum age', block: CROP_BLOCK, state: { age: 0 }, accepted: true },
    { name: 'wheat crop maximum age', block: CROP_BLOCK, state: { age: 7 }, accepted: true },
    { name: 'wheat crop age above maximum', block: CROP_BLOCK, state: { age: 8 }, accepted: false },
    { name: 'wheat crop age below minimum', block: CROP_BLOCK, state: { age: -1 }, accepted: false },
    { name: 'unsupported crop property', block: CROP_BLOCK, state: { facing: 'north' }, accepted: false },
    { name: 'valid door state', block: DOOR_BLOCK, state: { facing: 'north', half: 'lower', hinge: 'left', open: true, powered: false }, accepted: true },
    { name: 'empty state for stateless block', block: STATELESS_BLOCK, state: {}, accepted: false },
    { name: 'nonempty state for stateless block', block: STATELESS_BLOCK, state: { age: 0 }, accepted: false },
  ])('decodes $name according to the block state contract', ({ block, state, accepted }) => {
    const decoded = Schema.decodeUnknownResult(BlockEditSchema)({
      position: EDIT_POSITION,
      block: block.id,
      state,
    })

    expect(Result.isSuccess(decoded)).toBe(accepted)
    if (accepted) {
      expect(Result.isSuccess(decoded)).toBe(true)
      if (Result.isSuccess(decoded)) expect(decoded.success.state).toStrictEqual(state)
    } else {
      expect(Result.isFailure(decoded)).toBe(true)
    }
  })

  it('decodes arbitrary block and state inputs as compatible values or typed schema failures', () => {
    const stateInput = fc.oneof(
      fc.anything(),
      fc.integer({ min: 0, max: 7 }).map((age) => ({ age })),
      fc.integer({ min: -1, max: 8 }).map((age) => ({ age })),
      fc.boolean().map((open) => ({ open })),
      fc.constant({}),
    )

    fc.assert(
      fc.property(
        fc.constantFrom(...TEST_BLOCKS),
        fc.boolean(),
        stateInput,
        (block, includeState, state) => {
          const input = includeState
            ? { position: EDIT_POSITION, block: block.id, state }
            : { position: EDIT_POSITION, block: block.id }
          const decoded = Schema.decodeUnknownResult(BlockEditSchema)(input)
          const expected = !includeState || (
            state !== undefined && referenceStateIsCompatible(block.name, state)
          )

          expect(Result.isSuccess(decoded)).toBe(expected)
          if (Result.isFailure(decoded)) expect(decoded.failure).toBeDefined()
          return true
        },
      ),
      { numRuns: 500 },
    )
  })

  it('covers omitted and empty states across every registered block id using the vanilla golden', () => {
    const selectedBlockIds = REGISTERED_BLOCKS.map(({ id }) => id)
    const selectedBlockTypes = REGISTERED_BLOCKS.map(({ name }) => name)
    const unmappedBlockTypes = REGISTERED_BLOCKS
      .filter((block) => referenceStatePropertiesFor(block.name) === undefined)
      .map(({ name }) => name)

    expect(REGISTERED_BLOCKS.length).toBeGreaterThan(0)
    expect(new Set(selectedBlockTypes)).toStrictEqual(new Set(BLOCK_TYPES))
    expect(new Set(selectedBlockIds).size).toBe(BLOCK_IDS.length)
    expect(new Set(selectedBlockIds)).toStrictEqual(new Set(BLOCK_IDS))
    expect(unmappedBlockTypes).toStrictEqual([])

    for (const block of REGISTERED_BLOCKS) {
      const referenceProperties = referenceStatePropertiesFor(block.name)
      expect(referenceProperties, `${block.name} has a test-owned reference`).toBeDefined()
      if (referenceProperties === undefined) continue

      const omittedState = Schema.decodeUnknownResult(BlockEditSchema)({
        position: EDIT_POSITION,
        block: block.id,
      })
      const emptyState = Schema.decodeUnknownResult(BlockEditSchema)({
        position: EDIT_POSITION,
        block: block.id,
        state: {},
      })

      expect(Result.isSuccess(omittedState), `${block.name} omitted state`).toBe(true)
      expect(Result.isSuccess(emptyState), `${block.name} empty state`).toBe(referenceProperties.length > 0)
      if (Result.isFailure(omittedState)) expect(omittedState.failure).toBeDefined()
      if (Result.isFailure(emptyState)) expect(emptyState.failure).toBeDefined()
    }
  })

  it('decodes a world write batch and allows an empty edit array structurally', () => {
    expect(Schema.decodeUnknownSync(WorldWriteBatchSchema)({
      world: 'world-1',
      expectedWorldRevision: 4,
      dimension: 'overworld',
      expectedDimensionRevision: 7,
      edits: [],
    })).toStrictEqual({
      world: 'world-1',
      expectedWorldRevision: 4,
      dimension: 'overworld',
      expectedDimensionRevision: 7,
      edits: [],
    })
  })

  it('decodes a world write commit', () => {
    expect(Schema.decodeUnknownSync(WorldWriteCommitSchema)({
      worldRevision: 5,
      dimensionRevision: 8,
    })).toStrictEqual({ worldRevision: 5, dimensionRevision: 8 })
  })

  it('decodes a conflict with both expected and current revisions', () => {
    const conflict = Schema.decodeUnknownSync(WorldWriteConflict)({
      _tag: 'WorldWriteConflict',
      expectedWorldRevision: 4,
      currentWorldRevision: 5,
      expectedDimensionRevision: 7,
      currentDimensionRevision: 8,
    })

    expect(conflict).toBeInstanceOf(WorldWriteConflict)
    expect(conflict).toMatchObject({
      _tag: 'WorldWriteConflict',
      expectedWorldRevision: 4,
      currentWorldRevision: 5,
      expectedDimensionRevision: 7,
      currentDimensionRevision: 8,
    })
  })

  it.each(['empty', 'duplicate-position'] as const)(
    'decodes invalid batch reason %s',
    (reason) => {
      const error = Schema.decodeUnknownSync(WorldWriteInvalidBatch)({
        _tag: 'WorldWriteInvalidBatch',
        reason,
      })

      expect(error).toBeInstanceOf(WorldWriteInvalidBatch)
      expect(error).toMatchObject({ _tag: 'WorldWriteInvalidBatch', reason })
    },
  )

  it('decodes a chunk-unavailable failure with a branded dimension and canonical chunk key', () => {
    const error = Schema.decodeUnknownSync(WorldWriteChunkUnavailableSchema)({
      _tag: 'WorldWriteChunkUnavailable',
      dimension: 'nether',
      chunk: '-1,2',
    })

    expect(error).toBeInstanceOf(WorldWriteChunkUnavailable)
    expect(error).toMatchObject({
      _tag: 'WorldWriteChunkUnavailable',
      dimension: 'nether',
      chunk: '-1,2',
    })
  })

  it.each([
    { _tag: 'WorldWriteChunkUnavailable', chunk: '-1,2' },
    { _tag: 'WorldWriteChunkUnavailable', dimension: 'nether' },
  ])('rejects a chunk-unavailable failure with a missing required field', (input) => {
    expect(() => Schema.decodeUnknownSync(WorldWriteChunkUnavailableSchema)(input)).toThrow()
  })

  it('rejects extra properties on a chunk-unavailable failure', () => {
    expect(() => Schema.decodeUnknownSync(WorldWriteChunkUnavailableSchema)({
      _tag: 'WorldWriteChunkUnavailable',
      dimension: 'nether',
      chunk: '-1,2',
      extra: true,
    })).toThrow()
  })

  it.each([
    { dimension: 'void', chunk: '-1,2' },
    { dimension: 'nether', chunk: '-1.0,2' },
  ])('rejects an invalid dimension or chunk key', ({ dimension, chunk }) => {
    expect(() => Schema.decodeUnknownSync(WorldWriteChunkUnavailableSchema)({
      _tag: 'WorldWriteChunkUnavailable',
      dimension,
      chunk,
    })).toThrow()
  })
})
