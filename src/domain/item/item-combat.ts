/** Constructors and guards for item use and attack components. */
import { Result } from 'effect'
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

const validateOptionsObject = (value: unknown, name: string): Result.Result<object, ItemValidationFailure> => {
  if (typeof value !== 'object' || value === null) {
    return Result.fail(failure('options', `${name} must be a non-null object`, 'invalid-type', value))
  }
  try {
    return Array.isArray(value)
      ? Result.fail(failure('options', `${name} must be a non-null object`, 'invalid-type', value))
      : Result.succeed(value)
  } catch {
    return Result.fail(failure('options', `Unable to inspect ${name}`, 'hostile-input', value))
  }
}

const snapshotOptions = <T extends object>(
  value: unknown,
  name: string,
  fields: ReadonlyArray<keyof T>,
): Result.Result<Readonly<Partial<T>>, ItemValidationFailure> => {
  const validObject = validateOptionsObject(value, `${name} options`)
  if (Result.isFailure(validObject)) return Result.fail(validObject.failure)

  try {
    const input = validObject.success
    const snapshot: Partial<T> = {}
    for (const field of fields) {
      const entry = Reflect.get(input, field)
      if (entry !== undefined) Object.defineProperty(snapshot, field, { enumerable: true, value: entry })
    }
    return Result.succeed(Object.freeze(snapshot))
  } catch {
    return Result.fail(failure('options', `Unable to inspect ${name} options`, 'hostile-input', value))
  }
}

const validateUseEffectsOptions = (options: UseEffectsOptions): Result.Result<void, ItemValidationFailure> => {
  if (options.canSprint !== undefined && typeof options.canSprint !== 'boolean') {
    return Result.fail(failure('canSprint', 'canSprint must be a boolean', 'invalid-type', options.canSprint))
  }
  return Result.succeed(undefined)
}

const validateSwingAnimationOptions = (options: SwingAnimationOptions): Result.Result<void, ItemValidationFailure> => {
  if (options.type !== undefined && !SWING_ANIMATION_TYPES.includes(options.type)) {
    return Result.fail(failure('type', `Unknown swing animation type: ${String(options.type)}`, 'invalid-value', options.type))
  }
  return Result.succeed(undefined)
}

export const useEffectsComponent = (
  options: UseEffectsOptions = {},
): Result.Result<UseEffectsComponent, ItemValidationFailure> => Result.flatMap(
  snapshotOptions<UseEffectsOptions>(options, 'Use effects', ['canSprint', 'speedMultiplier']),
  (snapshot) => Result.flatMap(validateUseEffectsOptions(snapshot), () =>
    Result.mapError(
      UseSpeedMultiplier.result(snapshot.speedMultiplier ?? 0.2),
      () => failure('speedMultiplier', 'speedMultiplier must be a finite number in [0, 1]', 'out-of-range', snapshot.speedMultiplier),
    ).pipe(Result.map((speedMultiplier) => Object.freeze({ canSprint: snapshot.canSprint ?? false, speedMultiplier }))),
  ),
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
  (snapshot) => Result.flatMap(validateSwingAnimationOptions(snapshot), () => Result.mapError(
    SwingAnimationDuration.result(snapshot.duration ?? 6),
    () => failure('duration', 'duration must be a non-negative safe integer', 'out-of-range', snapshot.duration),
  ).pipe(Result.map((duration) => Object.freeze({ type: snapshot.type ?? 'whack', duration })))),
)

export const attackRangeComponent = (
  options: AttackRangeOptions = {},
): Result.Result<AttackRangeComponent, ItemValidationFailure> => Result.flatMap(
  snapshotOptions<AttackRangeOptions>(options, 'Attack range', [
    'minReach', 'maxReach', 'minCreativeReach', 'maxCreativeReach', 'hitboxMargin', 'mobFactor',
  ]),
  (snapshot) => Result.gen(function* () {
    const minReach = yield* Result.mapError(AttackRangeDistance.result(snapshot.minReach ?? 0), () => failure('minReach', 'minReach must be a finite number in [0, 64]', 'out-of-range', snapshot.minReach))
    const maxReach = yield* Result.mapError(AttackRangeDistance.result(snapshot.maxReach ?? 3), () => failure('maxReach', 'maxReach must be a finite number in [0, 64]', 'out-of-range', snapshot.maxReach))
    const minCreativeReach = yield* Result.mapError(AttackRangeDistance.result(snapshot.minCreativeReach ?? 0), () => failure('minCreativeReach', 'minCreativeReach must be a finite number in [0, 64]', 'out-of-range', snapshot.minCreativeReach))
    const maxCreativeReach = yield* Result.mapError(AttackRangeDistance.result(snapshot.maxCreativeReach ?? 5), () => failure('maxCreativeReach', 'maxCreativeReach must be a finite number in [0, 64]', 'out-of-range', snapshot.maxCreativeReach))
    const hitboxMargin = yield* Result.mapError(AttackHitboxMargin.result(snapshot.hitboxMargin ?? 0.3), () => failure('hitboxMargin', 'hitboxMargin must be a finite number in [0, 1]', 'out-of-range', snapshot.hitboxMargin))
    const mobFactor = yield* Result.mapError(MobAttackRangeFactor.result(snapshot.mobFactor ?? 1), () => failure('mobFactor', 'mobFactor must be a finite number in [0, 2]', 'out-of-range', snapshot.mobFactor))
    return Object.freeze({ minReach, maxReach, minCreativeReach, maxCreativeReach, hitboxMargin, mobFactor })
  }),
)
