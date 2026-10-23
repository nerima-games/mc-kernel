import {
  BlockAddressSchema,
  BlockIdSchema,
  BlockPositionSchema,
  DimensionIdSchema,
  DimensionRevisionSchema,
  EntityIdSchema,
  ItemIdSchema,
  SimulationTickSchema,
  WorldIdSchema,
  WorldPositionSchema,
  WorldRevisionSchema,
} from '../src/domain/shared-vocabulary/shared-vocabulary.js'
import {
  ModuleContractIdSchema,
  ModuleContractKindSchema,
  QaBlockIdOutput,
  QaBlockPositionInput,
  QaNamespaceNameSchema,
  QaOperationNameSchema,
  SaveSliceIdSchema,
  SaveVersionSchema,
} from '../src/domain/module-contracts/module-contracts.js'
import { defineSaveMigration } from '../src/domain/save-slices/save-slices.js'
import { Effect, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

describe('shared vocabulary schemas', () => {
  it('accepts non-empty identifiers and rejects empty or unsupported values', () => {
    expect(Schema.decodeUnknownSync(EntityIdSchema)('entity-1')).toBe('entity-1')
    expect(Schema.decodeUnknownSync(WorldIdSchema)('world-1')).toBe('world-1')
    expect(Schema.decodeUnknownSync(DimensionIdSchema)('nether')).toBe('nether')
    expect(() => Schema.decodeUnknownSync(EntityIdSchema)('')).toThrow()
    expect(() => Schema.decodeUnknownSync(WorldIdSchema)('')).toThrow()
    expect(() => Schema.decodeUnknownSync(DimensionIdSchema)('void')).toThrow()
  })

  it('validates current numeric block IDs and unsigned item ID boundaries', () => {
    expect(Schema.decodeUnknownSync(BlockIdSchema)(0)).toBe(0)
    expect(Schema.decodeUnknownSync(BlockIdSchema)(65535)).toBe(65535)
    expect(() => Schema.decodeUnknownSync(BlockIdSchema)('minecraft:stone')).toThrow()
    expect(() => Schema.decodeUnknownSync(BlockIdSchema)(65536)).toThrow()
    expect(Schema.decodeUnknownSync(ItemIdSchema)(0)).toBe(0)
    expect(Schema.decodeUnknownSync(ItemIdSchema)(65535)).toBe(65535)
    expect(() => Schema.decodeUnknownSync(ItemIdSchema)(-1)).toThrow()
    expect(() => Schema.decodeUnknownSync(ItemIdSchema)(1.5)).toThrow()
  })

  it('checks integer block coordinates and finite world positions', () => {
    const blockPosition = { x: 4, y: -64, z: 9 }
    expect(Schema.decodeUnknownSync(BlockPositionSchema)(blockPosition)).toStrictEqual(blockPosition)
    expect(() => Schema.decodeUnknownSync(BlockPositionSchema)({ x: 0, y: 1.5, z: 0 })).toThrow()

    const blockAddress = { dimension: 'overworld', position: blockPosition }
    expect(Schema.decodeUnknownSync(BlockAddressSchema)(blockAddress)).toStrictEqual(blockAddress)
    expect(() => Schema.decodeUnknownSync(BlockAddressSchema)({ dimension: 'void', position: blockPosition })).toThrow()

    const worldPosition = { dimension: 'end', x: 0.5, y: 80, z: -2.25 }
    expect(Schema.decodeUnknownSync(WorldPositionSchema)(worldPosition)).toStrictEqual(worldPosition)
    expect(() => Schema.decodeUnknownSync(WorldPositionSchema)({ ...worldPosition, x: Number.POSITIVE_INFINITY })).toThrow()
  })

  it('accepts zero revisions and ticks while rejecting negative values', () => {
    expect(Schema.decodeUnknownSync(SimulationTickSchema)(0)).toBe(0)
    expect(Schema.decodeUnknownSync(WorldRevisionSchema)(0)).toBe(0)
    expect(Schema.decodeUnknownSync(DimensionRevisionSchema)(0)).toBe(0)
    expect(() => Schema.decodeUnknownSync(SimulationTickSchema)(-1)).toThrow()
    expect(() => Schema.decodeUnknownSync(WorldRevisionSchema)(-1)).toThrow()
    expect(() => Schema.decodeUnknownSync(DimensionRevisionSchema)(-1)).toThrow()
  })
})

describe('module contract schemas and save migrations', () => {
  it('accepts non-empty contract identifiers and positive integer versions', () => {
    expect(Schema.decodeUnknownSync(QaNamespaceNameSchema)('example')).toBe('example')
    expect(Schema.decodeUnknownSync(QaOperationNameSchema)('blockAt')).toBe('blockAt')
    expect(Schema.decodeUnknownSync(ModuleContractIdSchema)('module:blocks')).toBe('module:blocks')
    expect(Schema.decodeUnknownSync(ModuleContractKindSchema)('qa-operation')).toBe('qa-operation')
    expect(Schema.decodeUnknownSync(SaveSliceIdSchema)('player-state')).toBe('player-state')
    expect(Schema.decodeUnknownSync(SaveVersionSchema)(1)).toBe(1)
    expect(() => Schema.decodeUnknownSync(QaNamespaceNameSchema)('')).toThrow()
    expect(() => Schema.decodeUnknownSync(QaOperationNameSchema)('')).toThrow()
    expect(() => Schema.decodeUnknownSync(ModuleContractIdSchema)('')).toThrow()
    expect(() => Schema.decodeUnknownSync(ModuleContractKindSchema)('other')).toThrow()
    expect(() => Schema.decodeUnknownSync(SaveSliceIdSchema)('')).toThrow()
    expect(() => Schema.decodeUnknownSync(SaveVersionSchema)(0)).toThrow()
    expect(() => Schema.decodeUnknownSync(SaveVersionSchema)(1.5)).toThrow()
  })

  it('validates the illustrative QA codecs at their shared vocabulary boundaries', () => {
    const address = { dimension: 'nether', position: { x: 0, y: 64, z: -1 } }
    expect(Schema.decodeUnknownSync(QaBlockPositionInput)({ address })).toStrictEqual({ address })
    expect(() =>
      Schema.decodeUnknownSync(QaBlockPositionInput)({
        address: { ...address, position: { x: 0, y: 1.5, z: 0 } },
      }),
    ).toThrow()
    expect(Schema.decodeUnknownSync(QaBlockIdOutput)({ blockId: 12 })).toStrictEqual({ blockId: 12 })
    expect(() => Schema.decodeUnknownSync(QaBlockIdOutput)({ blockId: 'minecraft:stone' })).toThrow()
  })

  it('decodes, transforms, and encodes a save slice migration', async () => {
    const fromSchema = Schema.Struct({ count: Schema.Int })
    const toSchema = Schema.Struct({ count: Schema.Int.check(Schema.isGreaterThan(0)) })
    const migration = defineSaveMigration(
      Schema.decodeUnknownSync(SaveVersionSchema)(1),
      Schema.decodeUnknownSync(SaveVersionSchema)(2),
      fromSchema,
      toSchema,
      ({ count }) => ({ count: count + 1 }),
    )

    expect(migration.fromVersion).toBe(1)
    expect(migration.toVersion).toBe(2)
    expect(await Effect.runPromise(migration.run({ count: 2 }))).toStrictEqual({ count: 3 })
    await expect(Effect.runPromise(migration.run({ count: '2' }))).rejects.toThrow()
  })

  it('fails when the migration output does not satisfy the target codec', async () => {
    const schema = Schema.Struct({ count: Schema.Int.check(Schema.isGreaterThan(0)) })
    const migration = defineSaveMigration(
      Schema.decodeUnknownSync(SaveVersionSchema)(1),
      Schema.decodeUnknownSync(SaveVersionSchema)(2),
      schema,
      schema,
      ({ count }) => ({ count: count - 1 }),
    )

    await expect(Effect.runPromise(migration.run({ count: 1 }))).rejects.toThrow()
  })
})
