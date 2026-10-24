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

const snapshotOptions = (value: unknown): Result.Result<WeaponComponentOptions, ItemValidationFailure> => {
  if (typeof value !== 'object' || value === null) {
    return Result.fail(itemValidationFailure('options', 'Weapon component options must be a non-null object', 'invalid-type', value))
  }
  try {
    if (Array.isArray(value)) {
      return Result.fail(itemValidationFailure('options', 'Weapon component options must be a non-null object', 'invalid-type', value))
    }
    const snapshot: WeaponComponentOptions = {}
    for (const field of ['itemDamagePerAttack', 'disableBlockingForSeconds'] as const) {
      const entry = Reflect.get(value, field)
      if (entry !== undefined) Object.defineProperty(snapshot, field, { enumerable: true, value: entry })
    }
    return Result.succeed(Object.freeze(snapshot))
  } catch {
    return Result.fail(itemValidationFailure('options', 'Unable to inspect weapon component options', 'hostile-input', value))
  }
}

export const weaponComponent = (
  options: WeaponComponentOptions = {},
): Result.Result<WeaponComponent, ItemValidationFailure> => Result.flatMap(
  snapshotOptions(options),
  (snapshot) => Result.gen(function* () {
    const itemDamagePerAttack = yield* Result.mapError(
      ItemDamage.result(snapshot.itemDamagePerAttack ?? 1),
      () => itemValidationFailure('itemDamagePerAttack', 'itemDamagePerAttack must be a non-negative safe integer', 'out-of-range', snapshot.itemDamagePerAttack),
    )
    const disableBlockingForSeconds = yield* Result.mapError(
      WeaponDisableBlockingSeconds.result(snapshot.disableBlockingForSeconds ?? 0),
      () => itemValidationFailure('disableBlockingForSeconds', 'disableBlockingForSeconds must be a finite, non-negative number', 'out-of-range', snapshot.disableBlockingForSeconds),
    )
    return Object.freeze({ itemDamagePerAttack, disableBlockingForSeconds })
  }),
)
