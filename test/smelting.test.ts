import { describe, expect, it } from 'vitest'

import {
  COOKING_STATIONS,
  VANILLA_FUEL_RULES,
  VANILLA_SMELTING_RECIPES,
} from '../src/domain/recipe/smelting-data'

describe('smelting data', () => {
  it('keeps the cooking stations and built-in recipe and fuel tables', () => {
    expect(COOKING_STATIONS).toEqual(['furnace', 'blast_furnace', 'smoker'])
    expect(VANILLA_SMELTING_RECIPES.length).toBeGreaterThan(10)
    expect(VANILLA_FUEL_RULES.map(({ fuel, burnTimeSecs }) => [fuel, burnTimeSecs])).toStrictEqual([
      ['coal', 80],
      ['coal_block', 800],
      ['oak_log', 15],
      ['oak_planks', 15],
      ['stick', 5],
      ['oak_stairs', 15],
      ['crafting_table', 15],
      ['chest', 15],
      ['bow', 15],
      ['fishing_rod', 15],
      ['oak_boat', 60],
      ['ladder', 15],
      ['sapling', 5],
      ['wooden_pickaxe', 10],
      ['wooden_hoe', 10],
      ['wooden_sword', 10],
      ['bowl', 5],
      ['wool', 5],
      ['door', 10],
    ])
  })
})
