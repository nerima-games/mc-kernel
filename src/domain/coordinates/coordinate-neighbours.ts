import { Result } from 'effect'
import { BlockAxis, blockPosition, type BlockPosition } from './coordinate-primitives.js'

/**
 * The six faces of a block, in canonical traversal order.
 *
 * Y is vertical, north is -Z, and west is -X. The order is part of the public
 * contract so simulation code can traverse neighbours deterministically.
 */
export const BLOCK_FACES = ['down', 'up', 'north', 'south', 'west', 'east'] as const

export type BlockFace = (typeof BLOCK_FACES)[number]

/** Horizontal faces in the traversal order already used by gameplay rules. */
export const HORIZONTAL_BLOCK_FACES: readonly ['west', 'east', 'north', 'south'] = [
  'west',
  'east',
  'north',
  'south',
]

const BLOCK_FACE_LOOKUP: ReadonlySet<string> = new Set(BLOCK_FACES)

const BLOCK_FACE_OPPOSITES: Readonly<Record<BlockFace, BlockFace>> = {
  down: 'up',
  up: 'down',
  north: 'south',
  south: 'north',
  west: 'east',
  east: 'west',
}

const BLOCK_FACE_STEPS: Readonly<Record<BlockFace, readonly [number, number, number]>> = {
  down: [0, -1, 0],
  up: [0, 1, 0],
  north: [0, 0, -1],
  south: [0, 0, 1],
  west: [-1, 0, 0],
  east: [1, 0, 0],
}

/** Boundary guard for faces read from save files, network frames, or commands. */
export const isBlockFace = (value: unknown): value is BlockFace =>
  typeof value === 'string' && BLOCK_FACE_LOOKUP.has(value)

export type BlockNeighbourFailure = Readonly<{
  readonly _tag: 'BlockNeighbourFailure'
  readonly kind: 'TypeError' | 'RangeError'
  readonly reason: 'unknown-face' | 'coordinate-overflow'
  readonly message: string
}>

const failure = (
  reason: BlockNeighbourFailure['reason'],
  kind: BlockNeighbourFailure['kind'],
  message: string,
): Result.Result<never, BlockNeighbourFailure> =>
  Result.fail({ _tag: 'BlockNeighbourFailure', reason, kind, message })

/** The face reached by crossing a block through `face`. */
export const oppositeBlockFace = (
  face: unknown,
): Result.Result<BlockFace, BlockNeighbourFailure> => {
  if (!isBlockFace(face)) {
    return failure('unknown-face', 'TypeError', 'Unknown block face')
  }

  return Result.succeed(BLOCK_FACE_OPPOSITES[face])
}

const UNIT_STEP = 1

const blockAxisAt = (value: number): Result.Result<ReturnType<typeof BlockAxis>, BlockNeighbourFailure> =>
  Number.isSafeInteger(value)
    ? Result.succeed(BlockAxis(value))
    : failure('coordinate-overflow', 'RangeError', `Block coordinate exceeds the safe integer range: ${value}`)

const offsetBlockPosition = (
  source: BlockPosition,
  dx: number,
  dy: number,
  dz: number,
): Result.Result<BlockPosition, BlockNeighbourFailure> =>
  Result.gen(function* () {
    const x = yield* blockAxisAt(source.x + dx)
    const y = yield* blockAxisAt(source.y + dy)
    const z = yield* blockAxisAt(source.z + dz)
    return blockPosition(x, y, z)
  })

/** The block cell touching `source` across `face`. */
export const adjacentBlockPosition = (
  source: BlockPosition,
  face: unknown,
): Result.Result<BlockPosition, BlockNeighbourFailure> => {
  if (!isBlockFace(face)) {
    return failure('unknown-face', 'TypeError', 'Unknown block face')
  }

  const [dx, dy, dz] = BLOCK_FACE_STEPS[face]
  return offsetBlockPosition(source, dx, dy, dz)
}

/** Horizontal neighbours in west, east, north, south order. */
export const horizontalBlockNeighbours = (
  source: BlockPosition,
): Result.Result<
  readonly [west: BlockPosition, east: BlockPosition, north: BlockPosition, south: BlockPosition],
  BlockNeighbourFailure
> =>
  Result.gen(function* () {
    const west = yield* offsetBlockPosition(source, -UNIT_STEP, 0, 0)
    const east = yield* offsetBlockPosition(source, UNIT_STEP, 0, 0)
    const north = yield* offsetBlockPosition(source, 0, 0, -UNIT_STEP)
    const south = yield* offsetBlockPosition(source, 0, 0, UNIT_STEP)
    return [west, east, north, south]
  })

/** All face-adjacent cells, in `BLOCK_FACES` order. */
export const blockNeighbours = (
  source: BlockPosition,
): Result.Result<
  readonly [
    down: BlockPosition,
    up: BlockPosition,
    north: BlockPosition,
    south: BlockPosition,
    west: BlockPosition,
    east: BlockPosition,
  ],
  BlockNeighbourFailure
> =>
  Result.gen(function* () {
    const down = yield* offsetBlockPosition(source, 0, -UNIT_STEP, 0)
    const up = yield* offsetBlockPosition(source, 0, UNIT_STEP, 0)
    const north = yield* offsetBlockPosition(source, 0, 0, -UNIT_STEP)
    const south = yield* offsetBlockPosition(source, 0, 0, UNIT_STEP)
    const west = yield* offsetBlockPosition(source, -UNIT_STEP, 0, 0)
    const east = yield* offsetBlockPosition(source, UNIT_STEP, 0, 0)
    return [down, up, north, south, west, east]
  })
