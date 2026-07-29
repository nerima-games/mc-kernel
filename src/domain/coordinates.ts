/**
 * Spatial vocabulary: continuous positions, axis-aligned bounding boxes, and
 * the world <-> chunk coordinate conversions.
 * Three coordinate spaces exist and are kept apart by branding the axes:
 *
 *   Position          continuous, world space, metres (1 block = 1 unit)
 *   BlockPosition     integral, world space   (BlockAxis on every component)
 *   ChunkCoord        integral, chunk space   (ChunkAxis; one step = 16 blocks)
 *   LocalBlockCoord   integral, chunk-local   (LocalAxis on x/z, in [0, 15])
 *
 * Negative coordinates use floor division and Euclidean modulo so converting
 * through chunk-local coordinates round-trips correctly.
 */
import { Brand } from 'effect'

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
  (value) => Number.isInteger(value) && value >= 0 && value < CHUNK_SIZE_XZ,
  (value) => Brand.error(`LocalAxis must be an integer in [0, ${CHUNK_SIZE_XZ - 1}], received ${value}`),
)

/** A continuous world-space point. Y is up. */
export type Position = {
  readonly x: number
  readonly y: number
  readonly z: number
}

export const position = (x: number, y: number, z: number): Position => ({ x, y, z })

/**
 * Collapse `-0` to `0`.
 *
 * `Math.floor(-0)` is `-0`, so a negative zero can enter integral coordinates
 * from an ordinary conversion. It then compares equal under `===` but not under
 * `Object.is`, and structural equality helpers (including Vitest's
 * `toStrictEqual`) treat it as a different value. Normalising once, here, keeps
 * every integral coordinate in the system canonical.
 */
const normalizeZero = (value: number): number => value + 0

/** A world-space block cell. Every component is an integer. */
export type BlockPosition = {
  readonly x: BlockAxis
  readonly y: BlockAxis
  readonly z: BlockAxis
}

export const blockPosition = (x: number, y: number, z: number): BlockPosition => ({
  x: BlockAxis(normalizeZero(x)),
  y: BlockAxis(normalizeZero(y)),
  z: BlockAxis(normalizeZero(z)),
})

/**
 * The canonical wire/key representation of a block position: `x,y,z`.
 *
 * The brand prevents an unvalidated string from being used as an internal
 * coordinate key. Use `decodeBlockPositionKey` at a storage or network
 * boundary, then keep the branded key inside the domain.
 */
export type BlockPositionKey = string & Brand.Brand<'BlockPositionKey'>

type ParsedBlockPositionKey = readonly [x: number, y: number, z: number]

const canonicalIntegerText = (value: number): string => String(normalizeZero(value))

/**
 * Parse without allocating an intermediate array. The canonical spelling check
 * keeps one key per position (`0`, not `-0`; decimal, not exponent notation).
 */
const parseBlockPositionKey = (value: string): ParsedBlockPositionKey | undefined => {
  const firstComma = value.indexOf(',')
  const secondComma = value.indexOf(',', firstComma + 1)

  if (
    firstComma <= 0 ||
    secondComma <= firstComma + 1 ||
    secondComma === value.length - 1 ||
    value.indexOf(',', secondComma + 1) !== -1
  ) {
    return undefined
  }

  const xText = value.slice(0, firstComma)
  const yText = value.slice(firstComma + 1, secondComma)
  const zText = value.slice(secondComma + 1)
  const x = Number(xText)
  const y = Number(yText)
  const z = Number(zText)

  if (
    !Number.isSafeInteger(x) ||
    !Number.isSafeInteger(y) ||
    !Number.isSafeInteger(z) ||
    xText !== canonicalIntegerText(x) ||
    yText !== canonicalIntegerText(y) ||
    zText !== canonicalIntegerText(z)
  ) {
    return undefined
  }

  return [x, y, z]
}

/** Serialise a block position into its canonical, allocation-minimal key. */
export const blockPositionKeyOf = (value: BlockPosition): BlockPositionKey =>
  `${String(value.x)},${String(value.y)},${String(value.z)}` as BlockPositionKey

/** Narrow an external string after validating its complete canonical format. */
export const isBlockPositionKey = (value: string): value is BlockPositionKey => parseBlockPositionKey(value) !== undefined

/** Recover a block position from a key that has already been validated. */
export const blockPositionOfKey = (value: BlockPositionKey): BlockPosition => {
  const parsed = parseBlockPositionKey(value)
  if (parsed === undefined) {
    throw new TypeError(`Invalid BlockPositionKey: ${value}`)
  }

  return blockPosition(...parsed)
}

/** Decode untrusted storage or network input without allowing invalid axes in. */
export const decodeBlockPositionKey = (value: string): BlockPosition | undefined => {
  const parsed = parseBlockPositionKey(value)
  return parsed === undefined ? undefined : blockPosition(...parsed)
}

/** The horizontal address of a chunk column. */
export type ChunkCoord = {
  readonly cx: ChunkAxis
  readonly cz: ChunkAxis
}

export const chunkCoord = (cx: number, cz: number): ChunkCoord => ({
  cx: ChunkAxis(normalizeZero(cx)),
  cz: ChunkAxis(normalizeZero(cz)),
})

/**
 * A block address relative to its chunk column.
 *
 * `lx` / `lz` are chunk-local and therefore in [0, 15]. `ly` is deliberately a
 * plain BlockAxis: chunks are not vertically subdivided by this type, and the
 * legal Y range is a world-generation concern that kernel does not own.
 */
export type LocalBlockCoord = {
  readonly lx: LocalAxis
  readonly ly: BlockAxis
  readonly lz: LocalAxis
}

/** Euclidean floor division — correct for negative operands, unlike `/` + trunc. */
const floorDiv = (value: number, divisor: number): number => Math.floor(value / divisor)

/**
 * Convert a world axis to its chunk-local counterpart without narrowing a
 * safe integer to 32 bits.
 */
const localAxisOfBlockAxis = (value: BlockAxis): LocalAxis => {
  const remainder = value % CHUNK_SIZE_XZ
  return LocalAxis(normalizeZero(remainder < 0 ? remainder + CHUNK_SIZE_XZ : remainder))
}

/** The block cell that contains a continuous position. */
export const blockPositionOfPosition = (value: Position): BlockPosition =>
  blockPosition(Math.floor(value.x), Math.floor(value.y), Math.floor(value.z))

/** The chunk column that owns a block cell. */
export const chunkCoordOfBlock = (value: BlockPosition): ChunkCoord =>
  chunkCoord(floorDiv(value.x, CHUNK_SIZE_XZ), floorDiv(value.z, CHUNK_SIZE_XZ))

/** The chunk-local address of a block cell. */
export const localCoordOfBlock = (value: BlockPosition): LocalBlockCoord => ({
  lx: localAxisOfBlockAxis(value.x),
  ly: value.y,
  lz: localAxisOfBlockAxis(value.z),
})

/** Inverse of `chunkCoordOfBlock` + `localCoordOfBlock`. */
export const blockPositionOfChunkLocal = (chunk: ChunkCoord, local: LocalBlockCoord): BlockPosition =>
  blockPosition(chunk.cx * CHUNK_SIZE_XZ + local.lx, local.ly, chunk.cz * CHUNK_SIZE_XZ + local.lz)

/**
 * An axis-aligned bounding box in continuous world space.
 *
 * Construct through `aabb`, which normalises the corners, so `min <= max` holds
 * componentwise for every AABB in circulation.
 */
export type AABB = {
  readonly min: Position
  readonly max: Position
}

export const aabb = (a: Position, b: Position): AABB => ({
  min: position(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.min(a.z, b.z)),
  max: position(Math.max(a.x, b.x), Math.max(a.y, b.y), Math.max(a.z, b.z)),
})

/** The unit cube occupied by a block cell. */
export const aabbOfBlock = (value: BlockPosition): AABB =>
  aabb(position(value.x, value.y, value.z), position(value.x + 1, value.y + 1, value.z + 1))

/**
 * Overlap test. Touching faces do NOT count as an intersection: a box ending at
 * x=1 and a box starting at x=1 are adjacent, not overlapping. Physics repos
 * rely on this so that standing exactly on a block surface is not a collision.
 */
export const aabbIntersects = (a: AABB, b: AABB): boolean =>
  a.min.x < b.max.x &&
  a.max.x > b.min.x &&
  a.min.y < b.max.y &&
  a.max.y > b.min.y &&
  a.min.z < b.max.z &&
  a.max.z > b.min.z

/** Containment test. The boundary counts as inside. */
export const aabbContainsPoint = (box: AABB, point: Position): boolean =>
  point.x >= box.min.x &&
  point.x <= box.max.x &&
  point.y >= box.min.y &&
  point.y <= box.max.y &&
  point.z >= box.min.z &&
  point.z <= box.max.z
