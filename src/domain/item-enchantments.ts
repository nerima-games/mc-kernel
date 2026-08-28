/** Constructors and guards for current Java item enchantment components. */
import { ResourceLocation } from './identifiers.js'
import {
  isEnchantmentLevelMap,
  isEnchantmentsComponent,
  isStoredEnchantmentsComponent,
} from './item-enchantments-validation.js'
import type {
  EnchantmentLevelMap,
  EnchantmentsComponent,
  StoredEnchantmentsComponent,
} from './item-enchantments-data.js'
import { EnchantmentLevel } from './quantities.js'

export type EnchantmentLevelMapOptions = Readonly<Record<string, number>>

const validateOptionsObject = (value: unknown, name: string): void => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name} must be a non-null object`)
  }
}

const validateLevel = (value: unknown, name: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`)
  }
  if (!EnchantmentLevel.is(value)) {
    throw new RangeError(`${name} must be a safe integer in [0, 255]`)
  }
  return value
}

const enchantmentLevelMapOf = (
  options: EnchantmentLevelMapOptions,
  name: string,
): EnchantmentLevelMap => {
  validateOptionsObject(options, `${name} options`)
  const entries: Record<string, EnchantmentLevel> = {}
  for (const [id, level] of Object.entries(options)) {
    if (!ResourceLocation.is(id)) {
      throw new TypeError(`${name} keys must be valid resource locations: ${id}`)
    }
    entries[id] = EnchantmentLevel(validateLevel(level, `${name}[${id}]`))
  }
  return Object.freeze(entries)
}

export const enchantmentsComponent = (
  options: EnchantmentLevelMapOptions = {},
): EnchantmentsComponent => enchantmentLevelMapOf(options, 'enchantments')

export const storedEnchantmentsComponent = (
  options: EnchantmentLevelMapOptions = {},
): StoredEnchantmentsComponent => enchantmentLevelMapOf(options, 'stored_enchantments')

export {
  isEnchantmentLevelMap,
  isEnchantmentsComponent,
  isStoredEnchantmentsComponent,
}
export type {
  EnchantmentLevelMap,
  EnchantmentsComponent,
  StoredEnchantmentsComponent,
} from './item-enchantments-data.js'
