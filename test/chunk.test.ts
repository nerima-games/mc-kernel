/* eslint-disable max-statements, no-magic-numbers, sort-imports -- Group test framework before subject imports. */
import { describe, expect, it } from 'vitest'
import { Effect } from 'effect'
import {
  CHUNK_CODEC_VERSION,
  CHUNK_HEADER_BYTES,
  ChunkBlocks,
  EncodedChunk,
  ChunkHeight,
  MAX_CHUNK_HEIGHT,
  chunk,
  chunkBlockCount,
  decodeChunk,
  encodeChunk,
} from '../src/domain/chunk'
import { BlockId as blockId, blockIdOf } from '../src/domain/block-registry'
import { blockState } from '../src/domain/block-state'
import { CHUNK_SIZE_XZ, chunkCoord } from '../src/domain/coordinates'

const height = ChunkHeight(2)
const blockCount = chunkBlockCount(height)

const sampleBlocks = (): Uint8Array => {
  const blocks = new Uint8Array(blockCount)
  blocks[0] = blockIdOf('stone')
  blocks[blocks.length - 1] = blockIdOf('water')
  return blocks
}

describe('chunk binary codec', () => {
  it('round-trips coordinates, height, and block data', () =>
    Effect.runPromise(Effect.sync(() => {
      const source = chunk(chunkCoord(-17, 23), height, sampleBlocks())
      const decoded = decodeChunk(encodeChunk(source))

      expect(decoded.coord).toStrictEqual(source.coord)
      expect(decoded.height).toBe(height)
      expect(decoded.blocks.toBytes()).toStrictEqual(source.blocks.toBytes())
    })),
  )

  it('writes the fixed header fields', () =>
    Effect.runPromise(Effect.sync(() => {
      const encoded = encodeChunk(chunk(chunkCoord(-17, 23), height, sampleBlocks()))
      const view = new DataView(encoded.buffer)

      expect(new TextDecoder().decode(encoded.slice(0, 4))).toBe('MCHK')
      expect(view.getUint16(4, true)).toBe(CHUNK_CODEC_VERSION)
      expect(view.getUint16(6, true)).toBe(CHUNK_SIZE_XZ)
      expect(view.getUint16(8, true)).toBe(CHUNK_SIZE_XZ)
      expect(view.getUint16(10, true)).toBe(height)
      expect(view.getInt32(12, true)).toBe(-17)
      expect(view.getInt32(16, true)).toBe(23)
      expect(view.getUint32(20, true)).toBe(blockCount)
    })),
  )

  it('rejects damaged headers and payloads explicitly', () =>
    Effect.runPromise(Effect.sync(() => {
      const valid = encodeChunk(chunk(chunkCoord(0, 0), height, sampleBlocks()))
      const corrupt = (offset: number, value: number): Uint8Array => {
        const result = valid.slice()
        result[offset] = value
        return result
      }

      expect(() => decodeChunk(valid.slice(0, CHUNK_HEADER_BYTES - 1))).toThrow(/header/)
      expect(() => decodeChunk(corrupt(0, 0))).toThrow(/magic/)
      expect(() => decodeChunk(corrupt(4, CHUNK_CODEC_VERSION + 1))).toThrow(/version/)
      expect(() => decodeChunk(corrupt(6, CHUNK_SIZE_XZ - 1))).toThrow(/dimensions/)
      expect(() => decodeChunk(corrupt(10, 0))).toThrow(/height/)
      expect(() => decodeChunk(corrupt(20, 1))).toThrow(/payload length/)
      expect(() => decodeChunk(valid.slice(0, -1))).toThrow(/encoded length/)
      expect(() => decodeChunk(Uint8Array.from([...valid, 0]))).toThrow(/encoded length/)

      const unknownId = valid.slice()
      unknownId[CHUNK_HEADER_BYTES] = 255
      expect(() => decodeChunk(unknownId)).toThrow(/unknown block id 255/)
    })),
  )

  it('does not retain mutable input or encoded buffers', () =>
    Effect.runPromise(Effect.sync(() => {
      const input = sampleBlocks()
      const source = chunk(chunkCoord(1, 2), height, input)
      input[0] = blockIdOf('water')
      expect(source.blocks.get(0)).toBe(blockIdOf('stone'))

      const encoded = encodeChunk(source)
      source.blocks.set(0, blockIdOf('water'))
      expect(encoded[CHUNK_HEADER_BYTES]).toBe(blockIdOf('stone'))

      const decoded = decodeChunk(encoded)
      encoded[CHUNK_HEADER_BYTES] = blockIdOf('water')
      expect(decoded.blocks.get(0)).toBe(blockIdOf('stone'))
    })),
  )

  it('keeps block storage behind checked accessors', () =>
    Effect.runPromise(Effect.sync(() => {
      const state = blockState(sampleBlocks())
      const copy = state.toBytes()
      copy[0] = blockIdOf('water')

      expect(state.get(0)).toBe(blockIdOf('stone'))
      state.set(0, blockIdOf('water'))
      expect(state.get(0)).toBe(blockIdOf('water'))
      expect(() => state.get(-1)).toThrow(/index/)
      expect(() => state.get(state.length)).toThrow(/index/)
      expect(() => state.set(0, blockId(255))).toThrow(/unknown block id 255/)
      expect(() => blockState(new Uint8Array([255]))).toThrow(/unknown block id 255/)
    })),
  )

  it('validates the destination range before copying into a caller-owned buffer', () =>
    Effect.runPromise(Effect.sync(() => {
      const state = blockState(sampleBlocks())
      const target = new Uint8Array(state.length)

      state.copyTo(target)
      expect(target).toStrictEqual(state.toBytes())

      expect(() => state.copyTo(new Uint8Array(state.length), -1)).toThrow(/copy range/)
      expect(() => state.copyTo(new Uint8Array(state.length - 1), 0)).toThrow(/copy range/)
      expect(() => state.copyTo(new Uint8Array(state.length), 1)).toThrow(/copy range/)
    })),
  )

  it('keeps the runtime length boundary authoritative', () =>
    Effect.runPromise(Effect.sync(() => {
      const source = chunk(chunkCoord(0, 0), height, sampleBlocks())
      const state = source.blocks
      const { length } = state

      expect(() => Object.defineProperty(state, 'length', { value: 0 })).toThrow(TypeError)
      expect(state.length).toBe(length)
      expect(new DataView(encodeChunk(source).buffer).getUint32(20, true)).toBe(length)
    })),
  )

  it('rejects constructor values outside the binary format bounds', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(() => ChunkHeight(0)).toThrow(/height/)
      expect(() => ChunkHeight(MAX_CHUNK_HEIGHT + 1)).toThrow(/height/)
      expect(() => ChunkBlocks(ChunkHeight(1), new Uint8Array())).toThrow(/length/)
      expect(() => ChunkBlocks(ChunkHeight(1), new Uint8Array([255, ...new Uint8Array(CHUNK_SIZE_XZ * CHUNK_SIZE_XZ - 1)]))).toThrow(/unknown block id 255/)
      expect(() => EncodedChunk(new Uint8Array())).toThrow(/header/)
      expect(() => chunk(chunkCoord(0, 0), 1, new Uint8Array(255))).toThrow(/block data length must be 256, received 255/i)
      expect(() => chunk(chunkCoord(0, 0), 0x1_0000, new Uint8Array())).toThrow(/height/)
      expect(() => chunk(chunkCoord(0x8000_0000, 0), 1, new Uint8Array(CHUNK_SIZE_XZ * CHUNK_SIZE_XZ))).toThrow(/cx/)
      expect(() => chunk(chunkCoord(0, -0x8000_0001), 1, new Uint8Array(CHUNK_SIZE_XZ * CHUNK_SIZE_XZ))).toThrow(/cz/)
    })),
  )

  it('rejects encoding blocks that are not a BlockState or whose length disagrees with the declared height', () =>
    Effect.runPromise(Effect.sync(() => {
      const coord = chunkCoord(0, 0)

      expect(() => encodeChunk({
        coord,
        height,
        blocks: { length: blockCount } as never,
      })).toThrow(/must be a BlockState/)

      expect(() => encodeChunk({
        coord,
        height: ChunkHeight(1),
        blocks: blockState(sampleBlocks()) as never,
      })).toThrow(/block data length must be/)
    })),
  )

  it('derives the exact payload size from the validated height', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(chunkBlockCount(ChunkHeight(1))).toBe(CHUNK_SIZE_XZ * CHUNK_SIZE_XZ)
      expect(chunkBlockCount(height)).toBe(blockCount)
    })),
  )
})
