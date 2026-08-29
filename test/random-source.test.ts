import { describe, expect, it } from 'vitest'
import { fixedRandomSource, seededRandomSource } from '../src/domain/random-source'

describe('seededRandomSource', () => {
  it('produces the same value sequence for the same seed', () => {
    const first = seededRandomSource(42)
    const second = seededRandomSource(42)

    const firstValues = [first.nextInt(100), first.nextFloat(), first.nextInt(6), first.nextFloat()]
    const secondValues = [second.nextInt(100), second.nextFloat(), second.nextInt(6), second.nextFloat()]

    expect(secondValues).toStrictEqual(firstValues)
  })

  it('produces different sequences for different seeds', () => {
    const a = seededRandomSource(1)
    const b = seededRandomSource(2)

    expect(a.nextFloat()).not.toBe(b.nextFloat())
  })

  it('keeps nextInt within [0, bound)', () => {
    const random = seededRandomSource(7)

    for (let call = 0; call < 50; call += 1) {
      const value = random.nextInt(10)
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(10)
    }
  })

  it('keeps nextFloat within [0, 1)', () => {
    const random = seededRandomSource(7)

    for (let call = 0; call < 50; call += 1) {
      const value = random.nextFloat()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('normalizes a seed that reduces to zero to the same state as seed 1', () => {
    const fromZero = seededRandomSource(0)
    const fromModulus = seededRandomSource(2147483647)
    const expected = seededRandomSource(1).nextFloat()

    expect(fromZero.nextFloat()).toBe(expected)
    expect(fromModulus.nextFloat()).toBe(expected)
  })

  it('normalizes a negative seed by wrapping into the positive range', () => {
    const fromNegative = seededRandomSource(-2147483647)
    const fromWrapped = seededRandomSource(2147483647 - 2147483647)

    expect(fromNegative.nextFloat()).toBe(fromWrapped.nextFloat())
  })

  it('rejects a non-safe-integer seed', () => {
    expect(() => seededRandomSource(1.5)).toThrow(TypeError)
    expect(() => seededRandomSource(Number.NaN)).toThrow(/RandomSource seed must be a safe integer/)
  })

  it('rejects a non-integer bound', () => {
    const random = seededRandomSource(3)
    expect(() => random.nextInt(1.5)).toThrow(RangeError)
  })

  it('rejects a non-positive bound', () => {
    const random = seededRandomSource(3)
    expect(() => random.nextInt(0)).toThrow(/RandomSource bound must be a positive integer/)
    expect(() => random.nextInt(-1)).toThrow(RangeError)
  })
})

describe('fixedRandomSource', () => {
  it('replays the scripted ints and floats in order', () => {
    const random = fixedRandomSource({ nextInts: [3, 1, 4], nextFloats: [0.1, 0.9] })

    expect(random.nextInt(10)).toBe(3)
    expect(random.nextFloat()).toBe(0.1)
    expect(random.nextInt(10)).toBe(1)
    expect(random.nextFloat()).toBe(0.9)
    expect(random.nextInt(10)).toBe(4)
  })

  it('rejects a non-integer or non-positive bound before consuming the script', () => {
    const random = fixedRandomSource({ nextInts: [5] })
    expect(() => random.nextInt(1.5)).toThrow(RangeError)
    expect(() => random.nextInt(0)).toThrow(RangeError)
    expect(random.nextInt(10)).toBe(5)
  })

  it('throws once the scripted int sequence is exhausted', () => {
    const random = fixedRandomSource({ nextInts: [9] })
    expect(random.nextInt(10)).toBe(9)
    expect(() => random.nextInt(10)).toThrow(/fixedRandomSource nextInt sequence exhausted/)
  })

  it('throws once the scripted float sequence is exhausted', () => {
    const random = fixedRandomSource({ nextFloats: [0.5] })
    expect(random.nextFloat()).toBe(0.5)
    expect(() => random.nextFloat()).toThrow(/fixedRandomSource nextFloat sequence exhausted/)
  })

  it('throws immediately when no script is supplied for a channel', () => {
    const random = fixedRandomSource({})
    expect(() => random.nextInt(10)).toThrow(RangeError)
    expect(() => random.nextFloat()).toThrow(RangeError)
  })
})
