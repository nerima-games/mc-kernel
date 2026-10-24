/**
 * Vanilla-derived world-simulation gamerule vocabulary and defaults.
 *
 * Data-only, mirroring `settings-data.ts`.
 *
 * Covers the subset of vanilla's gamerule set a world simulation actually
 * branches on: daylight/weather cycling, mob spawning and griefing,
 * inventory-on-death, fire spread, insomnia (phantom eligibility), natural
 * regeneration, immediate respawn, the four damage-source toggles, random
 * tick speed, entity cramming, the sleep-skip threshold and the natural mob
 * spawn radius. Announcement/log/debug rules (`showDeathMessages`,
 * `announceAdvancements`, `reducedDebugInfo`, `commandBlockOutput`,
 * `sendCommandFeedback`, `logAdminCommands`, …) and other command/admin
 * rules are excluded on the same basis: nothing in a physics or entity tick
 * reads them, only chat/log formatting does. Names and defaults verified
 * against minecraft.wiki's "Game rule" article (Java Edition; the legacy
 * camelCase names remain functional after the 1.21.11 snake_case rename).
 *
 * Integer rule bounds (`*_MIN`/`*_MAX` below) are a kernel-chosen safety
 * clamp, not a vanilla-mandated limit — vanilla accepts any 32-bit integer
 * for these — the same "kernel picks a workable range" choice
 * `settings-data.ts` makes for `MIN_RENDER_DISTANCE`/`MAX_RENDER_DISTANCE`.
 */

export const GAME_RULE_BOOLEAN_NAMES = [
  'doDaylightCycle',
  'doWeatherCycle',
  'doMobSpawning',
  'mobGriefing',
  'keepInventory',
  'doFireTick',
  'doInsomnia',
  'naturalRegeneration',
  'doImmediateRespawn',
  'fallDamage',
  'fireDamage',
  'drowningDamage',
  'freezeDamage',
] as const

export type GameRuleBooleanName = (typeof GAME_RULE_BOOLEAN_NAMES)[number]

export const GAME_RULE_INTEGER_NAMES = [
  'randomTickSpeed',
  'maxEntityCramming',
  'playersSleepingPercentage',
  'spawnRadius',
] as const

export type GameRuleIntegerName = (typeof GAME_RULE_INTEGER_NAMES)[number]

export type GameRules = Readonly<{
  doDaylightCycle: boolean
  doWeatherCycle: boolean
  doMobSpawning: boolean
  mobGriefing: boolean
  keepInventory: boolean
  doFireTick: boolean
  doInsomnia: boolean
  naturalRegeneration: boolean
  doImmediateRespawn: boolean
  fallDamage: boolean
  fireDamage: boolean
  drowningDamage: boolean
  freezeDamage: boolean
  randomTickSpeed: number
  maxEntityCramming: number
  playersSleepingPercentage: number
  spawnRadius: number
}>

export const RANDOM_TICK_SPEED_MIN = 0
export const RANDOM_TICK_SPEED_MAX = 4096
export const MAX_ENTITY_CRAMMING_MIN = 0
export const MAX_ENTITY_CRAMMING_MAX = 4096
export const PLAYERS_SLEEPING_PERCENTAGE_MIN = 0
export const PLAYERS_SLEEPING_PERCENTAGE_MAX = 100
export const SPAWN_RADIUS_MIN = 0
export const SPAWN_RADIUS_MAX = 128

export const DEFAULT_GAME_RULES: GameRules = {
  doDaylightCycle: true,
  doWeatherCycle: true,
  doMobSpawning: true,
  mobGriefing: true,
  keepInventory: false,
  doFireTick: true,
  doInsomnia: true,
  naturalRegeneration: true,
  doImmediateRespawn: false,
  fallDamage: true,
  fireDamage: true,
  drowningDamage: true,
  freezeDamage: true,
  randomTickSpeed: 3,
  maxEntityCramming: 24,
  playersSleepingPercentage: 100,
  spawnRadius: 10,
}
