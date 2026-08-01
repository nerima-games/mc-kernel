import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import {
  aabb,
  aabbContainsPoint,
  aabbIntersects,
  aabbOfBlock,
  blockPosition,
  blockPositionOfChunkLocal,
  blockPositionOfPosition,
  CHUNK_SIZE_XZ,
  chunkCoordOfBlock,
  localCoordOfBlock,
  position,
  type BlockPosition,
} from '../src/domain/coordinates'

/** Coordinates chosen to straddle the origin, chunk borders, and both signs. */
const SAMPLE_COORDINATES: ReadonlyArray<readonly [number, number, number]> = [
  [0, 0, 0],
  [1, 64, 1],
  [15, 0, 15],
  [16, 0, 16],
  [17, 320, 31],
  [-1, 0, -1],
  [-15, -64, -15],
  [-16, 0, -16],
  [-17, 0, -33],
  [1234, 100, -5678],
]

const roundTrip = (source: BlockPosition): BlockPosition =>
  blockPositionOfChunkLocal(chunkCoordOfBlock(source), localCoordOfBlock(source))

describe('world <-> chunk coordinate conversion', () => {
  it.effect('round-trips every sample block position, including across the origin into negatives', () =>
    Effect.sync(() => {
      for (const [x, y, z] of SAMPLE_COORDINATES) {
        const source = blockPosition(x, y, z)
        expect(roundTrip(source)).toStrictEqual(source)
      }
    }),
  )

  it.effect('round-trips exhaustively over a two-chunk-wide neighbourhood of the origin', () =>
    Effect.sync(() => {
      for (let x = -CHUNK_SIZE_XZ * 2; x <= CHUNK_SIZE_XZ * 2; x += 1) {
        for (let z = -CHUNK_SIZE_XZ * 2; z <= CHUNK_SIZE_XZ * 2; z += 1) {
          const source = blockPosition(x, 0, z)
          expect(roundTrip(source)).toStrictEqual(source)
        }
      }
    }),
  )

  it.effect('local coordinates always land in [0, CHUNK_SIZE_XZ - 1], including for negative world coordinates', () =>
    Effect.sync(() => {
      for (let x = -CHUNK_SIZE_XZ * 2; x <= CHUNK_SIZE_XZ * 2; x += 1) {
        const local = localCoordOfBlock(blockPosition(x, 0, x))
        expect(local.lx).toBeGreaterThanOrEqual(0)
        expect(local.lx).toBeLessThan(CHUNK_SIZE_XZ)
        expect(local.lz).toBeGreaterThanOrEqual(0)
        expect(local.lz).toBeLessThan(CHUNK_SIZE_XZ)
      }
    }),
  )

  it.effect('chunk coordinates floor rather than truncate, so -1 belongs to chunk -1 and not to chunk 0', () =>
    Effect.sync(() => {
      expect(chunkCoordOfBlock(blockPosition(-1, 0, -1))).toStrictEqual({ cx: -1, cz: -1 })
      expect(chunkCoordOfBlock(blockPosition(-16, 0, -16))).toStrictEqual({ cx: -1, cz: -1 })
      expect(chunkCoordOfBlock(blockPosition(-17, 0, -17))).toStrictEqual({ cx: -2, cz: -2 })
      expect(chunkCoordOfBlock(blockPosition(0, 0, 0))).toStrictEqual({ cx: 0, cz: 0 })
      expect(chunkCoordOfBlock(blockPosition(15, 0, 15))).toStrictEqual({ cx: 0, cz: 0 })
      expect(chunkCoordOfBlock(blockPosition(16, 0, 16))).toStrictEqual({ cx: 1, cz: 1 })
    }),
  )

  it.effect('the chunk-local Y component passes through untouched, because kernel does not subdivide vertically', () =>
    Effect.sync(() => {
      expect(localCoordOfBlock(blockPosition(3, -59, 3)).ly).toBe(-59)
      expect(localCoordOfBlock(blockPosition(3, 319, 3)).ly).toBe(319)
    }),
  )
})

describe('blockPositionOfPosition', () => {
  it.effect('floors a continuous position into the block cell that contains it', () =>
    Effect.sync(() => {
      expect(blockPositionOfPosition(position(0.9, 0.1, 0.5))).toStrictEqual(blockPosition(0, 0, 0))
      expect(blockPositionOfPosition(position(-0.1, -0.9, -0.5))).toStrictEqual(blockPosition(-1, -1, -1))
    }),
  )

  it.effect('normalises the negative zero that Math.floor(-0) produces, so coordinates stay canonical', () =>
    Effect.sync(() => {
      const origin = blockPositionOfPosition(position(-0, -0, -0))
      expect(Object.is(origin.x, 0)).toBe(true)
      expect(Object.is(origin.y, 0)).toBe(true)
      expect(Object.is(origin.z, 0)).toBe(true)
      expect(origin).toStrictEqual(blockPosition(0, 0, 0))
    }),
  )

  it.effect('normalises negative zero in chunk and chunk-local coordinates too', () =>
    Effect.sync(() => {
      const chunk = chunkCoordOfBlock(blockPosition(-0, 0, -0))
      expect(Object.is(chunk.cx, 0)).toBe(true)
      expect(Object.is(chunk.cz, 0)).toBe(true)

      const local = localCoordOfBlock(blockPosition(-0, 0, -0))
      expect(Object.is(local.lx, 0)).toBe(true)
      expect(Object.is(local.lz, 0)).toBe(true)
    }),
  )
})

describe('AABB', () => {
  it.effect('normalises swapped corners so that min <= max holds componentwise', () =>
    Effect.sync(() => {
      const box = aabb(position(3, 4, 5), position(1, 2, 3))
      expect(box.min).toStrictEqual(position(1, 2, 3))
      expect(box.max).toStrictEqual(position(3, 4, 5))
    }),
  )

  it.effect('treats touching faces as adjacent rather than overlapping, so standing on a block is not a collision', () =>
    Effect.sync(() => {
      const below = aabbOfBlock(blockPosition(0, 0, 0))
      const above = aabbOfBlock(blockPosition(0, 1, 0))
      expect(aabbIntersects(below, above)).toBe(false)
      expect(aabbIntersects(below, below)).toBe(true)
    }),
  )

  it.effect('detects a genuine overlap', () =>
    Effect.sync(() => {
      const left = aabb(position(0, 0, 0), position(2, 2, 2))
      const right = aabb(position(1, 1, 1), position(3, 3, 3))
      expect(aabbIntersects(left, right)).toBe(true)
      expect(aabbIntersects(right, left)).toBe(true)
    }),
  )

  it.effect('a block occupies the unit cube anchored at its own coordinates', () =>
    Effect.sync(() => {
      const box = aabbOfBlock(blockPosition(-3, 7, 2))
      expect(box.min).toStrictEqual(position(-3, 7, 2))
      expect(box.max).toStrictEqual(position(-2, 8, 3))
    }),
  )

  it.effect('containment includes the boundary', () =>
    Effect.sync(() => {
      const box = aabb(position(0, 0, 0), position(1, 1, 1))
      expect(aabbContainsPoint(box, position(0.5, 0.5, 0.5))).toBe(true)
      expect(aabbContainsPoint(box, position(0, 0, 0))).toBe(true)
      expect(aabbContainsPoint(box, position(1, 1, 1))).toBe(true)
      expect(aabbContainsPoint(box, position(1.0001, 0.5, 0.5))).toBe(false)
    }),
  )
})
