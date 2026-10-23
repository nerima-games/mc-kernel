import { describe, expect, it } from 'vitest'
import {
  DEFAULT_WEATHER_REMAINING_SECS,
  WEATHERS,
  isWeather,
} from '../src/domain/world/weather'

describe('weather', () => {
  it('defines the supported weather kinds and default duration', () => {
    expect(WEATHERS).toStrictEqual(['clear', 'rain', 'thunder'])
    expect(DEFAULT_WEATHER_REMAINING_SECS).toBe(600)
  })

  it('narrows only the supported weather kinds', () => {
    for (const weather of WEATHERS) expect(isWeather(weather)).toBe(true)
    expect(isWeather('snow')).toBe(false)
    expect(isWeather('')).toBe(false)
    expect(isWeather(1)).toBe(false)
    expect(isWeather(null)).toBe(false)
  })
})
