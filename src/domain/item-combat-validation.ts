import { ResourceLocation } from './identifiers.js'
import {
  AttackCharge,
  AttackHitboxMargin,
  AttackRangeDistance,
  MobAttackRangeFactor,
  SwingAnimationDuration,
  UseSpeedMultiplier,
} from './quantities.js'
import {
  SWING_ANIMATION_TYPES,
  type AttackRangeComponent,
  type DamageTypeComponent,
  type MinimumAttackChargeComponent,
  type SwingAnimationComponent,
  type UseEffectsComponent,
} from './item-combat-data.js'

type RecordValue = Record<string, unknown>

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const hasExactKeys = (value: RecordValue, keys: ReadonlyArray<string>): boolean => {
  const actualKeys = Object.keys(value)
  return actualKeys.length === keys.length && keys.every((key) => Object.hasOwn(value, key))
}

const SWING_ANIMATION_TYPE_SET: ReadonlySet<string> = new Set(SWING_ANIMATION_TYPES)

export const isUseEffectsComponent = (value: unknown): value is UseEffectsComponent => {
  if (!isRecord(value) || !hasExactKeys(value, ['canSprint', 'speedMultiplier'])) {
    return false
  }
  return (
    typeof value['canSprint'] === 'boolean' &&
    typeof value['speedMultiplier'] === 'number' &&
    UseSpeedMultiplier.is(value['speedMultiplier'])
  )
}

export const isMinimumAttackChargeComponent = (
  value: unknown,
): value is MinimumAttackChargeComponent =>
  typeof value === 'number' && AttackCharge.is(value)

export const isDamageTypeComponent = (value: unknown): value is DamageTypeComponent =>
  typeof value === 'string' && ResourceLocation.is(value)

export const isSwingAnimationComponent = (value: unknown): value is SwingAnimationComponent => {
  if (!isRecord(value) || !hasExactKeys(value, ['type', 'duration'])) {
    return false
  }
  return (
    typeof value['type'] === 'string' &&
    SWING_ANIMATION_TYPE_SET.has(value['type']) &&
    typeof value['duration'] === 'number' &&
    SwingAnimationDuration.is(value['duration'])
  )
}

export const isAttackRangeComponent = (value: unknown): value is AttackRangeComponent => {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      'minReach',
      'maxReach',
      'minCreativeReach',
      'maxCreativeReach',
      'hitboxMargin',
      'mobFactor',
    ])
  ) {
    return false
  }
  return (
    typeof value['minReach'] === 'number' &&
    AttackRangeDistance.is(value['minReach']) &&
    typeof value['maxReach'] === 'number' &&
    AttackRangeDistance.is(value['maxReach']) &&
    typeof value['minCreativeReach'] === 'number' &&
    AttackRangeDistance.is(value['minCreativeReach']) &&
    typeof value['maxCreativeReach'] === 'number' &&
    AttackRangeDistance.is(value['maxCreativeReach']) &&
    typeof value['hitboxMargin'] === 'number' &&
    AttackHitboxMargin.is(value['hitboxMargin']) &&
    typeof value['mobFactor'] === 'number' &&
    MobAttackRangeFactor.is(value['mobFactor'])
  )
}
