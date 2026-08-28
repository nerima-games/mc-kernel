import {
  CONSUMABLE_ANIMATIONS,
  type ConsumableApplyEffects,
  type ConsumableClearAllEffects,
  type ConsumableComponent,
  type ConsumableEffect,
  type ConsumablePlaySound,
  type ConsumableRemoveEffects,
  type ConsumableStatusEffect,
  type ConsumableTeleportRandomly,
  type FoodComponent,
  type ItemUseComponents,
  type UseRemainderComponent,
} from './consumable-data.js'
import { ResourceLocation, type ResourceLocation as ResourceLocationValue } from './identifiers.js'
import { isItemType } from './item-type.js'

type RecordValue = Record<string, unknown>

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const hasExactKeys = (value: RecordValue, keys: ReadonlyArray<string>): boolean => {
  const actualKeys = Object.keys(value)
  return actualKeys.length === keys.length && keys.every((key) => Object.hasOwn(value, key))
}

const isFiniteNonNegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

const isResourceLocation = (value: unknown): value is ResourceLocationValue => {
  if (typeof value !== 'string') return false
  try {
    ResourceLocation(value)
    return true
  } catch {
    return false
  }
}

const CONSUMABLE_ANIMATION_SET: ReadonlySet<string> = new Set(CONSUMABLE_ANIMATIONS)

const isConsumableAnimation = (value: unknown): value is ConsumableComponent['animation'] =>
  typeof value === 'string' && CONSUMABLE_ANIMATION_SET.has(value)

const FOOD_COMPONENT_KEYS = ['nutrition', 'saturation', 'canAlwaysEat'] as const

export const isFoodComponent = (value: unknown): value is FoodComponent => {
  if (!isRecord(value) || !hasExactKeys(value, FOOD_COMPONENT_KEYS)) {
    return false
  }
  return (
    isNonNegativeInteger(value['nutrition']) &&
    isFiniteNonNegative(value['saturation']) &&
    typeof value['canAlwaysEat'] === 'boolean'
  )
}

const CONSUMABLE_STATUS_EFFECT_KEYS = ['effectId', 'durationSecs', 'amplifier'] as const

export const isConsumableStatusEffect = (value: unknown): value is ConsumableStatusEffect => {
  if (!isRecord(value) || !hasExactKeys(value, CONSUMABLE_STATUS_EFFECT_KEYS)) {
    return false
  }
  return (
    isResourceLocation(value['effectId']) &&
    typeof value['durationSecs'] === 'number' &&
    Number.isFinite(value['durationSecs']) &&
    value['durationSecs'] > 0 &&
    isNonNegativeInteger(value['amplifier'])
  )
}

const isConsumableApplyEffects = (value: RecordValue): value is ConsumableApplyEffects => {
  if (!hasExactKeys(value, ['type', 'effects', 'probability'])) {
    return false
  }
  const effects = value['effects']
  return (
    value['type'] === 'minecraft:apply_effects' &&
    Array.isArray(effects) &&
    effects.every(isConsumableStatusEffect) &&
    typeof value['probability'] === 'number' &&
    Number.isFinite(value['probability']) &&
    value['probability'] >= 0 &&
    value['probability'] <= 1
  )
}

const isConsumableRemoveEffects = (value: RecordValue): value is ConsumableRemoveEffects => {
  if (!hasExactKeys(value, ['type', 'effects'])) {
    return false
  }
  const effects = value['effects']
  return (
    value['type'] === 'minecraft:remove_effects' &&
    Array.isArray(effects) &&
    effects.every(isResourceLocation)
  )
}

const isConsumableClearAllEffects = (value: RecordValue): value is ConsumableClearAllEffects =>
  hasExactKeys(value, ['type']) && value['type'] === 'minecraft:clear_all_effects'

const isConsumableTeleportRandomly = (value: RecordValue): value is ConsumableTeleportRandomly =>
  hasExactKeys(value, ['type', 'diameter']) &&
  value['type'] === 'minecraft:teleport_randomly' &&
  typeof value['diameter'] === 'number' &&
  Number.isFinite(value['diameter']) &&
  value['diameter'] > 0

const isConsumablePlaySound = (value: RecordValue): value is ConsumablePlaySound =>
  hasExactKeys(value, ['type', 'sound']) &&
  value['type'] === 'minecraft:play_sound' &&
  isResourceLocation(value['sound'])

type ConsumableEffectValidator = (value: RecordValue) => boolean

const CONSUMABLE_EFFECT_VALIDATORS: ReadonlyMap<string, ConsumableEffectValidator> = new Map([
  ['minecraft:apply_effects', (value): boolean => isConsumableApplyEffects(value)],
  ['minecraft:remove_effects', (value): boolean => isConsumableRemoveEffects(value)],
  ['minecraft:clear_all_effects', (value): boolean => isConsumableClearAllEffects(value)],
  ['minecraft:teleport_randomly', (value): boolean => isConsumableTeleportRandomly(value)],
  ['minecraft:play_sound', (value): boolean => isConsumablePlaySound(value)],
])

export const isConsumableEffect = (value: unknown): value is ConsumableEffect => {
  if (!isRecord(value)) {
    return false
  }
  const effectType = value['type']
  const validator =
    typeof effectType === 'string' ? CONSUMABLE_EFFECT_VALIDATORS.get(effectType) : undefined
  return validator === undefined ? false : validator(value)
}

const CONSUMABLE_COMPONENT_KEYS = [
  'consumeSeconds',
  'animation',
  'sound',
  'hasConsumeParticles',
  'onConsumeEffects',
] as const

export const isConsumableComponent = (value: unknown): value is ConsumableComponent => {
  if (!isRecord(value) || !hasExactKeys(value, CONSUMABLE_COMPONENT_KEYS)) {
    return false
  }
  const effects = value['onConsumeEffects']
  return (
    isFiniteNonNegative(value['consumeSeconds']) &&
    isConsumableAnimation(value['animation']) &&
    isResourceLocation(value['sound']) &&
    typeof value['hasConsumeParticles'] === 'boolean' &&
    Array.isArray(effects) &&
    effects.every(isConsumableEffect)
  )
}

export const isUseRemainderComponent = (value: unknown): value is UseRemainderComponent =>
  isRecord(value) &&
  hasExactKeys(value, ['item', 'count']) &&
  isItemType(value['item']) &&
  value['count'] === 1

export const isItemUseComponents = (value: unknown): value is ItemUseComponents =>
  isRecord(value) &&
  hasExactKeys(value, ['food', 'consumable', 'useRemainder']) &&
  isFoodComponent(value['food']) &&
  isConsumableComponent(value['consumable']) &&
  (value['useRemainder'] === undefined || isUseRemainderComponent(value['useRemainder']))
