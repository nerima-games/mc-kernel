import { itemStack } from './item-stack.js'
import type { ItemStack, Slot } from './item-stack.js'
import type { ItemType } from './item-type.js'

export const BREWING_BOTTLE_SLOTS = 3
export const BREWING_TIME_SECS = 20
export const BREWING_MAX_FUEL_CHARGES = 20
export const BREWING_FUEL_ITEM: ItemType = 'blaze_powder'

export type BrewingRecipe = {
  readonly _tag: 'Brewing'
  readonly id: string
  readonly input: ItemType
  readonly ingredient: ItemType
  readonly output: ItemType
}

export type BrewingRecipeTable = ReadonlyArray<BrewingRecipe>
export type BrewingBottles = readonly [Slot, Slot, Slot]

export type BrewingState = {
  readonly bottles: BrewingBottles
  readonly ingredient: Slot
  readonly fuel: Slot
  readonly fuelCharges: number
  readonly brewProgressSecs: number
}

export type BrewingStateInput = {
  readonly bottles?: ReadonlyArray<Slot>
  readonly ingredient?: Slot
  readonly fuel?: Slot
  readonly fuelCharges?: number
  readonly brewProgressSecs?: number
}

export type BrewingAdvanceResult = {
  readonly state: BrewingState
  readonly brewedCount: number
}

const brewingRecipe = (id: string, input: ItemType, ingredient: ItemType, output: ItemType): BrewingRecipe => ({
  _tag: 'Brewing',
  id,
  ingredient,
  input,
  output,
})

export const VANILLA_BREWING_RECIPES: BrewingRecipeTable = [
  brewingRecipe('minecraft:awkward_potion', 'water_bottle', 'nether_wart', 'awkward_potion'),
  brewingRecipe('minecraft:swiftness', 'awkward_potion', 'sugar', 'potion_of_swiftness'),
  brewingRecipe('minecraft:poison', 'awkward_potion', 'spider_eye', 'potion_of_poison'),
  brewingRecipe('minecraft:regeneration', 'awkward_potion', 'ghast_tear', 'potion_of_regeneration'),
]

export const brewingOutput = (recipe: BrewingRecipe): ItemStack => itemStack(recipe.output, 1)
