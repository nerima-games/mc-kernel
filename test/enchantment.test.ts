import { describe, expect, it } from 'vitest'
import {
  SUPPORTED_VANILLA_ANVIL_RULE_SET,
  SUPPORTED_VANILLA_BOOK_ANVIL_RULE_SET,
  SUPPORTED_VANILLA_ITEM_ANVIL_RULE_SET,
} from '../src/domain/item/enchantment'
import {
  SUPPORTED_VANILLA_BOOK_ENCHANTMENT_RULES,
  SUPPORTED_VANILLA_ENCHANTMENT_IDS,
  SUPPORTED_VANILLA_ENCHANTMENT_RULES,
  SUPPORTED_VANILLA_ITEM_ENCHANTMENT_RULES,
  VANILLA_ENCHANTMENT_COSTS,
  type SupportedVanillaEnchantmentId,
} from '../src/domain/item/enchantment-data'

const ruleFor = (id: SupportedVanillaEnchantmentId) =>
  SUPPORTED_VANILLA_ENCHANTMENT_RULES.find((rule) => rule.id === id)

describe('supported vanilla enchantment data', () => {
  it('keeps one rule per supported id and cost entry', () => {
    expect(new Set(SUPPORTED_VANILLA_ENCHANTMENT_IDS).size).toBe(
      SUPPORTED_VANILLA_ENCHANTMENT_IDS.length,
    )
    expect(new Set(SUPPORTED_VANILLA_ENCHANTMENT_RULES.map(({ id }) => id)).size).toBe(
      SUPPORTED_VANILLA_ENCHANTMENT_RULES.length,
    )
    expect(SUPPORTED_VANILLA_ENCHANTMENT_RULES).toHaveLength(
      SUPPORTED_VANILLA_ENCHANTMENT_IDS.length,
    )
    expect(Object.keys(VANILLA_ENCHANTMENT_COSTS).sort()).toStrictEqual(
      [...SUPPORTED_VANILLA_ENCHANTMENT_IDS].sort(),
    )
  })

  it('stores official item and book cost multipliers', () => {
    expect(VANILLA_ENCHANTMENT_COSTS.mending).toStrictEqual({ item: 4, book: 2 })
    expect(VANILLA_ENCHANTMENT_COSTS.silk_touch).toStrictEqual({ item: 8, book: 4 })
    for (const { item, book } of Object.values(VANILLA_ENCHANTMENT_COSTS)) {
      for (const cost of [item, book]) {
        expect(Number.isSafeInteger(cost)).toBe(true)
        expect(cost).toBeGreaterThanOrEqual(0)
        expect(cost).toBeLessThanOrEqual(99)
      }
    }
  })

  it('keeps rule ids, level caps, targets, and conflicts in static data', () => {
    for (const rule of SUPPORTED_VANILLA_ENCHANTMENT_RULES) {
      expect(SUPPORTED_VANILLA_ENCHANTMENT_IDS).toContain(rule.id)
      expect(ruleFor(rule.id)).toStrictEqual(rule)
    }

    expect(ruleFor('protection')?.maxLevel).toBe(4)
    expect(ruleFor('sharpness')?.maxLevel).toBe(5)
    expect(ruleFor('mending')?.applicableItems).toContain('iron_sword')
    expect(ruleFor('aqua_affinity')?.applicableItems).toStrictEqual(['iron_helmet'])
    expect(ruleFor('silk_touch')?.incompatibleWith).toStrictEqual(['fortune'])
  })

  it('keeps vanilla anvil rule-set data as aliases of the static rules', () => {
    expect(SUPPORTED_VANILLA_BOOK_ANVIL_RULE_SET.enchantments).toBe(
      SUPPORTED_VANILLA_BOOK_ENCHANTMENT_RULES,
    )
    expect(SUPPORTED_VANILLA_ITEM_ANVIL_RULE_SET.enchantments).toBe(
      SUPPORTED_VANILLA_ITEM_ENCHANTMENT_RULES,
    )
    expect(SUPPORTED_VANILLA_ANVIL_RULE_SET.enchantments).toBe(
      SUPPORTED_VANILLA_ENCHANTMENT_RULES,
    )
  })
})
