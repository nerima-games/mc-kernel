import { blockPosition, type BlockPosition } from './coordinate-primitives.js'

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

/** The face reached by crossing a block through `face`. */
export function oppositeBlockFace(face: BlockFace): BlockFace
export function oppositeBlockFace(face: BlockFace): BlockFace {
  if (!isBlockFace(face)) {
    throw new TypeError('Unknown block face')
  }

  return BLOCK_FACE_OPPOSITES[face]
}

const UNIT_STEP = 1

/** The block cell touching `source` across `face`. */
export function adjacentBlockPosition(source: BlockPosition, face: BlockFace): BlockPosition
export function adjacentBlockPosition(source: BlockPosition, face: BlockFace): BlockPosition {
  if (!isBlockFace(face)) {
    throw new TypeError('Unknown block face')
  }

  const [dx, dy, dz] = BLOCK_FACE_STEPS[face]
  return blockPosition(source.x + dx, source.y + dy, source.z + dz)
}

/** Horizontal neighbours in west, east, north, south order. */
export const horizontalBlockNeighbours = (
  source: BlockPosition,
): readonly [west: BlockPosition, east: BlockPosition, north: BlockPosition, south: BlockPosition] => [
  blockPosition(source.x - UNIT_STEP, source.y, source.z),
  blockPosition(source.x + UNIT_STEP, source.y, source.z),
  blockPosition(source.x, source.y, source.z - UNIT_STEP),
  blockPosition(source.x, source.y, source.z + UNIT_STEP),
]

/** All face-adjacent cells, in `BLOCK_FACES` order. */
export const blockNeighbours = (
  source: BlockPosition,
): readonly [
  down: BlockPosition,
  up: BlockPosition,
  north: BlockPosition,
  south: BlockPosition,
  west: BlockPosition,
  east: BlockPosition,
] => [
  blockPosition(source.x, source.y - UNIT_STEP, source.z),
  blockPosition(source.x, source.y + UNIT_STEP, source.z),
  blockPosition(source.x, source.y, source.z - UNIT_STEP),
  blockPosition(source.x, source.y, source.z + UNIT_STEP),
  blockPosition(source.x - UNIT_STEP, source.y, source.z),
  blockPosition(source.x + UNIT_STEP, source.y, source.z),
]
