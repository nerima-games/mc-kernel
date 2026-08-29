import { describe, expect, it } from 'vitest'
import { chunk } from '../src/domain/chunk'
import { CHUNK_SIZE_XZ, chunkCoord } from '../src/domain/coordinates'
import { BLOCK_IDS, blockIdOf, opacityOfBlockId, propertyOfBlockId } from '../src/domain/block-registry'
import {
  heightmapColumnIndex,
  motionBlockingHeightmapOf,
  opaqueHeightmapOf,
  type Heightmap,
} from '../src/domain/heightmap'

const CHUNK_HEIGHT = 4
const COLUMN_COUNT = CHUNK_SIZE_XZ * CHUNK_SIZE_XZ
const BLOCK_COUNT = COLUMN_COUNT * CHUNK_HEIGHT

type Placement = readonly [lx: number, lz: number, ly: number, blockId: number]

const blockIndexOf = (lx: number, lz: number, ly: number): number =>
  (lx * CHUNK_SIZE_XZ + lz) * CHUNK_HEIGHT + ly

const buildChunk = (placements: ReadonlyArray<Placement>) => {
  const blocks = new Uint8Array(BLOCK_COUNT)
  for (const [lx, lz, ly, blockId] of placements) {
    blocks[blockIndexOf(lx, lz, ly)] = blockId
  }
  return chunk(chunkCoord(0, 0), CHUNK_HEIGHT, blocks)
}

const everyColumnIsUndefined = (heightmap: Heightmap): boolean =>
  heightmap.every((value) => value === undefined)

describe('heightmap', () => {
  it('yields no qualifying block for every column of an all-air chunk', () => {
    const source = buildChunk([])

    const opaque = opaqueHeightmapOf(source)
    const motionBlocking = motionBlockingHeightmapOf(source)

    expect(opaque).toHaveLength(COLUMN_COUNT)
    expect(motionBlocking).toHaveLength(COLUMN_COUNT)
    expect(everyColumnIsUndefined(opaque)).toBe(true)
    expect(everyColumnIsUndefined(motionBlocking)).toBe(true)
  })

  it('resolves a single opaque block to its own column and leaves the rest absent', () => {
    const stone = blockIdOf('stone')
    const torch = blockIdOf('torch')
    const stoneColumn = { lx: 3, lz: 5, ly: 2 }
    const torchColumn = { lx: 7, lz: 9, ly: 1 }

    const source = buildChunk([
      [stoneColumn.lx, stoneColumn.lz, stoneColumn.ly, stone],
      [torchColumn.lx, torchColumn.lz, torchColumn.ly, torch],
    ])

    const opaque = opaqueHeightmapOf(source)
    const motionBlocking = motionBlockingHeightmapOf(source)
    const stoneIndex = heightmapColumnIndex(stoneColumn.lx, stoneColumn.lz)
    const torchIndex = heightmapColumnIndex(torchColumn.lx, torchColumn.lz)
    const emptyIndex = heightmapColumnIndex(0, 0)

    expect(opaque[stoneIndex]).toBe(stoneColumn.ly)
    expect(motionBlocking[stoneIndex]).toBe(stoneColumn.ly)

    // A torch is neither opaque nor motion-blocking: present, but disqualified.
    expect(opaque[torchIndex]).toBeUndefined()
    expect(motionBlocking[torchIndex]).toBeUndefined()

    expect(opaque[emptyIndex]).toBeUndefined()
    expect(motionBlocking[emptyIndex]).toBeUndefined()
  })

  it('differs between the two kinds for a block that blocks motion without being opaque', () => {
    const differingBlockId = BLOCK_IDS.find(
      (blockId) =>
        propertyOfBlockId(blockId, 'collisionShape') !== 'none' && opacityOfBlockId(blockId) !== 'opaque',
    )

    expect(differingBlockId).toBeDefined()
    if (differingBlockId === undefined) return

    const column = { lx: 2, lz: 2, ly: 1 }
    const source = buildChunk([[column.lx, column.lz, column.ly, differingBlockId]])
    const index = heightmapColumnIndex(column.lx, column.lz)

    const opaque = opaqueHeightmapOf(source)
    const motionBlocking = motionBlockingHeightmapOf(source)

    expect(opaque[index]).toBeUndefined()
    expect(motionBlocking[index]).toBe(column.ly)
    expect(opaque).not.toStrictEqual(motionBlocking)
  })

  it('is deterministic across repeated calls on the same chunk', () => {
    const stone = blockIdOf('stone')
    const source = buildChunk([[4, 4, 2, stone]])

    expect(opaqueHeightmapOf(source)).toStrictEqual(opaqueHeightmapOf(source))
    expect(motionBlockingHeightmapOf(source)).toStrictEqual(motionBlockingHeightmapOf(source))
  })

  it('skips a motion-blocking, non-opaque block to find the opaque block beneath it, while motion-blocking stops at the top', () => {
    const opaqueBlockId = BLOCK_IDS.find(
      (blockId) =>
        propertyOfBlockId(blockId, 'collisionShape') !== 'none' && opacityOfBlockId(blockId) === 'opaque',
    )
    const motionOnlyBlockId = BLOCK_IDS.find(
      (blockId) =>
        propertyOfBlockId(blockId, 'collisionShape') !== 'none' && opacityOfBlockId(blockId) !== 'opaque',
    )

    expect(opaqueBlockId).toBeDefined()
    expect(motionOnlyBlockId).toBeDefined()
    if (opaqueBlockId === undefined || motionOnlyBlockId === undefined) return

    const column = { lx: 1, lz: 6 }
    const source = buildChunk([
      [column.lx, column.lz, 0, opaqueBlockId],
      [column.lx, column.lz, 1, motionOnlyBlockId],
    ])
    const index = heightmapColumnIndex(column.lx, column.lz)

    const opaque = opaqueHeightmapOf(source)
    const motionBlocking = motionBlockingHeightmapOf(source)

    // The motion-only block at ly=1 disqualifies the opaque scan, which must
    // fall through to the opaque block at ly=0; the motion-blocking scan
    // stops at ly=1 without looking further down.
    expect(opaque[index]).toBe(0)
    expect(motionBlocking[index]).toBe(1)
  })

  it('counts a motion-blocking, non-opaque column toward motion-blocking but not opaque, alongside columns for the other two kinds', () => {
    const bothBlockId = BLOCK_IDS.find(
      (blockId) =>
        propertyOfBlockId(blockId, 'collisionShape') !== 'none' && opacityOfBlockId(blockId) === 'opaque',
    )
    const motionOnlyBlockId = BLOCK_IDS.find(
      (blockId) =>
        propertyOfBlockId(blockId, 'collisionShape') !== 'none' && opacityOfBlockId(blockId) !== 'opaque',
    )
    const neitherBlockId = BLOCK_IDS.find(
      (blockId) =>
        propertyOfBlockId(blockId, 'collisionShape') === 'none' && opacityOfBlockId(blockId) !== 'opaque',
    )

    expect(bothBlockId).toBeDefined()
    expect(motionOnlyBlockId).toBeDefined()
    expect(neitherBlockId).toBeDefined()
    if (bothBlockId === undefined || motionOnlyBlockId === undefined || neitherBlockId === undefined) return

    const bothColumn = { lx: 0, lz: 1, ly: 1 }
    const motionOnlyColumn = { lx: 5, lz: 3, ly: 2 }
    const neitherColumn = { lx: 8, lz: 8, ly: 3 }
    const source = buildChunk([
      [bothColumn.lx, bothColumn.lz, bothColumn.ly, bothBlockId],
      [motionOnlyColumn.lx, motionOnlyColumn.lz, motionOnlyColumn.ly, motionOnlyBlockId],
      [neitherColumn.lx, neitherColumn.lz, neitherColumn.ly, neitherBlockId],
    ])
    const bothIndex = heightmapColumnIndex(bothColumn.lx, bothColumn.lz)
    const motionOnlyIndex = heightmapColumnIndex(motionOnlyColumn.lx, motionOnlyColumn.lz)
    const neitherIndex = heightmapColumnIndex(neitherColumn.lx, neitherColumn.lz)

    const opaque = opaqueHeightmapOf(source)
    const motionBlocking = motionBlockingHeightmapOf(source)

    expect(opaque[bothIndex]).toBe(bothColumn.ly)
    expect(opaque[motionOnlyIndex]).toBeUndefined()
    expect(opaque[neitherIndex]).toBeUndefined()

    expect(motionBlocking[bothIndex]).toBe(bothColumn.ly)
    expect(motionBlocking[motionOnlyIndex]).toBe(motionOnlyColumn.ly)
    expect(motionBlocking[neitherIndex]).toBeUndefined()
  })
})
