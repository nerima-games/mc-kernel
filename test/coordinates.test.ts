import {
  BLOCK_FACES,
  type BlockPosition,
  CHUNK_SIZE_XZ,
  HORIZONTAL_BLOCK_FACES,
  aabb,
  aabbContainsPoint,
  aabbIntersects,
  aabbOfBlock,
  adjacentBlockPosition,
  blockNeighbours,
  blockPosition,
  blockPositionOfChunkLocal,
  blockPositionOfPosition,
  chunkCoordOfBlock,
  horizontalBlockNeighbours,
  isBlockFace,
  localCoordOfBlock,
  oppositeBlockFace,
  position,
} from '../src/domain/coordinates'
import { describe, expect, it } from 'vitest'
import { Effect } from 'effect'

const NEGATIVE_ZERO = -0
const NEGATIVE_ONE = -1
const NEGATIVE_TWO = -2
const NEGATIVE_THREE = -3
const NEGATIVE_FIFTEEN = -15
const NEGATIVE_SIXTEEN = -16
const NEGATIVE_SEVENTEEN = -17
const NEGATIVE_THIRTY_THREE = -33
const NEGATIVE_FIFTY_NINE = -59
const NEGATIVE_SIXTY_FOUR = -64
const NEGATIVE_ONE_TENTH = -0.1
const NEGATIVE_ONE_HALF = -0.5
const NEGATIVE_NINE_TENTHS = -0.9
const NEGATIVE_FIVE_THOUSAND_SIX_HUNDRED_SEVENTY_EIGHT = -5678
const ZERO = 0
const ONE = 1
const TWO = 2
const THREE = 3
const FOUR = 4
const FIVE = 5
const SEVEN = 7
const EIGHT = 8
const NINE = 9
const TEN = 10
const ELEVEN = 11
const FOURTEEN = 14
const FIFTEEN = 15
const SIXTEEN = 16
const SEVENTEEN = 17
const NINETEEN = 19
const TWENTY = 20
const TWENTY_ONE = 21
const TWENTY_NINE = 29
const THIRTY = 30
const THIRTY_ONE = 31
const SIXTY_FOUR = 64
const ONE_HUNDRED = 100
const THREE_HUNDRED_NINETEEN = 319
const THREE_HUNDRED_TWENTY = 320
const ONE_THOUSAND_TWO_HUNDRED_THIRTY_FOUR = 1234
const ONE_TENTH = 0.1
const ONE_HALF = 0.5
const NINE_TENTHS = 0.9
const JUST_ABOVE_ONE = 1.0001

/** Coordinates chosen to straddle the origin, chunk borders, and both signs. */
const SAMPLE_COORDINATES: ReadonlyArray<readonly [number, number, number]> = [
  [ZERO, ZERO, ZERO],
  [ONE, SIXTY_FOUR, ONE],
  [FIFTEEN, ZERO, FIFTEEN],
  [SIXTEEN, ZERO, SIXTEEN],
  [SEVENTEEN, THREE_HUNDRED_TWENTY, THIRTY_ONE],
  [NEGATIVE_ONE, ZERO, NEGATIVE_ONE],
  [NEGATIVE_FIFTEEN, NEGATIVE_SIXTY_FOUR, NEGATIVE_FIFTEEN],
  [NEGATIVE_SIXTEEN, ZERO, NEGATIVE_SIXTEEN],
  [NEGATIVE_SEVENTEEN, ZERO, NEGATIVE_THIRTY_THREE],
  [ONE_THOUSAND_TWO_HUNDRED_THIRTY_FOUR, ONE_HUNDRED, NEGATIVE_FIVE_THOUSAND_SIX_HUNDRED_SEVENTY_EIGHT],
]

const roundTrip = (source: BlockPosition): BlockPosition =>
  blockPositionOfChunkLocal(chunkCoordOfBlock(source), localCoordOfBlock(source))

describe('world <-> chunk coordinate conversion', () => {
  it('round-trips every sample block position, including across the origin into negatives', () =>
    Effect.runPromise(Effect.sync(() => {
      for (const [blockX, blockY, blockZ] of SAMPLE_COORDINATES) {
        const source = blockPosition(blockX, blockY, blockZ)
        expect(roundTrip(source)).toStrictEqual(source)
      }
    })),
  )

  it('round-trips exhaustively over a two-chunk-wide neighbourhood of the origin', () =>
    Effect.runPromise(Effect.sync(() => {
      for (let blockX = -CHUNK_SIZE_XZ * TWO; blockX <= CHUNK_SIZE_XZ * TWO; blockX += ONE) {
        for (let blockZ = -CHUNK_SIZE_XZ * TWO; blockZ <= CHUNK_SIZE_XZ * TWO; blockZ += ONE) {
          const source = blockPosition(blockX, ZERO, blockZ)
          expect(roundTrip(source)).toStrictEqual(source)
        }
      }
    })),
  )

  it('local coordinates always land in [0, CHUNK_SIZE_XZ - 1], including for negative world coordinates', () =>
    Effect.runPromise(Effect.sync(() => {
      for (let blockX = -CHUNK_SIZE_XZ * TWO; blockX <= CHUNK_SIZE_XZ * TWO; blockX += ONE) {
        const local = localCoordOfBlock(blockPosition(blockX, ZERO, blockX))
        expect(local.lx).toBeGreaterThanOrEqual(ZERO)
        expect(local.lx).toBeLessThan(CHUNK_SIZE_XZ)
        expect(local.lz).toBeGreaterThanOrEqual(ZERO)
        expect(local.lz).toBeLessThan(CHUNK_SIZE_XZ)
      }
    })),
  )

  it('chunk coordinates floor rather than truncate, so -1 belongs to chunk -1 and not to chunk 0', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(chunkCoordOfBlock(blockPosition(NEGATIVE_ONE, ZERO, NEGATIVE_ONE))).toStrictEqual({ cx: NEGATIVE_ONE, cz: NEGATIVE_ONE })
      expect(chunkCoordOfBlock(blockPosition(NEGATIVE_SIXTEEN, ZERO, NEGATIVE_SIXTEEN))).toStrictEqual({ cx: NEGATIVE_ONE, cz: NEGATIVE_ONE })
      expect(chunkCoordOfBlock(blockPosition(NEGATIVE_SEVENTEEN, ZERO, NEGATIVE_SEVENTEEN))).toStrictEqual({ cx: NEGATIVE_TWO, cz: NEGATIVE_TWO })
      expect(chunkCoordOfBlock(blockPosition(ZERO, ZERO, ZERO))).toStrictEqual({ cx: ZERO, cz: ZERO })
      expect(chunkCoordOfBlock(blockPosition(FIFTEEN, ZERO, FIFTEEN))).toStrictEqual({ cx: ZERO, cz: ZERO })
      expect(chunkCoordOfBlock(blockPosition(SIXTEEN, ZERO, SIXTEEN))).toStrictEqual({ cx: ONE, cz: ONE })
    })),
  )

  it('the chunk-local Y component passes through untouched, because kernel does not subdivide vertically', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(localCoordOfBlock(blockPosition(THREE, NEGATIVE_FIFTY_NINE, THREE)).ly).toBe(NEGATIVE_FIFTY_NINE)
      expect(localCoordOfBlock(blockPosition(THREE, THREE_HUNDRED_NINETEEN, THREE)).ly).toBe(THREE_HUNDRED_NINETEEN)
    })),
  )
})

describe('face fallback totality', () => {
  it('keeps the final fallback arms total for invalid face values', () =>
    Effect.runPromise(Effect.sync(() => {
      const invalidFace = 'sideways' as never
      const source = blockPosition(TEN, TWENTY, THIRTY)

      expect(oppositeBlockFace(invalidFace)).toBe('sideways')
      expect(adjacentBlockPosition(source, invalidFace)).toBe('sideways')
    })),
  )
})

describe('blockPositionOfPosition', () => {
  it('floors a continuous position into the block cell that contains it', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(blockPositionOfPosition(position(NINE_TENTHS, ONE_TENTH, ONE_HALF))).toStrictEqual(blockPosition(ZERO, ZERO, ZERO))
      expect(blockPositionOfPosition(position(NEGATIVE_ONE_TENTH, NEGATIVE_NINE_TENTHS, NEGATIVE_ONE_HALF))).toStrictEqual(blockPosition(NEGATIVE_ONE, NEGATIVE_ONE, NEGATIVE_ONE))
    })),
  )

  it('normalises the negative zero that Math.floor(-0) produces, so coordinates stay canonical', () =>
    Effect.runPromise(Effect.sync(() => {
      const origin = blockPositionOfPosition(position(NEGATIVE_ZERO, NEGATIVE_ZERO, NEGATIVE_ZERO))
      expect(Object.is(origin.x, ZERO)).toBe(true)
      expect(Object.is(origin.y, ZERO)).toBe(true)
      expect(Object.is(origin.z, ZERO)).toBe(true)
      expect(origin).toStrictEqual(blockPosition(ZERO, ZERO, ZERO))
    })),
  )

  it('normalises negative zero in chunk and chunk-local coordinates too', () =>
    Effect.runPromise(Effect.sync(() => {
      const chunk = chunkCoordOfBlock(blockPosition(NEGATIVE_ZERO, ZERO, NEGATIVE_ZERO))
      expect(Object.is(chunk.cx, ZERO)).toBe(true)
      expect(Object.is(chunk.cz, ZERO)).toBe(true)

      const local = localCoordOfBlock(blockPosition(NEGATIVE_ZERO, ZERO, NEGATIVE_ZERO))
      expect(Object.is(local.lx, ZERO)).toBe(true)
      expect(Object.is(local.lz, ZERO)).toBe(true)
    })),
  )
})

describe('block face adjacency', () => {
  it('uses the canonical Minecraft axes and deterministic six-face order', () =>
    Effect.runPromise(Effect.sync(() => {
      const source = blockPosition(TEN, TWENTY, THIRTY)
      expect(BLOCK_FACES).toStrictEqual(['down', 'up', 'north', 'south', 'west', 'east'])
      expect(blockNeighbours(source)).toStrictEqual([
        blockPosition(TEN, NINETEEN, THIRTY),
        blockPosition(TEN, TWENTY_ONE, THIRTY),
        blockPosition(TEN, TWENTY, TWENTY_NINE),
        blockPosition(TEN, TWENTY, THIRTY_ONE),
        blockPosition(NINE, TWENTY, THIRTY),
        blockPosition(ELEVEN, TWENTY, THIRTY),
      ])
    })),
  )

  it('returns horizontal neighbours without leaking the vertical faces', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(HORIZONTAL_BLOCK_FACES).toStrictEqual(['west', 'east', 'north', 'south'])
      expect(horizontalBlockNeighbours(blockPosition(NEGATIVE_SIXTEEN, FOUR, FIFTEEN))).toStrictEqual([
        blockPosition(NEGATIVE_SEVENTEEN, FOUR, FIFTEEN),
        blockPosition(NEGATIVE_FIFTEEN, FOUR, FIFTEEN),
        blockPosition(NEGATIVE_SIXTEEN, FOUR, FOURTEEN),
        blockPosition(NEGATIVE_SIXTEEN, FOUR, SIXTEEN),
      ])
    })),
  )

  it('crossing a face and its opposite returns to the source', () =>
    Effect.runPromise(Effect.sync(() => {
      const source = blockPosition(NEGATIVE_THREE, SEVEN, ELEVEN)
      for (const face of BLOCK_FACES) {
        expect(adjacentBlockPosition(adjacentBlockPosition(source, face), oppositeBlockFace(face))).toStrictEqual(
          source,
        )
      }
    })),
  )

  it('guards untrusted face strings at the boundary', () =>
    Effect.runPromise(Effect.sync(() => {
      for (const face of BLOCK_FACES) {
        expect(isBlockFace(face)).toBe(true)
      }
      expect(isBlockFace('forward')).toBe(false)
      expect(isBlockFace('North')).toBe(false)
      expect(isBlockFace('')).toBe(false)
    })),
  )
})

describe('AABB', () => {
  it('normalises swapped corners so that min <= max holds componentwise', () =>
    Effect.runPromise(Effect.sync(() => {
      const box = aabb(position(THREE, FOUR, FIVE), position(ONE, TWO, THREE))
      expect(box.min).toStrictEqual(position(ONE, TWO, THREE))
      expect(box.max).toStrictEqual(position(THREE, FOUR, FIVE))
    })),
  )

  it('treats touching faces as adjacent rather than overlapping, so standing on a block is not a collision', () =>
    Effect.runPromise(Effect.sync(() => {
      const below = aabbOfBlock(blockPosition(ZERO, ZERO, ZERO))
      const above = aabbOfBlock(blockPosition(ZERO, ONE, ZERO))
      expect(aabbIntersects(below, above)).toBe(false)
      expect(aabbIntersects(below, below)).toBe(true)
    })),
  )

  it('detects a genuine overlap', () =>
    Effect.runPromise(Effect.sync(() => {
      const left = aabb(position(ZERO, ZERO, ZERO), position(TWO, TWO, TWO))
      const right = aabb(position(ONE, ONE, ONE), position(THREE, THREE, THREE))
      expect(aabbIntersects(left, right)).toBe(true)
      expect(aabbIntersects(right, left)).toBe(true)
    })),
  )

  it('a block occupies the unit cube anchored at its own coordinates', () =>
    Effect.runPromise(Effect.sync(() => {
      const box = aabbOfBlock(blockPosition(NEGATIVE_THREE, SEVEN, TWO))
      expect(box.min).toStrictEqual(position(NEGATIVE_THREE, SEVEN, TWO))
      expect(box.max).toStrictEqual(position(NEGATIVE_TWO, EIGHT, THREE))
    })),
  )

  it('containment includes the boundary', () =>
    Effect.runPromise(Effect.sync(() => {
      const box = aabb(position(ZERO, ZERO, ZERO), position(ONE, ONE, ONE))
      expect(aabbContainsPoint(box, position(ONE_HALF, ONE_HALF, ONE_HALF))).toBe(true)
      expect(aabbContainsPoint(box, position(ZERO, ZERO, ZERO))).toBe(true)
      expect(aabbContainsPoint(box, position(ONE, ONE, ONE))).toBe(true)
      expect(aabbContainsPoint(box, position(JUST_ABOVE_ONE, ONE_HALF, ONE_HALF))).toBe(false)
    })),
  )
})
