import { describe, expect, it } from 'vitest'
import {
  ENCHANTMENT_TABLE_BOOK,
  ENCHANTMENT_TABLE_ITEM_ENMERCHANTABILITY,
  ENCHANTMENT_TABLE_SLOT_COUNT,
  VANILLA_ENCHANTMENT_TABLE_RULES,
  enchantmentTableRuleFor,
  isEnchantmentTableRuleId,
  itemEnchantabilityOf,
} from '../src/domain/item/enchantment-table-data'
import { SUPPORTED_VANILLA_ENCHANTMENT_IDS } from '../src/domain/item/enchantment-data'

describe('enchantment table data', () => {
  it('keeps one official rule per supported enchantment id', () => {
    expect(Object.keys(VANILLA_ENCHANTMENT_TABLE_RULES).sort()).toStrictEqual(
      [...SUPPORTED_VANILLA_ENCHANTMENT_IDS].sort(),
    )
    expect(Object.keys(VANILLA_ENCHANTMENT_TABLE_RULES)).toHaveLength(43)
    expect(ENCHANTMENT_TABLE_SLOT_COUNT).toBe(3)
    expect(enchantmentTableRuleFor('protection')).toStrictEqual({
      maxLevel: 4,
      weight: 10,
      minCost: { base: 1, perLevelAboveFirst: 11 },
      maxCost: { base: 12, perLevelAboveFirst: 11 },
      treasureOnly: false,
    })
    expect(isEnchantmentTableRuleId('sharpness')).toBe(true)
    expect(isEnchantmentTableRuleId('minecraft:sharpness')).toBe(false)
    expect(isEnchantmentTableRuleId(null)).toBe(false)
    expect(isEnchantmentTableRuleId(3)).toBe(false)
  })

  it('stores enchantability for supported table inputs', () => {
    expect(ENCHANTMENT_TABLE_ITEM_ENMERCHANTABILITY.iron_sword).toBe(14)
    expect(itemEnchantabilityOf(ENCHANTMENT_TABLE_BOOK)).toBe(1)
    expect(itemEnchantabilityOf('dirt')).toBe(0)
  })
})
