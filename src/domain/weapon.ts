import { ItemDamage, WeaponDisableBlockingSeconds } from './quantities.js'
import type { WeaponComponent } from './weapon-data.js'

export type { WeaponComponent } from './weapon-data.js'
export { isWeaponComponent } from './weapon-validation.js'

export type WeaponComponentOptions = Readonly<{
  readonly itemDamagePerAttack?: number
  readonly disableBlockingForSeconds?: number
}>

const validateOptions = (options: WeaponComponentOptions): void => {
  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    throw new TypeError('Weapon component options must be a non-null object')
  }
  if (
    options.itemDamagePerAttack !== undefined &&
    (!Number.isSafeInteger(options.itemDamagePerAttack) || options.itemDamagePerAttack < 0)
  ) {
    throw new RangeError('itemDamagePerAttack must be a non-negative safe integer')
  }
  if (
    options.disableBlockingForSeconds !== undefined &&
    (!Number.isFinite(options.disableBlockingForSeconds) || options.disableBlockingForSeconds < 0)
  ) {
    throw new RangeError('disableBlockingForSeconds must be a finite, non-negative number')
  }
}

export const weaponComponent = (options: WeaponComponentOptions = {}): WeaponComponent => {
  validateOptions(options)
  return Object.freeze({
    itemDamagePerAttack: ItemDamage(options.itemDamagePerAttack ?? 1),
    disableBlockingForSeconds: WeaponDisableBlockingSeconds(options.disableBlockingForSeconds ?? 0),
  })
}
