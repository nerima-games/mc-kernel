import { Result } from 'effect'
import { snapshotInputRecord } from '../../input-snapshot.js'
import { ItemDamage, WeaponDisableBlockingSeconds } from '../time/quantities.js'
import type { WeaponComponent } from './weapon-data.js'
import { itemValidationFailure, type ItemValidationFailure } from './item-failure.js'

export type { WeaponComponent } from './weapon-data.js'
export { isWeaponComponent } from './weapon-validation.js'

export type WeaponComponentOptions = Readonly<{
  readonly itemDamagePerAttack?: ItemDamage
  readonly disableBlockingForSeconds?: WeaponDisableBlockingSeconds
}>

const snapshotOptions = (value: unknown): Result.Result<Readonly<Record<string, unknown>>, ItemValidationFailure> => {
  const snapshot = snapshotInputRecord(value, ['itemDamagePerAttack', 'disableBlockingForSeconds'])
  if (Result.isFailure(snapshot)) {
    const invalidType = snapshot.failure.reason === 'invalid-container' || snapshot.failure.reason === 'unsupported-prototype'
    return Result.fail(itemValidationFailure(
      'options',
      invalidType ? 'Weapon component options must be a non-null object' : 'Unable to inspect weapon component options',
      invalidType ? 'invalid-type' : 'hostile-input',
      value,
    ))
  }
  return Result.succeed(snapshot.success)
}

export const weaponComponent = (
  options: WeaponComponentOptions = {},
): Result.Result<WeaponComponent, ItemValidationFailure> => Result.flatMap(
  snapshotOptions(options),
  (snapshot) => Result.gen(function* () {
    const itemDamageValue = snapshot['itemDamagePerAttack'] ?? 1
    if (typeof itemDamageValue !== 'number') {
      return yield* Result.fail(itemValidationFailure(
        'itemDamagePerAttack',
        'itemDamagePerAttack must be a non-negative safe integer',
        'out-of-range',
        itemDamageValue,
      ))
    }
    const itemDamagePerAttack = yield* Result.mapError(
      ItemDamage.result(itemDamageValue),
      () => itemValidationFailure('itemDamagePerAttack', 'itemDamagePerAttack must be a non-negative safe integer', 'out-of-range', itemDamageValue),
    )
    const disableBlockingValue = snapshot['disableBlockingForSeconds'] ?? 0
    if (typeof disableBlockingValue !== 'number') {
      return yield* Result.fail(itemValidationFailure(
        'disableBlockingForSeconds',
        'disableBlockingForSeconds must be a finite, non-negative number',
        'out-of-range',
        disableBlockingValue,
      ))
    }
    const disableBlockingForSeconds = yield* Result.mapError(
      WeaponDisableBlockingSeconds.result(disableBlockingValue),
      () => itemValidationFailure('disableBlockingForSeconds', 'disableBlockingForSeconds must be a finite, non-negative number', 'out-of-range', disableBlockingValue),
    )
    return Object.freeze({ itemDamagePerAttack, disableBlockingForSeconds })
  }),
)
