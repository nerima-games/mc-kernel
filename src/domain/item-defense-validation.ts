import { ResourceLocation } from './identifiers.js'
import type {
  BlocksAttacksComponent,
  DamageReductionRule,
  DamageResistantComponent,
  ItemDamageRule,
} from './item-defense-data.js'
import { isResourceLocationProvider } from './item-component-values-validation.js'
import {
  BlockingDelaySeconds,
  DamageReductionBase,
  DamageReductionFactor,
  DisableCooldownScale,
  HorizontalBlockingAngle,
  ItemDamageBase,
  ItemDamageFactor,
  ItemDamageThreshold,
} from './quantities.js'

type RecordValue = Record<string, unknown>

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const hasExactKeys = (value: RecordValue, keys: ReadonlyArray<string>): boolean => {
  const actualKeys = Object.keys(value)
  return actualKeys.length === keys.length && keys.every((key) => Object.hasOwn(value, key))
}

const isOptionalResourceLocationProvider = (value: unknown): boolean =>
  value === undefined || isResourceLocationProvider(value)

const isOptionalResourceLocation = (value: unknown): boolean =>
  value === undefined || (typeof value === 'string' && ResourceLocation.is(value))

export const isDamageResistantComponent = (value: unknown): value is DamageResistantComponent =>
  isRecord(value) &&
  hasExactKeys(value, ['types']) &&
  isResourceLocationProvider(value['types'])

export const isDamageReductionRule = (value: unknown): value is DamageReductionRule => {
  if (!isRecord(value) || !hasExactKeys(value, ['type', 'base', 'factor', 'horizontalBlockingAngle'])) {
    return false
  }
  return (
    isOptionalResourceLocationProvider(value['type']) &&
    typeof value['base'] === 'number' &&
    DamageReductionBase.is(value['base']) &&
    typeof value['factor'] === 'number' &&
    DamageReductionFactor.is(value['factor']) &&
    typeof value['horizontalBlockingAngle'] === 'number' &&
    HorizontalBlockingAngle.is(value['horizontalBlockingAngle'])
  )
}

export const isItemDamageRule = (value: unknown): value is ItemDamageRule => {
  if (!isRecord(value) || !hasExactKeys(value, ['threshold', 'base', 'factor'])) {
    return false
  }
  return (
    typeof value['threshold'] === 'number' &&
    ItemDamageThreshold.is(value['threshold']) &&
    typeof value['base'] === 'number' &&
    ItemDamageBase.is(value['base']) &&
    typeof value['factor'] === 'number' &&
    ItemDamageFactor.is(value['factor'])
  )
}

export const isBlocksAttacksComponent = (value: unknown): value is BlocksAttacksComponent => {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      'blockDelaySeconds',
      'disableCooldownScale',
      'damageReductions',
      'itemDamage',
      'blockSound',
      'disabledSound',
      'bypassedBy',
    ])
  ) {
    return false
  }
  return (
    typeof value['blockDelaySeconds'] === 'number' &&
    BlockingDelaySeconds.is(value['blockDelaySeconds']) &&
    typeof value['disableCooldownScale'] === 'number' &&
    DisableCooldownScale.is(value['disableCooldownScale']) &&
    Array.isArray(value['damageReductions']) &&
    value['damageReductions'].every((rule: unknown) => isDamageReductionRule(rule)) &&
    (value['itemDamage'] === undefined || isItemDamageRule(value['itemDamage'])) &&
    isOptionalResourceLocation(value['blockSound']) &&
    isOptionalResourceLocation(value['disabledSound']) &&
    isOptionalResourceLocationProvider(value['bypassedBy'])
  )
}
