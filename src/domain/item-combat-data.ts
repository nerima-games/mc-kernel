/** Portable data contracts for item use and attack components. */
import type { ResourceLocation } from './identifiers.js'
import type {
  AttackCharge,
  AttackHitboxMargin,
  AttackRangeDistance,
  MobAttackRangeFactor,
  SwingAnimationDuration,
  UseSpeedMultiplier,
} from './quantities.js'

export type UseEffectsComponent = Readonly<{
  readonly canSprint: boolean
  readonly speedMultiplier: UseSpeedMultiplier
}>

export type MinimumAttackChargeComponent = AttackCharge

export type DamageTypeComponent = ResourceLocation

export const SWING_ANIMATION_TYPES = ['none', 'whack', 'stab'] as const

export type SwingAnimationType = (typeof SWING_ANIMATION_TYPES)[number]

export type SwingAnimationComponent = Readonly<{
  readonly type: SwingAnimationType
  readonly duration: SwingAnimationDuration
}>

export type AttackRangeComponent = Readonly<{
  readonly minReach: AttackRangeDistance
  readonly maxReach: AttackRangeDistance
  readonly minCreativeReach: AttackRangeDistance
  readonly maxCreativeReach: AttackRangeDistance
  readonly hitboxMargin: AttackHitboxMargin
  readonly mobFactor: MobAttackRangeFactor
}>
