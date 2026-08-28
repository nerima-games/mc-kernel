import { Bounciness, EntityPhysicsModifier, EntityVisibilityDistance, KnockbackResistance } from './quantities.js'
import type { EntityAttributeOptions, EntityAttributes } from './entity-attributes-data.js'

type RecordValue = Record<string, unknown>

const isRecord = (value: unknown): value is RecordValue => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

const ENTITY_ATTRIBUTE_KEYS = [
  'bounciness',
  'frictionModifier',
  'airDragModifier',
  'nameTagDistance',
  'belowNameDistance',
  'knockbackResistance',
] as const

const isEntityAttributeKey = (value: string): value is (typeof ENTITY_ATTRIBUTE_KEYS)[number] =>
  ENTITY_ATTRIBUTE_KEYS.some((key) => key === value)

const isOptionalNumber = (
  value: RecordValue,
  key: (typeof ENTITY_ATTRIBUTE_KEYS)[number],
  predicate: (candidate: number) => boolean,
): boolean => {
  if (!Object.hasOwn(value, key)) {
    return true
  }
  const candidate = value[key]
  return typeof candidate === 'number' && predicate(candidate)
}

const hasOnlyEntityAttributeKeys = (value: RecordValue): boolean =>
  Object.keys(value).every((key) => isEntityAttributeKey(key))

export const isEntityAttributeOptions = (value: unknown): value is EntityAttributeOptions => {
  if (!isRecord(value) || !hasOnlyEntityAttributeKeys(value)) {
    return false
  }
  return (
    isOptionalNumber(value, 'bounciness', (candidate) => Bounciness.is(candidate)) &&
    isOptionalNumber(value, 'frictionModifier', (candidate) => EntityPhysicsModifier.is(candidate)) &&
    isOptionalNumber(value, 'airDragModifier', (candidate) => EntityPhysicsModifier.is(candidate)) &&
    isOptionalNumber(value, 'nameTagDistance', (candidate) => EntityVisibilityDistance.is(candidate)) &&
    isOptionalNumber(value, 'belowNameDistance', (candidate) => EntityVisibilityDistance.is(candidate)) &&
    isOptionalNumber(value, 'knockbackResistance', (candidate) => KnockbackResistance.is(candidate))
  )
}

export const isEntityAttributes = (value: unknown): value is EntityAttributes => {
  if (!isRecord(value) || Object.keys(value).length !== ENTITY_ATTRIBUTE_KEYS.length) {
    return false
  }
  return (
    ENTITY_ATTRIBUTE_KEYS.every((key) => Object.hasOwn(value, key)) &&
    typeof value['bounciness'] === 'number' &&
    Bounciness.is(value['bounciness']) &&
    typeof value['frictionModifier'] === 'number' &&
    EntityPhysicsModifier.is(value['frictionModifier']) &&
    typeof value['airDragModifier'] === 'number' &&
    EntityPhysicsModifier.is(value['airDragModifier']) &&
    typeof value['nameTagDistance'] === 'number' &&
    EntityVisibilityDistance.is(value['nameTagDistance']) &&
    typeof value['belowNameDistance'] === 'number' &&
    EntityVisibilityDistance.is(value['belowNameDistance']) &&
    typeof value['knockbackResistance'] === 'number' &&
    KnockbackResistance.is(value['knockbackResistance'])
  )
}
