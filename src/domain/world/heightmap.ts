/**
 * Pure per-column heightmaps derived from a chunk's block data.
 *
 * Vanilla distinguishes several heightmap kinds; this module derives the two
 * kernel consumers need: the topmost opaque block (sky-light occlusion) and
 * the topmost motion-blocking block (placement and spawn checks). Both are
 * resolved through the registry's `BlockCapabilities` / `BlockProperties`
 * accessors, never from a block-name literal.
 *
 * Motion blocking reads `collisionShape` rather than `passable`:
 * `block-registry-entries-collision-shapes.ts` records a pressure plate as
 * "a very short box you stand ON, which is exactly the distinction
 * collisionShape exists to carry and passable cannot" — that is the
 * distinction placement and spawn checks need.
 *
 * A pure derivation only: no caching, invalidation, or scheduling. A caller
 * recomputes this when the chunk's blocks change.
 */
import { Brand } from 'effect'
import { CHUNK_SIZE_XZ, LocalAxis } from '../coordinates/coordinates.js'
import { ChunkLocalY, type Chunk } from './chunk.js'
import { isEmpty, opacityOfBlockId, propertyOfBlockId } from '../block/block-registry.js'
import type { BlockId } from '../block/block-registry-types.js'
import { BlockStateIndex } from '../block/block-state.js'

const AXIS_MIN = 0
const AXIS_STEP = 1
const TOP_OFFSET = 1

/** A column's y for one heightmap kind, or absent when no block in the column qualifies. */
export type ColumnHeight = ChunkLocalY | undefined

/** Flat index of one chunk-local X/Z column, in [0, CHUNK_SIZE_XZ² - 1]. */
export type HeightmapColumnIndex = number & Brand.Brand<'HeightmapColumnIndex'>
export const HeightmapColumnIndex: Brand.Constructor<HeightmapColumnIndex> = Brand.make<HeightmapColumnIndex>(
  (value) =>
    Number.isSafeInteger(value) && value >= 0 && value < CHUNK_SIZE_XZ * CHUNK_SIZE_XZ
      ? true
      : `HeightmapColumnIndex must be an integer in [0, ${CHUNK_SIZE_XZ * CHUNK_SIZE_XZ - 1}], received ${value}`,
)

/** Dense per-column heightmap; look up a column with `heightmapColumnIndex`. */
export type Heightmap = ReadonlyArray<ColumnHeight>

/** The flat column index a `Heightmap` uses for chunk-local `(lx, lz)`. */
export const heightmapColumnIndex = (lx: LocalAxis, lz: LocalAxis): HeightmapColumnIndex =>
  HeightmapColumnIndex(lx * CHUNK_SIZE_XZ + lz)

/** `chunk.ts` documents blocks stored x-major then z-major then y-major. */
const blockIndexOf = (lx: number, lz: number, ly: number, height: number): number =>
  (lx * CHUNK_SIZE_XZ + lz) * height + ly

type QualifiesBlock = (blockId: BlockId) => boolean

const topQualifyingY = (chunk: Chunk, lx: number, lz: number, qualifies: QualifiesBlock): ColumnHeight => {
  for (let ly = chunk.height - TOP_OFFSET; ly >= AXIS_MIN; ly -= AXIS_STEP) {
    const blockId = chunk.blocks.get(BlockStateIndex(blockIndexOf(lx, lz, ly, chunk.height)))
    if (isEmpty(blockId)) continue
    if (qualifies(blockId)) return ChunkLocalY(ly)
  }
  return undefined
}

const heightmapOf = (chunk: Chunk, qualifies: QualifiesBlock): Heightmap => {
  const columns: Array<ColumnHeight> = Array.from(
    { length: CHUNK_SIZE_XZ * CHUNK_SIZE_XZ },
    () => undefined,
  )

  for (let lx = AXIS_MIN; lx < CHUNK_SIZE_XZ; lx += AXIS_STEP) {
    for (let lz = AXIS_MIN; lz < CHUNK_SIZE_XZ; lz += AXIS_STEP) {
      columns[heightmapColumnIndex(LocalAxis(lx), LocalAxis(lz))] = topQualifyingY(chunk, lx, lz, qualifies)
    }
  }

  return columns
}

const isOpaqueBlockId = (blockId: BlockId): boolean => opacityOfBlockId(blockId) === 'opaque'

const isMotionBlockingBlockId = (blockId: BlockId): boolean =>
  propertyOfBlockId(blockId, 'collisionShape') !== 'none'

/** Topmost opaque block per column, used for sky-light occlusion. */
export const opaqueHeightmapOf = (chunk: Chunk): Heightmap => heightmapOf(chunk, isOpaqueBlockId)

/** Topmost motion-blocking block per column, used for placement and spawn checks. */
export const motionBlockingHeightmapOf = (chunk: Chunk): Heightmap => heightmapOf(chunk, isMotionBlockingBlockId)
