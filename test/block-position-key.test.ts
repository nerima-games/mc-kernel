import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import {
  BlockPositionKey as parseBlockPositionKey,
  blockPosition,
  blockPositionKeyOf,
  blockPositionOfKey,
  decodeBlockPositionKey,
  isBlockPositionKey,
  type BlockPositionKey,
} from '../src/domain/coordinates'

describe('BlockPositionKey', () => {
  it.effect('round-trips canonical positions, including safe-integer boundaries', () =>
    Effect.sync(() => {
      const source = blockPosition(Number.MIN_SAFE_INTEGER, 0, Number.MAX_SAFE_INTEGER)
      const key = blockPositionKeyOf(source)

      expect(key).toBe('-9007199254740991,0,9007199254740991')
      expect(isBlockPositionKey(key)).toBe(true)
      expect(parseBlockPositionKey(key)).toBe(key)
      expect(blockPositionOfKey(key)).toStrictEqual(source)
      expect(decodeBlockPositionKey(key)).toStrictEqual(source)
    }),
  )

  it.effect('uses one spelling per position, including the origin', () =>
    Effect.sync(() => {
      expect(blockPositionKeyOf(blockPosition(-0, -0, -0))).toBe('0,0,0')
      expect(isBlockPositionKey('0,0,0')).toBe(true)
      expect(isBlockPositionKey('-0,0,0')).toBe(false)
      expect(isBlockPositionKey('01,0,0')).toBe(false)
      expect(isBlockPositionKey('1e3,0,0')).toBe(false)
    }),
  )

  it.effect('rejects malformed, fractional, and unsafe external input', () =>
    Effect.sync(() => {
      for (const key of [
        '',
        '0,0',
        '0,0,0,0',
        '0,,0',
        '0,0,',
        '0.5,0,0',
        'Infinity,0,0',
        '9007199254740992,0,0',
      ]) {
        expect(isBlockPositionKey(key)).toBe(false)
        expect(decodeBlockPositionKey(key)).toBeUndefined()
      }
    }),
  )

  it.effect('fails loudly if JavaScript callers forge an invalid branded key', () =>
    Effect.sync(() => {
      expect(() => parseBlockPositionKey('0.5,0,0')).toThrow(TypeError)
      expect(() => blockPositionOfKey('0.5,0,0' as BlockPositionKey)).toThrow(TypeError)
    }),
  )
})
