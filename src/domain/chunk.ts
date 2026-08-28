/* eslint-disable max-statements, no-magic-numbers -- Constants define the fixed binary wire format. */
import { Brand } from 'effect'
import { BlockState, blockState } from './block-state.js'
import { CHUNK_SIZE_XZ, type ChunkCoord, chunkCoord } from './coordinates.js'
import { chunkCoordFromAxes } from './coordinate-primitives.js'

export const CHUNK_CODEC_VERSION = 1
export const CHUNK_HEADER_BYTES = 24
export const MAX_CHUNK_HEIGHT = 0xffff

const MAGIC = [0x4d, 0x43, 0x48, 0x4b] as const // MCHK
const MAX_INT32 = 0x7fffffff
const MIN_INT32 = -0x80000000

/** Vertical block count of a chunk column. Integer in [1, MAX_CHUNK_HEIGHT]. */
export type ChunkHeight = number & Brand.Brand<'ChunkHeight'>
export type ChunkBlocks = BlockState & Brand.Brand<'ChunkBlocks'>
const brandChunkBlocks = Brand.nominal<ChunkBlocks>()
type ReadonlyByteArray = Omit<
  Uint8Array,
  | 'buffer'
  | 'byteLength'
  | 'byteOffset'
  | 'copyWithin'
  | 'fill'
  | 'reverse'
  | 'set'
  | 'sort'
  | 'subarray'
> & {
  readonly [index: number]: number
}
export type EncodedChunk = ReadonlyByteArray & Brand.Brand<'EncodedChunk'>
const brandEncodedChunk = Brand.nominal<EncodedChunk>()

type EncodedChunkInput = Uint8Array | EncodedChunk
type RecordValue = Readonly<Record<string, unknown>>

type ValidatedEncodedChunk = {
  readonly encoded: Uint8Array
  readonly height: ChunkHeight
  readonly view: DataView
}

const ChunkHeightBrand = Brand.refined<ChunkHeight>(
  (value) => Number.isInteger(value) && value > 0 && value <= MAX_CHUNK_HEIGHT,
  (value) => Brand.error(`Chunk height must be an integer in [1, ${MAX_CHUNK_HEIGHT}], received ${value}`),
)

export const ChunkHeight = (value: number): ChunkHeight => {
  try {
    return ChunkHeightBrand(value)
  } catch {
    throw new RangeError(`Chunk height must be an integer in [1, ${MAX_CHUNK_HEIGHT}], received ${value}`)
  }
}

/** A complete vertical chunk column, stored x-major then z-major then y-major. */
export type Chunk = {
  readonly coord: ChunkCoord
  readonly height: ChunkHeight
  readonly blocks: ChunkBlocks
}

export const chunkBlockCount = (height: ChunkHeight): number => CHUNK_SIZE_XZ * CHUNK_SIZE_XZ * height

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const assertCoord = (value: unknown, name: 'cx' | 'cz'): number => {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < MIN_INT32 ||
    value > MAX_INT32
  ) {
    throw new RangeError(`Chunk ${name} must fit a signed 32-bit integer, received ${value}`)
  }
  return value
}

const assertBlocks = (blocks: unknown, height: ChunkHeight): BlockState => {
  if (!(blocks instanceof BlockState)) {
    throw new TypeError('Chunk blocks must be a BlockState')
  }
  const expected = chunkBlockCount(height)
  if (blocks.length !== expected) {
    throw new RangeError(`Chunk block data length must be ${expected}, received ${blocks.length}`)
  }
  return blocks
}

export const ChunkBlocks = (height: number, blocks: Uint8Array): ChunkBlocks => {
  const validatedHeight = ChunkHeight(height)
  const expected = chunkBlockCount(validatedHeight)
  if (blocks.length !== expected) {
    throw new RangeError(
      `Chunk block data length must be ${expected}, received ${blocks.length}`,
    )
  }
  return brandChunkBlocks(blockState(blocks))
}

const chunkBlocksFromValidatedHeight = (blocks: Uint8Array): ChunkBlocks =>
  brandChunkBlocks(blockState(blocks))

const validateEncodedChunk = (
  encoded: Uint8Array,
): ValidatedEncodedChunk => {
  if (encoded.length < CHUNK_HEADER_BYTES) {
    throw new RangeError(`Chunk data is shorter than the ${CHUNK_HEADER_BYTES}-byte header`)
  }
  if (
    encoded[0] !== MAGIC[0] ||
    encoded[1] !== MAGIC[1] ||
    encoded[2] !== MAGIC[2] ||
    encoded[3] !== MAGIC[3]
  ) {
    throw new Error('Invalid chunk magic')
  }

  const view = new DataView(encoded.buffer, encoded.byteOffset, encoded.byteLength)
  const version = view.getUint16(4, true)
  if (version !== CHUNK_CODEC_VERSION) {
    throw new Error(`Unsupported chunk codec version ${version}`)
  }
  const width = view.getUint16(6, true)
  const depth = view.getUint16(8, true)
  if (width !== CHUNK_SIZE_XZ || depth !== CHUNK_SIZE_XZ) {
    throw new Error(`Invalid chunk dimensions ${width}x${depth}; expected ${CHUNK_SIZE_XZ}x${CHUNK_SIZE_XZ}`)
  }

  const height = ChunkHeight(view.getUint16(10, true))
  const payloadLength = view.getUint32(20, true)
  const expected = chunkBlockCount(height)
  if (payloadLength !== expected) {
    throw new RangeError(`Chunk payload length must be ${expected}, header declares ${payloadLength}`)
  }
  if (encoded.length !== CHUNK_HEADER_BYTES + payloadLength) {
    throw new RangeError(
      `Chunk encoded length must be ${CHUNK_HEADER_BYTES + payloadLength}, received ${encoded.length}`,
    )
  }

  return { encoded, height, view }
}

const mutableBytesOf = (encoded: EncodedChunkInput): Uint8Array =>
  encoded instanceof Uint8Array ? encoded : encoded.slice()

export const EncodedChunk = (encoded: EncodedChunkInput): EncodedChunk => {
  return brandEncodedChunk(validateEncodedChunk(mutableBytesOf(encoded)).encoded.slice())
}

const validatedChunk = (coord: ChunkCoord, height: ChunkHeight, blocks: ChunkBlocks): Chunk => ({
  blocks,
  coord,
  height,
})

type EncodableChunk = {
  readonly coord: {
    readonly cx: number
    readonly cz: number
  }
  readonly height: ChunkHeight
  readonly blocks: BlockState
}

const validateChunkForEncoding = (value: unknown): EncodableChunk => {
  if (!isRecord(value)) {
    throw new TypeError('Chunk must be an object')
  }

  const coord = value['coord']
  if (!isRecord(coord)) {
    throw new TypeError('Chunk coordinate must be an object')
  }

  const rawHeight = value['height']
  if (typeof rawHeight !== 'number') {
    throw new TypeError(`Chunk height must be a number, received ${rawHeight}`)
  }

  const height = ChunkHeight(rawHeight)
  return {
    blocks: assertBlocks(value['blocks'], height),
    coord: {
      cx: assertCoord(coord['cx'], 'cx'),
      cz: assertCoord(coord['cz'], 'cz'),
    },
    height,
  }
}

/** Construct a validated chunk without retaining the caller's mutable buffer. */
export const chunk = (coord: ChunkCoord, height: number, blocks: Uint8Array): Chunk => {
  assertCoord(coord.cx, 'cx')
  assertCoord(coord.cz, 'cz')
  const validatedHeight = ChunkHeight(height)
  const validatedBlocks = ChunkBlocks(validatedHeight, blocks)
  return validatedChunk(chunkCoordFromAxes(coord.cx, coord.cz), validatedHeight, validatedBlocks)
}

/** Encode a chunk into the versioned little-endian kernel wire format. */
export function encodeChunk(value: Chunk): EncodedChunk
export function encodeChunk(value: Chunk): EncodedChunk {
  const { blocks, coord, height } = validateChunkForEncoding(value)

  const encoded = new Uint8Array(CHUNK_HEADER_BYTES + blocks.length)
  encoded.set(MAGIC, 0)
  const view = new DataView(encoded.buffer)
  view.setUint16(4, CHUNK_CODEC_VERSION, true)
  view.setUint16(6, CHUNK_SIZE_XZ, true)
  view.setUint16(8, CHUNK_SIZE_XZ, true)
  view.setUint16(10, height, true)
  view.setInt32(12, coord.cx, true)
  view.setInt32(16, coord.cz, true)
  view.setUint32(20, blocks.length, true)
  blocks.copyTo(encoded, CHUNK_HEADER_BYTES)
  // Every wire field was written from validated inputs; avoid revalidating this fresh buffer.
  return brandEncodedChunk(encoded)
}

/** Decode and validate a chunk. Trailing bytes and unknown registry ids are corruption. */
export const decodeChunk = (encoded: EncodedChunkInput): Chunk => {
  const { encoded: validated, height, view } = validateEncodedChunk(mutableBytesOf(encoded))
  const blocks = chunkBlocksFromValidatedHeight(validated.subarray(CHUNK_HEADER_BYTES))

  return validatedChunk(chunkCoord(view.getInt32(12, true), view.getInt32(16, true)), height, blocks)
}
