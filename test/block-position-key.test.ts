import {
  BlockAxis,
  BlockPositionKey as parseBlockPositionKey,
  blockPosition,
  blockPositionKeyOf,
  blockPositionOfKey,
  decodeBlockPositionKey,
  isBlockPositionKey,
} from '../src/domain/coordinates/coordinates'
import { describe, expect, it } from 'vitest'
import { Effect, Result } from 'effect'

const NEGATIVE_ZERO_COMPONENT = -0
const ORIGIN_COMPONENT = 0
const FIRST_UNSAFE_INTEGER = 9_007_199_254_740_992

describe('BlockPositionKey', () => {
  it('round-trips canonical positions, including safe-integer boundaries', () =>
    Effect.runPromise(Effect.sync(() => {
      const source = blockPosition(
        BlockAxis(Number.MIN_SAFE_INTEGER),
        BlockAxis(ORIGIN_COMPONENT),
        BlockAxis(Number.MAX_SAFE_INTEGER),
      )
      const key = blockPositionKeyOf(source)

      expect(key).toBe('-9007199254740991,0,9007199254740991')
      expect(isBlockPositionKey(key)).toBe(true)
      expect(parseBlockPositionKey(key)).toEqual(Result.succeed(key))
      expect(blockPositionOfKey(key)).toEqual(Result.succeed(source))
      expect(decodeBlockPositionKey(key)).toStrictEqual(source)
    })),
  )

    it('uses one spelling per position, including the origin', () =>
      Effect.runPromise(Effect.sync(() => {
        expect(
          blockPositionKeyOf(
            blockPosition(
              BlockAxis(NEGATIVE_ZERO_COMPONENT),
              BlockAxis(NEGATIVE_ZERO_COMPONENT),
              BlockAxis(NEGATIVE_ZERO_COMPONENT),
            ),
          ),
        ).toBe('0,0,0')
      expect(isBlockPositionKey('0,0,0')).toBe(true)
      expect(isBlockPositionKey('-0,0,0')).toBe(false)
      expect(isBlockPositionKey('01,0,0')).toBe(false)
      expect(isBlockPositionKey('1e3,0,0')).toBe(false)
    })),
  )

  it('rejects malformed, fractional, and unsafe external input', () =>
    Effect.runPromise(Effect.sync(() => {
      for (const key of [
        '',
        '0,0',
        '0,0,0,0',
        '0,,0',
        '0,0,',
          '0.5,0,0',
          'Infinity,0,0',
          `${FIRST_UNSAFE_INTEGER},0,0`,
      ]) {
        expect(isBlockPositionKey(key)).toBe(false)
        expect(decodeBlockPositionKey(key)).toBeUndefined()
      }
    })),
  )

  it('rejects non-string values at the unknown-input boundary', () =>
    Effect.runPromise(Effect.sync(() => {
      for (const value of [null, 0, {}]) {
        expect(isBlockPositionKey(value)).toBe(false)
        expect(decodeBlockPositionKey(value)).toBeUndefined()
        const decoded = parseBlockPositionKey(value)
        expect(Result.isFailure(decoded)).toBe(true)
        if (Result.isFailure(decoded)) {
          expect(decoded.failure).toMatchObject({
            _tag: 'CoordinateKeyFailure',
            reason: 'invalid-block-position-key',
            kind: 'TypeError',
          })
        }
      }
    })),
  )

  it('returns a tagged failure if JavaScript callers forge an invalid branded key', () =>
    Effect.runPromise(Effect.sync(() => {
      const decoded = parseBlockPositionKey('0.5,0,0')
      const position = Reflect.apply(blockPositionOfKey, undefined, ['0.5,0,0'])
      expect(Result.isFailure(decoded)).toBe(true)
      expect(Result.isFailure(position)).toBe(true)
      if (Result.isFailure(decoded)) {
        expect(decoded.failure).toMatchObject({
          _tag: 'CoordinateKeyFailure',
          reason: 'invalid-block-position-key',
          kind: 'TypeError',
          value: '0.5,0,0',
        })
      }
      if (Result.isFailure(position)) {
        expect(position.failure).toMatchObject({
          _tag: 'CoordinateKeyFailure',
          reason: 'invalid-block-position-key',
          kind: 'TypeError',
          value: '0.5,0,0',
        })
      }
    })),
  )
})
