import { describe, expect, it } from 'vitest'
import { BlockId, blockIdOf } from '../src/domain/block/block-registry.js'
import {
  BlockAxis,
  blockPosition as makeBlockPosition,
  ChunkAxis,
  chunkCoord as makeChunkCoord,
} from '../src/domain/coordinates/coordinate-primitives.js'
import { optionValue, resultFailure, resultValue } from './block-result-helpers.js'
import { chunkKeyOf } from '../src/domain/coordinates/coordinate-keys.js'
import {
  ChunkRevision,
  ChunkLocalIndex,
  LightRevision,
  SectionIndex,
  SectionLength,
  WorldEpoch,
  blockEdit,
  blockWriteBatch,
  chunkKeyOfPosition,
  expectedChunk,
  loadedBlock,
  outOfWorld,
  readView,
  unloadedChunk,
} from '../src/domain/world/world-read-write.js'

const SECTION_LENGTH = 16 * 16 * 16
const blockPosition = (x: number, y: number, z: number) =>
  makeBlockPosition(BlockAxis(x), BlockAxis(y), BlockAxis(z))
const chunkCoord = (cx: number, cz: number) => makeChunkCoord(ChunkAxis(cx), ChunkAxis(cz))
const stone = optionValue(blockIdOf('stone'))
const air = optionValue(blockIdOf('air'))
const origin = blockPosition(0, 0, 0)
const chunk = chunkKeyOf(chunkCoord(0, 0))

describe('world read/write vocabulary', () => {
  it('readBlock_distinguishesLoadedAirUnloadedAndOutOfWorld', () => {
    expect(loadedBlock(air)).toStrictEqual({ _tag: 'Loaded', blockId: air })
    expect(unloadedChunk(chunk)).toStrictEqual({ _tag: 'Unloaded', chunk })
    expect(outOfWorld(origin)).toStrictEqual({ _tag: 'OutOfWorld', position: origin })
  })

  it('snapshotChunk_isImmutableAcrossSectionCowWrite', () => {
    const blocks = new Uint16Array(SECTION_LENGTH)
    const light = new Uint16Array(SECTION_LENGTH)
    blocks[0] = stone
    const view = resultValue(readView({
      epoch: resultValue(WorldEpoch(1)),
      chunk,
      blockRevision: resultValue(ChunkRevision(2)),
      lightRevision: resultValue(LightRevision(3)),
      blocks,
      light,
    }))

    blocks[0] = air
    const detached = view.blocks.snapshot()
    detached[0] = air
    expect(resultValue(view.getBlock(resultValue(SectionIndex(0))))).toBe(stone)
    expect(blocks[0]).toBe(air)
  })

  it('writeBlocksSTM_rejectsDuplicatePositionWithoutMutation', () => {
    const duplicate = resultFailure(blockWriteBatch(
      expectedChunk(resultValue(WorldEpoch(1)), resultValue(ChunkRevision(2))),
      [resultValue(blockEdit(origin, stone)), resultValue(blockEdit(origin, air))],
    ))
    expect(duplicate._tag).toBe('WorldReadWriteFailure')
    expect(duplicate.reason).toBe('duplicate-position')
    expect(duplicate.message).toMatch(/duplicate position/)
  })

  it('writeBlocks_acceptsBlockAxisSafeIntegerRangeAndDetectsOnlyExactCollisions', () => {
    const minimumPosition = blockPosition(Number.MIN_SAFE_INTEGER, -30_000_000, -1)
    const boundaryPosition = blockPosition(-65_536, 0, 65_535)
    const largePosition = blockPosition(1_000_000, 0, 0)
    const maximumPosition = blockPosition(Number.MAX_SAFE_INTEGER, 30_000_000, 1)
    const positions = [minimumPosition, boundaryPosition, largePosition, maximumPosition]
    const batch = resultValue(blockWriteBatch(
      expectedChunk(resultValue(WorldEpoch(0)), resultValue(ChunkRevision(0))),
      positions.map((position) => resultValue(blockEdit(position, stone))),
    ))
    expect(batch.edits.map((edit) => edit.position)).toStrictEqual(positions)

    const distinct = resultValue(blockWriteBatch(
      expectedChunk(resultValue(WorldEpoch(0)), resultValue(ChunkRevision(0))),
      [resultValue(blockEdit(minimumPosition, stone)), resultValue(blockEdit(boundaryPosition, air))],
    ))
    expect(distinct.edits).toHaveLength(2)

    const duplicate = resultFailure(blockWriteBatch(
      expectedChunk(resultValue(WorldEpoch(0)), resultValue(ChunkRevision(0))),
      [
        resultValue(blockEdit(largePosition, stone)),
        resultValue(blockEdit(blockPosition(1_000_000, 0, 0), air)),
      ],
    ))
    expect(duplicate.reason).toBe('duplicate-position')
    expect(duplicate.message).toMatch(/duplicate position/)
  })

  it('writeBlocksSTM_rejectsOutOfWorldAndUnloadedTargets', () => {
    expect(outOfWorld(origin)._tag).toBe('OutOfWorld')
    expect(unloadedChunk(chunk)._tag).toBe('Unloaded')
    expect(chunkKeyOfPosition(blockPosition(16, 0, -1))).toBe(chunkKeyOf(chunkCoord(1, -1)))
  })

  it('writeBlocksSTM_rejectsRevisionConflictWithoutErasingLaterEdit', () => {
    const batch = resultValue(blockWriteBatch(
      expectedChunk(resultValue(WorldEpoch(4)), resultValue(ChunkRevision(8))),
      [resultValue(blockEdit(origin, stone))],
    ))
    expect(batch.expected).toStrictEqual({
      epoch: resultValue(WorldEpoch(4)),
      revision: resultValue(ChunkRevision(8)),
    })
    expect(batch.edits).toHaveLength(1)
  })

  it('workerPacket_detachesRequiredSectionsWithoutAuthoritativeAlias', () => {
    const blocks = new Uint16Array(SECTION_LENGTH)
    const light = new Uint16Array(SECTION_LENGTH)
    const view = resultValue(readView({
      epoch: resultValue(WorldEpoch(1)),
      chunk,
      blockRevision: resultValue(ChunkRevision(1)),
      lightRevision: resultValue(LightRevision(1)),
      blocks,
      light,
    }))
    const detached = view.light.snapshot()
    detached[0] = 15
    expect(resultValue(view.getLight(resultValue(SectionIndex(0))))).toBe(0)
  })

  it('rejectsInvalidSectionIndices', () => {
    const view = resultValue(readView({
      epoch: resultValue(WorldEpoch(0)),
      chunk,
      blockRevision: resultValue(ChunkRevision(0)),
      lightRevision: resultValue(LightRevision(0)),
      blocks: new Uint16Array(1),
      light: new Uint16Array(1),
    }))
    // @ts-expect-error Raw indices are rejected at the type boundary and fail validation at runtime.
    expect(resultFailure(view.getBlock(-1)).reason).toBe('invalid-index')
    const validIndex = resultValue(SectionIndex(0))
    const outsideIndex = resultValue(SectionIndex(1))
    expect(resultFailure(view.getLight(outsideIndex)).reason).toBe('invalid-index')
    expect(resultValue(view.blocks.get(validIndex))).toBe(0)
    expect(resultValue(view.light.get(validIndex))).toBe(0)
    expect(resultFailure(view.blocks.get(outsideIndex)).reason).toBe('invalid-index')
  })

  it('rejectsInvalidReadViewAndEditInputs', () => {
    const mismatched = resultFailure(readView({
      epoch: resultValue(WorldEpoch(0)),
      chunk,
      blockRevision: resultValue(ChunkRevision(0)),
      lightRevision: resultValue(LightRevision(0)),
      blocks: new Uint16Array(1),
      light: new Uint16Array(0),
    }))
    expect(mismatched._tag).toBe('WorldReadWriteFailure')
    expect(mismatched.reason).toBe('invalid-read-view')
    expect(mismatched.message).toMatch(/equal lengths/)

    const unknownId = resultFailure(readView({
      epoch: resultValue(WorldEpoch(0)),
      chunk,
      blockRevision: resultValue(ChunkRevision(0)),
      lightRevision: resultValue(LightRevision(0)),
      blocks: new Uint16Array([0xffff]),
      light: new Uint16Array(1),
    }))
    expect(unknownId.reason).toBe('unknown-block-id')
    expect(unknownId.message).toMatch(/unknown block id/)

    const invalidLight = resultFailure(readView({
      epoch: resultValue(WorldEpoch(0)),
      chunk,
      blockRevision: resultValue(ChunkRevision(0)),
      lightRevision: resultValue(LightRevision(0)),
      blocks: new Uint16Array(1),
      light: new Uint16Array([16]),
    }))
    expect(invalidLight.reason).toBe('invalid-read-view')
    expect(invalidLight.message).toMatch(/light level/)

    const unknownEdit = resultFailure(blockEdit(origin, BlockId(0xffff)))
    expect(unknownEdit.reason).toBe('unknown-block-id')
    expect(unknownEdit.message).toMatch(/unknown block id/)

    const invalidEdit = resultFailure(Reflect.apply(blockEdit, undefined, [origin, -1]))
    expect(invalidEdit).toMatchObject({
      _tag: 'WorldReadWriteFailure',
      reason: 'unknown-block-id',
      message: 'Block edit contains an unknown block id -1',
    })
  })

  it('rejectsInvalidRevisionAndIndexBrands', () => {
    const invalidEpoch = resultFailure(WorldEpoch(-1))
    expect(invalidEpoch.reason).toBe('invalid-epoch')
    expect(invalidEpoch.message).toMatch(/WorldEpoch must be a non-negative safe integer/)
    expect(resultFailure(WorldEpoch(1.5)).reason).toBe('invalid-epoch')
    expect(resultFailure(WorldEpoch(Number.POSITIVE_INFINITY)).reason).toBe('invalid-epoch')
    expect(resultFailure(WorldEpoch(Number.MAX_SAFE_INTEGER + 1)).reason).toBe('invalid-epoch')
    expect(resultFailure(ChunkRevision(-1)).reason).toBe('invalid-revision')
    expect(resultFailure(ChunkRevision(1.5)).reason).toBe('invalid-revision')
    expect(resultFailure(LightRevision(-1)).reason).toBe('invalid-revision')
    expect(resultFailure(LightRevision(Number.NaN)).reason).toBe('invalid-revision')
    expect(resultValue(ChunkLocalIndex(0))).toBe(0)
    expect(resultFailure(ChunkLocalIndex(-1)).reason).toBe('invalid-index')
    expect(resultFailure(ChunkLocalIndex(0.5)).reason).toBe('invalid-index')
    expect(resultValue(SectionIndex(0))).toBe(0)
    expect(resultFailure(SectionIndex(-1)).reason).toBe('invalid-index')
    expect(resultFailure(SectionIndex(Number.MAX_SAFE_INTEGER + 1)).reason).toBe('invalid-index')
    expect(resultFailure(SectionLength(-1)).reason).toBe('invalid-read-view')
    expect(resultValue(SectionLength(0))).toBe(0)
  })
})
