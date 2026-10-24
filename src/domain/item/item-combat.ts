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
  const validObject = validateOptionsObject(options, 'Use effects options')
  if (Result.isFailure(validObject)) return Result.fail(validObject.failure)
  if (options.canSprint !== undefined && typeof options.canSprint !== 'boolean') {
    return Result.fail(failure('canSprint', 'canSprint must be a boolean', 'invalid-type', options.canSprint))
  }
  if (options.speedMultiplier !== undefined && !UseSpeedMultiplier.is(options.speedMultiplier)) {
    return Result.fail(failure('speedMultiplier', 'speedMultiplier must be a finite number in [0, 1]', 'out-of-range', options.speedMultiplier))
  }
  return Result.succeed(undefined)
}

const validateSwingAnimationOptions = (options: SwingAnimationOptions): Result.Result<void, ItemValidationFailure> => {
  const validObject = validateOptionsObject(options, 'Swing animation options')
  if (Result.isFailure(validObject)) return Result.fail(validObject.failure)
  if (options.type !== undefined && !SWING_ANIMATION_TYPES.includes(options.type)) {
    return Result.fail(failure('type', `Unknown swing animation type: ${String(options.type)}`, 'invalid-value', options.type))
  }
  if (options.duration !== undefined && !SwingAnimationDuration.is(options.duration)) {
    return Result.fail(failure('duration', 'duration must be a non-negative safe integer', 'out-of-range', options.duration))
  }
  return Result.succeed(undefined)
}

const validateAttackRangeOptions = (options: AttackRangeOptions): Result.Result<void, ItemValidationFailure> => {
  const validObject = validateOptionsObject(options, 'Attack range options')
  if (Result.isFailure(validObject)) return Result.fail(validObject.failure)
  if (options.minReach !== undefined && !AttackRangeDistance.is(options.minReach)) {
    return Result.fail(failure('minReach', 'minReach must be a finite number in [0, 64]', 'out-of-range', options.minReach))
  }
  if (options.maxReach !== undefined && !AttackRangeDistance.is(options.maxReach)) {
    return Result.fail(failure('maxReach', 'maxReach must be a finite number in [0, 64]', 'out-of-range', options.maxReach))
  }
  if (options.minCreativeReach !== undefined && !AttackRangeDistance.is(options.minCreativeReach)) {
    return Result.fail(failure('minCreativeReach', 'minCreativeReach must be a finite number in [0, 64]', 'out-of-range', options.minCreativeReach))
  }
  if (options.maxCreativeReach !== undefined && !AttackRangeDistance.is(options.maxCreativeReach)) {
    return Result.fail(failure('maxCreativeReach', 'maxCreativeReach must be a finite number in [0, 64]', 'out-of-range', options.maxCreativeReach))
  }
  if (options.hitboxMargin !== undefined && !AttackHitboxMargin.is(options.hitboxMargin)) {
    return Result.fail(failure('hitboxMargin', 'hitboxMargin must be a finite number in [0, 1]', 'out-of-range', options.hitboxMargin))
  }
  if (options.mobFactor !== undefined && !MobAttackRangeFactor.is(options.mobFactor)) {
    return Result.fail(failure('mobFactor', 'mobFactor must be a finite number in [0, 2]', 'out-of-range', options.mobFactor))
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
  (snapshot) => Result.flatMap(validateAttackRangeOptions(snapshot), () => Result.gen(function* () {
    const minReach = yield* Result.mapError(AttackRangeDistance.result(snapshot.minReach ?? 0), () => failure('minReach', 'minReach must be a finite number in [0, 64]', 'out-of-range', snapshot.minReach))
    const maxReach = yield* Result.mapError(AttackRangeDistance.result(snapshot.maxReach ?? 3), () => failure('maxReach', 'maxReach must be a finite number in [0, 64]', 'out-of-range', snapshot.maxReach))
    const minCreativeReach = yield* Result.mapError(AttackRangeDistance.result(snapshot.minCreativeReach ?? 0), () => failure('minCreativeReach', 'minCreativeReach must be a finite number in [0, 64]', 'out-of-range', snapshot.minCreativeReach))
    const maxCreativeReach = yield* Result.mapError(AttackRangeDistance.result(snapshot.maxCreativeReach ?? 5), () => failure('maxCreativeReach', 'maxCreativeReach must be a finite number in [0, 64]', 'out-of-range', snapshot.maxCreativeReach))
    const hitboxMargin = yield* Result.mapError(AttackHitboxMargin.result(snapshot.hitboxMargin ?? 0.3), () => failure('hitboxMargin', 'hitboxMargin must be a finite number in [0, 1]', 'out-of-range', snapshot.hitboxMargin))
    const mobFactor = yield* Result.mapError(MobAttackRangeFactor.result(snapshot.mobFactor ?? 1), () => failure('mobFactor', 'mobFactor must be a finite number in [0, 2]', 'out-of-range', snapshot.mobFactor))
    return Object.freeze({ minReach, maxReach, minCreativeReach, maxCreativeReach, hitboxMargin, mobFactor })
  })),
)
