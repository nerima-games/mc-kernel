import { ResourceLocation } from './identifiers.js'
import type {
  EnchantmentLevelMap,
  EnchantmentsComponent,
  StoredEnchantmentsComponent,
} from './item-enchantments-data.js'
import { EnchantmentLevel } from './quantities.js'

type RecordValue = Record<string, unknown>

const isRecord = (value: unknown): value is RecordValue => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

export const isEnchantmentLevelMap = (value: unknown): value is EnchantmentLevelMap =>
  isRecord(value) &&
  Object.entries(value).every(
    ([id, level]) =>
      ResourceLocation.is(id) &&
      typeof level === 'number' &&
      EnchantmentLevel.is(level),
  )

export const isEnchantmentsComponent = (value: unknown): value is EnchantmentsComponent =>
  isEnchantmentLevelMap(value)

export const isStoredEnchantmentsComponent = (
  value: unknown,
): value is StoredEnchantmentsComponent => isEnchantmentLevelMap(value)
