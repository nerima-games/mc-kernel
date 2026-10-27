import { Schema } from 'effect'
import { describe, expect, it } from 'vitest'
import {
  BlockEditSchema,
  WorldWriteBatchSchema,
  WorldWriteCommitSchema,
  WorldWriteChunkUnavailable,
  WorldWriteChunkUnavailableSchema,
  WorldWriteConflict,
  WorldWriteInvalidBatch,
} from '../src/domain/world/world-write-port.js'

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
