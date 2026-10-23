import { Result } from 'effect'
import {
  DeltaTimeSecs,
  FixedDurationSecs,
  InterpolationFraction,
  SimulationTick,
  type DeltaTimeSecs as DeltaTimeSecsValue,
  type FixedDurationSecs as FixedDurationSecsValue,
  type InterpolationFraction as InterpolationFractionValue,
  type MonotonicTimeSecs as MonotonicTimeSecsValue,
  type NonNegativeTickCount as NonNegativeTickCountValue,
  type SimulationTick as SimulationTickValue,
} from './quantities.js'

export const MIN_FRAME_DELTA_SECS = 0.001
export const MAX_FRAME_DELTA_SECS = 0.05
export const FIRST_FRAME_DELTA_SECS: DeltaTimeSecs = DeltaTimeSecs(0.016)

const clampFrameDeltaValue = (rawDeltaSecs: number): DeltaTimeSecsValue =>
  Number.isNaN(rawDeltaSecs)
    ? FIRST_FRAME_DELTA_SECS
    : DeltaTimeSecs(Math.min(Math.max(MIN_FRAME_DELTA_SECS, rawDeltaSecs), MAX_FRAME_DELTA_SECS))

const frameDeltaLossValue = (rawDeltaSecs: number): DeltaTimeSecsValue =>
  Number.isNaN(rawDeltaSecs)
    ? DeltaTimeSecs(0)
    : DeltaTimeSecs(Math.max(0, rawDeltaSecs - clampFrameDeltaValue(rawDeltaSecs)))

export const clampFrameDelta = (rawDeltaSecs: DeltaTimeSecsValue): DeltaTimeSecsValue =>
  clampFrameDeltaValue(rawDeltaSecs)

export const frameDeltaBetween = (
  previousSecs: MonotonicTimeSecsValue | undefined,
  nowSecs: MonotonicTimeSecsValue,
): DeltaTimeSecsValue =>
  previousSecs === undefined ? FIRST_FRAME_DELTA_SECS : clampFrameDeltaValue(nowSecs - previousSecs)

export const frameDeltaLossSecs = (rawDeltaSecs: DeltaTimeSecsValue): DeltaTimeSecsValue =>
  frameDeltaLossValue(rawDeltaSecs)

export const frameDeltaLossBetween = (
  previousSecs: MonotonicTimeSecsValue | undefined,
  nowSecs: MonotonicTimeSecsValue,
): DeltaTimeSecsValue =>
  previousSecs === undefined ? DeltaTimeSecs(0) : frameDeltaLossValue(nowSecs - previousSecs)

export const tickDuration: FixedDurationSecsValue = FixedDurationSecs(0.05)
export const physicsSubstepDuration: FixedDurationSecsValue = FixedDurationSecs(0.025)

export type TimeOverflow = { readonly _tag: 'TimeOverflow' }

const timeOverflow: TimeOverflow = { _tag: 'TimeOverflow' }

export const addTick = (
  tick: SimulationTickValue,
  count: NonNegativeTickCountValue,
): Result.Result<SimulationTickValue, TimeOverflow> => {
  const nextTick = tick + count
  return Number.isSafeInteger(nextTick) ? Result.succeed(SimulationTick(nextTick)) : Result.fail(timeOverflow)
}

export const secondsForTicks = (
  ticks: NonNegativeTickCountValue,
): Result.Result<FixedDurationSecsValue, TimeOverflow> => {
  const seconds = ticks * tickDuration
  return Result.mapError(FixedDurationSecs.result(seconds), () => timeOverflow)
}

export const interpolationFraction = (accumulator: FixedDurationSecsValue): InterpolationFractionValue =>
  InterpolationFraction(accumulator / tickDuration)
