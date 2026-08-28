import { ResourceLocation, TagLocation } from './identifiers.js'
import {
  SULFUR_CUBE_ATTRIBUTE_MODIFIER_OPERATIONS,
  type SulfurCubeArchetype,
  type SulfurCubeArchetypeOptions,
  type SulfurCubeAttributeModifier,
  type SulfurCubeAttributeModifierOptions,
  type SulfurCubeContactDamage,
  type SulfurCubeContactDamageOptions,
  type SulfurCubeExplosion,
  type SulfurCubeExplosionOptions,
  type SulfurCubeKnockbackModifiers,
  type SulfurCubeKnockbackModifiersOptions,
  type SulfurCubeSoundSettings,
  type SulfurCubeSoundSettingsOptions,
} from './sulfur-cube-data.js'
import { AttributeModifierAmount } from './quantities.js'

type RecordValue = Record<string, unknown>

const isRecord = (value: unknown): value is RecordValue => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

const hasOnlyKeys = (
  value: RecordValue,
  requiredKeys: ReadonlyArray<string>,
  optionalKeys: ReadonlyArray<string> = [],
): boolean => {
  const keys = Object.keys(value)
  return (
    requiredKeys.every((key) => Object.hasOwn(value, key)) &&
    keys.every((key) => requiredKeys.includes(key) || optionalKeys.includes(key))
  )
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isPositiveSafeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0

const isNonNegativeSafeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

const isResourceLocation = (value: unknown): value is string =>
  typeof value === 'string' && ResourceLocation.is(value)

const isNamespacedResourceLocation = (value: unknown): boolean =>
  isResourceLocation(value) && value.includes(':')

const SULFUR_CUBE_ATTRIBUTE_MODIFIER_OPERATION_SET = new Set<string>(
  SULFUR_CUBE_ATTRIBUTE_MODIFIER_OPERATIONS,
)

const isSulfurCubeAttributeModifierOperation = (value: unknown): boolean =>
  typeof value === 'string' && SULFUR_CUBE_ATTRIBUTE_MODIFIER_OPERATION_SET.has(value)

const isExplosionOptions = (value: unknown): value is SulfurCubeExplosionOptions =>
  isRecord(value) &&
  hasOnlyKeys(value, ['fuse', 'power', 'causesFire']) &&
  isPositiveSafeInteger(value['fuse']) &&
  isNonNegativeSafeInteger(value['power']) &&
  typeof value['causesFire'] === 'boolean'

const isContactDamageOptions = (value: unknown): value is SulfurCubeContactDamageOptions =>
  isRecord(value) &&
  hasOnlyKeys(value, ['amount', 'damageType', 'attributeToSource']) &&
  isFiniteNumber(value['amount']) &&
  value['amount'] >= 0 &&
  isResourceLocation(value['damageType']) &&
  typeof value['attributeToSource'] === 'boolean'

const isAttributeModifierOptions = (
  value: unknown,
): value is SulfurCubeAttributeModifierOptions =>
  isRecord(value) &&
  hasOnlyKeys(value, ['attribute', 'id', 'amount', 'operation']) &&
  isNamespacedResourceLocation(value['attribute']) &&
  isNamespacedResourceLocation(value['id']) &&
  isFiniteNumber(value['amount']) &&
  AttributeModifierAmount.is(value['amount']) &&
  isSulfurCubeAttributeModifierOperation(value['operation'])

const isKnockbackModifiersOptions = (
  value: unknown,
): value is SulfurCubeKnockbackModifiersOptions =>
  isRecord(value) &&
  hasOnlyKeys(value, ['horizontalPower', 'verticalPower']) &&
  isFiniteNumber(value['horizontalPower']) &&
  isFiniteNumber(value['verticalPower'])

const isSoundSettingsOptions = (value: unknown): value is SulfurCubeSoundSettingsOptions =>
  isRecord(value) &&
  hasOnlyKeys(value, [
    'hitSound',
    'pushSound',
    'pushSoundImpulseThreshold',
    'pushSoundCooldown',
  ]) &&
  isResourceLocation(value['hitSound']) &&
  isResourceLocation(value['pushSound']) &&
  isFiniteNumber(value['pushSoundImpulseThreshold']) &&
  isFiniteNumber(value['pushSoundCooldown'])

const isOptionalExplosion = (value: RecordValue): boolean =>
  !Object.hasOwn(value, 'explosion') ||
  value['explosion'] === undefined ||
  isExplosionOptions(value['explosion'])

const isOptionalContactDamage = (value: RecordValue): boolean =>
  !Object.hasOwn(value, 'contactDamage') ||
  value['contactDamage'] === undefined ||
  isContactDamageOptions(value['contactDamage'])

export const isSulfurCubeArchetypeOptions = (
  value: unknown,
): value is SulfurCubeArchetypeOptions => {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      'items',
      'buoyant',
      'attributeModifiers',
      'knockbackModifiers',
      'soundSettings',
    ], ['explosion', 'contactDamage'])
  ) {
    return false
  }
  return (
    typeof value['items'] === 'string' &&
    TagLocation.is(value['items']) &&
    typeof value['buoyant'] === 'boolean' &&
    isOptionalExplosion(value) &&
    isOptionalContactDamage(value) &&
    Array.isArray(value['attributeModifiers']) &&
    value['attributeModifiers'].every((modifier) => isAttributeModifierOptions(modifier)) &&
    isKnockbackModifiersOptions(value['knockbackModifiers']) &&
    isSoundSettingsOptions(value['soundSettings'])
  )
}

const isExplosion = (value: unknown): value is SulfurCubeExplosion =>
  isExplosionOptions(value)

const isContactDamage = (value: unknown): value is SulfurCubeContactDamage =>
  isRecord(value) &&
  hasOnlyKeys(value, ['amount', 'damageType', 'attributeToSource']) &&
  isFiniteNumber(value['amount']) &&
  value['amount'] >= 0 &&
  typeof value['damageType'] === 'string' &&
  ResourceLocation.is(value['damageType']) &&
  typeof value['attributeToSource'] === 'boolean'

const isAttributeModifier = (value: unknown): value is SulfurCubeAttributeModifier =>
  isRecord(value) &&
  hasOnlyKeys(value, ['attribute', 'id', 'amount', 'operation']) &&
  typeof value['attribute'] === 'string' &&
  ResourceLocation.is(value['attribute']) &&
  typeof value['id'] === 'string' &&
  ResourceLocation.is(value['id']) &&
  value['id'].includes(':') &&
  typeof value['amount'] === 'number' &&
  AttributeModifierAmount.is(value['amount']) &&
  isSulfurCubeAttributeModifierOperation(value['operation'])

const isKnockbackModifiers = (value: unknown): value is SulfurCubeKnockbackModifiers =>
  isKnockbackModifiersOptions(value)

const isSoundSettings = (value: unknown): value is SulfurCubeSoundSettings =>
  isRecord(value) &&
  hasOnlyKeys(value, [
    'hitSound',
    'pushSound',
    'pushSoundImpulseThreshold',
    'pushSoundCooldown',
  ]) &&
  typeof value['hitSound'] === 'string' &&
  ResourceLocation.is(value['hitSound']) &&
  typeof value['pushSound'] === 'string' &&
  ResourceLocation.is(value['pushSound']) &&
  isFiniteNumber(value['pushSoundImpulseThreshold']) &&
  isFiniteNumber(value['pushSoundCooldown'])

export const isSulfurCubeArchetype = (value: unknown): value is SulfurCubeArchetype => {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      'items',
      'buoyant',
      'attributeModifiers',
      'knockbackModifiers',
      'soundSettings',
    ], ['explosion', 'contactDamage'])
  ) {
    return false
  }
  return (
    typeof value['items'] === 'string' &&
    TagLocation.is(value['items']) &&
    typeof value['buoyant'] === 'boolean' &&
    (!Object.hasOwn(value, 'explosion') ||
      value['explosion'] === undefined ||
      isExplosion(value['explosion'])) &&
    (!Object.hasOwn(value, 'contactDamage') ||
      value['contactDamage'] === undefined ||
      isContactDamage(value['contactDamage'])) &&
    Array.isArray(value['attributeModifiers']) &&
    value['attributeModifiers'].every((modifier) => isAttributeModifier(modifier)) &&
    isKnockbackModifiers(value['knockbackModifiers']) &&
    isSoundSettings(value['soundSettings'])
  )
}
