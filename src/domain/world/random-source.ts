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
import { Brand, Result } from 'effect'

const RANDOM_INT_MIN = 0
const RANDOM_INT_BOUND_MIN = 1
const RANDOM_FRACTION_MIN = 0
const RANDOM_FRACTION_MAX = 1

export type RandomSeed = number & Brand.Brand<'RandomSeed'>
export const RandomSeed: Brand.Constructor<RandomSeed> = Brand.make<RandomSeed>(
  (value) => Number.isSafeInteger(value) || 'RandomSeed must be a safe integer',
)

export type RandomIntBound = number & Brand.Brand<'RandomIntBound'>
export const RandomIntBound: Brand.Constructor<RandomIntBound> = Brand.make<RandomIntBound>(
  (value) =>
    Number.isSafeInteger(value) && value >= RANDOM_INT_BOUND_MIN
      ? true
      : 'RandomIntBound must be a positive safe integer',
)

export type RandomInt = number & Brand.Brand<'RandomInt'>
export const RandomInt: Brand.Constructor<RandomInt> = Brand.make<RandomInt>(
  (value) =>
    Number.isSafeInteger(value) && value >= RANDOM_INT_MIN
      ? true
      : 'RandomInt must be a non-negative safe integer',
)

export type RandomFraction = number & Brand.Brand<'RandomFraction'>
export const RandomFraction: Brand.Constructor<RandomFraction> = Brand.make<RandomFraction>(
  (value) =>
    Number.isFinite(value) && value >= RANDOM_FRACTION_MIN && value < RANDOM_FRACTION_MAX
      ? true
      : 'RandomFraction must be in [0, 1)',
)

export type RandomSourceFailure = Readonly<{
  readonly _tag: 'RandomSourceFailure'
  readonly reason: 'invalid-seed' | 'invalid-bound' | 'sequence-exhausted' | 'invalid-script'
  readonly message: string
}>

const failure = (
  reason: RandomSourceFailure['reason'],
  message: string,
): Result.Result<never, RandomSourceFailure> => Result.fail({ _tag: 'RandomSourceFailure', reason, message })

const brandFailure = (
  reason: RandomSourceFailure['reason'],
  label: string,
  error: Readonly<{ readonly message: string }>,
): RandomSourceFailure => ({
  _tag: 'RandomSourceFailure',
  reason,
  message: `${label}: ${error.message}`,
})

export type RandomSource = Readonly<{
  readonly nextInt: (bound: number) => Result.Result<RandomInt, RandomSourceFailure>
  readonly nextFloat: () => Result.Result<RandomFraction, RandomSourceFailure>
}>

const validateBound = (bound: number): Result.Result<RandomIntBound, RandomSourceFailure> =>
  Result.mapError(
    RandomIntBound.result(bound),
    (error) => brandFailure('invalid-bound', 'RandomSource bound is invalid', error),
  )

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
const randomFraction = Brand.nominal<RandomFraction>()
const randomInt = Brand.nominal<RandomInt>()

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
export const seededRandomSource = (seed: number): Result.Result<RandomSource, RandomSourceFailure> =>
  Result.mapError(
    Result.map(RandomSeed.result(seed), (validSeed) => {
      let state = normalizeSeed(validSeed)

      const nextFloat = (): Result.Result<RandomFraction, RandomSourceFailure> => {
        state = (state * MCG_MULTIPLIER) % MCG_MODULUS
        return Result.succeed(randomFraction(state / MCG_MODULUS))
      }

      const nextInt = (bound: number): Result.Result<RandomInt, RandomSourceFailure> =>
        Result.flatMap(validateBound(bound), (validBound) =>
          Result.flatMap(nextFloat(), (fraction) =>
            Result.succeed(randomInt(Math.floor(fraction * validBound))),
          ),
        )

      return { nextInt, nextFloat }
    }),
    (error) => brandFailure('invalid-seed', 'RandomSource seed is invalid', error),
  )

/** A caller-supplied replay sequence for `fixedRandomSource`. */
export type RandomSourceScript = Readonly<{
  readonly nextInts?: ReadonlyArray<RandomInt>
  readonly nextFloats?: ReadonlyArray<RandomFraction>
}>

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * A `RandomSource` that replays a fixed, caller-supplied sequence rather
 * than generating one, analogous to `fixedClock`. Kernel ships this rather
 * than a real entropy adapter on purpose: a scripted source is
 * platform-independent, whereas every real one is not. Each call consumes
 * the next scripted value; a call past the end of its sequence returns a
 * failure rather than silently wrapping or defaulting.
 */
export const fixedRandomSource = (
  script: RandomSourceScript,
): Result.Result<RandomSource, RandomSourceFailure> => {
  if (
    !isRecord(script) ||
    (script['nextInts'] !== undefined && !Array.isArray(script['nextInts'])) ||
    (script['nextFloats'] !== undefined && !Array.isArray(script['nextFloats']))
  ) {
    return failure('invalid-script', 'RandomSource script must contain optional int and float arrays')
  }

  const ints: Array<RandomInt> = []
  for (const value of script.nextInts ?? []) {
    if (typeof value !== 'number') {
      return failure('invalid-script', 'RandomSource script integer values must be numbers')
    }
    const validInt = Result.mapError(
      RandomInt.result(value),
      (error) => brandFailure('invalid-script', 'RandomSource script contains an invalid integer', error),
    )
    if (Result.isFailure(validInt)) return Result.fail(validInt.failure)
    ints.push(validInt.success)
  }

  const floats: Array<RandomFraction> = []
  for (const value of script.nextFloats ?? []) {
    if (typeof value !== 'number') {
      return failure('invalid-script', 'RandomSource script fraction values must be numbers')
    }
    const validFraction = Result.mapError(
      RandomFraction.result(value),
      (error) => brandFailure('invalid-script', 'RandomSource script contains an invalid fraction', error),
    )
    if (Result.isFailure(validFraction)) return Result.fail(validFraction.failure)
    floats.push(validFraction.success)
  }

  let intIndex = 0
  let floatIndex = 0

  const nextInt = (bound: number): Result.Result<RandomInt, RandomSourceFailure> =>
    Result.flatMap(validateBound(bound), () => {
      const value = ints[intIndex]
      if (value === undefined) {
        return failure('sequence-exhausted', `fixedRandomSource nextInt sequence exhausted after ${String(intIndex)} calls`)
      }
      intIndex += 1
      return Result.succeed(value)
    })

  const nextFloat = (): Result.Result<RandomFraction, RandomSourceFailure> => {
    const value = floats[floatIndex]
    if (value === undefined) {
      return failure('sequence-exhausted', `fixedRandomSource nextFloat sequence exhausted after ${String(floatIndex)} calls`)
    }
    floatIndex += 1
    return Result.succeed(value)
  }

  return Result.succeed({ nextInt, nextFloat })
}
