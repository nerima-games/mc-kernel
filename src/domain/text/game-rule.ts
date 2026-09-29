/**
 * Public game-rule boundary: validation, normalisation and pure update.
 *
 * `settings.ts` owns client-local presentation and input preference —
 * render distance, FOV, volume, key bindings; screen, renderer preset,
 * input application and persistence stay with the upper layer
 * (docs/responsibility.md, "設定値" row). `game-rule` owns
 * world-simulation-authoritative state shared by every player in the
 * world — structurally closer to `weather.ts` and `time-of-day.ts` than to
 * a client config record — so the two must never be merged.
 */
import {
  DEFAULT_GAME_RULES,
  GAME_RULE_BOOLEAN_NAMES,
  GAME_RULE_INTEGER_NAMES,
  MAX_ENTITY_CRAMMING_MAX,
  MAX_ENTITY_CRAMMING_MIN,
  PLAYERS_SLEEPING_PERCENTAGE_MAX,
  PLAYERS_SLEEPING_PERCENTAGE_MIN,
  RANDOM_TICK_SPEED_MAX,
  RANDOM_TICK_SPEED_MIN,
  SPAWN_RADIUS_MAX,
  SPAWN_RADIUS_MIN,
} from './game-rule-data.js'
import type { GameRuleIntegerName, GameRules } from './game-rule-data.js'

export {
  DEFAULT_GAME_RULES,
  GAME_RULE_BOOLEAN_NAMES,
  GAME_RULE_INTEGER_NAMES,
  MAX_ENTITY_CRAMMING_MAX,
  MAX_ENTITY_CRAMMING_MIN,
  PLAYERS_SLEEPING_PERCENTAGE_MAX,
  PLAYERS_SLEEPING_PERCENTAGE_MIN,
  RANDOM_TICK_SPEED_MAX,
  RANDOM_TICK_SPEED_MIN,
  SPAWN_RADIUS_MAX,
  SPAWN_RADIUS_MIN,
} from './game-rule-data.js'
export type { GameRuleBooleanName, GameRuleIntegerName, GameRules } from './game-rule-data.js'

type UnknownRecord = Readonly<Record<string, unknown>>

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const INTEGER_RULE_RANGES: Readonly<Record<GameRuleIntegerName, Readonly<{ minimum: number; maximum: number }>>> = {
  randomTickSpeed: { minimum: RANDOM_TICK_SPEED_MIN, maximum: RANDOM_TICK_SPEED_MAX },
  maxEntityCramming: { minimum: MAX_ENTITY_CRAMMING_MIN, maximum: MAX_ENTITY_CRAMMING_MAX },
  playersSleepingPercentage: {
    minimum: PLAYERS_SLEEPING_PERCENTAGE_MIN,
    maximum: PLAYERS_SLEEPING_PERCENTAGE_MAX,
  },
  spawnRadius: { minimum: SPAWN_RADIUS_MIN, maximum: SPAWN_RADIUS_MAX },
}

const normaliseBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback

// Diverges from `settings.ts`'s `clampWithDefault` on purpose: any
// non-finite value (`NaN` or ±Infinity) falls back to the rule's default
// instead of being clamped to a boundary. `Infinity` in a save file is
// corruption, not a request for the maximum, and this state is
// world-authoritative and shared, unlike a single client's input.
const normaliseInteger = (value: unknown, name: GameRuleIntegerName): number => {
  const { minimum, maximum } = INTEGER_RULE_RANGES[name]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_GAME_RULES[name]
  }
  return Math.min(maximum, Math.max(minimum, Math.trunc(value)))
}

export const normaliseGameRules = (rules: unknown): GameRules => {
  const source: UnknownRecord = isRecord(rules) ? rules : {}
  return {
    doDaylightCycle: normaliseBoolean(source['doDaylightCycle'], DEFAULT_GAME_RULES.doDaylightCycle),
    doWeatherCycle: normaliseBoolean(source['doWeatherCycle'], DEFAULT_GAME_RULES.doWeatherCycle),
    doMobSpawning: normaliseBoolean(source['doMobSpawning'], DEFAULT_GAME_RULES.doMobSpawning),
    mobGriefing: normaliseBoolean(source['mobGriefing'], DEFAULT_GAME_RULES.mobGriefing),
    keepInventory: normaliseBoolean(source['keepInventory'], DEFAULT_GAME_RULES.keepInventory),
    doFireTick: normaliseBoolean(source['doFireTick'], DEFAULT_GAME_RULES.doFireTick),
    doInsomnia: normaliseBoolean(source['doInsomnia'], DEFAULT_GAME_RULES.doInsomnia),
    naturalRegeneration: normaliseBoolean(source['naturalRegeneration'], DEFAULT_GAME_RULES.naturalRegeneration),
    doImmediateRespawn: normaliseBoolean(source['doImmediateRespawn'], DEFAULT_GAME_RULES.doImmediateRespawn),
    fallDamage: normaliseBoolean(source['fallDamage'], DEFAULT_GAME_RULES.fallDamage),
    fireDamage: normaliseBoolean(source['fireDamage'], DEFAULT_GAME_RULES.fireDamage),
    drowningDamage: normaliseBoolean(source['drowningDamage'], DEFAULT_GAME_RULES.drowningDamage),
    freezeDamage: normaliseBoolean(source['freezeDamage'], DEFAULT_GAME_RULES.freezeDamage),
    randomTickSpeed: normaliseInteger(source['randomTickSpeed'], 'randomTickSpeed'),
    maxEntityCramming: normaliseInteger(source['maxEntityCramming'], 'maxEntityCramming'),
    playersSleepingPercentage: normaliseInteger(
      source['playersSleepingPercentage'],
      'playersSleepingPercentage',
    ),
    spawnRadius: normaliseInteger(source['spawnRadius'], 'spawnRadius'),
  }
}

export const applyGameRules = (current: GameRules, patch: Partial<GameRules>): GameRules =>
  normaliseGameRules({ ...current, ...patch })

const isValidInteger = (value: unknown, minimum: number, maximum: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= maximum

export const isValidGameRules = (rules: unknown): rules is GameRules => {
  if (!isRecord(rules)) {
    return false
  }

  const booleansValid = GAME_RULE_BOOLEAN_NAMES.every((name) => typeof rules[name] === 'boolean')
  const integersValid = GAME_RULE_INTEGER_NAMES.every((name) => {
    const { minimum, maximum } = INTEGER_RULE_RANGES[name]
    return isValidInteger(rules[name], minimum, maximum)
  })

  return booleansValid && integersValid
}
