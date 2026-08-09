import {
  ChunkKey as parseChunkKey,
  type ChunkKey,
  chunkCoord,
  chunkCoordOfKey,
  chunkKeyOf,
  decodeChunkKey,
  isChunkKey,
} from '../src/domain/coordinates'
import { describe, expect, it } from 'vitest'
import { Effect } from 'effect'

const NEGATIVE_ZERO = -0

describe('ChunkKey', () => {
  it('round-trips canonical chunk coordinates, including safe-integer boundaries', () =>
    Effect.runPromise(Effect.sync(() => {
      const source = chunkCoord(Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)
      const key = chunkKeyOf(source)

      expect(key).toBe('-9007199254740991,9007199254740991')
      expect(parseChunkKey(key)).toBe(key)
      expect(chunkCoordOfKey(key)).toEqual(source)
      expect(decodeChunkKey(key)).toEqual(source)
    })),
  )

  it('uses one spelling for each chunk coordinate', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(chunkKeyOf(chunkCoord(NEGATIVE_ZERO, NEGATIVE_ZERO))).toBe('0,0')
      expect(isChunkKey('0,0')).toBe(true)
      expect(isChunkKey('-0,0')).toBe(false)
      expect(isChunkKey('01,0')).toBe(false)
      expect(isChunkKey('1e3,0')).toBe(false)
    })),
  )

  it('rejects malformed, non-integer, and unsafe keys', () =>
    Effect.runPromise(Effect.sync(() => {
      for (const value of [
        '',
        '0',
        ',0',
        '0,',
        '0,0,0',
        '0.5,0',
        'Infinity,0',
        '9007199254740992,0',
      ]) {
        expect(isChunkKey(value)).toBe(false)
        expect(decodeChunkKey(value)).toBeUndefined()
      }
    })),
  )

  it('throws when a forged ChunkKey is malformed', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(() => parseChunkKey('0.5,0')).toThrow('Invalid ChunkKey: 0.5,0')
      expect(() => chunkCoordOfKey('0.5,0' as ChunkKey)).toThrow('Invalid ChunkKey: 0.5,0')
    })),
  )
})
