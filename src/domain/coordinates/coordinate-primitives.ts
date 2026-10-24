import { Brand } from 'effect'

const ZERO = 0

/** Horizontal extent of a chunk, in blocks. Vertical extent is world-dependent. */
export const CHUNK_SIZE_XZ = 16

/** An integral world-space block coordinate on any axis. */
export type BlockAxis = number & Brand.Brand<'BlockAxis'>

export const BlockAxis: Brand.Constructor<BlockAxis> = Brand.make<BlockAxis>(
  (value) =>
    Number.isSafeInteger(value)
      ? true
      : `BlockAxis must be a safe integer, received ${value}`,
)

/** An integral chunk-space coordinate on the X or Z axis. One step = CHUNK_SIZE_XZ blocks. */
export type ChunkAxis = number & Brand.Brand<'ChunkAxis'>

export const ChunkAxis: Brand.Constructor<ChunkAxis> = Brand.make<ChunkAxis>(
  (value) =>
    Number.isSafeInteger(value)
      ? true
      : `ChunkAxis must be a safe integer, received ${value}`,
)

/** A chunk-local horizontal coordinate: an integer in [0, CHUNK_SIZE_XZ - 1]. */
export type LocalAxis = number & Brand.Brand<'LocalAxis'>

export const LocalAxis: Brand.Constructor<LocalAxis> = Brand.make<LocalAxis>(
  (value) =>
    Number.isInteger(value) && value >= ZERO && value < CHUNK_SIZE_XZ
      ? true
      : `LocalAxis must be an integer in [0, ${CHUNK_SIZE_XZ - 1}], received ${value}`,
)

/** A finite continuous world-space coordinate measured in blocks. */
export type PositionAxis = number & Brand.Brand<'PositionAxis'>

export const PositionAxis: Brand.Constructor<PositionAxis> = Brand.make<PositionAxis>(
  (value) =>
    Number.isFinite(value)
      ? true
      : `PositionAxis must be a finite number of blocks, received ${value}`,
)

/** A continuous world-space point. Y is up. */
export type Position = {
  readonly x: PositionAxis
  readonly y: PositionAxis
  readonly z: PositionAxis
}

export const position = (
  coordinateX: PositionAxis,
  coordinateY: PositionAxis,
  coordinateZ: PositionAxis,
): Position => ({
  x: coordinateX,
  y: coordinateY,
  z: coordinateZ,
})

/** Collapse `-0` to `0` before an integral value receives a brand. */
const normalizeZero = (value: number): number => value + ZERO

/** A world-space block cell. Every component is an integer. */
export type BlockPosition = {
  readonly x: BlockAxis
  readonly y: BlockAxis
  readonly z: BlockAxis
}

export const blockPositionFromAxes = (x: BlockAxis, y: BlockAxis, z: BlockAxis): BlockPosition => ({ x, y, z })

export const blockPosition = (x: BlockAxis, y: BlockAxis, z: BlockAxis): BlockPosition =>
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

export const chunkCoord = (cx: ChunkAxis, cz: ChunkAxis): ChunkCoord =>
  chunkCoordFromAxes(ChunkAxis(normalizeZero(cx)), ChunkAxis(normalizeZero(cz)))
