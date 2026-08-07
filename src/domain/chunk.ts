/* eslint-disable max-statements, no-magic-numbers -- Constants define the fixed binary wire format. */
import { BlockState, blockState } from './block-state'
import { CHUNK_SIZE_XZ, type ChunkCoord, chunkCoord } from './coordinates'

export const CHUNK_CODEC_VERSION = 1
export const CHUNK_HEADER_BYTES = 24

const MAGIC = [0x4d, 0x43, 0x48, 0x4b] as const // MCHK
const MAX_HEIGHT = 0xffff
const MAX_INT32 = 0x7fffffff
const MIN_INT32 = -0x80000000

/** A complete vertical chunk column, stored x-major then z-major then y-major. */
export type Chunk = {
  readonly coord: ChunkCoord
  readonly height: number
  readonly blocks: BlockState
}

const expectedBlockCount = (height: number): number => CHUNK_SIZE_XZ * CHUNK_SIZE_XZ * height

const assertHeight = (height: number): void => {
  if (!Number.isInteger(height) || height <= 0 || height > MAX_HEIGHT) {
    throw new RangeError(`Chunk height must be an integer in [1, ${MAX_HEIGHT}], received ${height}`)
  }
}

const assertCoord = (value: number, name: 'cx' | 'cz'): void => {
  if (!Number.isInteger(value) || value < MIN_INT32 || value > MAX_INT32) {
    throw new RangeError(`Chunk ${name} must fit a signed 32-bit integer, received ${value}`)
  }
}

const assertBlockLength = (blocks: Uint8Array, height: number): void => {
  const expected = expectedBlockCount(height)
  if (blocks.length !== expected) {
    throw new RangeError(`Chunk block data length must be ${expected}, received ${blocks.length}`)
  }
}

const assertBlocks = (blocks: BlockState, height: number): void => {
  if (!(blocks instanceof BlockState)) {
    throw new TypeError('Chunk blocks must be a BlockState')
  }
  const expected = expectedBlockCount(height)
  if (blocks.length !== expected) {
    throw new RangeError(`Chunk block data length must be ${expected}, received ${blocks.length}`)
  }
}

const createChunk = (coord: ChunkCoord, height: number, blocks: Uint8Array): Chunk => ({
  blocks: blockState(blocks),
  coord,
  height,
})

/** Construct a validated chunk without retaining the caller's mutable buffer. */
export const chunk = (coord: ChunkCoord, height: number, blocks: Uint8Array): Chunk => {
  assertCoord(coord.cx, 'cx')
  assertCoord(coord.cz, 'cz')
  assertHeight(height)
  assertBlockLength(blocks, height)
  return createChunk(chunkCoord(coord.cx, coord.cz), height, blocks)
}

/** Encode a chunk into the versioned little-endian kernel wire format. */
export const encodeChunk = (value: Chunk): Uint8Array => {
  assertCoord(value.coord.cx, 'cx')
  assertCoord(value.coord.cz, 'cz')
  assertHeight(value.height)
  assertBlocks(value.blocks, value.height)

  const encoded = new Uint8Array(CHUNK_HEADER_BYTES + value.blocks.length)
  encoded.set(MAGIC, 0)
  const view = new DataView(encoded.buffer)
  view.setUint16(4, CHUNK_CODEC_VERSION, true)
  view.setUint16(6, CHUNK_SIZE_XZ, true)
  view.setUint16(8, CHUNK_SIZE_XZ, true)
  view.setUint16(10, value.height, true)
  view.setInt32(12, value.coord.cx, true)
  view.setInt32(16, value.coord.cz, true)
  view.setUint32(20, value.blocks.length, true)
  value.blocks.copyTo(encoded, CHUNK_HEADER_BYTES)
  return encoded
}

/** Decode and validate a chunk. Trailing bytes and unknown registry ids are corruption. */
export const decodeChunk = (encoded: Uint8Array): Chunk => {
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

  const height = view.getUint16(10, true)
  assertHeight(height)
  const payloadLength = view.getUint32(20, true)
  const expected = expectedBlockCount(height)
  if (payloadLength !== expected) {
    throw new RangeError(`Chunk payload length must be ${expected}, header declares ${payloadLength}`)
  }
  if (encoded.length !== CHUNK_HEADER_BYTES + payloadLength) {
    throw new RangeError(
      `Chunk encoded length must be ${CHUNK_HEADER_BYTES + payloadLength}, received ${encoded.length}`,
    )
  }

  return createChunk(
    chunkCoord(view.getInt32(12, true), view.getInt32(16, true)),
    height,
    encoded.subarray(CHUNK_HEADER_BYTES),
  )
}
