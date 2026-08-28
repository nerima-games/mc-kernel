import type { AchievementId, StatisticKey, Statistics } from './statistics-data.js'

export { EMPTY_STATISTICS } from './statistics-data.js'
export type { AchievementId, StatisticKey, Statistics } from './statistics-data.js'

type UnknownRecord = Readonly<Record<string, unknown>>

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const delta = (value: number): number => (Number.isFinite(value) ? value : 0)

export const counterOf = (statistics: Statistics, key: StatisticKey): number =>
  Math.max(0, statistics.counters[key] ?? 0)

export const record = (statistics: Statistics, key: StatisticKey, amount = 1): Statistics => {
  const by = delta(amount)
  if (by === 0) {
    return statistics
  }
  return {
    ...statistics,
    counters: {
      ...statistics.counters,
      [key]: Math.max(0, counterOf(statistics, key) + by),
    },
  }
}

export const isUnlocked = (statistics: Statistics, achievement: AchievementId): boolean =>
  statistics.unlocked.includes(achievement)

export const unlock = (statistics: Statistics, achievement: AchievementId): Statistics => {
  if (isUnlocked(statistics, achievement)) {
    return statistics
  }
  return {
    ...statistics,
    unlocked: [...statistics.unlocked, achievement],
  }
}

export const normaliseStatistics = (statistics: unknown): Statistics => {
  const source: UnknownRecord = isRecord(statistics) ? statistics : {}
  const counterSource: UnknownRecord = isRecord(source['counters']) ? source['counters'] : {}
  const counters: Record<StatisticKey, number> = {}
  for (const [key, value] of Object.entries(counterSource)) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      counters[key] = value
    }
  }

  const unlockedSource = Array.isArray(source['unlocked']) ? source['unlocked'] : []
  const unlocked: AchievementId[] = []
  for (const achievement of unlockedSource) {
    if (typeof achievement === 'string' && !unlocked.includes(achievement)) {
      unlocked.push(achievement)
    }
  }

  return { counters, unlocked }
}

export const isValidStatistics = (statistics: unknown): statistics is Statistics => {
  if (
    !isRecord(statistics) ||
    !isRecord(statistics['counters']) ||
    !Array.isArray(statistics['unlocked'])
  ) {
    return false
  }
  const countersValid = Object.values(statistics['counters']).every(
    (value) => typeof value === 'number' && Number.isFinite(value) && value > 0,
  )
  if (!countersValid) {
    return false
  }
  if (!statistics['unlocked'].every((achievement) => typeof achievement === 'string')) {
    return false
  }
  return new Set(statistics['unlocked']).size === statistics['unlocked'].length
}
