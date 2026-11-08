import { describe, expect, it } from 'vitest'
import {
  EQUIPMENT_CATALOG,
  EQUIPMENT_SLOTS,
  ITEM_DURABILITY_CATALOG,
  itemDurabilityDefinitionFor,
} from '../src/domain/item/equipment-data'

describe('equipment data', () => {
  it('publishes the stable slot and item catalogs', () => {
    expect(EQUIPMENT_SLOTS).toStrictEqual([
      'mainhand',
      'head',
      'chest',
      'legs',
      'feet',
      'offhand',
    ])
    expect(EQUIPMENT_CATALOG.diamond_helmet).toStrictEqual({ slots: ['head'] })
    expect(EQUIPMENT_CATALOG.diamond_sword).toStrictEqual({
      slots: ['mainhand', 'offhand'],
    })
    expect(ITEM_DURABILITY_CATALOG.diamond_sword).toStrictEqual({
      maxDurability: 1561,
    })
    expect(itemDurabilityDefinitionFor('diamond_sword')).toStrictEqual({
      maxDurability: 1561,
    })
    const newEquipment = [
      ['leather_helmet', ['head'], 55],
      ['leather_chestplate', ['chest'], 80],
      ['leather_leggings', ['legs'], 75],
      ['leather_boots', ['feet'], 65],
      ['gold_helmet', ['head'], 77],
      ['gold_chestplate', ['chest'], 112],
      ['gold_leggings', ['legs'], 105],
      ['gold_boots', ['feet'], 91],
      ['elytra', ['chest'], 432],
    ] as const
    for (const [item, slots, maxDurability] of newEquipment) {
      expect(EQUIPMENT_CATALOG[item]).toStrictEqual({ slots })
      expect(ITEM_DURABILITY_CATALOG[item]).toStrictEqual({ maxDurability })
      expect(itemDurabilityDefinitionFor(item)).toStrictEqual({ maxDurability })
    }
    expect(itemDurabilityDefinitionFor('stone')).toBeUndefined()
  })
})
