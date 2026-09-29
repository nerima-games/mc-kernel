import type { ItemDamage, WeaponDisableBlockingSeconds } from '../time/quantities.js'

/** The official `minecraft:weapon` item component. */
export type WeaponComponent = Readonly<{
  readonly itemDamagePerAttack: ItemDamage
  readonly disableBlockingForSeconds: WeaponDisableBlockingSeconds
}>
