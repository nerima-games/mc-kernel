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

const ZERO = 0
const UNIT_STEP = 1
const NEGATIVE_UNIT_STEP = -UNIT_STEP
const ABSENT = ({} as { readonly value?: never }).value

type Absent = typeof ABSENT

/** Horizontal extent of a chunk, in blocks. Vertical extent is world-dependent. */
export const CHUNK_SIZE_XZ = 16

/** An integral world-space block coordinate on any axis. */
export type BlockAxis = number & Brand.Brand<'BlockAxis'>

const blockAxis = Brand.refined<BlockAxis>(
  (value) => Number.isSafeInteger(value),
  (value) => Brand.error(`BlockAxis must be a safe integer, received ${value}`),
)

export { blockAxis as BlockAxis }

/** An integral chunk-space coordinate on the X or Z axis. One step = CHUNK_SIZE_XZ blocks. */
export type ChunkAxis = number & Brand.Brand<'ChunkAxis'>

const chunkAxis = Brand.refined<ChunkAxis>(
  (value) => Number.isSafeInteger(value),
  (value) => Brand.error(`ChunkAxis must be a safe integer, received ${value}`),
)

export { chunkAxis as ChunkAxis }

/** A chunk-local horizontal coordinate: an integer in [0, CHUNK_SIZE_XZ - 1]. */
export type LocalAxis = number & Brand.Brand<'LocalAxis'>

const localAxis = Brand.refined<LocalAxis>(
  (value) => Number.isInteger(value) && value >= ZERO && value < CHUNK_SIZE_XZ,
  (value) => Brand.error(`LocalAxis must be an integer in [0, ${CHUNK_SIZE_XZ - UNIT_STEP}], received ${value}`),
)

export { localAxis as LocalAxis }

/** A continuous world-space point. Y is up. */
export type Position = {
  readonly ['x']: number
  readonly ['y']: number
  readonly ['z']: number
}

export const position = (coordinateX: number, coordinateY: number, coordinateZ: number): Position => ({
  'x': coordinateX,
  'y': coordinateY,
  'z': coordinateZ,
})

/**
 * Collapse `-0` to `0`.
 *
 * `Math.floor(-0)` is `-0`, so a negative zero can enter integral coordinates
 * from an ordinary conversion. It then compares equal under `===` but not under
 * `Object.is`, and structural equality helpers (including Vitest's
 * `toStrictEqual`) treat it as a different value. Normalising once, here, keeps
 * every integral coordinate in the system canonical.
 */
const normalizeZero = (value: number): number => value + ZERO

/** A world-space block cell. Every component is an integer. */
export type BlockPosition = {
  readonly ['x']: BlockAxis
  readonly ['y']: BlockAxis
  readonly ['z']: BlockAxis
}

const blockPositionFromAxes = (x: BlockAxis, y: BlockAxis, z: BlockAxis): BlockPosition => ({ x, y, z })

export const blockPosition = (x: number, y: number, z: number): BlockPosition =>
  blockPositionFromAxes(
    blockAxis(normalizeZero(x)),
    blockAxis(normalizeZero(y)),
    blockAxis(normalizeZero(z)),
  )

/** The canonical wire/key representation of a block position: `x,y,z`. */
export type BlockPositionKey = string & Brand.Brand<'BlockPositionKey'>

type ParsedBlockPositionKey = readonly [x: BlockAxis, y: BlockAxis, z: BlockAxis]

const canonicalIntegerText = (value: number): string => String(normalizeZero(value))

const hasCanonicalIntegerText = (texts: ReadonlyArray<string>, values: ReadonlyArray<number>): boolean =>
  values.every((coordinate, index) =>
    Number.isSafeInteger(coordinate) && texts[index] === canonicalIntegerText(coordinate),
  )

const parseBlockPositionKey = (value: string): ParsedBlockPositionKey | Absent => {
  const firstComma = value.indexOf(',')
  const secondComma = value.indexOf(',', firstComma + UNIT_STEP)

  if (
    firstComma <= ZERO ||
    secondComma <= firstComma + UNIT_STEP ||
    secondComma === value.length - UNIT_STEP ||
    value.indexOf(',', secondComma + UNIT_STEP) !== NEGATIVE_UNIT_STEP
  ) {
    return
  }

  const texts = [
    value.slice(ZERO, firstComma),
    value.slice(firstComma + UNIT_STEP, secondComma),
    value.slice(secondComma + UNIT_STEP),
  ] as const
  const coordinates = [Number(texts[ZERO]), Number(texts[UNIT_STEP]), Number(texts[UNIT_STEP + UNIT_STEP])] as const

  if (!hasCanonicalIntegerText(texts, coordinates)) {
    return
  }

  return [
    blockAxis(normalizeZero(coordinates[ZERO])),
    blockAxis(normalizeZero(coordinates[UNIT_STEP])),
    blockAxis(normalizeZero(coordinates[2])),
  ]
}

/** Serialize a block position into its canonical, allocation-minimal key. */
export const blockPositionKeyOf = (value: BlockPosition): BlockPositionKey =>
  `${String(value.x)},${String(value.y)},${String(value.z)}` as BlockPositionKey

/** Validate external text before it becomes a branded block-position key. */
export const BlockPositionKey = (value: string): BlockPositionKey => {
  if (parseBlockPositionKey(value) === undefined) {
    throw new TypeError(`Invalid BlockPositionKey: ${value}`)
  }

  return value as BlockPositionKey
}

/** Narrow an external string after validating its complete canonical format. */
export const isBlockPositionKey = (value: string): value is BlockPositionKey => parseBlockPositionKey(value) !== ABSENT

/** Recover a block position from a key that has already been validated. */
export const blockPositionOfKey = (value: BlockPositionKey): BlockPosition => {
  const parsed = parseBlockPositionKey(value)
  if (parsed === ABSENT) {
    throw new TypeError(`Invalid BlockPositionKey: ${value}`)
  }

  return blockPositionFromAxes(...parsed)
}

/** Decode untrusted storage or network input without allowing invalid axes in. */
export const decodeBlockPositionKey = (value: string): BlockPosition | Absent => {
  const parsed = parseBlockPositionKey(value)
  return parsed === undefined ? undefined : blockPositionFromAxes(...parsed)
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
  blockPosition(source.x - 1, source.y, source.z),
  blockPosition(source.x + 1, source.y, source.z),
  blockPosition(source.x, source.y, source.z - 1),
  blockPosition(source.x, source.y, source.z + 1),
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
  blockPosition(source.x, source.y - 1, source.z),
  blockPosition(source.x, source.y + 1, source.z),
  blockPosition(source.x, source.y, source.z - 1),
  blockPosition(source.x, source.y, source.z + 1),
  blockPosition(source.x - 1, source.y, source.z),
  blockPosition(source.x + 1, source.y, source.z),
]

/** The horizontal address of a chunk column. */
export type ChunkCoord = {
  readonly cx: ChunkAxis
  readonly cz: ChunkAxis
}

const chunkCoordFromAxes = (cx: ChunkAxis, cz: ChunkAxis): ChunkCoord => ({ cx, cz })

export const chunkCoord = (cx: number, cz: number): ChunkCoord =>
  chunkCoordFromAxes(chunkAxis(normalizeZero(cx)), chunkAxis(normalizeZero(cz)))

/** The canonical wire/key representation of a chunk column: `cx,cz`. */
export type ChunkKey = string & Brand.Brand<'ChunkKey'>

type ParsedChunkKey = readonly [cx: ChunkAxis, cz: ChunkAxis]

const parseChunkKey = (value: string): ParsedChunkKey | Absent => {
  const comma = value.indexOf(',')

  if (comma <= ZERO || comma === value.length - UNIT_STEP || value.indexOf(',', comma + UNIT_STEP) !== NEGATIVE_UNIT_STEP) {
    return
  }

  const texts = [value.slice(ZERO, comma), value.slice(comma + UNIT_STEP)] as const
  const coordinates = [Number(texts[ZERO]), Number(texts[UNIT_STEP])] as const

  if (!hasCanonicalIntegerText(texts, coordinates)) {
    return
  }

  return [chunkAxis(normalizeZero(coordinates[ZERO])), chunkAxis(normalizeZero(coordinates[UNIT_STEP]))]
}

/** Produces the canonical, allocation-minimal key for a chunk coordinate. */
export const chunkKeyOf = (value: ChunkCoord): ChunkKey =>
  `${String(value.cx)},${String(value.cz)}` as ChunkKey

/** Validate external text before it becomes a branded chunk key. */
export const ChunkKey = (value: string): ChunkKey => {
  if (parseChunkKey(value) === undefined) {
    throw new TypeError(`Invalid ChunkKey: ${value}`)
  }

  return value as ChunkKey
}

/** True only for the single canonical spelling of a safe-integer chunk key. */
export const isChunkKey = (value: string): value is ChunkKey => parseChunkKey(value) !== ABSENT

/** Parses a trusted canonical chunk key, rejecting malformed forged values. */
export const chunkCoordOfKey = (value: ChunkKey): ChunkCoord => {
  const parsed = parseChunkKey(value)
  if (parsed === ABSENT) {
    throw new TypeError(`Invalid ChunkKey: ${value}`)
  }
  return chunkCoordFromAxes(...parsed)
}

/** Decodes an untrusted chunk key without throwing for malformed input. */
export const decodeChunkKey = (value: string): ChunkCoord | Absent => {
  const parsed = parseChunkKey(value)
  return parsed === undefined ? undefined : chunkCoordFromAxes(...parsed)
}

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
  lx: localAxis(normalizeZero(floorMod(value.x, CHUNK_SIZE_XZ))),
  ly: value.y,
  lz: localAxis(normalizeZero(floorMod(value.z, CHUNK_SIZE_XZ))),
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

export const aabb = (firstCorner: Position, secondCorner: Position): AABB => ({
  ...{ min: position(Math.min(firstCorner.x, secondCorner.x), Math.min(firstCorner.y, secondCorner.y), Math.min(firstCorner.z, secondCorner.z)) },
  ...{ max: position(Math.max(firstCorner.x, secondCorner.x), Math.max(firstCorner.y, secondCorner.y), Math.max(firstCorner.z, secondCorner.z)) },
})

/** The unit cube occupied by a block cell. */
export const aabbOfBlock = (value: BlockPosition): AABB =>
  aabb(position(value.x, value.y, value.z), position(value.x + UNIT_STEP, value.y + UNIT_STEP, value.z + UNIT_STEP))

/**
 * Overlap test. Touching faces do NOT count as an intersection: a box ending at
 * x=1 and a box starting at x=1 are adjacent, not overlapping. Physics repos
 * rely on this so that standing exactly on a block surface is not a collision.
 */
export const aabbIntersects = (firstBox: AABB, secondBox: AABB): boolean =>
  firstBox.min.x < secondBox.max.x &&
  firstBox.max.x > secondBox.min.x &&
  firstBox.min.y < secondBox.max.y &&
  firstBox.max.y > secondBox.min.y &&
  firstBox.min.z < secondBox.max.z &&
  firstBox.max.z > secondBox.min.z

/** Containment test. The boundary counts as inside. */
export const aabbContainsPoint = (box: AABB, point: Position): boolean =>
  point.x >= box.min.x &&
  point.x <= box.max.x &&
  point.y >= box.min.y &&
  point.y <= box.max.y &&
  point.z >= box.min.z &&
  point.z <= box.max.z
