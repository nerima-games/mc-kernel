import { describe, expect, it } from 'vitest'

import {
  COOKING_STATIONS,
  VANILLA_FUEL_RULES,
  VANILLA_SMELTING_RECIPES,
} from '../src/domain/recipe/smelting-data'
import type { ItemType } from '../src/domain/item/item-type'

const expectSmeltingRecipe = (
  input: ItemType,
  output: ItemType,
  experience: number,
  stations: ReadonlyArray<string>,
): void => {
  const recipe = VANILLA_SMELTING_RECIPES.find((candidate) => candidate.input === input)
  if (recipe === undefined) throw new Error(`Missing smelting recipe for ${input}`)
  expect(recipe.output.item).toBe(output)
  expect(recipe.output.count).toBe(1)
  expect(recipe.cookTimeSecs).toBe(10)
  expect(recipe.experience).toBe(experience)
  expect(recipe.stations).toEqual(stations)
}

describe('smelting data', () => {
  it('keeps the cooking stations and built-in recipe and fuel tables', () => {
    expect(COOKING_STATIONS).toEqual(['furnace', 'blast_furnace', 'smoker'])
    expect(VANILLA_SMELTING_RECIPES.length).toBeGreaterThan(10)
    expect(VANILLA_FUEL_RULES.map(({ fuel, burnTimeSecs }) => [fuel, burnTimeSecs])).toStrictEqual([
      ['coal', 80],
      ['charcoal', 80],
      ['coal_block', 800],
      ['blaze_rod', 120],
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

  it('maps each represented raw food and smeltable item to its vanilla output', () => {
    expectSmeltingRecipe('oak_log', 'charcoal', 0.15, ['furnace'])
    expectSmeltingRecipe('chorus_fruit', 'popped_chorus_fruit', 0.1, ['furnace'])
    expectSmeltingRecipe('potato', 'baked_potato', 0.35, ['furnace', 'smoker'])
    expectSmeltingRecipe('beef', 'cooked_beef', 0.35, ['furnace', 'smoker'])
    expectSmeltingRecipe('porkchop', 'cooked_porkchop', 0.35, ['furnace', 'smoker'])
    expectSmeltingRecipe('mutton', 'cooked_mutton', 0.35, ['furnace', 'smoker'])
    expectSmeltingRecipe('chicken', 'cooked_chicken', 0.35, ['furnace', 'smoker'])
    expectSmeltingRecipe('rabbit', 'cooked_rabbit', 0.35, ['furnace', 'smoker'])
    expectSmeltingRecipe('cod', 'cooked_cod', 0.35, ['furnace', 'smoker'])
    expectSmeltingRecipe('salmon', 'cooked_salmon', 0.35, ['furnace', 'smoker'])
  })
})
