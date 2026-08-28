import { describe, expect, it } from 'vitest'

import { itemStack } from '../src/domain/item-stack'
import {
  COOKING_STATIONS,
  VANILLA_FUEL_RULES,
  VANILLA_SMELTING_RECIPES,
  advanceFurnace,
  emptyFurnaceState,
  furnaceState,
  matchSmeltingRecipe,
} from '../src/domain/smelting'
import type { FuelRule, SmeltingRecipe } from '../src/domain/smelting'
import {
  buildFuelIndex,
  buildSmeltingIndexes,
  cachedFuelIndex,
} from '../src/domain/smelting-indexes'

const recipe: SmeltingRecipe = {
  _tag: 'Smelting',
  id: 'minecraft:test',
  input: 'cobblestone',
  output: itemStack('stone', 1),
  cookTimeSecs: 10,
  experience: 0.25,
  stations: ['furnace'],
}

const shortFuel: FuelRule = { fuel: 'oak_planks', burnTimeSecs: 5 }

const validState = () => furnaceState({ input: itemStack('cobblestone', 1), fuel: itemStack('coal', 1) })

describe('smelting data and state', () => {
  it('constructs default and custom furnace states', () => {
    expect(COOKING_STATIONS).toEqual(['furnace', 'blast_furnace', 'smoker'])
    expect(emptyFurnaceState()).toEqual({
      station: 'furnace',
      input: undefined,
      fuel: undefined,
      output: undefined,
      fuelTimeRemainingSecs: 0,
      fuelTimeTotalSecs: 0,
      cookProgressSecs: 0,
    })
    expect(furnaceState({ station: 'blast_furnace', fuelTimeRemainingSecs: 2, fuelTimeTotalSecs: 5, cookProgressSecs: 1 })).toEqual({
      station: 'blast_furnace',
      input: undefined,
      fuel: undefined,
      output: undefined,
      fuelTimeRemainingSecs: 2,
      fuelTimeTotalSecs: 5,
      cookProgressSecs: 1,
    })
  })

  it('matches supported recipes and validates recipe tables', () => {
    expect(matchSmeltingRecipe(undefined, 'furnace')).toBeUndefined()
    expect(matchSmeltingRecipe(itemStack('cobblestone', 1), 'furnace')).toMatchObject({ id: 'minecraft:stone' })
    expect(matchSmeltingRecipe(itemStack('iron_ore', 1), 'blast_furnace')).toMatchObject({ id: 'minecraft:iron_ingot_from_iron_ore' })
    expect(matchSmeltingRecipe(itemStack('cobblestone', 1), 'smoker')).toBeUndefined()
    expect(matchSmeltingRecipe(itemStack('cobblestone', 1), 'furnace', [recipe])).toBe(recipe)
    expect(() => Reflect.apply(matchSmeltingRecipe, undefined, [itemStack('cobblestone', 1), 'invalid'])).toThrow(TypeError)
    expect(() => Reflect.apply(matchSmeltingRecipe, undefined, [{}, 'furnace'])).toThrow(TypeError)
    expect(() => Reflect.apply(matchSmeltingRecipe, undefined, [undefined, 'furnace', {}])).toThrow(TypeError)

    const invalidRecipes: unknown[] = [
      null,
      [],
      { ...recipe, _tag: 'Other' },
      { ...recipe, id: ' ' },
      { ...recipe, input: 'unknown' },
      { ...recipe, output: {} },
      { ...recipe, cookTimeSecs: 0 },
      { ...recipe, cookTimeSecs: Number.NaN },
      { ...recipe, experience: -1 },
      { ...recipe, experience: Number.NaN },
      { ...recipe, stations: [] },
      { ...recipe, stations: undefined },
      { ...recipe, stations: ['invalid'] },
    ]
    expect(() => Reflect.apply(matchSmeltingRecipe, undefined, [undefined, 'furnace', invalidRecipes[0]])).toThrow(TypeError)
    expect(() => Reflect.apply(matchSmeltingRecipe, undefined, [undefined, 'furnace', [invalidRecipes[1]]])).toThrow(TypeError)
    for (const invalid of invalidRecipes.slice(2)) {
      expect(() => Reflect.apply(matchSmeltingRecipe, undefined, [undefined, 'furnace', [invalid]])).toThrow()
    }
  })

  it('keeps the first indexed recipe and fuel rule for duplicate keys', () => {
    const duplicateRecipe: SmeltingRecipe = { ...recipe, id: 'minecraft:test_duplicate' }
    const recipeIndex = buildSmeltingIndexes([recipe, duplicateRecipe])
    expect(recipeIndex.furnace.get('cobblestone')).toBe(recipe)

    const duplicateFuel: FuelRule = { ...shortFuel, burnTimeSecs: 10 }
    const fuelIndex = buildFuelIndex([shortFuel, duplicateFuel])
    expect(fuelIndex.get('oak_planks')).toBe(shortFuel)
  })

  it('reuses and invalidates custom fuel indexes', () => {
    const fuels: FuelRule[] = Array.from({ length: 8 }, (_, index) => ({
      burnTimeSecs: index + 1,
      fuel: 'stick',
    }))
    const firstFuelIndex = cachedFuelIndex(fuels)
    expect(cachedFuelIndex(fuels)).toBe(firstFuelIndex)

    const firstFuel = fuels[0]
    if (firstFuel === undefined) throw new Error('Test fixture must contain a fuel rule')
    Object.assign(firstFuel, { fuel: 'coal' })
    const fuelChangedIndex = cachedFuelIndex(fuels)
    expect(fuelChangedIndex).not.toBe(firstFuelIndex)
    expect(fuelChangedIndex.get('coal')).toBe(firstFuel)

    fuels[0] = { burnTimeSecs: 3, fuel: 'coal_block' }
    const replacedFuelIndex = cachedFuelIndex(fuels)
    expect(replacedFuelIndex).not.toBe(fuelChangedIndex)
    expect(replacedFuelIndex.get('coal_block')).toBe(fuels[0])

    fuels.pop()
    expect(cachedFuelIndex(fuels)).not.toBe(replacedFuelIndex)
  })

  it('rejects malformed furnace states, recipes, and fuels', () => {
    expect(() => Reflect.apply(furnaceState, undefined, [null])).toThrow(TypeError)
    expect(() => Reflect.apply(furnaceState, undefined, [[]])).toThrow(TypeError)
    expect(() => Reflect.apply(furnaceState, undefined, [{ station: 'invalid' }])).toThrow(TypeError)
    expect(() => Reflect.apply(furnaceState, undefined, [{ input: {} }])).toThrow(TypeError)
    expect(() => Reflect.apply(furnaceState, undefined, [{ fuel: {} }])).toThrow(TypeError)
    expect(() => Reflect.apply(furnaceState, undefined, [{ output: {} }])).toThrow(TypeError)
    expect(() => furnaceState({ fuelTimeRemainingSecs: -1 })).toThrow(RangeError)
    expect(() => furnaceState({ fuelTimeTotalSecs: Number.NaN })).toThrow(RangeError)
    expect(() => furnaceState({ cookProgressSecs: Number.POSITIVE_INFINITY })).toThrow(RangeError)
    expect(() => furnaceState({ fuelTimeRemainingSecs: 3, fuelTimeTotalSecs: 2 })).toThrow(RangeError)

    expect(() => Reflect.apply(advanceFurnace, undefined, [[], 1])).toThrow(TypeError)
    expect(() => advanceFurnace(validState(), -1)).toThrow(RangeError)
    expect(() => advanceFurnace(validState(), Number.NaN)).toThrow(RangeError)
    expect(() => advanceFurnace(validState(), Number.POSITIVE_INFINITY)).toThrow(RangeError)
    expect(() => Reflect.apply(advanceFurnace, undefined, [validState(), 1, 'invalid'])).toThrow(TypeError)
    expect(() => Reflect.apply(advanceFurnace, undefined, [{ ...validState(), station: 'invalid' }, 0])).toThrow(TypeError)
    expect(() => advanceFurnace({ ...validState(), fuelTimeRemainingSecs: 3, fuelTimeTotalSecs: 2 }, 0)).toThrow(RangeError)
    expect(() => Reflect.apply(advanceFurnace, undefined, [validState(), 1, [], [{}]])).toThrow(TypeError)
    expect(() => Reflect.apply(advanceFurnace, undefined, [validState(), 1, [], null])).toThrow(TypeError)
    expect(() => Reflect.apply(advanceFurnace, undefined, [validState(), 1, [], [null]])).toThrow(TypeError)
    expect(() => Reflect.apply(advanceFurnace, undefined, [validState(), 1, [], [{ fuel: 'unknown', burnTimeSecs: 1 }]])).toThrow(TypeError)
    expect(() => advanceFurnace(validState(), 1, [], [{ fuel: 'coal', burnTimeSecs: 0 }])).toThrow(RangeError)
    expect(() => advanceFurnace(validState(), 1, [], [{ fuel: 'coal', burnTimeSecs: Number.NaN }])).toThrow(RangeError)
    expect(() => Reflect.apply(advanceFurnace, undefined, [validState(), 1, [], [['coal']]])).toThrow(TypeError)
  })
})

describe('furnace advancement', () => {
  it('resets progress when no recipe or output space is available', () => {
    const noInput = furnaceState({ cookProgressSecs: 3, fuelTimeRemainingSecs: 4, fuelTimeTotalSecs: 4 })
    expect(advanceFurnace(noInput, 1).state.cookProgressSecs).toBe(0)

    const wrongOutput = furnaceState({ input: itemStack('cobblestone', 1), output: itemStack('dirt', 1), cookProgressSecs: 3 })
    expect(advanceFurnace(wrongOutput, 1).state.cookProgressSecs).toBe(0)

    const fullOutput = furnaceState({ input: itemStack('cobblestone', 1), output: itemStack('stone', 64) })
    expect(advanceFurnace(fullOutput, 1).state.cookProgressSecs).toBe(0)

    const noFuel = furnaceState({ input: itemStack('cobblestone', 1), cookProgressSecs: 3 })
    expect(advanceFurnace(noFuel, 1).state).toEqual(noFuel)
    expect(advanceFurnace(noFuel, 0)).toEqual({ experienceGained: 0, smeltedCount: 0, state: noFuel })
  })

  it('consumes fuel and smelts one or more items', () => {
    const one = advanceFurnace(validState(), 10)
    expect(one).toEqual({
      experienceGained: 0.1,
      smeltedCount: 1,
      state: furnaceState({ input: undefined, fuel: undefined, output: itemStack('stone', 1), fuelTimeRemainingSecs: 70, fuelTimeTotalSecs: 80 }),
    })

    const many = advanceFurnace(furnaceState({ input: itemStack('cobblestone', 2), fuel: itemStack('coal', 2) }), 20)
    expect(many).toEqual({
      experienceGained: 0.2,
      smeltedCount: 2,
      state: furnaceState({ input: undefined, fuel: itemStack('coal', 1), output: itemStack('stone', 2), fuelTimeRemainingSecs: 60, fuelTimeTotalSecs: 80 }),
    })

    const existing = advanceFurnace(furnaceState({ input: itemStack('cobblestone', 1), fuel: itemStack('coal', 1), output: itemStack('stone', 63) }), 10)
    expect(existing.state.output).toEqual(itemStack('stone', 64))
  })

  it('handles partial fuel, progress, station restrictions, and unusual progress', () => {
    const partial = advanceFurnace(furnaceState({ input: itemStack('cobblestone', 1), fuel: itemStack('oak_planks', 2) }), 5, [recipe], [shortFuel])
    expect(partial).toEqual({
      experienceGained: 0,
      smeltedCount: 0,
      state: furnaceState({ input: itemStack('cobblestone', 1), fuel: itemStack('oak_planks', 1), fuelTimeRemainingSecs: 0, fuelTimeTotalSecs: 5, cookProgressSecs: 5 }),
    })

    const indexedFuel = advanceFurnace(
      furnaceState({ input: itemStack('cobblestone', 1), fuel: itemStack('oak_planks', 2) }),
      5,
      [recipe],
      [
        ...Array.from({ length: 7 }, () => ({ fuel: 'stick' as const, burnTimeSecs: 1 })),
        shortFuel,
      ],
    )
    expect(indexedFuel.state.fuelTimeTotalSecs).toBe(5)

    const resumed = advanceFurnace(partial.state, 5, [recipe], [shortFuel])
    expect(resumed.state.output).toEqual(itemStack('stone', 1))
    expect(resumed.state.cookProgressSecs).toBe(0)

    const smoker = furnaceState({ station: 'smoker', input: itemStack('cobblestone', 1), fuel: itemStack('coal', 1), cookProgressSecs: 2 })
    expect(advanceFurnace(smoker, 1).state.cookProgressSecs).toBe(0)

    const overProgress = furnaceState({ input: itemStack('cobblestone', 1), fuel: itemStack('coal', 1), fuelTimeRemainingSecs: 5, fuelTimeTotalSecs: 5, cookProgressSecs: 11 })
    expect(advanceFurnace(overProgress, 1).state).toEqual(overProgress)
  })

  it('supports custom cooking time and experience', () => {
    const custom: SmeltingRecipe = { ...recipe, cookTimeSecs: 2, experience: 1.5 }
    const result = advanceFurnace(furnaceState({ input: itemStack('cobblestone', 1), fuel: itemStack('stick', 1) }), 2, [custom], VANILLA_FUEL_RULES)
    expect(result.smeltedCount).toBe(1)
    expect(result.experienceGained).toBe(1.5)
    expect(result.state.output).toEqual(itemStack('stone', 1))
  })

  it('accepts the built-in tables as valid data', () => {
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
    expect(advanceFurnace(furnaceState({ input: itemStack('sand', 1), fuel: itemStack('coal', 1) }), 10).state.output).toEqual(itemStack('glass', 1))
  })
})
