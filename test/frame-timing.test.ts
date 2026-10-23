import { Effect, Result } from 'effect'
import * as fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  FIRST_FRAME_DELTA_SECS,
  MAX_FRAME_DELTA_SECS,
  MIN_FRAME_DELTA_SECS,
  clampFrameDelta,
  frameDeltaBetween,
  frameDeltaLossBetween,
  frameDeltaLossSecs,
  addTick,
  interpolationFraction,
  physicsSubstepDuration,
  secondsForTicks,
  tickDuration,
} from '../src/domain/time/frame-timing'
import {
  DeltaTimeSecs,
  FixedDurationSecs,
  MonotonicTimeSecs,
  NonNegativeTickCount,
  SimulationTick,
} from '../src/domain/time/quantities'

const assertWithEffect = (assertion: () => void): Promise<void> => Effect.runPromise(Effect.sync(assertion))

describe('frame timing', () => {
  it('defines the shared frame policy', () =>
    assertWithEffect(() => {
      expect(MIN_FRAME_DELTA_SECS).toBe(0.001)
      expect(MAX_FRAME_DELTA_SECS).toBe(0.05)
      expect(FIRST_FRAME_DELTA_SECS).toBe(0.016)
    }),
  )

  it('preserves ordinary positive frame deltas', () =>
    assertWithEffect(() => {
      expect(clampFrameDelta(DeltaTimeSecs(1 / 60))).toBeCloseTo(1 / 60, 12)
      expect(clampFrameDelta(DeltaTimeSecs(0.02))).toBe(0.02)
    }),
  )

  it('clamps large frame deltas to the maximum', () =>
    assertWithEffect(() => {
      expect(clampFrameDelta(DeltaTimeSecs(30))).toBe(MAX_FRAME_DELTA_SECS)
      expect(clampFrameDelta(DeltaTimeSecs(MAX_FRAME_DELTA_SECS + 0.00001))).toBe(MAX_FRAME_DELTA_SECS)
    }),
  )

  it('clamps small frame deltas to the minimum', () =>
    assertWithEffect(() => {
      expect(clampFrameDelta(DeltaTimeSecs(0))).toBe(MIN_FRAME_DELTA_SECS)
      expect(clampFrameDelta(DeltaTimeSecs(Number.EPSILON))).toBe(MIN_FRAME_DELTA_SECS)
    }),
  )

  it('leaves both policy boundaries unchanged', () =>
    assertWithEffect(() => {
      expect(clampFrameDelta(DeltaTimeSecs(MIN_FRAME_DELTA_SECS))).toBe(MIN_FRAME_DELTA_SECS)
      expect(clampFrameDelta(DeltaTimeSecs(MAX_FRAME_DELTA_SECS))).toBe(MAX_FRAME_DELTA_SECS)
    }),
  )

  it('validates frame deltas and clock readings at their numeric boundaries', () =>
    assertWithEffect(() => {
      expect(Result.isSuccess(DeltaTimeSecs.result(0))).toBe(true)
      expect(Result.isSuccess(DeltaTimeSecs.result(Number.MIN_VALUE))).toBe(true)
      expect(Result.isSuccess(DeltaTimeSecs.result(Number.MAX_VALUE))).toBe(true)
      expect(Result.isFailure(DeltaTimeSecs.result(-Number.MIN_VALUE))).toBe(true)
      expect(Result.isFailure(DeltaTimeSecs.result(Number.POSITIVE_INFINITY))).toBe(true)
      expect(Result.isFailure(DeltaTimeSecs.result(Number.NaN))).toBe(true)
      expect(Result.isSuccess(MonotonicTimeSecs.result(0))).toBe(true)
      expect(Result.isSuccess(MonotonicTimeSecs.result(Number.MAX_VALUE))).toBe(true)
      expect(Result.isFailure(MonotonicTimeSecs.result(-Number.MIN_VALUE))).toBe(true)
      expect(Result.isFailure(MonotonicTimeSecs.result(Number.POSITIVE_INFINITY))).toBe(true)
      expect(Result.isFailure(MonotonicTimeSecs.result(Number.NaN))).toBe(true)
      // @ts-expect-error Invalid JavaScript input still uses the historical NaN fallback.
      expect(clampFrameDelta(Number.NaN)).toBe(FIRST_FRAME_DELTA_SECS)
      // @ts-expect-error Invalid JavaScript input still reports no discarded time.
      expect(frameDeltaLossSecs(Number.NaN)).toBe(0)
    }),
  )

  it('keeps clamped deltas within the simulation range', () =>
    assertWithEffect(() => {
      for (const rawDeltaSecs of [0, 0.001, 0.016, 0.05, 5]) {
        const deltaSecs = clampFrameDelta(DeltaTimeSecs(rawDeltaSecs))
        expect(deltaSecs).toBeGreaterThanOrEqual(MIN_FRAME_DELTA_SECS)
        expect(deltaSecs).toBeLessThanOrEqual(MAX_FRAME_DELTA_SECS)
      }
    }),
  )

  it('uses the first-frame value when no previous timestamp exists', () =>
    assertWithEffect(() => {
      expect(frameDeltaBetween(undefined, MonotonicTimeSecs(100))).toBe(FIRST_FRAME_DELTA_SECS)
    }),
  )

  it('treats timestamp zero as a real previous timestamp', () =>
    assertWithEffect(() => {
      expect(frameDeltaBetween(MonotonicTimeSecs(0), MonotonicTimeSecs(0.02))).toBe(0.02)
    }),
  )

  it('clamps timestamp intervals with the same policy as raw deltas', () =>
    assertWithEffect(() => {
      expect(frameDeltaBetween(MonotonicTimeSecs(100), MonotonicTimeSecs(130))).toBe(MAX_FRAME_DELTA_SECS)
      expect(frameDeltaBetween(MonotonicTimeSecs(100), MonotonicTimeSecs(100.00001))).toBe(MIN_FRAME_DELTA_SECS)
    }),
  )

  it('reports time discarded above the maximum', () =>
    assertWithEffect(() => {
      expect(frameDeltaLossSecs(DeltaTimeSecs(30))).toBeCloseTo(29.95, 12)
      expect(frameDeltaLossSecs(DeltaTimeSecs(0.051))).toBeCloseTo(0.001, 12)
    }),
  )

  it('reports no loss for ordinary or small deltas', () =>
    assertWithEffect(() => {
      expect(frameDeltaLossSecs(DeltaTimeSecs(0.02))).toBe(0)
      expect(frameDeltaLossSecs(DeltaTimeSecs(0))).toBe(0)
    }),
  )

  it('preserves positive raw time when the clamped delta and loss are recombined', () =>
    assertWithEffect(() => {
      for (const rawDeltaSecs of [0.051, 0.5, 30]) {
        const delta = DeltaTimeSecs(rawDeltaSecs)
        expect(clampFrameDelta(delta) + frameDeltaLossSecs(delta)).toBeCloseTo(rawDeltaSecs, 12)
      }
    }),
  )

  it('reports loss between timestamps', () =>
    assertWithEffect(() => {
      expect(frameDeltaLossBetween(MonotonicTimeSecs(1), MonotonicTimeSecs(1.051))).toBeCloseTo(0.001, 12)
      expect(frameDeltaLossBetween(MonotonicTimeSecs(1), MonotonicTimeSecs(1.02))).toBe(0)
    }),
  )

  it('reports no loss for the first frame', () =>
    assertWithEffect(() => {
      expect(frameDeltaLossBetween(undefined, MonotonicTimeSecs(100))).toBe(0)
    }),
  )

  it('reports no loss when the clock moves backwards', () =>
    assertWithEffect(() => {
      expect(frameDeltaLossBetween(MonotonicTimeSecs(2), MonotonicTimeSecs(1))).toBe(0)
    }),
  )
})

describe('fixed simulation timing', () => {
  it('uses the K05 literal durations', () =>
    assertWithEffect(() => {
      expect(tickDuration).toBe(0.05)
      expect(physicsSubstepDuration).toBe(0.025)
    }),
  )

  it('matches the K05 tick arithmetic oracle', () =>
    assertWithEffect(() => {
      const firstTick = addTick(SimulationTick(0), NonNegativeTickCount(1))
      expect(firstTick).toStrictEqual(Result.succeed(1))
      expect(secondsForTicks(NonNegativeTickCount(1))).toStrictEqual(Result.succeed(0.05))
      expect(secondsForTicks(NonNegativeTickCount(2))).toStrictEqual(Result.succeed(0.1))
      // @ts-expect-error Runtime overflow is rejected even when an invalid value crosses the typed boundary.
      expect(secondsForTicks(Number.POSITIVE_INFINITY)).toStrictEqual(Result.fail({ _tag: 'TimeOverflow' }))
      expect(addTick(SimulationTick(Number.MAX_SAFE_INTEGER), NonNegativeTickCount(1))).toStrictEqual(
        Result.fail({ _tag: 'TimeOverflow' }),
      )
    }),
  )

  it('keeps addTick at the safe-integer boundary without wrapping', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
        fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
        (tickValue, countValue) => {
          const result = addTick(SimulationTick(tickValue), NonNegativeTickCount(countValue))
          const expected = tickValue + countValue
          if (Number.isSafeInteger(expected)) {
            expect(Result.isSuccess(result)).toBe(true)
            if (Result.isSuccess(result)) expect(result.success).toBe(expected)
          } else {
            expect(result).toStrictEqual(Result.fail({ _tag: 'TimeOverflow' }))
          }
        },
      ),
    )
  })

  it('keeps interpolation fractions in [0, 1) for an unconsumed accumulator', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 49 }), (milliseconds) => {
        const fraction = interpolationFraction(FixedDurationSecs(milliseconds / 1000))
        expect(fraction).toBeGreaterThanOrEqual(0)
        expect(fraction).toBeLessThan(1)
      }),
    )
    expect(interpolationFraction(FixedDurationSecs(0))).toBe(0)
    expect(interpolationFraction(FixedDurationSecs(0.025))).toBe(0.5)
    expect(() => interpolationFraction(FixedDurationSecs(0.05))).toThrow()
  })
})
