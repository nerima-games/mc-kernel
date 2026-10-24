export const WEATHERS: readonly ['clear', 'rain', 'thunder'] = ['clear', 'rain', 'thunder']

export type Weather = (typeof WEATHERS)[number]

export const DEFAULT_WEATHER_REMAINING_SECS = 600

export const isWeather = (value: unknown): value is Weather =>
  typeof value === 'string' && WEATHERS.some((weather) => weather === value)
