import type { AchievementId } from '../event/domain-event.js'

export type { AchievementId } from '../event/domain-event.js'

export type StatisticKey = string

export type Statistics = Readonly<{
  counters: Readonly<Record<StatisticKey, number>>
  unlocked: ReadonlyArray<AchievementId>
}>

export const EMPTY_STATISTICS: Statistics = {
  counters: {},
  unlocked: [],
}
