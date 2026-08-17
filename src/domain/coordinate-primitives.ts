import { Brand } from 'effect'

const ZERO = 0

/** Horizontal extent of a chunk, in blocks. Vertical extent is world-dependent. */
export const CHUNK_SIZE_XZ = 16

/** An integral world-space block coordinate on any axis. */
export type BlockAxis = number & Brand.Brand<'BlockAxis'>

export const BlockAxis = Brand.refined<BlockAxis>(
  (value) => Number.isSafeInteger(value),
  (value) => Brand.error(`BlockAxis must be a safe integer, received ${value}`),
)

/** An integral chunk-space coordinate on the X or Z axis. One step = CHUNK_SIZE_XZ blocks. */
export type ChunkAxis = number & Brand.Brand<'ChunkAxis'>

export const ChunkAxis = Brand.refined<ChunkAxis>(
  (value) => Number.isSafeInteger(value),
  (value) => Brand.error(`ChunkAxis must be a safe integer, received ${value}`),
)

/** A chunk-local horizontal coordinate: an integer in [0, CHUNK_SIZE_XZ - 1]. */
export type LocalAxis = number & Brand.Brand<'LocalAxis'>

export const LocalAxis = Brand.refined<LocalAxis>(
  (value) => Number.isInteger(value) && value >= ZERO && value < CHUNK_SIZE_XZ,
  (value) => Brand.error(`LocalAxis must be an integer in [0, ${CHUNK_SIZE_XZ - 1}], received ${value}`),
)

/** A continuous world-space point. Y is up. */
export type Position = {
  readonly x: number
  readonly y: number
  readonly z: number
}

export const position = (coordinateX: number, coordinateY: number, coordinateZ: number): Position => ({
  x: coordinateX,
  y: coordinateY,
  z: coordinateZ,
})

/** Collapse `-0` to `0` before an integral value receives a brand. */
export const normalizeZero = (value: number): number => value + ZERO

/** A world-space block cell. Every component is an integer. */
export type BlockPosition = {
  readonly x: BlockAxis
  readonly y: BlockAxis
  readonly z: BlockAxis
}

export const blockPositionFromAxes = (x: BlockAxis, y: BlockAxis, z: BlockAxis): BlockPosition => ({ x, y, z })

export const blockPosition = (x: number, y: number, z: number): BlockPosition =>
  blockPositionFromAxes(
    BlockAxis(normalizeZero(x)),
    BlockAxis(normalizeZero(y)),
    BlockAxis(normalizeZero(z)),
  )

/** The horizontal address of a chunk column. */
export type ChunkCoord = {
  readonly cx: ChunkAxis
  readonly cz: ChunkAxis
}

export const chunkCoordFromAxes = (cx: ChunkAxis, cz: ChunkAxis): ChunkCoord => ({ cx, cz })

export const chunkCoord = (cx: number, cz: number): ChunkCoord =>
  chunkCoordFromAxes(ChunkAxis(normalizeZero(cx)), ChunkAxis(normalizeZero(cz)))
