import { describe, expect, it } from 'vitest'
import {
  RandomFraction,
  RandomInt,
  RandomIntBound,
  RandomSeed,
  fixedRandomSource,
  seededRandomSource,
} from '../src/domain/world/random-source'

describe('random scalar brands', () => {
  it('accepts safe integer seed boundaries', () => {
    expect(RandomSeed(-Number.MAX_SAFE_INTEGER)).toBe(-Number.MAX_SAFE_INTEGER)
    expect(RandomSeed(0)).toBe(0)
    expect(RandomSeed(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER)
    expect(() => RandomSeed(-Number.MAX_SAFE_INTEGER - 1)).toThrow()
    expect(() => RandomSeed(Number.MAX_SAFE_INTEGER + 1)).toThrow()
    expect(() => RandomSeed(1.5)).toThrow()
  })

  it('accepts positive safe integer bounds and non-negative integer results', () => {
    expect(RandomIntBound(1)).toBe(1)
    expect(RandomIntBound(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER)
    expect(() => RandomIntBound(0)).toThrow()
    expect(() => RandomIntBound(Number.MAX_SAFE_INTEGER + 1)).toThrow()
    expect(() => RandomIntBound(1.5)).toThrow()

    expect(RandomInt(0)).toBe(0)
    expect(RandomInt(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER)
    expect(() => RandomInt(-1)).toThrow()
    expect(() => RandomInt(Number.MAX_SAFE_INTEGER + 1)).toThrow()
    expect(() => RandomInt(1.5)).toThrow()
  })

  it('accepts fractions from zero up to, but not including, one', () => {
    expect(RandomFraction(0)).toBe(0)
    expect(RandomFraction(0.5)).toBe(0.5)
    expect(() => RandomFraction(-Number.MIN_VALUE)).toThrow()
    expect(() => RandomFraction(1)).toThrow()
    expect(() => RandomFraction(Number.NaN)).toThrow()
  })
})

describe('seededRandomSource', () => {
  it('produces the same value sequence for the same seed', () => {
    const first = seededRandomSource(RandomSeed(42))
    const second = seededRandomSource(RandomSeed(42))

    const firstValues = [first.nextInt(RandomIntBound(100)), first.nextFloat(), first.nextInt(RandomIntBound(6)), first.nextFloat()]
    const secondValues = [second.nextInt(RandomIntBound(100)), second.nextFloat(), second.nextInt(RandomIntBound(6)), second.nextFloat()]

    expect(secondValues).toStrictEqual(firstValues)
  })

  it('produces different sequences for different seeds', () => {
    const a = seededRandomSource(RandomSeed(1))
    const b = seededRandomSource(RandomSeed(2))

    expect(a.nextFloat()).not.toBe(b.nextFloat())
  })

  it('keeps nextInt within [0, bound)', () => {
    const random = seededRandomSource(RandomSeed(7))

    for (let call = 0; call < 50; call += 1) {
      const value = random.nextInt(RandomIntBound(10))
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(10)
    }
  })

  it('keeps nextFloat within [0, 1)', () => {
    const random = seededRandomSource(RandomSeed(7))

    for (let call = 0; call < 50; call += 1) {
      const value = random.nextFloat()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('normalizes a seed that reduces to zero to the same state as seed 1', () => {
    const fromZero = seededRandomSource(RandomSeed(0))
    const fromModulus = seededRandomSource(RandomSeed(2147483647))
    const expected = seededRandomSource(RandomSeed(1)).nextFloat()

    expect(fromZero.nextFloat()).toBe(expected)
    expect(fromModulus.nextFloat()).toBe(expected)
  })

  it('normalizes a negative seed by wrapping into the positive range', () => {
    const fromNegative = seededRandomSource(RandomSeed(-2147483647))
    const fromWrapped = seededRandomSource(RandomSeed(2147483647 - 2147483647))

    expect(fromNegative.nextFloat()).toBe(fromWrapped.nextFloat())
  })

  it('rejects a non-safe-integer seed', () => {
    // @ts-expect-error seededRandomSource requires RandomSeed.
    expect(() => seededRandomSource(1.5)).toThrow(TypeError)
    // @ts-expect-error seededRandomSource requires RandomSeed.
    expect(() => seededRandomSource(Number.NaN)).toThrow(/RandomSource seed must be a safe integer/)
  })

  it('rejects a non-integer bound', () => {
    const random = seededRandomSource(RandomSeed(3))
    // @ts-expect-error nextInt requires RandomIntBound.
    expect(() => random.nextInt(1.5)).toThrow(RangeError)
  })

  it('rejects a non-positive bound', () => {
    const random = seededRandomSource(RandomSeed(3))
    // @ts-expect-error nextInt requires RandomIntBound.
    expect(() => random.nextInt(0)).toThrow(/RandomSource bound must be a positive integer/)
    // @ts-expect-error nextInt requires RandomIntBound.
    expect(() => random.nextInt(-1)).toThrow(RangeError)
  })
})

describe('fixedRandomSource', () => {
  it('replays the scripted ints and floats in order', () => {
    const random = fixedRandomSource({
      nextInts: [RandomInt(3), RandomInt(1), RandomInt(4)],
      nextFloats: [RandomFraction(0.1), RandomFraction(0.9)],
    })

    expect(random.nextInt(RandomIntBound(10))).toBe(3)
    expect(random.nextFloat()).toBe(0.1)
    expect(random.nextInt(RandomIntBound(10))).toBe(1)
    expect(random.nextFloat()).toBe(0.9)
    expect(random.nextInt(RandomIntBound(10))).toBe(4)
  })

  it('rejects a non-integer or non-positive bound before consuming the script', () => {
    const random = fixedRandomSource({ nextInts: [RandomInt(5)] })
    // @ts-expect-error nextInt requires RandomIntBound.
    expect(() => random.nextInt(1.5)).toThrow(RangeError)
    // @ts-expect-error nextInt requires RandomIntBound.
    expect(() => random.nextInt(0)).toThrow(RangeError)
    expect(random.nextInt(RandomIntBound(10))).toBe(5)
  })

  it('throws once the scripted int sequence is exhausted', () => {
    const random = fixedRandomSource({ nextInts: [RandomInt(9)] })
    expect(random.nextInt(RandomIntBound(10))).toBe(9)
    expect(() => random.nextInt(RandomIntBound(10))).toThrow(/fixedRandomSource nextInt sequence exhausted/)
  })

  it('throws once the scripted float sequence is exhausted', () => {
    const random = fixedRandomSource({ nextFloats: [RandomFraction(0.5)] })
    expect(random.nextFloat()).toBe(0.5)
    expect(() => random.nextFloat()).toThrow(/fixedRandomSource nextFloat sequence exhausted/)
  })

  it('throws immediately when no script is supplied for a channel', () => {
    const random = fixedRandomSource({})
    expect(() => random.nextInt(RandomIntBound(10))).toThrow(RangeError)
    expect(() => random.nextFloat()).toThrow(RangeError)
  })
})
