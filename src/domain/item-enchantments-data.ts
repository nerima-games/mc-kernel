/** Portable data contracts for current Java item enchantment components. */
import type { EnchantmentLevel } from './quantities.js'

export type EnchantmentLevelMap = Readonly<Record<string, EnchantmentLevel>>

/** The 1.21.5+ `enchantments` component maps enchantment ids directly to levels. */
export type EnchantmentsComponent = EnchantmentLevelMap

/** The 1.21.5+ `stored_enchantments` component uses the same level map. */
export type StoredEnchantmentsComponent = EnchantmentLevelMap
