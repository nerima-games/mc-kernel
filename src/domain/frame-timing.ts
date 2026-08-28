import { DeltaTimeSecs } from './quantities.js'

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
