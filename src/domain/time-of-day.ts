import type { DeltaTimeSecs } from './quantities.js'

export const TICKS_PER_SECOND = 60
export const MIN_DAY_LENGTH_SECS = 120
export const MAX_DAY_LENGTH_SECS = 1200
export const MAX_TIME_FRACTION = 0.9999
export const MOON_PHASE_COUNT = 8

export type TimeState = {
  readonly ticks: number
  readonly dayLengthTicks: number
}

export const INITIAL_TIME_STATE: TimeState = {
  ticks: 7200,
  dayLengthTicks: 24000,
} satisfies TimeState

export const DEFAULT_DAY_LENGTH_SECS = 400

type UnknownRecord = Readonly<Record<string, unknown>>

const isRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null

const hasMagnitude = (value: number): boolean => !Number.isNaN(value)

export const clampDayLengthSecs = (seconds: number): number => {
  const value = hasMagnitude(seconds) ? seconds : DEFAULT_DAY_LENGTH_SECS
  return Math.max(MIN_DAY_LENGTH_SECS, Math.min(MAX_DAY_LENGTH_SECS, value))
}

export const clampFraction = (fraction: number): number => {
  const value = hasMagnitude(fraction) ? fraction : 0
  return Math.max(0, Math.min(MAX_TIME_FRACTION, value))
}

export const isValidTimeState = (value: unknown): value is TimeState => {
  if (!isRecord(value)) return false
  const ticks = value['ticks']
  const dayLengthTicks = value['dayLengthTicks']
  return (
    typeof ticks === 'number' &&
    Number.isFinite(ticks) &&
    ticks >= 0 &&
    typeof dayLengthTicks === 'number' &&
    Number.isFinite(dayLengthTicks) &&
    dayLengthTicks >= MIN_DAY_LENGTH_SECS * TICKS_PER_SECOND &&
    dayLengthTicks <= MAX_DAY_LENGTH_SECS * TICKS_PER_SECOND
  )
}

export const normaliseTimeState = (value: unknown): TimeState => {
  const state = isRecord(value) ? value : undefined
  const ticks = state?.['ticks']
  const dayLengthTicks = state?.['dayLengthTicks']
  return {
    ticks: typeof ticks === 'number' && Number.isFinite(ticks) && ticks >= 0 ? ticks : 0,
    dayLengthTicks:
      clampDayLengthSecs(typeof dayLengthTicks === 'number' ? dayLengthTicks / TICKS_PER_SECOND : Number.NaN) *
      TICKS_PER_SECOND,
  }
}

export const timeOfDay = (state: TimeState): number => (state.ticks % state.dayLengthTicks) / state.dayLengthTicks

export const dayLengthSecs = (state: TimeState): number => state.dayLengthTicks / TICKS_PER_SECOND

export const moonPhase = (state: TimeState): number =>
  Math.floor(state.ticks / state.dayLengthTicks) % MOON_PHASE_COUNT

export const isNight = (state: TimeState): boolean => {
  const fraction = timeOfDay(state)
  return fraction < 0.25 || fraction > 0.75
}

export const advance = (state: TimeState, deltaTimeSecs: DeltaTimeSecs): TimeState => ({
  ...state,
  ticks: state.ticks + deltaTimeSecs * TICKS_PER_SECOND,
})

export const setDayLength = (state: TimeState, seconds: number): TimeState => ({
  ...state,
  dayLengthTicks: clampDayLengthSecs(seconds) * TICKS_PER_SECOND,
})

export const setTimeOfDay = (state: TimeState, fraction: number): TimeState => ({
  ...state,
  ticks: Math.floor(clampFraction(fraction) * state.dayLengthTicks),
})

export const setDayLengthThenTimeOfDay = (
  state: TimeState,
  seconds: number,
  fraction: number,
): TimeState => setTimeOfDay(setDayLength(state, seconds), fraction)
