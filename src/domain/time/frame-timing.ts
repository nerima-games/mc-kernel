import { Either } from 'effect'
import {
  DeltaTimeSecs,
  FixedDurationSecs,
  InterpolationFraction,
  SimulationTick,
  type FixedDurationSecs as FixedDurationSecsValue,
  type InterpolationFraction as InterpolationFractionValue,
  type NonNegativeTickCount as NonNegativeTickCountValue,
  type SimulationTick as SimulationTickValue,
} from './quantities.js'

export const MIN_FRAME_DELTA_SECS = 0.001
export const MAX_FRAME_DELTA_SECS = 0.05
export const FIRST_FRAME_DELTA_SECS: DeltaTimeSecs = DeltaTimeSecs(0.016)

export const clampFrameDelta = (rawDeltaSecs: number): DeltaTimeSecs =>
  Number.isNaN(rawDeltaSecs)
    ? FIRST_FRAME_DELTA_SECS
    : DeltaTimeSecs(Math.min(Math.max(MIN_FRAME_DELTA_SECS, rawDeltaSecs), MAX_FRAME_DELTA_SECS))

export const frameDeltaBetween = (previousSecs: number | undefined, nowSecs: number): DeltaTimeSecs =>
  previousSecs === undefined ? FIRST_FRAME_DELTA_SECS : clampFrameDelta(nowSecs - previousSecs)

export const frameDeltaLossSecs = (rawDeltaSecs: number): number =>
  Number.isNaN(rawDeltaSecs) ? 0 : Math.max(0, rawDeltaSecs - clampFrameDelta(rawDeltaSecs))

export const frameDeltaLossBetween = (previousSecs: number | undefined, nowSecs: number): number =>
  previousSecs === undefined ? 0 : frameDeltaLossSecs(nowSecs - previousSecs)

export const tickDuration: FixedDurationSecsValue = FixedDurationSecs(0.05)
export const physicsSubstepDuration: FixedDurationSecsValue = FixedDurationSecs(0.025)

export type TimeOverflow = { readonly _tag: 'TimeOverflow' }

const timeOverflow: TimeOverflow = { _tag: 'TimeOverflow' }

export const addTick = (
  tick: SimulationTickValue,
  count: NonNegativeTickCountValue,
): Either.Either<SimulationTickValue, TimeOverflow> => {
  const nextTick = tick + count
  return Number.isSafeInteger(nextTick) ? Either.right(SimulationTick(nextTick)) : Either.left(timeOverflow)
}

export const secondsForTicks = (
  ticks: NonNegativeTickCountValue,
): Either.Either<FixedDurationSecsValue, TimeOverflow> => {
  const seconds = ticks * tickDuration
  return Either.try({ try: () => FixedDurationSecs(seconds), catch: () => timeOverflow })
}

export const interpolationFraction = (accumulator: FixedDurationSecsValue): InterpolationFractionValue =>
  InterpolationFraction(accumulator / tickDuration)
