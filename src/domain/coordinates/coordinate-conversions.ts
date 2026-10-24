import { Result } from 'effect'
import {
  CHUNK_SIZE_XZ,
  BlockAxis,
  blockPositionFromAxes,
  ChunkAxis,
  chunkCoord,
  LocalAxis,
  type BlockPosition,
  type ChunkCoord,
  type Position,
} from './coordinate-primitives.js'

/**
 * A block address relative to its chunk column.
 *
 * `lx` / `lz` are chunk-local and therefore in [0, 15]. `ly` is deliberately a
 * plain BlockAxis: chunks are not vertically subdivided by this type, and the
 * legal Y range is a world-generation concern that kernel does not own.
 */
export type LocalBlockCoord = {
  readonly lx: LocalAxis
  readonly ly: BlockPosition['y']
  readonly lz: LocalAxis
}

/** Euclidean floor division — correct for negative operands, unlike `/` + trunc. */
const floorDiv = (value: number, divisor: number): number => Math.floor(value / divisor)

/** Euclidean modulo — always in [0, divisor), unlike `%`. */
const floorMod = (value: number, divisor: number): number => ((value % divisor) + divisor) % divisor

export type CoordinateConversionFailure = Readonly<{
  readonly _tag: 'CoordinateConversionFailure'
  readonly reason: 'block-axis-out-of-range'
  readonly axis: 'x' | 'y' | 'z'
  readonly kind: 'RangeError'
}>

const coordinateConversionFailure = (axis: CoordinateConversionFailure['axis']): CoordinateConversionFailure => ({
  _tag: 'CoordinateConversionFailure',
  reason: 'block-axis-out-of-range',
  axis,
  kind: 'RangeError',
})

const normalizeZero = (value: number): number => value + 0

const blockAxisResult = (
  value: number,
  axis: CoordinateConversionFailure['axis'],
): Result.Result<BlockAxis, CoordinateConversionFailure> =>
  Result.mapError(BlockAxis.result(value), () => coordinateConversionFailure(axis))

/** The block cell that contains a continuous position. */
export const blockPositionOfPosition = (
  value: Position,
): Result.Result<BlockPosition, CoordinateConversionFailure> =>
  Result.gen(function* () {
    const x = yield* blockAxisResult(normalizeZero(Math.floor(value.x)), 'x')
    const y = yield* blockAxisResult(normalizeZero(Math.floor(value.y)), 'y')
    const z = yield* blockAxisResult(normalizeZero(Math.floor(value.z)), 'z')
    return blockPositionFromAxes(x, y, z)
  })

/** The chunk column that owns a block cell. */
export const chunkCoordOfBlock = (value: BlockPosition): ChunkCoord =>
  chunkCoord(ChunkAxis(floorDiv(value.x, CHUNK_SIZE_XZ)), ChunkAxis(floorDiv(value.z, CHUNK_SIZE_XZ)))

/** The chunk-local address of a block cell. */
export const localCoordOfBlock = (value: BlockPosition): LocalBlockCoord => ({
  lx: LocalAxis(floorMod(value.x, CHUNK_SIZE_XZ)),
  ly: value.y,
  lz: LocalAxis(floorMod(value.z, CHUNK_SIZE_XZ)),
})

/** Inverse of `chunkCoordOfBlock` + `localCoordOfBlock`. */
export const blockPositionOfChunkLocal = (
  chunk: ChunkCoord,
  local: LocalBlockCoord,
): Result.Result<BlockPosition, CoordinateConversionFailure> =>
  Result.gen(function* () {
    const x = yield* blockAxisResult(normalizeZero(chunk.cx * CHUNK_SIZE_XZ + local.lx), 'x')
    const z = yield* blockAxisResult(normalizeZero(chunk.cz * CHUNK_SIZE_XZ + local.lz), 'z')
    return blockPositionFromAxes(x, local.ly, z)
  })
