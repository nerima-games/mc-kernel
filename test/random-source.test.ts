import { describe, expect, it } from 'vitest'
import {
  RandomFraction,
  RandomInt,
  RandomIntBound,
  RandomSeed,
  fixedRandomSource,
  seededRandomSource,
} from '../src/domain/world/random-source'
import { Result } from 'effect'
import { resultFailure, resultValue } from './block-result-helpers.js'

describe('random scalar brands', () => {
  it('validates seed, bound, integer, and fraction values through Results', () => {
    expect(resultValue(RandomSeed.result(-Number.MAX_SAFE_INTEGER))).toBe(-Number.MAX_SAFE_INTEGER)
    expect(resultValue(RandomIntBound.result(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER)
    expect(resultValue(RandomInt.result(0))).toBe(0)
    expect(resultValue(RandomFraction.result(0.5))).toBe(0.5)
    expect(Result.isFailure(RandomSeed.result(1.5))).toBe(true)
    expect(Result.isFailure(RandomIntBound.result(0))).toBe(true)
    expect(Result.isFailure(RandomInt.result(-1))).toBe(true)
    expect(Result.isFailure(RandomFraction.result(1))).toBe(true)
  })
})

describe('seededRandomSource', () => {
  it('produces the same value sequence for the same seed', () => {
    const first = resultValue(seededRandomSource(42))
    const second = resultValue(seededRandomSource(42))

    const firstValues = [resultValue(first.nextInt(100)), resultValue(first.nextFloat()), resultValue(first.nextInt(6)), resultValue(first.nextFloat())]
    const secondValues = [resultValue(second.nextInt(100)), resultValue(second.nextFloat()), resultValue(second.nextInt(6)), resultValue(second.nextFloat())]

    expect(secondValues).toStrictEqual(firstValues)
  })

  it('produces different sequences for different seeds', () => {
    const a = resultValue(seededRandomSource(1))
    const b = resultValue(seededRandomSource(2))

    expect(resultValue(a.nextFloat())).not.toBe(resultValue(b.nextFloat()))
  })

  it('keeps nextInt within [0, bound)', () => {
    const random = resultValue(seededRandomSource(7))

    for (let call = 0; call < 50; call += 1) {
      const value = resultValue(random.nextInt(10))
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(10)
    }
  })

  it('keeps nextFloat within [0, 1)', () => {
    const random = resultValue(seededRandomSource(7))

    for (let call = 0; call < 50; call += 1) {
      const value = resultValue(random.nextFloat())
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('normalizes a seed that reduces to zero to the same state as seed 1', () => {
    const fromZero = resultValue(seededRandomSource(0))
    const fromModulus = resultValue(seededRandomSource(2147483647))
    const expected = resultValue(resultValue(seededRandomSource(1)).nextFloat())

    expect(resultValue(fromZero.nextFloat())).toBe(expected)
    expect(resultValue(fromModulus.nextFloat())).toBe(expected)
  })

  it('normalizes a negative seed by wrapping into the positive range', () => {
    const fromNegative = resultValue(seededRandomSource(-2147483647))
    const fromWrapped = resultValue(seededRandomSource(2147483647 - 2147483647))

    expect(resultValue(fromNegative.nextFloat())).toBe(resultValue(fromWrapped.nextFloat()))
  })

  it('rejects a non-safe-integer seed', () => {
    const fractional = resultFailure(seededRandomSource(1.5))
    const nonFinite = resultFailure(seededRandomSource(Number.NaN))
    expect(fractional._tag).toBe('RandomSourceFailure')
    expect(fractional.reason).toBe('invalid-seed')
    expect(fractional.message).toMatch(/safe integer/)
    expect(nonFinite._tag).toBe('RandomSourceFailure')
    expect(nonFinite.reason).toBe('invalid-seed')
    expect(nonFinite.message).toMatch(/safe integer/)
  })

  it('rejects a non-integer bound', () => {
    const random = resultValue(seededRandomSource(3))
    const failure = resultFailure(random.nextInt(1.5))
    expect(failure._tag).toBe('RandomSourceFailure')
    expect(failure.reason).toBe('invalid-bound')
    expect(failure.message).toMatch(/positive safe integer/)
  })

  it('rejects a non-positive bound', () => {
    const random = resultValue(seededRandomSource(3))
    const zero = resultFailure(random.nextInt(0))
    const negative = resultFailure(random.nextInt(-1))
    expect(zero._tag).toBe('RandomSourceFailure')
    expect(zero.reason).toBe('invalid-bound')
    expect(zero.message).toMatch(/positive safe integer/)
    expect(negative._tag).toBe('RandomSourceFailure')
    expect(negative.reason).toBe('invalid-bound')
  })
})

describe('fixedRandomSource', () => {
  it('replays the scripted ints and floats in order', () => {
    const random = resultValue(fixedRandomSource({
      nextInts: [3, 1, 4].map((value) => resultValue(RandomInt.result(value))),
      nextFloats: [0.1, 0.9].map((value) => resultValue(RandomFraction.result(value))),
    }))

    expect(resultValue(random.nextInt(10))).toBe(3)
    expect(resultValue(random.nextFloat())).toBe(0.1)
    expect(resultValue(random.nextInt(10))).toBe(1)
    expect(resultValue(random.nextFloat())).toBe(0.9)
    expect(resultValue(random.nextInt(10))).toBe(4)
  })

  it('rejects a non-integer or non-positive bound before consuming the script', () => {
    const random = resultValue(fixedRandomSource({ nextInts: [resultValue(RandomInt.result(5))] }))
    expect(resultFailure(random.nextInt(1.5)).reason).toBe('invalid-bound')
    expect(resultFailure(random.nextInt(0)).reason).toBe('invalid-bound')
    expect(resultValue(random.nextInt(10))).toBe(5)
  })

  it('returns a failure once the scripted int sequence is exhausted', () => {
    const random = resultValue(fixedRandomSource({ nextInts: [resultValue(RandomInt.result(9))] }))
    expect(resultValue(random.nextInt(10))).toBe(9)
    const failure = resultFailure(random.nextInt(10))
    expect(failure._tag).toBe('RandomSourceFailure')
    expect(failure.reason).toBe('sequence-exhausted')
    expect(failure.message).toMatch(/fixedRandomSource nextInt sequence exhausted/)
  })

  it('returns a failure once the scripted float sequence is exhausted', () => {
    const random = resultValue(fixedRandomSource({ nextFloats: [resultValue(RandomFraction.result(0.5))] }))
    expect(resultValue(random.nextFloat())).toBe(0.5)
    const failure = resultFailure(random.nextFloat())
    expect(failure._tag).toBe('RandomSourceFailure')
    expect(failure.reason).toBe('sequence-exhausted')
    expect(failure.message).toMatch(/fixedRandomSource nextFloat sequence exhausted/)
  })

  it('returns a failure immediately when no script is supplied for a channel', () => {
    const random = resultValue(fixedRandomSource({}))
    expect(resultFailure(random.nextInt(10)).reason).toBe('sequence-exhausted')
    expect(resultFailure(random.nextFloat()).reason).toBe('sequence-exhausted')
  })

  it('rejects malformed scripts with a tagged failure', () => {
    const failure = resultFailure(fixedRandomSource({ nextInts: 'not-an-array' } as never))
    expect(failure._tag).toBe('RandomSourceFailure')
    expect(failure.reason).toBe('invalid-script')
    expect(failure.message).toMatch(/optional int and float arrays/)
  })
})
