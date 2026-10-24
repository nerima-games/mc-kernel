import {
  ChunkAxis,
  ChunkKey as parseChunkKey,
  chunkCoord,
  chunkCoordOfKey,
  chunkKeyOf,
  decodeChunkKey,
  isChunkKey,
} from '../src/domain/coordinates/coordinates'
import { describe, expect, it } from 'vitest'
import { Effect, Result } from 'effect'

const NEGATIVE_ZERO = -0

describe('ChunkKey', () => {
  it('round-trips canonical chunk coordinates, including safe-integer boundaries', () =>
    Effect.runPromise(Effect.sync(() => {
      const source = chunkCoord(ChunkAxis(Number.MIN_SAFE_INTEGER), ChunkAxis(Number.MAX_SAFE_INTEGER))
      const key = chunkKeyOf(source)

      expect(key).toBe('-9007199254740991,9007199254740991')
      expect(parseChunkKey(key)).toEqual(Result.succeed(key))
      expect(chunkCoordOfKey(key)).toEqual(Result.succeed(source))
      expect(decodeChunkKey(key)).toEqual(source)
    })),
  )

  it('uses one spelling for each chunk coordinate', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(chunkKeyOf(chunkCoord(ChunkAxis(NEGATIVE_ZERO), ChunkAxis(NEGATIVE_ZERO)))).toBe('0,0')
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

  it('rejects non-string values at the unknown-input boundary', () =>
    Effect.runPromise(Effect.sync(() => {
      for (const value of [null, 0, {}]) {
        expect(isChunkKey(value)).toBe(false)
        expect(decodeChunkKey(value)).toBeUndefined()
        const decoded = parseChunkKey(value)
        expect(Result.isFailure(decoded)).toBe(true)
        if (Result.isFailure(decoded)) {
          expect(decoded.failure).toMatchObject({
            _tag: 'CoordinateKeyFailure',
            reason: 'invalid-chunk-key',
            kind: 'TypeError',
          })
        }
      }
    })),
  )

  it('returns a tagged failure when a forged ChunkKey is malformed', () =>
    Effect.runPromise(Effect.sync(() => {
      const decoded = parseChunkKey('0.5,0')
      const coordinate = Reflect.apply(chunkCoordOfKey, undefined, ['0.5,0'])
      expect(Result.isFailure(decoded)).toBe(true)
      expect(Result.isFailure(coordinate)).toBe(true)
      if (Result.isFailure(decoded)) {
        expect(decoded.failure).toMatchObject({
          _tag: 'CoordinateKeyFailure',
          reason: 'invalid-chunk-key',
          kind: 'TypeError',
          value: '0.5,0',
        })
      }
      if (Result.isFailure(coordinate)) {
        expect(coordinate.failure).toMatchObject({
          _tag: 'CoordinateKeyFailure',
          reason: 'invalid-chunk-key',
          kind: 'TypeError',
          value: '0.5,0',
        })
      }
    })),
  )
})
