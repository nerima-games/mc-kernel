/* eslint-disable max-statements, no-magic-numbers -- Constants define the fixed binary wire format. */
import { Brand } from 'effect'
import { CHUNK_SIZE_XZ, type ChunkCoord, chunkCoord } from './coordinates'
import { isKnownBlockId } from './block-registry'

export const CHUNK_CODEC_VERSION = 1
export const CHUNK_HEADER_BYTES = 24
export const MAX_CHUNK_HEIGHT = 0xffff

const MAGIC = [0x4d, 0x43, 0x48, 0x4b] as const // MCHK
const MAX_INT32 = 0x7fffffff
const MIN_INT32 = -0x80000000

/** Vertical block count of a chunk column. Integer in [1, MAX_CHUNK_HEIGHT]. */
export type ChunkHeight = number & Brand.Brand<'ChunkHeight'>
export type ChunkBlocks = Uint8Array & Brand.Brand<'ChunkBlocks'>
export type EncodedChunk = Uint8Array & Brand.Brand<'EncodedChunk'>

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

const assertCoord = (value: number, name: 'cx' | 'cz'): void => {
  if (!Number.isInteger(value) || value < MIN_INT32 || value > MAX_INT32) {
    throw new RangeError(`Chunk ${name} must fit a signed 32-bit integer, received ${value}`)
  }
}

const assertBlocks = (blocks: Uint8Array, height: ChunkHeight): void => {
  const expected = chunkBlockCount(height)
  if (blocks.length !== expected) {
    throw new RangeError(`Chunk block data length must be ${expected}, received ${blocks.length}`)
  }

  for (let index = 0; index < blocks.length; index += 1) {
    const blockId = blocks[index]!
    if (!isKnownBlockId(blockId)) {
      throw new RangeError(`Chunk contains unknown block id ${blockId} at index ${index}`)
    }
  }
}

export const ChunkBlocks = (height: number, blocks: Uint8Array): ChunkBlocks => {
  const validatedHeight = ChunkHeight(height)
  assertBlocks(blocks, validatedHeight)
  return blocks as ChunkBlocks
}

const validateEncodedChunk = (
  encoded: Uint8Array,
): { readonly height: ChunkHeight; readonly payloadLength: number; readonly view: DataView } => {
  if (encoded.length < CHUNK_HEADER_BYTES) {
    throw new RangeError(`Chunk data is shorter than the ${CHUNK_HEADER_BYTES}-byte header`)
  }
  if (MAGIC.some((byte, index) => encoded[index] !== byte)) {
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

  return { height, payloadLength, view }
}

export const EncodedChunk = (encoded: Uint8Array): EncodedChunk => {
  validateEncodedChunk(encoded)
  return encoded as EncodedChunk
}

const validatedChunk = (coord: ChunkCoord, height: ChunkHeight, blocks: ChunkBlocks): Chunk => ({
  blocks,
  coord: chunkCoord(coord.cx, coord.cz),
  height,
})

/** Construct a validated chunk without retaining the caller's mutable buffer. */
export const chunk = (coord: ChunkCoord, height: number, blocks: Uint8Array): Chunk => {
  assertCoord(coord.cx, 'cx')
  assertCoord(coord.cz, 'cz')
  const validatedHeight = ChunkHeight(height)
  const validatedBlocks = ChunkBlocks(validatedHeight, blocks.slice())
  return validatedChunk(coord, validatedHeight, validatedBlocks)
}

/** Encode a chunk into the versioned little-endian kernel wire format. */
export const encodeChunk = (value: Chunk): EncodedChunk => {
  assertCoord(value.coord.cx, 'cx')
  assertCoord(value.coord.cz, 'cz')
  const height = ChunkHeight(value.height)
  const blocks = ChunkBlocks(height, value.blocks)

  const encoded = new Uint8Array(CHUNK_HEADER_BYTES + blocks.length)
  encoded.set(MAGIC, 0)
  const view = new DataView(encoded.buffer)
  view.setUint16(4, CHUNK_CODEC_VERSION, true)
  view.setUint16(6, CHUNK_SIZE_XZ, true)
  view.setUint16(8, CHUNK_SIZE_XZ, true)
  view.setUint16(10, height, true)
  view.setInt32(12, value.coord.cx, true)
  view.setInt32(16, value.coord.cz, true)
  view.setUint32(20, blocks.length, true)
  encoded.set(blocks, CHUNK_HEADER_BYTES)
  return EncodedChunk(encoded)
}

/** Decode and validate a chunk. Trailing bytes and unknown registry ids are corruption. */
export const decodeChunk = (encoded: Uint8Array): Chunk => {
  const validated = EncodedChunk(encoded)
  const { height, view } = validateEncodedChunk(validated)
  const blocks = ChunkBlocks(height, validated.slice(CHUNK_HEADER_BYTES))

  return validatedChunk(
    chunkCoord(view.getInt32(12, true), view.getInt32(16, true)),
    height,
    blocks,
  )
}
