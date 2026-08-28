import type { ItemDamage, WeaponDisableBlockingSeconds } from './quantities.js'

/** The official `minecraft:weapon` item component. */
export type WeaponComponent = Readonly<{
  readonly itemDamagePerAttack: ItemDamage
  readonly disableBlockingForSeconds: WeaponDisableBlockingSeconds
}>
