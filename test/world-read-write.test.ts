import { describe, expect, it } from 'vitest'
import { BlockId, blockIdOf } from '../src/domain/block-registry.js'
import { blockPosition, chunkCoord } from '../src/domain/coordinate-primitives.js'
import { chunkKeyOf } from '../src/domain/coordinate-keys.js'
import {
  ChunkRevision,
  ChunkLocalIndex,
  LightRevision,
  SectionIndex,
  WorldEpoch,
  blockEdit,
  blockWriteBatch,
  chunkKeyOfPosition,
  expectedChunk,
  loadedBlock,
  outOfWorld,
  readView,
  unloadedChunk,
} from '../src/domain/world-read-write.js'

const SECTION_LENGTH = 16 * 16 * 16
const stone = blockIdOf('stone')
const air = blockIdOf('air')
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
    const view = readView({
      epoch: WorldEpoch(1),
      chunk,
      blockRevision: ChunkRevision(2),
      lightRevision: LightRevision(3),
      blocks,
      light,
    })

    blocks[0] = air
    const detached = view.blocks.snapshot()
    detached[0] = air
    expect(view.getBlock(0)).toBe(stone)
    expect(blocks[0]).toBe(air)
  })

  it('writeBlocksSTM_rejectsDuplicatePositionWithoutMutation', () => {
    expect(() => blockWriteBatch(
      expectedChunk(WorldEpoch(1), ChunkRevision(2)),
      [blockEdit(origin, stone), blockEdit(origin, air)],
    )).toThrow(/duplicate position/)
  })

  it('writeBlocksSTM_rejectsOutOfWorldAndUnloadedTargets', () => {
    expect(outOfWorld(origin)._tag).toBe('OutOfWorld')
    expect(unloadedChunk(chunk)._tag).toBe('Unloaded')
    expect(chunkKeyOfPosition(blockPosition(16, 0, -1))).toBe(chunkKeyOf(chunkCoord(1, -1)))
  })

  it('writeBlocksSTM_rejectsRevisionConflictWithoutErasingLaterEdit', () => {
    const batch = blockWriteBatch(
      expectedChunk(WorldEpoch(4), ChunkRevision(8)),
      [blockEdit(origin, stone)],
    )
    expect(batch.expected).toStrictEqual({ epoch: WorldEpoch(4), revision: ChunkRevision(8) })
    expect(batch.edits).toHaveLength(1)
  })

  it('workerPacket_detachesRequiredSectionsWithoutAuthoritativeAlias', () => {
    const blocks = new Uint16Array(SECTION_LENGTH)
    const light = new Uint16Array(SECTION_LENGTH)
    const view = readView({
      epoch: WorldEpoch(1),
      chunk,
      blockRevision: ChunkRevision(1),
      lightRevision: LightRevision(1),
      blocks,
      light,
    })
    const detached = view.light.snapshot()
    detached[0] = 15
    expect(view.getLight(0)).toBe(0)
  })

  it('rejectsInvalidSectionIndices', () => {
    const view = readView({
      epoch: WorldEpoch(0),
      chunk,
      blockRevision: ChunkRevision(0),
      lightRevision: LightRevision(0),
      blocks: new Uint16Array(1),
      light: new Uint16Array(1),
    })
    expect(() => view.getBlock(-1)).toThrow(RangeError)
    expect(() => view.getLight(1)).toThrow(RangeError)
    expect(view.blocks.get(0)).toBe(0)
    expect(view.light.get(0)).toBe(0)
    expect(() => view.blocks.get(1)).toThrow(RangeError)
  })

  it('rejectsInvalidReadViewAndEditInputs', () => {
    expect(() => readView({
      epoch: WorldEpoch(0),
      chunk,
      blockRevision: ChunkRevision(0),
      lightRevision: LightRevision(0),
      blocks: new Uint16Array(1),
      light: new Uint16Array(0),
    })).toThrow(/equal lengths/)
    expect(() => readView({
      epoch: WorldEpoch(0),
      chunk,
      blockRevision: ChunkRevision(0),
      lightRevision: LightRevision(0),
      blocks: new Uint16Array([0xffff]),
      light: new Uint16Array(1),
    })).toThrow(/unknown block id/)
    expect(() => blockEdit(origin, BlockId(0xffff))).toThrow(/unknown block id/)
  })

  it('rejectsInvalidRevisionAndIndexBrands', () => {
    expect(() => WorldEpoch(-1)).toThrow()
    expect(() => ChunkRevision(-1)).toThrow()
    expect(() => LightRevision(-1)).toThrow()
    expect(() => ChunkLocalIndex(-1)).toThrow()
    expect(() => SectionIndex(-1)).toThrow()
  })
})
