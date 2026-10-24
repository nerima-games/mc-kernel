/** Constructors and guards for item use and attack components. */
import { Result } from 'effect'
import { snapshotInputRecord } from '../../input-snapshot.js'
import { ResourceLocation } from '../text/identifiers.js'
import {
  AttackCharge,
  AttackHitboxMargin,
  AttackRangeDistance,
  MobAttackRangeFactor,
  SwingAnimationDuration,
  UseSpeedMultiplier,
} from '../time/quantities.js'
import {
  SWING_ANIMATION_TYPES,
  type AttackRangeComponent,
  type DamageTypeComponent,
  type MinimumAttackChargeComponent,
  type SwingAnimationComponent,
  type SwingAnimationType,
  type UseEffectsComponent,
} from './item-combat-data.js'
import { itemValidationFailure, type ItemValidationFailure } from './item-failure.js'

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
  readonly speedMultiplier?: UseSpeedMultiplier
}>

export type SwingAnimationOptions = Readonly<{
  readonly type?: SwingAnimationType
  readonly duration?: SwingAnimationDuration
}>

export type AttackRangeOptions = Readonly<{
  readonly minReach?: AttackRangeDistance
  readonly maxReach?: AttackRangeDistance
  readonly minCreativeReach?: AttackRangeDistance
  readonly maxCreativeReach?: AttackRangeDistance
  readonly hitboxMargin?: AttackHitboxMargin
  readonly mobFactor?: MobAttackRangeFactor
}>

const failure = (
  field: string,
  message: string,
  reason: ItemValidationFailure['reason'] = 'invalid-value',
  value?: unknown,
): ItemValidationFailure => itemValidationFailure(field, message, reason, value)

const snapshotOptions = <T extends object>(
  value: unknown,
  name: string,
  fields: ReadonlyArray<keyof T>,
): Result.Result<Readonly<Record<string, unknown>>, ItemValidationFailure> => {
  const snapshot = snapshotInputRecord(value, fields.map(String))
  if (Result.isFailure(snapshot)) {
    const invalidType = snapshot.failure.reason === 'invalid-container' || snapshot.failure.reason === 'unsupported-prototype'
    return Result.fail(failure(
      'options',
      invalidType ? `${name} options must be a non-null object` : `Unable to inspect ${name} options`,
      invalidType ? 'invalid-type' : 'hostile-input',
      value,
    ))
  }
  return Result.succeed(snapshot.success)
}

const isSwingAnimationType = (value: unknown): value is SwingAnimationType =>
  typeof value === 'string' && SWING_ANIMATION_TYPES.some((type) => type === value)

export const useEffectsComponent = (
  options: UseEffectsOptions = {},
): Result.Result<UseEffectsComponent, ItemValidationFailure> => Result.flatMap(
  snapshotOptions<UseEffectsOptions>(options, 'Use effects', ['canSprint', 'speedMultiplier']),
  (snapshot) => {
    const canSprint = snapshot['canSprint']
    if (canSprint !== undefined && typeof canSprint !== 'boolean') {
      return Result.fail(failure('canSprint', 'canSprint must be a boolean', 'invalid-type', canSprint))
    }
    const speedMultiplierValue = snapshot['speedMultiplier'] ?? 0.2
    if (typeof speedMultiplierValue !== 'number') {
      return Result.fail(failure('speedMultiplier', 'speedMultiplier must be a finite number in [0, 1]', 'out-of-range', speedMultiplierValue))
    }
    return Result.mapError(
      UseSpeedMultiplier.result(speedMultiplierValue),
      () => failure('speedMultiplier', 'speedMultiplier must be a finite number in [0, 1]', 'out-of-range', speedMultiplierValue),
    ).pipe(Result.map((speedMultiplier) => Object.freeze({ canSprint: canSprint ?? false, speedMultiplier })))
  },
)

export const minimumAttackChargeComponent = (
  value: number,
): Result.Result<MinimumAttackChargeComponent, ItemValidationFailure> =>
  Result.mapError(
    AttackCharge.result(value),
    () => failure('minimumAttackCharge', 'minimumAttackCharge must be a finite number in [0, 1]', 'out-of-range', value),
  )

export const damageTypeComponent = (value: string): Result.Result<DamageTypeComponent, ItemValidationFailure> =>
  typeof value !== 'string'
    ? Result.fail(failure('damageType', `damageType must be a valid resource location: ${value}`, 'invalid-value', value))
    : Result.mapError(
      ResourceLocation.result(value),
      () => failure('damageType', `damageType must be a valid resource location: ${value}`, 'invalid-value', value),
    )

export const swingAnimationComponent = (
  options: SwingAnimationOptions = {},
): Result.Result<SwingAnimationComponent, ItemValidationFailure> => Result.flatMap(
  snapshotOptions<SwingAnimationOptions>(options, 'Swing animation', ['type', 'duration']),
  (snapshot) => {
    const typeValue = snapshot['type']
    if (typeValue !== undefined && !isSwingAnimationType(typeValue)) {
      return Result.fail(failure('type', `Unknown swing animation type: ${String(typeValue)}`, 'invalid-value', typeValue))
    }
    const durationValue = snapshot['duration'] ?? 6
    if (typeof durationValue !== 'number') {
      return Result.fail(failure('duration', 'duration must be a non-negative safe integer', 'out-of-range', durationValue))
    }
    return Result.mapError(
      SwingAnimationDuration.result(durationValue),
      () => failure('duration', 'duration must be a non-negative safe integer', 'out-of-range', durationValue),
    ).pipe(Result.map((duration) => Object.freeze({ type: typeValue ?? 'whack', duration })))
  },
)

export const attackRangeComponent = (
  options: AttackRangeOptions = {},
): Result.Result<AttackRangeComponent, ItemValidationFailure> => Result.flatMap(
  snapshotOptions<AttackRangeOptions>(options, 'Attack range', [
    'minReach', 'maxReach', 'minCreativeReach', 'maxCreativeReach', 'hitboxMargin', 'mobFactor',
  ]),
  (snapshot) => Result.gen(function* () {
    const minReachValue = snapshot['minReach'] ?? 0
    const maxReachValue = snapshot['maxReach'] ?? 3
    const minCreativeReachValue = snapshot['minCreativeReach'] ?? 0
    const maxCreativeReachValue = snapshot['maxCreativeReach'] ?? 5
    const hitboxMarginValue = snapshot['hitboxMargin'] ?? 0.3
    const mobFactorValue = snapshot['mobFactor'] ?? 1
    if (typeof minReachValue !== 'number') return yield* Result.fail(failure('minReach', 'minReach must be a finite number in [0, 64]', 'out-of-range', minReachValue))
    if (typeof maxReachValue !== 'number') return yield* Result.fail(failure('maxReach', 'maxReach must be a finite number in [0, 64]', 'out-of-range', maxReachValue))
    if (typeof minCreativeReachValue !== 'number') return yield* Result.fail(failure('minCreativeReach', 'minCreativeReach must be a finite number in [0, 64]', 'out-of-range', minCreativeReachValue))
    if (typeof maxCreativeReachValue !== 'number') return yield* Result.fail(failure('maxCreativeReach', 'maxCreativeReach must be a finite number in [0, 64]', 'out-of-range', maxCreativeReachValue))
    if (typeof hitboxMarginValue !== 'number') return yield* Result.fail(failure('hitboxMargin', 'hitboxMargin must be a finite number in [0, 1]', 'out-of-range', hitboxMarginValue))
    if (typeof mobFactorValue !== 'number') return yield* Result.fail(failure('mobFactor', 'mobFactor must be a finite number in [0, 2]', 'out-of-range', mobFactorValue))
    const minReach = yield* Result.mapError(AttackRangeDistance.result(minReachValue), () => failure('minReach', 'minReach must be a finite number in [0, 64]', 'out-of-range', minReachValue))
    const maxReach = yield* Result.mapError(AttackRangeDistance.result(maxReachValue), () => failure('maxReach', 'maxReach must be a finite number in [0, 64]', 'out-of-range', maxReachValue))
    const minCreativeReach = yield* Result.mapError(AttackRangeDistance.result(minCreativeReachValue), () => failure('minCreativeReach', 'minCreativeReach must be a finite number in [0, 64]', 'out-of-range', minCreativeReachValue))
    const maxCreativeReach = yield* Result.mapError(AttackRangeDistance.result(maxCreativeReachValue), () => failure('maxCreativeReach', 'maxCreativeReach must be a finite number in [0, 64]', 'out-of-range', maxCreativeReachValue))
    const hitboxMargin = yield* Result.mapError(AttackHitboxMargin.result(hitboxMarginValue), () => failure('hitboxMargin', 'hitboxMargin must be a finite number in [0, 1]', 'out-of-range', hitboxMarginValue))
    const mobFactor = yield* Result.mapError(MobAttackRangeFactor.result(mobFactorValue), () => failure('mobFactor', 'mobFactor must be a finite number in [0, 2]', 'out-of-range', mobFactorValue))
    return Object.freeze({ minReach, maxReach, minCreativeReach, maxCreativeReach, hitboxMargin, mobFactor })
  }),
)
