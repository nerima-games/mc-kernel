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
    expect(itemDurabilityDefinitionFor('stone')).toBeUndefined()
  })
})
