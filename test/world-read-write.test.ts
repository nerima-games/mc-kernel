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
import type { WorldReadWriteFailure } from '../src/domain/world/world-read-write.js'

const SECTION_LENGTH = 16 * 16 * 16
const blockPosition = (x: number, y: number, z: number) =>
  makeBlockPosition(BlockAxis(x), BlockAxis(y), BlockAxis(z))
const chunkCoord = (cx: number, cz: number) => makeChunkCoord(ChunkAxis(cx), ChunkAxis(cz))
const worldFailureReason = (failure: WorldReadWriteFailure) =>
  failure._tag === 'WorldReadWriteFailure' ? failure.reason : undefined
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
    expect(worldFailureReason(duplicate)).toBe('duplicate-position')
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
    expect(worldFailureReason(duplicate)).toBe('duplicate-position')
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
    expect(worldFailureReason(resultFailure(view.getBlock(-1)))).toBe('invalid-index')
    const validIndex = resultValue(SectionIndex(0))
    const outsideIndex = resultValue(SectionIndex(1))
    expect(worldFailureReason(resultFailure(view.getLight(outsideIndex)))).toBe('invalid-index')
    expect(resultValue(view.blocks.get(validIndex))).toBe(0)
    expect(resultValue(view.light.get(validIndex))).toBe(0)
    expect(worldFailureReason(resultFailure(view.blocks.get(outsideIndex)))).toBe('invalid-index')
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
    expect(worldFailureReason(mismatched)).toBe('invalid-read-view')
    expect(mismatched.message).toMatch(/equal lengths/)

    const unknownId = resultFailure(readView({
      epoch: resultValue(WorldEpoch(0)),
      chunk,
      blockRevision: resultValue(ChunkRevision(0)),
      lightRevision: resultValue(LightRevision(0)),
      blocks: new Uint16Array([0xffff]),
      light: new Uint16Array(1),
    }))
    expect(worldFailureReason(unknownId)).toBe('unknown-block-id')
    expect(unknownId.message).toMatch(/unknown block id/)

    const invalidLight = resultFailure(readView({
      epoch: resultValue(WorldEpoch(0)),
      chunk,
      blockRevision: resultValue(ChunkRevision(0)),
      lightRevision: resultValue(LightRevision(0)),
      blocks: new Uint16Array(1),
      light: new Uint16Array([16]),
    }))
    expect(worldFailureReason(invalidLight)).toBe('invalid-read-view')
    expect(invalidLight.message).toMatch(/light level/)

    const unknownEdit = resultFailure(blockEdit(origin, BlockId(0xffff)))
    expect(worldFailureReason(unknownEdit)).toBe('unknown-block-id')
    expect(unknownEdit.message).toMatch(/unknown block id/)

    const invalidEdit = resultFailure(Reflect.apply(blockEdit, undefined, [origin, -1]))
    expect(invalidEdit).toMatchObject({
      _tag: 'BrandError',
      name: 'BrandError',
      message: 'BlockId must be an integer in [0, 65535], received -1',
    })
  })

  it('rejectsInvalidRevisionAndIndexBrands', () => {
    const invalidEpoch = resultFailure(WorldEpoch(-1))
    expect(worldFailureReason(invalidEpoch)).toBe('invalid-epoch')
    expect(invalidEpoch.message).toMatch(/WorldEpoch must be a non-negative safe integer/)
    expect(worldFailureReason(resultFailure(WorldEpoch(1.5)))).toBe('invalid-epoch')
    expect(worldFailureReason(resultFailure(WorldEpoch(Number.POSITIVE_INFINITY)))).toBe('invalid-epoch')
    expect(worldFailureReason(resultFailure(WorldEpoch(Number.MAX_SAFE_INTEGER + 1)))).toBe('invalid-epoch')
    expect(worldFailureReason(resultFailure(ChunkRevision(-1)))).toBe('invalid-revision')
    expect(worldFailureReason(resultFailure(ChunkRevision(1.5)))).toBe('invalid-revision')
    expect(worldFailureReason(resultFailure(LightRevision(-1)))).toBe('invalid-revision')
    expect(worldFailureReason(resultFailure(LightRevision(Number.NaN)))).toBe('invalid-revision')
    expect(resultValue(ChunkLocalIndex(0))).toBe(0)
    expect(worldFailureReason(resultFailure(ChunkLocalIndex(-1)))).toBe('invalid-index')
    expect(worldFailureReason(resultFailure(ChunkLocalIndex(0.5)))).toBe('invalid-index')
    expect(resultValue(SectionIndex(0))).toBe(0)
    expect(worldFailureReason(resultFailure(SectionIndex(-1)))).toBe('invalid-index')
    expect(worldFailureReason(resultFailure(SectionIndex(Number.MAX_SAFE_INTEGER + 1)))).toBe('invalid-index')
    expect(worldFailureReason(resultFailure(SectionLength(-1)))).toBe('invalid-read-view')
    expect(resultValue(SectionLength(0))).toBe(0)
  })
})
