/**
 * Public coordinate vocabulary.
 *
 * Each concern lives in a focused module: primitive branded values, canonical
 * keys, neighbour traversal, world/chunk conversion, and geometry. This file
 * is the stable domain entrypoint used by the rest of the kernel.
 */
export {
  CHUNK_SIZE_XZ,
  BlockAxis,
  ChunkAxis,
  LocalAxis,
  blockPosition,
  chunkCoord,
  position,
} from './coordinate-primitives.js'
export type { BlockPosition, ChunkCoord, Position } from './coordinate-primitives.js'

export {
  BlockPositionKey,
  blockPositionKeyOf,
  blockPositionOfKey,
  ChunkKey,
  chunkKeyOf,
  chunkCoordOfKey,
  decodeBlockPositionKey,
  decodeChunkKey,
  isBlockPositionKey,
  isChunkKey,
} from './coordinate-keys.js'
export {
  adjacentBlockPosition,
  BLOCK_FACES,
  blockNeighbours,
  HORIZONTAL_BLOCK_FACES,
  horizontalBlockNeighbours,
  isBlockFace,
  oppositeBlockFace,
} from './coordinate-neighbours.js'
export type { BlockFace } from './coordinate-neighbours.js'

export {
  blockPositionOfChunkLocal,
  blockPositionOfPosition,
  chunkCoordOfBlock,
  localCoordOfBlock,
} from './coordinate-conversions.js'
export type { LocalBlockCoord } from './coordinate-conversions.js'

export { aabb, aabbContainsPoint, aabbIntersects, aabbOfBlock } from './coordinate-geometry.js'
export type { AABB } from './coordinate-geometry.js'
