/** Constructors and guards for item use and attack components. */
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
  type SwingAnimationType,
  type UseEffectsComponent,
} from './item-combat-data.js'

export {
  isAttackRangeComponent,
  isDamageTypeComponent,
  isMinimumAttackChargeComponent,
  isSwingAnimationComponent,
  isUseEffectsComponent,
} from './item-combat-validation.js'
export { SWING_ANIMATION_TYPES }
export type {
  AttackRangeComponent,
  DamageTypeComponent,
  MinimumAttackChargeComponent,
  SwingAnimationComponent,
  SwingAnimationType,
  UseEffectsComponent,
} from './item-combat-data.js'

export type UseEffectsOptions = Readonly<{
  readonly canSprint?: boolean
  readonly speedMultiplier?: number
}>

export type SwingAnimationOptions = Readonly<{
  readonly type?: SwingAnimationType
  readonly duration?: number
}>

export type AttackRangeOptions = Readonly<{
  readonly minReach?: number
  readonly maxReach?: number
  readonly minCreativeReach?: number
  readonly maxCreativeReach?: number
  readonly hitboxMargin?: number
  readonly mobFactor?: number
}>

const validateOptionsObject = (value: unknown, name: string): void => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name} must be a non-null object`)
  }
}

const validateUseEffectsOptions = (options: UseEffectsOptions): void => {
  validateOptionsObject(options, 'Use effects options')
  if (options.canSprint !== undefined && typeof options.canSprint !== 'boolean') {
    throw new TypeError('canSprint must be a boolean')
  }
  if (options.speedMultiplier !== undefined && !UseSpeedMultiplier.is(options.speedMultiplier)) {
    throw new RangeError('speedMultiplier must be a finite number in [0, 1]')
  }
}

const validateMinimumAttackCharge = (value: number): void => {
  if (!AttackCharge.is(value)) {
    throw new RangeError('minimumAttackCharge must be a finite number in [0, 1]')
  }
}

const validateDamageType = (value: string): void => {
  if (typeof value !== 'string' || !ResourceLocation.is(value)) {
    throw new TypeError(`damageType must be a valid resource location: ${value}`)
  }
}

const validateSwingAnimationOptions = (options: SwingAnimationOptions): void => {
  validateOptionsObject(options, 'Swing animation options')
  if (options.type !== undefined && !SWING_ANIMATION_TYPES.includes(options.type)) {
    throw new TypeError(`Unknown swing animation type: ${String(options.type)}`)
  }
  if (options.duration !== undefined && !SwingAnimationDuration.is(options.duration)) {
    throw new RangeError('duration must be a non-negative safe integer')
  }
}

const validateAttackRangeOptions = (options: AttackRangeOptions): void => {
  validateOptionsObject(options, 'Attack range options')
  if (options.minReach !== undefined && !AttackRangeDistance.is(options.minReach)) {
    throw new RangeError('minReach must be a finite number in [0, 64]')
  }
  if (options.maxReach !== undefined && !AttackRangeDistance.is(options.maxReach)) {
    throw new RangeError('maxReach must be a finite number in [0, 64]')
  }
  if (options.minCreativeReach !== undefined && !AttackRangeDistance.is(options.minCreativeReach)) {
    throw new RangeError('minCreativeReach must be a finite number in [0, 64]')
  }
  if (options.maxCreativeReach !== undefined && !AttackRangeDistance.is(options.maxCreativeReach)) {
    throw new RangeError('maxCreativeReach must be a finite number in [0, 64]')
  }
  if (options.hitboxMargin !== undefined && !AttackHitboxMargin.is(options.hitboxMargin)) {
    throw new RangeError('hitboxMargin must be a finite number in [0, 1]')
  }
  if (options.mobFactor !== undefined && !MobAttackRangeFactor.is(options.mobFactor)) {
    throw new RangeError('mobFactor must be a finite number in [0, 2]')
  }
}

export const useEffectsComponent = (options: UseEffectsOptions = {}): UseEffectsComponent => {
  validateUseEffectsOptions(options)
  return Object.freeze({
    canSprint: options.canSprint ?? false,
    speedMultiplier: UseSpeedMultiplier(options.speedMultiplier ?? 0.2),
  })
}

export const minimumAttackChargeComponent = (value: number): MinimumAttackChargeComponent => {
  validateMinimumAttackCharge(value)
  return AttackCharge(value)
}

export const damageTypeComponent = (value: string): DamageTypeComponent => {
  validateDamageType(value)
  return ResourceLocation(value)
}

export const swingAnimationComponent = (
  options: SwingAnimationOptions = {},
): SwingAnimationComponent => {
  validateSwingAnimationOptions(options)
  return Object.freeze({
    type: options.type ?? 'whack',
    duration: SwingAnimationDuration(options.duration ?? 6),
  })
}

export const attackRangeComponent = (options: AttackRangeOptions = {}): AttackRangeComponent => {
  validateAttackRangeOptions(options)
  return Object.freeze({
    minReach: AttackRangeDistance(options.minReach ?? 0),
    maxReach: AttackRangeDistance(options.maxReach ?? 3),
    minCreativeReach: AttackRangeDistance(options.minCreativeReach ?? 0),
    maxCreativeReach: AttackRangeDistance(options.maxCreativeReach ?? 5),
    hitboxMargin: AttackHitboxMargin(options.hitboxMargin ?? 0.3),
    mobFactor: MobAttackRangeFactor(options.mobFactor ?? 1),
  })
}
