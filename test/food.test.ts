import { describe, expect, it } from 'vitest'
import {
  canEatFood,
  consumeFood,
  foodDefinitionOf,
  foodRemainderOf,
  FOOD_DEFINITION_BY_ITEM,
  VANILLA_FOOD_DEFINITIONS,
  type FoodDefinition,
} from '../src/domain/food'
import { itemStack } from '../src/domain/item-stack'
import { SPAWN_VITALS, type Vitals } from '../src/domain/vitals'

const vitalsWith = (changes: Partial<Vitals> = {}): Vitals => ({
  ...SPAWN_VITALS,
  ...changes,
})

const EXPECTED_FOOD_DEFINITIONS = [
  {
    item: 'cod',
    nutrition: 2,
    saturation: 0.4,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'salmon',
    nutrition: 2,
    saturation: 0.4,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'tropical_fish',
    nutrition: 1,
    saturation: 0.2,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'pufferfish',
    nutrition: 1,
    saturation: 0.2,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [
      { kind: 'status', name: 'poison', chance: 1, durationSecs: 60, amplifier: 1 },
      { kind: 'status', name: 'nausea', chance: 1, durationSecs: 15, amplifier: 1 },
      { kind: 'status', name: 'hunger', chance: 1, durationSecs: 15, amplifier: 2 },
    ],
  },
  {
    item: 'potato',
    nutrition: 1,
    saturation: 0.6,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'rotten_flesh',
    nutrition: 4,
    saturation: 0.8,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [{ kind: 'status', name: 'hunger', chance: 0.8, durationSecs: 30, amplifier: 0 }],
  },
  {
    item: 'spider_eye',
    nutrition: 2,
    saturation: 3.2,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [{ kind: 'status', name: 'poison', chance: 1, durationSecs: 5, amplifier: 0 }],
  },
  {
    item: 'apple',
    nutrition: 4,
    saturation: 2.4,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'baked_potato',
    nutrition: 5,
    saturation: 6,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'beef',
    nutrition: 3,
    saturation: 1.8,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'beetroot',
    nutrition: 1,
    saturation: 1.2,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'beetroot_soup',
    nutrition: 6,
    saturation: 7.2,
    canAlwaysEat: false,
    useRemainder: 'bowl',
    effects: [],
  },
  {
    item: 'bread',
    nutrition: 5,
    saturation: 6,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'carrot',
    nutrition: 3,
    saturation: 3.6,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'chicken',
    nutrition: 2,
    saturation: 1.2,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [{ kind: 'status', name: 'hunger', chance: 0.3, durationSecs: 30, amplifier: 0 }],
  },
  {
    item: 'chorus_fruit',
    nutrition: 4,
    saturation: 2.4,
    canAlwaysEat: true,
    useRemainder: undefined,
    effects: [{ kind: 'teleport', chance: 1 }],
  },
  {
    item: 'cooked_beef',
    nutrition: 8,
    saturation: 12.8,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'cooked_chicken',
    nutrition: 6,
    saturation: 7.2,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'cooked_cod',
    nutrition: 5,
    saturation: 6,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'cooked_mutton',
    nutrition: 6,
    saturation: 9.6,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'cooked_porkchop',
    nutrition: 8,
    saturation: 12.8,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'cooked_rabbit',
    nutrition: 5,
    saturation: 6,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'cooked_salmon',
    nutrition: 6,
    saturation: 9.6,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'cookie',
    nutrition: 2,
    saturation: 0.4,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'dried_kelp',
    nutrition: 1,
    saturation: 0.6,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'enchanted_golden_apple',
    nutrition: 4,
    saturation: 9.6,
    canAlwaysEat: true,
    useRemainder: undefined,
    effects: [
      { kind: 'status', name: 'regeneration', chance: 1, durationSecs: 20, amplifier: 1 },
      { kind: 'status', name: 'absorption', chance: 1, durationSecs: 120, amplifier: 3 },
      { kind: 'status', name: 'fire_resistance', chance: 1, durationSecs: 300, amplifier: 0 },
      { kind: 'status', name: 'resistance', chance: 1, durationSecs: 300, amplifier: 0 },
    ],
  },
  {
    item: 'glow_berries',
    nutrition: 2,
    saturation: 0.4,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'golden_apple',
    nutrition: 4,
    saturation: 9.6,
    canAlwaysEat: true,
    useRemainder: undefined,
    effects: [
      { kind: 'status', name: 'regeneration', chance: 1, durationSecs: 5, amplifier: 1 },
      { kind: 'status', name: 'absorption', chance: 1, durationSecs: 120, amplifier: 0 },
    ],
  },
  {
    item: 'golden_carrot',
    nutrition: 6,
    saturation: 14.4,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'honey_bottle',
    nutrition: 6,
    saturation: 1.2,
    canAlwaysEat: false,
    useRemainder: 'glass_bottle',
    effects: [{ kind: 'remove', name: 'poison', chance: 1 }],
  },
  {
    item: 'melon_slice',
    nutrition: 2,
    saturation: 1.2,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'mushroom_stew',
    nutrition: 6,
    saturation: 7.2,
    canAlwaysEat: false,
    useRemainder: 'bowl',
    effects: [],
  },
  {
    item: 'mutton',
    nutrition: 2,
    saturation: 1.2,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'poisonous_potato',
    nutrition: 2,
    saturation: 1.2,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [{ kind: 'status', name: 'poison', chance: 0.6, durationSecs: 5, amplifier: 0 }],
  },
  {
    item: 'porkchop',
    nutrition: 3,
    saturation: 1.8,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'pumpkin_pie',
    nutrition: 8,
    saturation: 4.8,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'rabbit',
    nutrition: 3,
    saturation: 1.8,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
  {
    item: 'rabbit_stew',
    nutrition: 10,
    saturation: 12,
    canAlwaysEat: false,
    useRemainder: 'bowl',
    effects: [],
  },
  {
    item: 'sweet_berries',
    nutrition: 2,
    saturation: 0.4,
    canAlwaysEat: false,
    useRemainder: undefined,
    effects: [],
  },
] as const satisfies ReadonlyArray<FoodDefinition>

const convertibleFood: FoodDefinition = {
  item: 'potato',
  nutrition: 1,
  saturation: 0.6,
  canAlwaysEat: false,
  useRemainder: 'bowl',
  effects: [],
}

describe('food data', () => {
  it('publishes the fixed-stat food roster and normalized effects', () => {
    expect(VANILLA_FOOD_DEFINITIONS).toStrictEqual(EXPECTED_FOOD_DEFINITIONS)
    expect(FOOD_DEFINITION_BY_ITEM.size).toBe(EXPECTED_FOOD_DEFINITIONS.length)
    expect(new Set(VANILLA_FOOD_DEFINITIONS.map(({ item }) => item)).size).toBe(
      EXPECTED_FOOD_DEFINITIONS.length,
    )
    for (const expected of EXPECTED_FOOD_DEFINITIONS) {
      expect(foodDefinitionOf(expected.item)).toStrictEqual(expected)
    }
    expect(foodDefinitionOf('bowl')).toBeUndefined()
  })

  it('resolves validated remainder stacks', () => {
    expect(foodRemainderOf({ ...convertibleFood, useRemainder: undefined })).toBeUndefined()
    expect(foodRemainderOf(convertibleFood)).toEqual(itemStack('bowl', 1))
  })
})

describe('food consumption', () => {
  it('allows always-edible food and rejects a normal food at full hunger', () => {
    expect(
      canEatFood(vitalsWith({ hungerPoints: 20 }), {
        ...convertibleFood,
        canAlwaysEat: true,
      }),
    ).toBe(true)
    expect(canEatFood(vitalsWith({ hungerPoints: 20 }), convertibleFood)).toBe(false)
    expect(canEatFood(vitalsWith({ hungerPoints: 19 }), convertibleFood)).toBe(true)
    const goldenApple = foodDefinitionOf('golden_apple')
    if (goldenApple === undefined) throw new Error('golden apple should be registered')
    expect(canEatFood(vitalsWith({ hungerPoints: 20 }), goldenApple)).toBe(true)
  })

  it('returns the unchanged stack for non-food items', () => {
    const stack = itemStack('bowl', 1)
    const result = consumeFood(stack, SPAWN_VITALS)

    expect(result).toEqual({
      consumed: false,
      reason: 'not_food',
      remainingStack: stack,
      remainderStack: undefined,
      vitals: SPAWN_VITALS,
      definition: undefined,
      effects: [],
    })
  })

  it('returns the unchanged stack when normal food cannot be eaten', () => {
    const stack = itemStack('cod', 2)
    const result = consumeFood(stack, SPAWN_VITALS)

    expect(result).toEqual({
      consumed: false,
      reason: 'hunger_full',
      remainingStack: stack,
      remainderStack: undefined,
      vitals: SPAWN_VITALS,
      definition: foodDefinitionOf('cod'),
      effects: [],
    })
  })

  it('applies nutrition and consumes one item from a stack', () => {
    const result = consumeFood(
      itemStack('cod', 2),
      vitalsWith({ hungerPoints: 10, saturation: 0 }),
    )

    expect(result.consumed).toBe(true)
    expect(result.remainingStack).toEqual(itemStack('cod', 1))
    expect(result.remainderStack).toBeUndefined()
    expect(result.vitals.hungerPoints).toBe(12)
    expect(result.vitals.saturation).toBeCloseTo(0.4)
    expect(result.effects).toEqual([])
  })

  it('returns status effects and removes a single-item stack', () => {
    const result = consumeFood(
      itemStack('pufferfish', 1),
      vitalsWith({ hungerPoints: 10, saturation: 0 }),
    )

    if (!result.consumed) throw new Error('pufferfish should be consumed')
    expect(result.remainingStack).toBeUndefined()
    expect(result.definition.item).toBe('pufferfish')
    expect(result.effects).toEqual([
      { kind: 'status', name: 'poison', chance: 1, durationSecs: 60, amplifier: 1 },
      { kind: 'status', name: 'nausea', chance: 1, durationSecs: 15, amplifier: 1 },
      { kind: 'status', name: 'hunger', chance: 1, durationSecs: 15, amplifier: 2 },
    ])
  })

  it('returns a use remainder and a non-status effect', () => {
    const result = consumeFood(
      itemStack('honey_bottle', 1),
      vitalsWith({ hungerPoints: 10, saturation: 0 }),
    )

    if (!result.consumed) throw new Error('honey bottle should be consumed')
    expect(result.remainingStack).toBeUndefined()
    expect(result.remainderStack).toEqual(itemStack('glass_bottle', 1))
    expect(result.effects).toEqual([{ kind: 'remove', name: 'poison', chance: 1 }])
  })
})
