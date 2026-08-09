import {
  type BlockPositionKey,
  BlockPositionKey as parseBlockPositionKey,
  blockPosition,
  blockPositionKeyOf,
  blockPositionOfKey,
  decodeBlockPositionKey,
  isBlockPositionKey,
} from '../src/domain/coordinates'
import { describe, expect, it } from 'vitest'
import { Effect } from 'effect'

const NEGATIVE_ZERO_COMPONENT = -0
const ORIGIN_COMPONENT = 0
const FIRST_UNSAFE_INTEGER = 9_007_199_254_740_992

describe('BlockPositionKey', () => {
  it('round-trips canonical positions, including safe-integer boundaries', () =>
    Effect.runPromise(Effect.sync(() => {
      const source = blockPosition(Number.MIN_SAFE_INTEGER, ORIGIN_COMPONENT, Number.MAX_SAFE_INTEGER)
      const key = blockPositionKeyOf(source)

      expect(key).toBe('-9007199254740991,0,9007199254740991')
      expect(isBlockPositionKey(key)).toBe(true)
      expect(parseBlockPositionKey(key)).toBe(key)
      expect(blockPositionOfKey(key)).toStrictEqual(source)
      expect(decodeBlockPositionKey(key)).toStrictEqual(source)
    })),
  )

    it('uses one spelling per position, including the origin', () =>
      Effect.runPromise(Effect.sync(() => {
        expect(
          blockPositionKeyOf(
            blockPosition(NEGATIVE_ZERO_COMPONENT, NEGATIVE_ZERO_COMPONENT, NEGATIVE_ZERO_COMPONENT),
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

  it('fails loudly if JavaScript callers forge an invalid branded key', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(() => parseBlockPositionKey('0.5,0,0')).toThrow(TypeError)
      expect(() => blockPositionOfKey('0.5,0,0' as BlockPositionKey)).toThrow(TypeError)
    })),
  )
})
