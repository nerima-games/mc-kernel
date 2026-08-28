import { ItemDamage, WeaponDisableBlockingSeconds } from './quantities.js'
import type { WeaponComponent } from './weapon-data.js'

type RecordValue = Record<string, unknown>

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const hasExactKeys = (value: RecordValue): boolean => {
  const keys = Object.keys(value)
  return (
    keys.length === 2 &&
    Object.hasOwn(value, 'itemDamagePerAttack') &&
    Object.hasOwn(value, 'disableBlockingForSeconds')
  )
}

export const isWeaponComponent = (value: unknown): value is WeaponComponent =>
  isRecord(value) &&
  hasExactKeys(value) &&
  typeof value['itemDamagePerAttack'] === 'number' &&
  ItemDamage.is(value['itemDamagePerAttack']) &&
  typeof value['disableBlockingForSeconds'] === 'number' &&
  WeaponDisableBlockingSeconds.is(value['disableBlockingForSeconds'])
