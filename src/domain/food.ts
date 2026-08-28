import {
  foodDefinitionOf,
  type FoodDefinition,
  type FoodEffect,
} from './food-data.js'
import { itemStack, itemStackWithCount, type ItemStack } from './item-stack.js'
import type { Vitals } from './vitals-model.js'
import { eat } from './vitals-hunger.js'

export {
  FOOD_DEFINITION_BY_ITEM,
  foodDefinitionOf,
  VANILLA_FOOD_DEFINITIONS,
  type FoodDefinition,
  type FoodEffect,
  type FoodRemoveEffect,
  type FoodStatusEffect,
  type FoodStatusEffectName,
  type FoodTeleportEffect,
} from './food-data.js'

export type FoodConsumeResult =
  | Readonly<{
      readonly consumed: false
      readonly reason: 'not_food'
      readonly remainingStack: ItemStack
      readonly remainderStack: undefined
      readonly vitals: Vitals
      readonly definition: undefined
      readonly effects: ReadonlyArray<FoodEffect>
    }>
  | Readonly<{
      readonly consumed: false
      readonly reason: 'hunger_full'
      readonly remainingStack: ItemStack
      readonly remainderStack: undefined
      readonly vitals: Vitals
      readonly definition: FoodDefinition
      readonly effects: ReadonlyArray<FoodEffect>
    }>
  | Readonly<{
      readonly consumed: true
      readonly remainingStack: ItemStack | undefined
      readonly remainderStack: ItemStack | undefined
      readonly vitals: Vitals
      readonly definition: FoodDefinition
      readonly effects: ReadonlyArray<FoodEffect>
    }>

const NO_FOOD_EFFECTS: ReadonlyArray<FoodEffect> = []

export const canEatFood = (vitals: Vitals, definition: FoodDefinition): boolean =>
  definition.canAlwaysEat || vitals.hungerPoints < vitals.maxHungerPoints

export const foodRemainderOf = (definition: FoodDefinition): ItemStack | undefined =>
  definition.useRemainder === undefined
    ? undefined
    : itemStack(definition.useRemainder, 1)

export const consumeFood = (stack: ItemStack, vitals: Vitals): FoodConsumeResult => {
  const definition = foodDefinitionOf(stack.item)
  if (definition === undefined) {
    return {
      consumed: false,
      reason: 'not_food',
      remainingStack: stack,
      remainderStack: undefined,
      vitals,
      definition: undefined,
      effects: NO_FOOD_EFFECTS,
    }
  }

  if (!canEatFood(vitals, definition)) {
    return {
      consumed: false,
      reason: 'hunger_full',
      remainingStack: stack,
      remainderStack: undefined,
      vitals,
      definition,
      effects: NO_FOOD_EFFECTS,
    }
  }

  return {
    consumed: true,
    remainingStack: stack.count === 1 ? undefined : itemStackWithCount(stack, stack.count - 1),
    remainderStack: foodRemainderOf(definition),
    vitals: eat(vitals, definition.nutrition, definition.saturation),
    definition,
    effects: definition.effects,
  }
}
