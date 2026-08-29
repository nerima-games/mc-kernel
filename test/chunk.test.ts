/* eslint-disable max-statements, no-magic-numbers, sort-imports -- Group test framework before subject imports. */
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'
import { Brand, Effect } from 'effect'
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
import type { BlockId } from '../src/domain/block-registry-types'
import { blockState } from '../src/domain/block-state'
import { CHUNK_SIZE_XZ, chunkCoord } from '../src/domain/coordinates'

const height = ChunkHeight(2)
const blockCount = chunkBlockCount(height)
/** v2 wire elements are two little-endian bytes each; see block-state.ts BYTES_PER_ELEMENT. */
const WIRE_BYTES_PER_ELEMENT = 2

const sampleBlocks = (): Uint8Array => {
  const blocks = new Uint8Array(blockCount)
  blocks[0] = blockIdOf('stone')
  blocks[blocks.length - 1] = blockIdOf('water')
  return blocks
}

const isUint8Array = (value: unknown): value is Uint8Array =>
  ArrayBuffer.isView(value) && Object.prototype.toString.call(value) === '[object Uint8Array]'

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

  it('decodes a chunk from a non-zero-offset byte view', () =>
    Effect.runPromise(Effect.sync(() => {
      const source = chunk(chunkCoord(-17, 23), height, sampleBlocks())
      const encoded = encodeChunk(source)
      const padded = new Uint8Array(encoded.length + 2)
      padded.set(encoded.slice(), 1)

      const decoded = decodeChunk(padded.subarray(1, encoded.length + 1))

      expect(decoded.coord).toStrictEqual(source.coord)
      expect(decoded.height).toBe(source.height)
      expect(decoded.blocks.toBytes()).toStrictEqual(source.blocks.toBytes())
    })),
  )

  it('decodes a typed array from another runtime realm', () =>
    Effect.runPromise(Effect.sync(() => {
      const source = chunk(chunkCoord(-17, 23), height, sampleBlocks())
      const encoded = encodeChunk(source)
      const foreignBytes: unknown = runInNewContext('Uint8Array.from(values)', {
        values: Array.from(encoded.slice()),
      })

      if (!isUint8Array(foreignBytes)) {
        throw new TypeError('runtime realm did not produce a Uint8Array')
      }

      const decoded = decodeChunk(foreignBytes)

      expect(decoded.coord).toStrictEqual(source.coord)
      expect(decoded.height).toBe(source.height)
      expect(Array.from(decoded.blocks.toBytes())).toStrictEqual(Array.from(source.blocks.toBytes()))
    })),
  )

  it('writes the fixed header fields', () =>
    Effect.runPromise(Effect.sync(() => {
      const encoded = encodeChunk(chunk(chunkCoord(-17, 23), height, sampleBlocks()))
      const view = new DataView(encoded.slice().buffer)

      expect(new TextDecoder().decode(encoded.slice(0, 4))).toBe('MCHK')
      expect(view.getUint16(4, true)).toBe(CHUNK_CODEC_VERSION)
      expect(view.getUint16(6, true)).toBe(CHUNK_SIZE_XZ)
      expect(view.getUint16(8, true)).toBe(CHUNK_SIZE_XZ)
      expect(view.getUint16(10, true)).toBe(height)
      expect(view.getInt32(12, true)).toBe(-17)
      expect(view.getInt32(16, true)).toBe(23)
      expect(view.getUint32(20, true)).toBe(blockCount * WIRE_BYTES_PER_ELEMENT)
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

      const mutableEncoded = encoded.slice()
      const decoded = decodeChunk(mutableEncoded)
      mutableEncoded[CHUNK_HEADER_BYTES] = blockIdOf('water')
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
      const byteLength = state.length * WIRE_BYTES_PER_ELEMENT
      const target = new Uint8Array(byteLength)

      state.copyTo(target)
      expect(target).toStrictEqual(state.toBytes())

      expect(() => state.copyTo(new Uint8Array(byteLength), -1)).toThrow(/copy range/)
      expect(() => state.copyTo(new Uint8Array(byteLength - 1), 0)).toThrow(/copy range/)
      expect(() => state.copyTo(new Uint8Array(byteLength), 1)).toThrow(/copy range/)
    })),
  )

  it('keeps the runtime length boundary authoritative', () =>
    Effect.runPromise(Effect.sync(() => {
      const source = chunk(chunkCoord(0, 0), height, sampleBlocks())
      const state = source.blocks
      const { length } = state

      expect(() => Object.defineProperty(state, 'length', { value: 0 })).toThrow(TypeError)
      expect(state.length).toBe(length)
      expect(new DataView(encodeChunk(source).slice().buffer).getUint32(20, true)).toBe(
        length * WIRE_BYTES_PER_ELEMENT,
      )
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

      expect(() => Reflect.apply(encodeChunk, undefined, [{
        coord,
        height,
        blocks: { length: blockCount },
      }])).toThrow(/must be a BlockState/)

      expect(() => Reflect.apply(encodeChunk, undefined, [{
        coord,
        height: ChunkHeight(1),
        blocks: blockState(sampleBlocks()),
      }])).toThrow(/block data length must be/)
    })),
  )

  it('rejects malformed unknown encoding inputs at the public boundary', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(() => Reflect.apply(encodeChunk, undefined, [null])).toThrow('Chunk must be an object')
      expect(() => Reflect.apply(encodeChunk, undefined, [[]])).toThrow('Chunk must be an object')
      expect(() => Reflect.apply(encodeChunk, undefined, [{ coord: null, height, blocks: blockState(sampleBlocks()) }]))
        .toThrow('Chunk coordinate must be an object')
      expect(() => Reflect.apply(encodeChunk, undefined, [{ coord: chunkCoord(0, 0), height: '2', blocks: blockState(sampleBlocks()) }]))
        .toThrow('Chunk height must be a number')
      expect(() => Reflect.apply(encodeChunk, undefined, [{
        coord: { cx: '0', cz: 0 },
        height,
        blocks: blockState(sampleBlocks()),
      }])).toThrow(/cx/)
    })),
  )

  it('derives the exact payload size from the validated height', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(chunkBlockCount(ChunkHeight(1))).toBe(CHUNK_SIZE_XZ * CHUNK_SIZE_XZ)
      expect(chunkBlockCount(height)).toBe(blockCount)
    })),
  )

  it('decodes a version-1 payload built directly from the retired 8-bit-per-block wire bytes', () =>
    Effect.runPromise(Effect.sync(() => {
      const V1_CODEC_VERSION = 1
      const V1_BYTES_PER_ELEMENT = 1
      const legacyHeight = ChunkHeight(1)
      const legacyBlockCount = chunkBlockCount(legacyHeight)
      const stoneId = blockIdOf('stone')
      const waterId = blockIdOf('water')

      const encoded = new Uint8Array(CHUNK_HEADER_BYTES + legacyBlockCount * V1_BYTES_PER_ELEMENT)
      encoded.set(new TextEncoder().encode('MCHK'), 0)
      const view = new DataView(encoded.buffer)
      view.setUint16(4, V1_CODEC_VERSION, true)
      view.setUint16(6, CHUNK_SIZE_XZ, true)
      view.setUint16(8, CHUNK_SIZE_XZ, true)
      view.setUint16(10, legacyHeight, true)
      view.setInt32(12, 5, true)
      view.setInt32(16, -9, true)
      view.setUint32(20, legacyBlockCount * V1_BYTES_PER_ELEMENT, true)
      encoded[CHUNK_HEADER_BYTES] = stoneId
      encoded[CHUNK_HEADER_BYTES + legacyBlockCount - 1] = waterId

      const decoded = decodeChunk(encoded)

      expect(decoded.coord).toStrictEqual(chunkCoord(5, -9))
      expect(decoded.height).toBe(legacyHeight)
      expect(decoded.blocks.length).toBe(legacyBlockCount)
      expect(decoded.blocks.get(0)).toBe(stoneId)
      expect(decoded.blocks.get(1)).toBe(blockIdOf('air'))
      expect(decoded.blocks.get(legacyBlockCount - 1)).toBe(waterId)
    })),
  )

  it('rejects a v2 payload whose declared length uses the retired element-count convention', () =>
    Effect.runPromise(Effect.sync(() => {
      const encoded = encodeChunk(chunk(chunkCoord(0, 0), height, sampleBlocks())).slice()
      const view = new DataView(encoded.buffer)
      // The v1 meaning of this field was an element count; asserting it here
      // proves v2 rejects that meaning and only accepts a byte count.
      view.setUint32(20, blockCount, true)

      expect(() => decodeChunk(encoded)).toThrow(/payload length/)
    })),
  )

  it('rejects a v2 element whose full 16-bit value is not a known block id', () =>
    Effect.runPromise(Effect.sync(() => {
      const encoded = encodeChunk(chunk(chunkCoord(0, 0), height, sampleBlocks())).slice()
      // Set the *high* byte of the first element nonzero: the low byte alone
      // (the stone id) is a valid registered id, so only a genuine 16-bit
      // read - not a truncated 8-bit one - catches this as corruption.
      encoded[CHUNK_HEADER_BYTES + 1] = 1

      expect(() => decodeChunk(encoded)).toThrow(/unknown block id/)
    })),
  )

  it('widens each element into a two-byte wire slot, independent of the current registry ceiling', () =>
    Effect.runPromise(Effect.sync(() => {
      // BLOCK_REGISTRY's current maximum id is 122
      // (block-registry-entries-structures-and-nether.ts), so no id above 255
      // can be constructed through the validated set()/fromBytes() surface
      // using today's real roster. This proves the storage headroom itself,
      // on BlockState; the test below proves a registered id above 255
      // actually survives the full v2 chunk codec, with a widened registry
      // substituted for the one real roster this repository ships.
      const state = blockState(sampleBlocks())

      expect(state.toBytes().length).toBe(state.length * WIRE_BYTES_PER_ELEMENT)
      expect(state.length).toBe(sampleBlocks().length)
    })),
  )

  it('carries a block id above 255 through a full v2 encode/decode round trip', async () => {
    // BLOCK_REGISTRY tops out at id 122 (see the test above), and every real
    // construction path (fromBytes, fromElementBytes, set) registry-checks
    // against that live roster, so no genuine id above 255 exists to decode
    // today. This test substitutes a widened registry — only the id-lookup
    // data, never chunk.ts's or block-state.ts's own logic — so the v2 path
    // can be proven against a value that the codec must actually carry
    // through, not merely against storage headroom.
    const WIDE_BLOCK_ID_VALUE = 300

    vi.resetModules()
    vi.doMock('../src/domain/block-registry.js', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../src/domain/block-registry')>()
      const wideBlockId = Brand.nominal<BlockId>()(WIDE_BLOCK_ID_VALUE)

      return {
        ...actual,
        BLOCK_IDS: [...actual.BLOCK_IDS, wideBlockId],
        isKnownBlockId: (id: number): boolean => id === WIDE_BLOCK_ID_VALUE || actual.isKnownBlockId(id),
      }
    })

    try {
      const wideChunkModule = await import('../src/domain/chunk.js')
      const wideHeight = wideChunkModule.ChunkHeight(1)
      const wideBlockCount = wideChunkModule.chunkBlockCount(wideHeight)

      const encoded = new Uint8Array(CHUNK_HEADER_BYTES + wideBlockCount * WIRE_BYTES_PER_ELEMENT)
      encoded.set(new TextEncoder().encode('MCHK'), 0)
      const view = new DataView(encoded.buffer)
      view.setUint16(4, wideChunkModule.CHUNK_CODEC_VERSION, true)
      view.setUint16(6, CHUNK_SIZE_XZ, true)
      view.setUint16(8, CHUNK_SIZE_XZ, true)
      view.setUint16(10, wideHeight, true)
      view.setInt32(12, 3, true)
      view.setInt32(16, -4, true)
      view.setUint32(20, wideBlockCount * WIRE_BYTES_PER_ELEMENT, true)
      view.setUint16(CHUNK_HEADER_BYTES, WIDE_BLOCK_ID_VALUE, true)

      const decoded = wideChunkModule.decodeChunk(encoded)
      expect(decoded.blocks.get(0)).toBe(WIDE_BLOCK_ID_VALUE)

      const reencoded = wideChunkModule.encodeChunk(decoded)
      const redecoded = wideChunkModule.decodeChunk(reencoded)
      expect(redecoded.blocks.get(0)).toBe(WIDE_BLOCK_ID_VALUE)
    } finally {
      vi.doUnmock('../src/domain/block-registry.js')
      vi.resetModules()
    }
  })
})
