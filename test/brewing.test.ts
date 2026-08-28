import { describe, expect, it } from 'vitest'

import { itemStack } from '../src/domain/item-stack'
import {
  BREWING_BOTTLE_SLOTS,
  BREWING_FUEL_ITEM,
  BREWING_MAX_FUEL_CHARGES,
  BREWING_TIME_SECS,
  VANILLA_BREWING_RECIPES,
  addBrewingFuel,
  advanceBrewing,
  brewingState,
  emptyBrewingState,
  matchBrewingRecipe,
} from '../src/domain/brewing'
import type { BrewingRecipe } from '../src/domain/brewing'
import { buildBrewingRecipeIndex, cachedBrewingRecipeIndex } from '../src/domain/brewing-indexes'

const recipe: BrewingRecipe = {
  _tag: 'Brewing',
  id: 'minecraft:test_brew',
  input: 'awkward_potion',
  ingredient: 'sugar',
  output: 'potion_of_swiftness',
}

const validState = () =>
  brewingState({
    bottles: [itemStack('awkward_potion', 1), undefined, itemStack('awkward_potion', 1)],
    ingredient: itemStack('sugar', 1),
    fuel: itemStack('blaze_powder', 2),
    fuelCharges: 1,
  })

describe('brewing data and state', () => {
  it('constructs default and custom brewing states', () => {
    expect(BREWING_BOTTLE_SLOTS).toBe(3)
    expect(BREWING_TIME_SECS).toBe(20)
    expect(BREWING_MAX_FUEL_CHARGES).toBe(20)
    expect(BREWING_FUEL_ITEM).toBe('blaze_powder')
    expect(emptyBrewingState()).toEqual({
      bottles: [undefined, undefined, undefined],
      ingredient: undefined,
      fuel: undefined,
      fuelCharges: 0,
      brewProgressSecs: 0,
    })
    expect(validState()).toEqual({
      bottles: [itemStack('awkward_potion', 1), undefined, itemStack('awkward_potion', 1)],
      ingredient: itemStack('sugar', 1),
      fuel: itemStack('blaze_powder', 2),
      fuelCharges: 1,
      brewProgressSecs: 0,
    })
  })

  it('adds blaze powder without exceeding the charge limit', () => {
    const one = addBrewingFuel(brewingState({ fuel: itemStack('blaze_powder', 1) }))
    expect(one).toEqual(brewingState({ fuel: undefined, fuelCharges: 20 }))

    const many = addBrewingFuel(brewingState({ fuel: itemStack('blaze_powder', 2), fuelCharges: 1 }))
    expect(many).toEqual(brewingState({ fuel: itemStack('blaze_powder', 1), fuelCharges: 20 }))

    const full = brewingState({ fuel: itemStack('blaze_powder', 1), fuelCharges: BREWING_MAX_FUEL_CHARGES })
    expect(addBrewingFuel(full)).toBe(full)
    const wrongFuel = brewingState({ fuel: itemStack('sugar', 1) })
    expect(addBrewingFuel(wrongFuel)).toBe(wrongFuel)
    const noFuel = emptyBrewingState()
    expect(addBrewingFuel(noFuel)).toBe(noFuel)
  })
})

describe('brewing recipe matching', () => {
  it('matches occupied bottle slots and ingredients', () => {
    const bottles = [itemStack('water_bottle', 1), undefined, itemStack('water_bottle', 1)] as const
    expect(matchBrewingRecipe(bottles, undefined)).toBeUndefined()
    expect(matchBrewingRecipe([undefined, undefined, undefined], itemStack('nether_wart', 1))).toBeUndefined()
    expect(matchBrewingRecipe(bottles, itemStack('nether_wart', 1))).toMatchObject({ id: 'minecraft:awkward_potion' })
    expect(matchBrewingRecipe([itemStack('awkward_potion', 1), undefined, undefined], itemStack('sugar', 1))).toMatchObject({ id: 'minecraft:swiftness' })
    expect(matchBrewingRecipe([itemStack('water_bottle', 1), undefined, undefined], itemStack('sugar', 1))).toBeUndefined()
    expect(matchBrewingRecipe([itemStack('awkward_potion', 1), itemStack('water_bottle', 1), undefined], itemStack('sugar', 1))).toBeUndefined()
    expect(matchBrewingRecipe([itemStack('awkward_potion', 1), undefined, undefined], itemStack('sugar', 1), [recipe])).toBe(recipe)
    expect(matchBrewingRecipe([undefined, undefined, itemStack('water_bottle', 1)], itemStack('nether_wart', 1))).toMatchObject({ id: 'minecraft:awkward_potion' })
  })

  it('keeps the first recipe for duplicate indexed keys', () => {
    const duplicate: BrewingRecipe = { ...recipe, id: 'minecraft:test_brew_duplicate' }
    const otherIngredient: BrewingRecipe = { ...recipe, id: 'minecraft:test_brew_other', ingredient: 'nether_wart' }
    const index = buildBrewingRecipeIndex([recipe, duplicate, otherIngredient])

    expect(index.get('sugar')?.get('awkward_potion')).toBe(recipe)
    expect(index.get('nether_wart')?.get('awkward_potion')).toBe(otherIngredient)
  })

  it('reuses and invalidates the custom recipe index', () => {
    const recipes: BrewingRecipe[] = Array.from({ length: 64 }, (_, index) => ({
      ...recipe,
      id: `minecraft:test_brew_${index}`,
    }))
    const firstIndex = cachedBrewingRecipeIndex(recipes)

    expect(cachedBrewingRecipeIndex(recipes)).toBe(firstIndex)

    const firstRecipe = recipes[0]
    if (firstRecipe === undefined) throw new Error('Test fixture must contain a recipe')
    Object.assign(firstRecipe, { input: 'water_bottle' })
    const inputChangedIndex = cachedBrewingRecipeIndex(recipes)
    expect(inputChangedIndex).not.toBe(firstIndex)
    expect(inputChangedIndex.get('sugar')?.get('water_bottle')).toBe(firstRecipe)

    Object.assign(firstRecipe, { ingredient: 'nether_wart' })
    const ingredientChangedIndex = cachedBrewingRecipeIndex(recipes)
    expect(ingredientChangedIndex).not.toBe(inputChangedIndex)
    expect(ingredientChangedIndex.get('nether_wart')?.get('water_bottle')).toBe(firstRecipe)

    recipes.pop()
    expect(cachedBrewingRecipeIndex(recipes)).not.toBe(ingredientChangedIndex)
  })

  it('rejects malformed state and recipe inputs', () => {
    expect(() => Reflect.apply(brewingState, undefined, [null])).toThrow(TypeError)
    expect(() => Reflect.apply(brewingState, undefined, [[]])).toThrow(TypeError)
    expect(() => Reflect.apply(brewingState, undefined, [{ bottles: [] }])).toThrow(TypeError)
    expect(() => Reflect.apply(brewingState, undefined, [{ bottles: [undefined, undefined, undefined, undefined] }])).toThrow(TypeError)
    expect(() => Reflect.apply(brewingState, undefined, [{ bottles: [{}, undefined, undefined] }])).toThrow(TypeError)
    expect(() => Reflect.apply(brewingState, undefined, [{ ingredient: {} }])).toThrow(TypeError)
    expect(() => Reflect.apply(brewingState, undefined, [{ fuel: {} }])).toThrow(TypeError)
    expect(() => brewingState({ fuelCharges: -1 })).toThrow(RangeError)
    expect(() => brewingState({ fuelCharges: 1.5 })).toThrow(RangeError)
    expect(() => brewingState({ fuelCharges: BREWING_MAX_FUEL_CHARGES + 1 })).toThrow(RangeError)
    expect(() => brewingState({ brewProgressSecs: Number.NaN })).toThrow(RangeError)
    expect(() => brewingState({ brewProgressSecs: BREWING_TIME_SECS + 1 })).toThrow(RangeError)

    expect(() => Reflect.apply(matchBrewingRecipe, undefined, [[], undefined])).toThrow(TypeError)
    expect(() => Reflect.apply(matchBrewingRecipe, undefined, [[{}, undefined, undefined], undefined])).toThrow(TypeError)
    expect(() => Reflect.apply(matchBrewingRecipe, undefined, [[undefined, undefined, undefined], {}])).toThrow(TypeError)
    expect(() => Reflect.apply(matchBrewingRecipe, undefined, [[undefined, undefined, undefined], undefined, {}])).toThrow(TypeError)

    const invalidRecipes: unknown[] = [
      null,
      [],
      { ...recipe, _tag: 'Other' },
      { ...recipe, id: ' ' },
      { ...recipe, input: 'unknown' },
      { ...recipe, ingredient: 'unknown' },
      { ...recipe, output: 'unknown' },
    ]
    expect(() => Reflect.apply(matchBrewingRecipe, undefined, [
      [itemStack('awkward_potion', 1), undefined, undefined],
      itemStack('sugar', 1),
      invalidRecipes[0],
    ])).toThrow(TypeError)
    expect(() => Reflect.apply(matchBrewingRecipe, undefined, [
      [itemStack('awkward_potion', 1), undefined, undefined],
      itemStack('sugar', 1),
      [invalidRecipes[1]],
    ])).toThrow(TypeError)
    for (const invalid of invalidRecipes.slice(2)) {
      expect(() => Reflect.apply(matchBrewingRecipe, undefined, [
        [itemStack('awkward_potion', 1), undefined, undefined],
        itemStack('sugar', 1),
        [invalid],
      ])).toThrow(TypeError)
    }
  })
})

describe('brewing advancement', () => {
  it('resets progress without a recipe and waits for fuel', () => {
    const noIngredient = emptyBrewingState()
    expect(advanceBrewing(noIngredient, 1)).toEqual({ brewedCount: 0, state: noIngredient })

    const noBottle = brewingState({ ingredient: itemStack('sugar', 1), fuelCharges: 1, brewProgressSecs: 4 })
    expect(advanceBrewing(noBottle, 1)).toEqual({ brewedCount: 0, state: brewingState({ ingredient: noBottle.ingredient, fuelCharges: 1 }) })

    const noRecipe = brewingState({ bottles: [itemStack('water_bottle', 1), undefined, undefined], ingredient: itemStack('sugar', 1), fuelCharges: 1, brewProgressSecs: 4 })
    expect(advanceBrewing(noRecipe, 1)).toEqual({ brewedCount: 0, state: brewingState({ bottles: noRecipe.bottles, ingredient: noRecipe.ingredient, fuelCharges: 1 }) })

    const noFuel = brewingState({ bottles: [itemStack('awkward_potion', 1), undefined, undefined], ingredient: itemStack('sugar', 1), brewProgressSecs: 4 })
    expect(advanceBrewing(noFuel, 1)).toEqual({ brewedCount: 0, state: noFuel })
    expect(advanceBrewing(validState(), 0)).toEqual({ brewedCount: 0, state: validState() })
  })

  it('advances partial progress and converts every occupied bottle', () => {
    const partial = advanceBrewing({ ...validState(), fuelCharges: 2 }, 5, [recipe])
    expect(partial).toEqual({ brewedCount: 0, state: { ...validState(), fuelCharges: 2, brewProgressSecs: 5 } })

    const complete = advanceBrewing(partial.state, 15, [recipe])
    expect(complete).toEqual({
      brewedCount: 1,
      state: brewingState({
        bottles: [itemStack('potion_of_swiftness', 1), undefined, itemStack('potion_of_swiftness', 1)],
        ingredient: undefined,
        fuel: itemStack('blaze_powder', 2),
        fuelCharges: 1,
      }),
    })

    const otherRecipe: BrewingRecipe = { ...recipe, ingredient: 'nether_wart' }
    const indexedRecipes = [
      ...Array.from({ length: 63 }, (_, index) => ({
        ...otherRecipe,
        id: `minecraft:filler_brew_${index}`,
      })),
      recipe,
    ]
    const indexed = advanceBrewing(validState(), BREWING_TIME_SECS, indexedRecipes)
    expect(indexed.brewedCount).toBe(1)
    expect(indexed.state.bottles[0]?.item).toBe('potion_of_swiftness')

    const middleBottle = advanceBrewing(
      brewingState({
        bottles: [undefined, itemStack('awkward_potion', 1), undefined],
        ingredient: itemStack('sugar', 1),
        fuelCharges: 1,
      }),
      BREWING_TIME_SECS,
      [recipe],
    )
    expect(middleBottle.state.bottles).toEqual([undefined, itemStack('potion_of_swiftness', 1), undefined])
  })

  it('handles exact and zero steps plus invalid elapsed time', () => {
    const exact = advanceBrewing(validState(), BREWING_TIME_SECS, [recipe])
    expect(exact.brewedCount).toBe(1)
    expect(exact.state.brewProgressSecs).toBe(0)

    const atLimit = brewingState({ bottles: [itemStack('awkward_potion', 1), undefined, undefined], ingredient: itemStack('sugar', 1), fuelCharges: 1, brewProgressSecs: BREWING_TIME_SECS })
    expect(advanceBrewing(atLimit, 1, [recipe])).toEqual({ brewedCount: 0, state: atLimit })
    expect(() => advanceBrewing(validState(), -1)).toThrow(RangeError)
    expect(() => advanceBrewing(validState(), Number.POSITIVE_INFINITY)).toThrow(RangeError)
    expect(() => Reflect.apply(advanceBrewing, undefined, [[], 1])).toThrow(TypeError)
    expect(() => advanceBrewing({ ...validState(), brewProgressSecs: BREWING_TIME_SECS + 1 }, 0)).toThrow(RangeError)
    expect(() => Reflect.apply(advanceBrewing, undefined, [validState(), 1, null])).toThrow(TypeError)
  })

  it('accepts the built-in table', () => {
    expect(VANILLA_BREWING_RECIPES.length).toBeGreaterThan(3)
    const result = advanceBrewing(
      brewingState({ bottles: [itemStack('water_bottle', 1), undefined, undefined], ingredient: itemStack('nether_wart', 1), fuelCharges: 1 }),
      BREWING_TIME_SECS,
    )
    expect(result.state.bottles[0]).toEqual(itemStack('awkward_potion', 1))
  })
})
