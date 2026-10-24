import { NamespacedResourceLocation, ResourceLocation, TagLocation } from '../text/identifiers.js'
import type {
  NamespacedResourceLocation as NamespacedResourceLocationValue,
  ResourceLocation as ResourceLocationValue,
} from '../text/identifiers.js'
import { AttributeModifierAmount, PositiveTickCount } from '../time/quantities.js'
import {
  SULFUR_CUBE_ATTRIBUTE_MODIFIER_OPERATIONS,
  SulfurCubeContactDamageAmount,
  SulfurCubeExplosionPower,
  SulfurCubeKnockbackPower,
  SulfurCubePushSoundCooldown,
  SulfurCubePushSoundImpulseThreshold,
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

const isResourceLocation = (value: unknown): value is ResourceLocationValue =>
  typeof value === 'string' && ResourceLocation.is(value)

const isNamespacedResourceLocation = (value: unknown): value is NamespacedResourceLocationValue =>
  typeof value === 'string' && NamespacedResourceLocation.is(value)

const SULFUR_CUBE_ATTRIBUTE_MODIFIER_OPERATION_SET = new Set<string>(
  SULFUR_CUBE_ATTRIBUTE_MODIFIER_OPERATIONS,
)

const isSulfurCubeAttributeModifierOperation = (value: unknown): boolean =>
  typeof value === 'string' && SULFUR_CUBE_ATTRIBUTE_MODIFIER_OPERATION_SET.has(value)

const isExplosionOptions = (value: unknown): value is SulfurCubeExplosionOptions =>
  isRecord(value) &&
  hasOnlyKeys(value, ['fuse', 'power', 'causesFire']) &&
  typeof value['fuse'] === 'number' &&
  PositiveTickCount.is(value['fuse']) &&
  typeof value['power'] === 'number' &&
  SulfurCubeExplosionPower.is(value['power']) &&
  typeof value['causesFire'] === 'boolean'

const isContactDamageOptions = (value: unknown): value is SulfurCubeContactDamageOptions =>
  isRecord(value) &&
  hasOnlyKeys(value, ['amount', 'damageType', 'attributeToSource']) &&
  typeof value['amount'] === 'number' &&
  SulfurCubeContactDamageAmount.is(value['amount']) &&
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
  typeof value['horizontalPower'] === 'number' &&
  SulfurCubeKnockbackPower.is(value['horizontalPower']) &&
  typeof value['verticalPower'] === 'number' &&
  SulfurCubeKnockbackPower.is(value['verticalPower'])

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
  typeof value['pushSoundImpulseThreshold'] === 'number' &&
  SulfurCubePushSoundImpulseThreshold.is(value['pushSoundImpulseThreshold']) &&
  typeof value['pushSoundCooldown'] === 'number' &&
  SulfurCubePushSoundCooldown.is(value['pushSoundCooldown'])

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
  typeof value['amount'] === 'number' &&
  SulfurCubeContactDamageAmount.is(value['amount']) &&
  typeof value['damageType'] === 'string' &&
  ResourceLocation.is(value['damageType']) &&
  typeof value['attributeToSource'] === 'boolean'

const isAttributeModifier = (value: unknown): value is SulfurCubeAttributeModifier =>
  isRecord(value) &&
  hasOnlyKeys(value, ['attribute', 'id', 'amount', 'operation']) &&
  typeof value['attribute'] === 'string' &&
  NamespacedResourceLocation.is(value['attribute']) &&
  typeof value['id'] === 'string' &&
  NamespacedResourceLocation.is(value['id']) &&
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
  typeof value['pushSoundImpulseThreshold'] === 'number' &&
  SulfurCubePushSoundImpulseThreshold.is(value['pushSoundImpulseThreshold']) &&
  typeof value['pushSoundCooldown'] === 'number' &&
  SulfurCubePushSoundCooldown.is(value['pushSoundCooldown'])

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
