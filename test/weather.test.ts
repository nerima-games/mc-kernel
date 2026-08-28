import { describe, expect, it } from 'vitest'
import {
  DEFAULT_WEATHER_REMAINING_SECS,
  INITIAL_WEATHER_STATE,
  WEATHERS,
  isValidWeatherState,
  isWeather,
  normaliseWeatherState,
} from '../src/domain/weather'

describe('weather', () => {
  it('defines the supported weather kinds and initial state', () => {
    expect(WEATHERS).toStrictEqual(['clear', 'rain', 'thunder'])
    expect(DEFAULT_WEATHER_REMAINING_SECS).toBe(600)
    expect(INITIAL_WEATHER_STATE).toStrictEqual({ weather: 'clear', remainingSecs: 600 })
  })

  it('narrows only the supported weather kinds', () => {
    for (const weather of WEATHERS) expect(isWeather(weather)).toBe(true)
    expect(isWeather('snow')).toBe(false)
    expect(isWeather('')).toBe(false)
    expect(isWeather(1)).toBe(false)
    expect(isWeather(null)).toBe(false)
  })

  it('validates weather state shape and positive duration', () => {
    expect(isValidWeatherState({ weather: 'rain', remainingSecs: 0.1 })).toBe(true)
    expect(isValidWeatherState(null)).toBe(false)
    expect(isValidWeatherState(1)).toBe(false)
    expect(isValidWeatherState({ weather: 'snow', remainingSecs: 10 })).toBe(false)
    expect(isValidWeatherState({ weather: 'clear' })).toBe(false)
    expect(isValidWeatherState({ weather: 'clear', remainingSecs: '10' })).toBe(false)
    expect(isValidWeatherState({ weather: 'clear', remainingSecs: Number.POSITIVE_INFINITY })).toBe(false)
    expect(isValidWeatherState({ weather: 'clear', remainingSecs: 0 })).toBe(false)
    expect(isValidWeatherState({ weather: 'clear', remainingSecs: -1 })).toBe(false)
  })

  it('normalises unknown state values to the safe weather defaults', () => {
    expect(normaliseWeatherState(null)).toStrictEqual(INITIAL_WEATHER_STATE)
    expect(normaliseWeatherState(1)).toStrictEqual(INITIAL_WEATHER_STATE)
    expect(normaliseWeatherState({ weather: 'thunder', remainingSecs: 42 })).toStrictEqual({
      weather: 'thunder',
      remainingSecs: 42,
    })
    expect(normaliseWeatherState({ weather: 'snow', remainingSecs: 42 })).toStrictEqual({
      weather: 'clear',
      remainingSecs: 42,
    })
    expect(normaliseWeatherState({ weather: 'clear' })).toStrictEqual(INITIAL_WEATHER_STATE)
    expect(normaliseWeatherState({ weather: 'clear', remainingSecs: Number.POSITIVE_INFINITY })).toStrictEqual(INITIAL_WEATHER_STATE)
    expect(normaliseWeatherState({ weather: 'clear', remainingSecs: 0 })).toStrictEqual(INITIAL_WEATHER_STATE)
  })
})
