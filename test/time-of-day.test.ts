import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DAY_LENGTH_SECS,
  INITIAL_TIME_STATE,
  MAX_DAY_LENGTH_SECS,
  MAX_TIME_FRACTION,
  MIN_DAY_LENGTH_SECS,
  MOON_PHASE_COUNT,
  TICKS_PER_SECOND,
  advance,
  clampDayLengthSecs,
  clampFraction,
  dayLengthSecs,
  isNight,
  isValidTimeState,
  moonPhase,
  normaliseTimeState,
  setDayLength,
  setDayLengthThenTimeOfDay,
  setTimeOfDay,
  timeOfDay,
} from '../src/domain/time-of-day'
import { DeltaTimeSecs } from '../src/domain/quantities'

describe('time of day', () => {
  it('defines the shared day policy and initial state', () => {
    expect(TICKS_PER_SECOND).toBe(60)
    expect(MIN_DAY_LENGTH_SECS).toBe(120)
    expect(MAX_DAY_LENGTH_SECS).toBe(1200)
    expect(MAX_TIME_FRACTION).toBe(0.9999)
    expect(MOON_PHASE_COUNT).toBe(8)
    expect(DEFAULT_DAY_LENGTH_SECS).toBe(400)
    expect(INITIAL_TIME_STATE).toStrictEqual({ ticks: 7200, dayLengthTicks: 24000 })
  })

  it('clamps day lengths and uses the default for NaN', () => {
    expect(clampDayLengthSecs(DEFAULT_DAY_LENGTH_SECS)).toBe(DEFAULT_DAY_LENGTH_SECS)
    expect(clampDayLengthSecs(MIN_DAY_LENGTH_SECS - 1)).toBe(MIN_DAY_LENGTH_SECS)
    expect(clampDayLengthSecs(MAX_DAY_LENGTH_SECS + 1)).toBe(MAX_DAY_LENGTH_SECS)
    expect(clampDayLengthSecs(Number.NaN)).toBe(DEFAULT_DAY_LENGTH_SECS)
    expect(clampDayLengthSecs(Number.POSITIVE_INFINITY)).toBe(MAX_DAY_LENGTH_SECS)
    expect(clampDayLengthSecs(Number.NEGATIVE_INFINITY)).toBe(MIN_DAY_LENGTH_SECS)
  })

  it('clamps time fractions and uses dawn for NaN', () => {
    expect(clampFraction(0.5)).toBe(0.5)
    expect(clampFraction(-1)).toBe(0)
    expect(clampFraction(2)).toBe(MAX_TIME_FRACTION)
    expect(clampFraction(Number.NaN)).toBe(0)
    expect(clampFraction(Number.POSITIVE_INFINITY)).toBe(MAX_TIME_FRACTION)
    expect(clampFraction(Number.NEGATIVE_INFINITY)).toBe(0)
  })

  it('accepts valid time states and rejects every malformed field', () => {
    expect(isValidTimeState({ ticks: 0, dayLengthTicks: MIN_DAY_LENGTH_SECS * TICKS_PER_SECOND })).toBe(true)
    expect(isValidTimeState({ ticks: 10, dayLengthTicks: MAX_DAY_LENGTH_SECS * TICKS_PER_SECOND })).toBe(true)
    expect(isValidTimeState(null)).toBe(false)
    expect(isValidTimeState(1)).toBe(false)
    expect(isValidTimeState({ ticks: '10', dayLengthTicks: 24000 })).toBe(false)
    expect(isValidTimeState({ ticks: Number.POSITIVE_INFINITY, dayLengthTicks: 24000 })).toBe(false)
    expect(isValidTimeState({ ticks: -1, dayLengthTicks: 24000 })).toBe(false)
    expect(isValidTimeState({ ticks: 10, dayLengthTicks: '24000' })).toBe(false)
    expect(isValidTimeState({ ticks: 10, dayLengthTicks: Number.POSITIVE_INFINITY })).toBe(false)
    expect(isValidTimeState({ ticks: 10, dayLengthTicks: MIN_DAY_LENGTH_SECS * TICKS_PER_SECOND - 1 })).toBe(false)
    expect(isValidTimeState({ ticks: 10, dayLengthTicks: MAX_DAY_LENGTH_SECS * TICKS_PER_SECOND + 1 })).toBe(false)
  })

  it('normalises unknown state values without unsafe casts', () => {
    expect(normaliseTimeState(null)).toStrictEqual({ ticks: 0, dayLengthTicks: 24000 })
    expect(normaliseTimeState(1)).toStrictEqual({ ticks: 0, dayLengthTicks: 24000 })
    expect(normaliseTimeState({ ticks: 123.5, dayLengthTicks: 30000 })).toStrictEqual({ ticks: 123.5, dayLengthTicks: 30000 })
    expect(normaliseTimeState({ ticks: Number.POSITIVE_INFINITY, dayLengthTicks: 24000 })).toStrictEqual({ ticks: 0, dayLengthTicks: 24000 })
    expect(normaliseTimeState({ ticks: -1, dayLengthTicks: 24000 })).toStrictEqual({ ticks: 0, dayLengthTicks: 24000 })
    expect(normaliseTimeState({ ticks: 10, dayLengthTicks: 'invalid' })).toStrictEqual({ ticks: 10, dayLengthTicks: 24000 })
    expect(normaliseTimeState({ ticks: 10, dayLengthTicks: Number.POSITIVE_INFINITY })).toStrictEqual({ ticks: 10, dayLengthTicks: 72000 })
    expect(normaliseTimeState({ ticks: 10, dayLengthTicks: MIN_DAY_LENGTH_SECS * TICKS_PER_SECOND - 1 })).toStrictEqual({ ticks: 10, dayLengthTicks: 7200 })
    expect(normaliseTimeState({ ticks: 10, dayLengthTicks: MAX_DAY_LENGTH_SECS * TICKS_PER_SECOND + 1 })).toStrictEqual({ ticks: 10, dayLengthTicks: 72000 })
  })

  it('derives the day fraction, duration, moon phase, and night status', () => {
    const quarterDay = { ticks: 6000, dayLengthTicks: 24000 }
    expect(timeOfDay(quarterDay)).toBe(0.25)
    expect(dayLengthSecs(quarterDay)).toBe(400)
    expect(moonPhase({ ticks: 24000 * 9, dayLengthTicks: 24000 })).toBe(1)
    expect(isNight({ ticks: 0, dayLengthTicks: 24000 })).toBe(true)
    expect(isNight({ ticks: 6000, dayLengthTicks: 24000 })).toBe(false)
    expect(isNight({ ticks: 18000, dayLengthTicks: 24000 })).toBe(false)
    expect(isNight({ ticks: 21600, dayLengthTicks: 24000 })).toBe(true)
  })

  it('advances time and preserves the configured day length', () => {
    expect(advance(INITIAL_TIME_STATE, DeltaTimeSecs(2.5))).toStrictEqual({ ticks: 7350, dayLengthTicks: 24000 })
  })

  it('sets day length and clamps its input', () => {
    expect(setDayLength(INITIAL_TIME_STATE, 600)).toStrictEqual({ ticks: 7200, dayLengthTicks: 36000 })
    expect(setDayLength(INITIAL_TIME_STATE, 30)).toStrictEqual({ ticks: 7200, dayLengthTicks: 7200 })
    expect(setDayLength(INITIAL_TIME_STATE, Number.POSITIVE_INFINITY)).toStrictEqual({ ticks: 7200, dayLengthTicks: 72000 })
  })

  it('sets the time fraction and clamps its input', () => {
    expect(setTimeOfDay(INITIAL_TIME_STATE, 0.5)).toStrictEqual({ ticks: 12000, dayLengthTicks: 24000 })
    expect(setTimeOfDay(INITIAL_TIME_STATE, -1)).toStrictEqual({ ticks: 0, dayLengthTicks: 24000 })
    expect(setTimeOfDay(INITIAL_TIME_STATE, 2)).toStrictEqual({ ticks: 23997, dayLengthTicks: 24000 })
    expect(setTimeOfDay(INITIAL_TIME_STATE, Number.NaN)).toStrictEqual({ ticks: 0, dayLengthTicks: 24000 })
  })

  it('applies day length before setting the time fraction', () => {
    expect(setDayLengthThenTimeOfDay(INITIAL_TIME_STATE, 600, 0.25)).toStrictEqual({ ticks: 9000, dayLengthTicks: 36000 })
  })
})
