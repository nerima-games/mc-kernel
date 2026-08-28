import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'
import {
  FIRST_FRAME_DELTA_SECS,
  MAX_FRAME_DELTA_SECS,
  MIN_FRAME_DELTA_SECS,
  clampFrameDelta,
  frameDeltaBetween,
  frameDeltaLossBetween,
  frameDeltaLossSecs,
} from '../src/domain/frame-timing'

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
      expect(clampFrameDelta(1 / 60)).toBeCloseTo(1 / 60, 12)
      expect(clampFrameDelta(0.02)).toBe(0.02)
    }),
  )

  it('clamps large and infinite frame deltas to the maximum', () =>
    assertWithEffect(() => {
      expect(clampFrameDelta(30)).toBe(MAX_FRAME_DELTA_SECS)
      expect(clampFrameDelta(MAX_FRAME_DELTA_SECS + 0.00001)).toBe(MAX_FRAME_DELTA_SECS)
      expect(clampFrameDelta(Number.POSITIVE_INFINITY)).toBe(MAX_FRAME_DELTA_SECS)
    }),
  )

  it('clamps small and negative frame deltas to the minimum', () =>
    assertWithEffect(() => {
      expect(clampFrameDelta(0)).toBe(MIN_FRAME_DELTA_SECS)
      expect(clampFrameDelta(Number.EPSILON)).toBe(MIN_FRAME_DELTA_SECS)
      expect(clampFrameDelta(-5)).toBe(MIN_FRAME_DELTA_SECS)
      expect(clampFrameDelta(Number.NEGATIVE_INFINITY)).toBe(MIN_FRAME_DELTA_SECS)
    }),
  )

  it('leaves both policy boundaries unchanged', () =>
    assertWithEffect(() => {
      expect(clampFrameDelta(MIN_FRAME_DELTA_SECS)).toBe(MIN_FRAME_DELTA_SECS)
      expect(clampFrameDelta(MAX_FRAME_DELTA_SECS)).toBe(MAX_FRAME_DELTA_SECS)
    }),
  )

  it('uses the first-frame fallback for NaN', () =>
    assertWithEffect(() => {
      expect(clampFrameDelta(Number.NaN)).toBe(FIRST_FRAME_DELTA_SECS)
    }),
  )

  it('keeps clamped deltas within the simulation range', () =>
    assertWithEffect(() => {
      for (const rawDeltaSecs of [-5, 0, 0.001, 0.016, 0.05, 5]) {
        const deltaSecs = clampFrameDelta(rawDeltaSecs)
        expect(deltaSecs).toBeGreaterThanOrEqual(MIN_FRAME_DELTA_SECS)
        expect(deltaSecs).toBeLessThanOrEqual(MAX_FRAME_DELTA_SECS)
      }
    }),
  )

  it('uses the first-frame value when no previous timestamp exists', () =>
    assertWithEffect(() => {
      expect(frameDeltaBetween(undefined, 100)).toBe(FIRST_FRAME_DELTA_SECS)
    }),
  )

  it('treats timestamp zero as a real previous timestamp', () =>
    assertWithEffect(() => {
      expect(frameDeltaBetween(0, 0.02)).toBe(0.02)
    }),
  )

  it('clamps timestamp intervals with the same policy as raw deltas', () =>
    assertWithEffect(() => {
      expect(frameDeltaBetween(100, 130)).toBe(MAX_FRAME_DELTA_SECS)
      expect(frameDeltaBetween(100, 100.00001)).toBe(MIN_FRAME_DELTA_SECS)
    }),
  )

  it('reports time discarded above the maximum', () =>
    assertWithEffect(() => {
      expect(frameDeltaLossSecs(30)).toBeCloseTo(29.95, 12)
      expect(frameDeltaLossSecs(0.051)).toBeCloseTo(0.001, 12)
    }),
  )

  it('reports no loss for ordinary, small, or NaN deltas', () =>
    assertWithEffect(() => {
      expect(frameDeltaLossSecs(0.02)).toBe(0)
      expect(frameDeltaLossSecs(0)).toBe(0)
      expect(frameDeltaLossSecs(-5)).toBe(0)
      expect(frameDeltaLossSecs(Number.NaN)).toBe(0)
    }),
  )

  it('preserves positive raw time when the clamped delta and loss are recombined', () =>
    assertWithEffect(() => {
      for (const rawDeltaSecs of [0.051, 0.5, 30]) {
        expect(clampFrameDelta(rawDeltaSecs) + frameDeltaLossSecs(rawDeltaSecs)).toBeCloseTo(rawDeltaSecs, 12)
      }
    }),
  )

  it('reports loss between timestamps', () =>
    assertWithEffect(() => {
      expect(frameDeltaLossBetween(1, 1.051)).toBeCloseTo(0.001, 12)
      expect(frameDeltaLossBetween(1, 1.02)).toBe(0)
    }),
  )

  it('reports no loss for the first frame', () =>
    assertWithEffect(() => {
      expect(frameDeltaLossBetween(undefined, 100)).toBe(0)
    }),
  )

  it('reports no loss when the clock moves backwards', () =>
    assertWithEffect(() => {
      expect(frameDeltaLossBetween(2, 1)).toBe(0)
    }),
  )
})
