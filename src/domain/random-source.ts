/**
 * The RandomSource contract.
 *
 * Simulation code must not read ambient entropy (`Math.random`, a platform
 * CSPRNG) directly. A direct read makes replay and fast-forward
 * nondeterministic, so randomness is obtained through this contract and
 * supplied explicitly by the caller — mirroring `ClockPort` in `clock.ts`.
 *
 * The kernel exports the domain vocabulary, a deterministic seeded
 * generator, and a scripted replay for tests. It ships no adapter over a
 * real entropy source; that belongs to the consuming platform.
 */

export type RandomSource = Readonly<{
  readonly nextInt: (bound: number) => number
  readonly nextFloat: () => number
}>

const validateBound = (bound: number): void => {
  if (!Number.isInteger(bound) || bound <= 0) {
    throw new RangeError(`RandomSource bound must be a positive integer, received ${String(bound)}`)
  }
}

/**
 * Park–Miller "minimal standard" Lehmer generator: `state' = (state *
 * MCG_MULTIPLIER) mod MCG_MODULUS`. `MCG_MODULUS` is the Mersenne prime
 * 2^31 - 1 and `MCG_MULTIPLIER` is a primitive root modulo it, so the
 * recurrence visits every value in [1, MCG_MODULUS - 1] before repeating.
 * The product of two values below `MCG_MODULUS` stays under
 * `Number.MAX_SAFE_INTEGER`, so the whole generator runs in plain
 * safe-integer arithmetic with no bitwise operators and no `BigInt`.
 */
const MCG_MODULUS = 2147483647
const MCG_MULTIPLIER = 16807

const normalizeSeed = (seed: number): number => {
  const reduced = ((seed % MCG_MODULUS) + MCG_MODULUS) % MCG_MODULUS
  return reduced === 0 ? 1 : reduced
}

/**
 * A deterministic seeded `RandomSource`: the same seed followed by the same
 * call sequence always produces the same value sequence. Two different
 * kernel processes replaying the same recorded inputs therefore reproduce
 * the same offers, drops, or ticks without sharing any other state.
 */
export const seededRandomSource = (seed: number): RandomSource => {
  if (!Number.isSafeInteger(seed)) {
    throw new TypeError(`RandomSource seed must be a safe integer, received ${String(seed)}`)
  }

  let state = normalizeSeed(seed)

  const nextFloat = (): number => {
    state = (state * MCG_MULTIPLIER) % MCG_MODULUS
    return state / MCG_MODULUS
  }

  const nextInt = (bound: number): number => {
    validateBound(bound)
    return Math.floor(nextFloat() * bound)
  }

  return { nextInt, nextFloat }
}

/** A caller-supplied replay sequence for `fixedRandomSource`. */
export type RandomSourceScript = Readonly<{
  readonly nextInts?: ReadonlyArray<number>
  readonly nextFloats?: ReadonlyArray<number>
}>

/**
 * A `RandomSource` that replays a fixed, caller-supplied sequence rather
 * than generating one, analogous to `fixedClock`. Kernel ships this rather
 * than a real entropy adapter on purpose: a scripted source is
 * platform-independent, whereas every real one is not. Each call consumes
 * the next scripted value; a call past the end of its sequence throws
 * rather than silently wrapping or defaulting.
 */
export const fixedRandomSource = (script: RandomSourceScript): RandomSource => {
  const ints = script.nextInts ?? []
  const floats = script.nextFloats ?? []
  let intIndex = 0
  let floatIndex = 0

  const nextInt = (bound: number): number => {
    validateBound(bound)
    const value = ints[intIndex]
    if (value === undefined) {
      throw new RangeError(`fixedRandomSource nextInt sequence exhausted after ${String(intIndex)} calls`)
    }
    intIndex += 1
    return value
  }

  const nextFloat = (): number => {
    const value = floats[floatIndex]
    if (value === undefined) {
      throw new RangeError(`fixedRandomSource nextFloat sequence exhausted after ${String(floatIndex)} calls`)
    }
    floatIndex += 1
    return value
  }

  return { nextInt, nextFloat }
}
