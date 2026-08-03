/**
 * Spatial vocabulary: continuous positions, axis-aligned bounding boxes, and
 * the world <-> chunk coordinate conversions.
 *
 * PRE-AUDIT FIRST CUT (叩き台).
 *
 * Three coordinate spaces exist and are kept apart by branding the axes:
 *
 *   Position          continuous, world space, metres (1 block = 1 unit)
 *   BlockPosition     integral, world space   (BlockAxis on every component)
 *   ChunkCoord        integral, chunk space   (ChunkAxis; one step = 16 blocks)
 *   LocalBlockCoord   integral, chunk-local   (LocalAxis on x/z, in [0, 15])
 *
 * The invariant that ties them together, and that `test/coordinates.test.ts`
 * pins down:
 *
 *   blockPositionOfChunkLocal(chunkCoordOfBlock(p), localCoordOfBlock(p)) === p
 *
 * for every BlockPosition p, including negative coordinates. This is why the
 * conversions use floor division and euclidean modulo rather than truncation:
 * `-1 / 16` truncates to `0` and `-1 % 16` is `-1` in JavaScript, both of which
 * would break the round trip on the negative side of the origin.
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

/** The canonical wire/key representation of a block position: `x,y,z`. */
export type BlockPositionKey = string & Brand.Brand<'BlockPositionKey'>

type ParsedBlockPositionKey = readonly [x: number, y: number, z: number]

const canonicalIntegerText = (value: number): string => String(normalizeZero(value))

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

/** Serialize a block position into its canonical, allocation-minimal key. */
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

/** The block cell touching `source` across `face`. */
export const adjacentBlockPosition = (source: BlockPosition, face: BlockFace): BlockPosition => {
  switch (face) {
    case 'down':
      return blockPosition(source.x, source.y - 1, source.z)
    case 'up':
      return blockPosition(source.x, source.y + 1, source.z)
    case 'north':
      return blockPosition(source.x, source.y, source.z - 1)
    case 'south':
      return blockPosition(source.x, source.y, source.z + 1)
    case 'west':
      return blockPosition(source.x - 1, source.y, source.z)
    case 'east':
      return blockPosition(source.x + 1, source.y, source.z)
    default:
      return face satisfies never
  }
}

/** Horizontal neighbours in west, east, north, south order. */
export const horizontalBlockNeighbours = (source: BlockPosition): ReadonlyArray<BlockPosition> =>
  HORIZONTAL_BLOCK_FACES.map((face) => adjacentBlockPosition(source, face))

/** All face-adjacent cells, in `BLOCK_FACES` order. */
export const blockNeighbours = (source: BlockPosition): ReadonlyArray<BlockPosition> =>
  BLOCK_FACES.map((face) => adjacentBlockPosition(source, face))

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

/** Euclidean modulo — always in [0, divisor), unlike `%`. */
const floorMod = (value: number, divisor: number): number => ((value % divisor) + divisor) % divisor

/** The block cell that contains a continuous position. */
export const blockPositionOfPosition = (value: Position): BlockPosition =>
  blockPosition(Math.floor(value.x), Math.floor(value.y), Math.floor(value.z))

/** The chunk column that owns a block cell. */
export const chunkCoordOfBlock = (value: BlockPosition): ChunkCoord =>
  chunkCoord(floorDiv(value.x, CHUNK_SIZE_XZ), floorDiv(value.z, CHUNK_SIZE_XZ))

/** The chunk-local address of a block cell. */
export const localCoordOfBlock = (value: BlockPosition): LocalBlockCoord => ({
  lx: LocalAxis(normalizeZero(floorMod(value.x, CHUNK_SIZE_XZ))),
  ly: value.y,
  lz: LocalAxis(normalizeZero(floorMod(value.z, CHUNK_SIZE_XZ))),
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
