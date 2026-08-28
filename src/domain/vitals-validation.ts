import {
  DEFAULT_MAX_HEALTH_POINTS,
  DEFAULT_MAX_HUNGER_POINTS,
  EXHAUSTION_PER_POINT,
  FOOD_TICK_SECS,
  type Vitals,
} from './vitals-model.js'
import { clamp, settle } from './vitals-number.js'

type UnknownRecord = Readonly<Record<string, unknown>>

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const numberAt = (record: UnknownRecord, key: string): number => {
  const value = record[key]
  return typeof value === 'number' ? value : Number.NaN
}

const causeAt = (
  record: UnknownRecord,
): string | undefined => {
  const value = record['lastDamageCause']
  return typeof value === 'string' ? value : undefined
}

const isValidHealth = (vitals: UnknownRecord): boolean => {
  const maxHealthPoints = numberAt(vitals, 'maxHealthPoints')
  const healthPoints = numberAt(vitals, 'healthPoints')
  return (
    Number.isFinite(maxHealthPoints) &&
    maxHealthPoints > 0 &&
    Number.isFinite(healthPoints) &&
    healthPoints >= 0 &&
    healthPoints <= maxHealthPoints
  )
}

const isValidHungerAndSaturation = (vitals: UnknownRecord): boolean => {
  const maxHungerPoints = numberAt(vitals, 'maxHungerPoints')
  const hungerPoints = numberAt(vitals, 'hungerPoints')
  const saturation = numberAt(vitals, 'saturation')
  return (
    Number.isFinite(maxHungerPoints) &&
    maxHungerPoints >= 0 &&
    Number.isFinite(hungerPoints) &&
    hungerPoints >= 0 &&
    hungerPoints <= maxHungerPoints &&
    Number.isFinite(saturation) &&
    saturation >= 0 &&
    saturation <= hungerPoints
  )
}

const isValidExhaustionAndFoodTimer = (vitals: UnknownRecord): boolean => {
  const exhaustion = numberAt(vitals, 'exhaustion')
  const foodTimerSecs = numberAt(vitals, 'foodTimerSecs')
  return (
    Number.isFinite(exhaustion) &&
    exhaustion >= 0 &&
    exhaustion < EXHAUSTION_PER_POINT &&
    Number.isFinite(foodTimerSecs) &&
    foodTimerSecs >= 0 &&
    foodTimerSecs < FOOD_TICK_SECS
  )
}

const isValidExperience = (vitals: UnknownRecord): boolean => {
  const totalExperience = numberAt(vitals, 'totalExperience')
  return Number.isFinite(totalExperience) && totalExperience >= 0
}

export const isValidVitals = (value: unknown): value is Vitals => {
  if (!isRecord(value)) return false
  return (
    isValidHealth(value) &&
    isValidHungerAndSaturation(value) &&
    isValidExhaustionAndFoodTimer(value) &&
    isValidExperience(value) &&
    (value['lastDamageCause'] === undefined ||
      typeof value['lastDamageCause'] === 'string')
  )
}

export const normaliseVitals = (value: unknown): Vitals => {
  const input = isRecord(value) ? value : {}
  const rawMaxHealthPoints = numberAt(input, 'maxHealthPoints')
  const rawMaxHungerPoints = numberAt(input, 'maxHungerPoints')
  const maxHealthPoints = Number.isFinite(rawMaxHealthPoints)
    ? Math.max(1, rawMaxHealthPoints)
    : DEFAULT_MAX_HEALTH_POINTS
  const maxHungerPoints = Number.isFinite(rawMaxHungerPoints)
    ? Math.max(0, rawMaxHungerPoints)
    : DEFAULT_MAX_HUNGER_POINTS
  const hungerPoints = clamp(
    numberAt(input, 'hungerPoints'),
    0,
    maxHungerPoints,
  )
  const totalExperience = numberAt(input, 'totalExperience')

  return {
    healthPoints: clamp(numberAt(input, 'healthPoints'), 0, maxHealthPoints),
    maxHealthPoints,
    hungerPoints,
    maxHungerPoints,
    saturation: clamp(numberAt(input, 'saturation'), 0, hungerPoints),
    exhaustion: settle(numberAt(input, 'exhaustion'), EXHAUSTION_PER_POINT),
    foodTimerSecs: settle(numberAt(input, 'foodTimerSecs'), FOOD_TICK_SECS),
    totalExperience: Number.isFinite(totalExperience)
      ? Math.max(0, totalExperience)
      : 0,
    lastDamageCause: causeAt(input),
  }
}
