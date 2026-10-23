import { describe, expect, it } from 'vitest'
import {
  GRINDSTONE_CURSE_ENCHANTMENT_IDS,
  GRINDSTONE_DURABILITY_BONUS_PERCENT,
  GRINDSTONE_REPAIR_COST_MAX,
} from '../src/domain/item/grindstone-data'

describe('grindstone data', () => {
  it('keeps the vanilla curse list and repair constants', () => {
    expect(GRINDSTONE_CURSE_ENCHANTMENT_IDS).toStrictEqual([
      'binding_curse',
      'vanishing_curse',
    ])
    expect(GRINDSTONE_DURABILITY_BONUS_PERCENT).toBe(5)
    expect(GRINDSTONE_REPAIR_COST_MAX).toBe(2_147_483_647)
  })
})
