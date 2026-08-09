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
export const HORIZONTAL_BLOCK_FACES = ['west', 'east', 'north', 'south'] as const satisfies ReadonlyArray<BlockFace>

const BLOCK_FACE_LOOKUP: ReadonlySet<string> = new Set(BLOCK_FACES)

/** Boundary guard for faces read from save files, network frames, or commands. */
export const isBlockFace = (value: string): value is BlockFace => BLOCK_FACE_LOOKUP.has(value)

/** The face reached by crossing a block through `face`. */
export const oppositeBlockFace = (face: BlockFace): BlockFace => {
  switch (face) {
    case 'down':
      return 'up'
    case 'up':
      return 'down'
    case 'north':
      return 'south'
    case 'south':
      return 'north'
    case 'west':
      return 'east'
    case 'east':
      return 'west'
    default:
      return face satisfies never
  }
}

const NEGATIVE_UNIT_STEP = -1
const UNIT_STEP = 1

/** The block cell touching `source` across `face`. */
export const adjacentBlockPosition = (source: BlockPosition, face: BlockFace): BlockPosition => {
  switch (face) {
    case 'down':
      return blockPosition(source.x, source.y + NEGATIVE_UNIT_STEP, source.z)
    case 'up':
      return blockPosition(source.x, source.y + UNIT_STEP, source.z)
    case 'north':
      return blockPosition(source.x, source.y, source.z + NEGATIVE_UNIT_STEP)
    case 'south':
      return blockPosition(source.x, source.y, source.z + UNIT_STEP)
    case 'west':
      return blockPosition(source.x + NEGATIVE_UNIT_STEP, source.y, source.z)
    case 'east':
      return blockPosition(source.x + UNIT_STEP, source.y, source.z)
    default:
      return face satisfies never
  }
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
