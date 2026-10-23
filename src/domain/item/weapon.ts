import { Result } from 'effect'
import { ItemDamage, WeaponDisableBlockingSeconds } from '../time/quantities.js'
import type { WeaponComponent } from './weapon-data.js'
import { itemValidationFailure, type ItemValidationFailure } from './item-failure.js'

export type { WeaponComponent } from './weapon-data.js'
export { isWeaponComponent } from './weapon-validation.js'

export type WeaponComponentOptions = Readonly<{
  readonly itemDamagePerAttack?: ItemDamage
  readonly disableBlockingForSeconds?: WeaponDisableBlockingSeconds
}>

const validateOptions = (options: WeaponComponentOptions): Result.Result<void, ItemValidationFailure> => {
  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    return Result.fail(itemValidationFailure('options', 'Weapon component options must be a non-null object', 'invalid-type', options))
  }
  if (
    options.itemDamagePerAttack !== undefined &&
    (!Number.isSafeInteger(options.itemDamagePerAttack) || options.itemDamagePerAttack < 0)
  ) {
    return Result.fail(itemValidationFailure('itemDamagePerAttack', 'itemDamagePerAttack must be a non-negative safe integer', 'out-of-range', options.itemDamagePerAttack))
  }
  if (
    options.disableBlockingForSeconds !== undefined &&
    (!Number.isFinite(options.disableBlockingForSeconds) || options.disableBlockingForSeconds < 0)
  ) {
    return Result.fail(itemValidationFailure('disableBlockingForSeconds', 'disableBlockingForSeconds must be a finite, non-negative number', 'out-of-range', options.disableBlockingForSeconds))
  }
  return Result.succeed(undefined)
}

export const weaponComponent = (
  options: WeaponComponentOptions = {},
): Result.Result<WeaponComponent, ItemValidationFailure> =>
  Result.flatMap(validateOptions(options), () => Result.gen(function* () {
    const itemDamagePerAttack = yield* Result.mapError(
      ItemDamage.result(options.itemDamagePerAttack ?? 1),
      () => itemValidationFailure('itemDamagePerAttack', 'itemDamagePerAttack must be a non-negative safe integer', 'out-of-range', options.itemDamagePerAttack),
    )
    const disableBlockingForSeconds = yield* Result.mapError(
      WeaponDisableBlockingSeconds.result(options.disableBlockingForSeconds ?? 0),
      () => itemValidationFailure('disableBlockingForSeconds', 'disableBlockingForSeconds must be a finite, non-negative number', 'out-of-range', options.disableBlockingForSeconds),
    )
    return Object.freeze({ itemDamagePerAttack, disableBlockingForSeconds })
  }))
