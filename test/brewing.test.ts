import { describe, expect, it } from 'vitest'

import {
  BREWING_BOTTLE_SLOTS,
  BREWING_FUEL_ITEM,
  BREWING_MAX_FUEL_CHARGES,
  BREWING_TIME_SECS,
  brewingOutput,
  VANILLA_BREWING_RECIPES,
} from '../src/domain/recipe/brewing-data'
import { itemStack } from '../src/domain/item/item-stack'

describe('brewing data', () => {
  it('keeps the brewing constants and built-in recipe table', () => {
    expect(BREWING_BOTTLE_SLOTS).toBe(3)
    expect(BREWING_TIME_SECS).toBe(20)
    expect(BREWING_MAX_FUEL_CHARGES).toBe(20)
    expect(BREWING_FUEL_ITEM).toBe('blaze_powder')
    expect(VANILLA_BREWING_RECIPES.length).toBeGreaterThan(3)
    expect(VANILLA_BREWING_RECIPES.map((recipe) => brewingOutput(recipe))).toContainEqual(
      itemStack('awkward_potion', 1),
    )
  })
})
