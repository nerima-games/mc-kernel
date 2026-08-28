export const WEATHERS: readonly ['clear', 'rain', 'thunder'] = ['clear', 'rain', 'thunder']

export type Weather = (typeof WEATHERS)[number]

export type WeatherState = {
  readonly weather: Weather
  readonly remainingSecs: number
}

export const DEFAULT_WEATHER_REMAINING_SECS = 600

export const INITIAL_WEATHER_STATE: WeatherState = {
  weather: 'clear',
  remainingSecs: DEFAULT_WEATHER_REMAINING_SECS,
} satisfies WeatherState

type UnknownRecord = Readonly<Record<string, unknown>>

const isRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null

export const isWeather = (value: unknown): value is Weather =>
  typeof value === 'string' && WEATHERS.some((weather) => weather === value)

export const isValidWeatherState = (value: unknown): value is WeatherState => {
  if (!isRecord(value)) return false
  const weather = value['weather']
  const remainingSecs = value['remainingSecs']
  return (
    isWeather(weather) &&
    typeof remainingSecs === 'number' &&
    Number.isFinite(remainingSecs) &&
    remainingSecs > 0
  )
}

export const normaliseWeatherState = (value: unknown): WeatherState => {
  const state = isRecord(value) ? value : undefined
  const weather = state?.['weather']
  const remainingSecs = state?.['remainingSecs']
  return {
    weather: isWeather(weather) ? weather : INITIAL_WEATHER_STATE.weather,
    remainingSecs:
      typeof remainingSecs === 'number' && Number.isFinite(remainingSecs) && remainingSecs > 0
        ? remainingSecs
        : DEFAULT_WEATHER_REMAINING_SECS,
  }
}
