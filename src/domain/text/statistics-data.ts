export type StatisticKey = string
export type AchievementId = string

export type Statistics = Readonly<{
  counters: Readonly<Record<StatisticKey, number>>
  unlocked: ReadonlyArray<AchievementId>
}>

export const EMPTY_STATISTICS: Statistics = {
  counters: {},
  unlocked: [],
}
