import { Brand, Result } from 'effect'
import { itemStack } from '../item/item-stack.js'
import type { ItemStack, Slot } from '../item/item-stack.js'
import type { ItemType } from '../item/item-type.js'
import { StackCount, FixedDurationSecs } from '../time/quantities.js'
import type { FixedDurationSecs as FixedDurationSecsValue } from '../time/quantities.js'
import { RecipeId } from './recipe-data.js'
import type {
  RecipeCompletionCount as RecipeCompletionCountValue,
  RecipeId as RecipeIdValue,
} from './recipe-data.js'
import { recipeItemFailure, type RecipeFailure } from './recipe-error.js'

export const BREWING_BOTTLE_SLOTS = 3
export const BREWING_TIME_SECS: FixedDurationSecsValue = FixedDurationSecs(20)
const BREWING_FUEL_CHARGES_MIN = 0
const BREWING_FUEL_CHARGES_MAX = 20

export type BrewingFuelCharges = number & Brand.Brand<'BrewingFuelCharges'>

export const BrewingFuelCharges: Brand.Constructor<BrewingFuelCharges> =
  Brand.make<BrewingFuelCharges>((value) =>
    Number.isSafeInteger(value) &&
    value >= BREWING_FUEL_CHARGES_MIN &&
    value <= BREWING_FUEL_CHARGES_MAX
      ? true
      : `BrewingFuelCharges must be an integer in [${BREWING_FUEL_CHARGES_MIN}, ${BREWING_FUEL_CHARGES_MAX}], received ${value}`,
  )

export const BREWING_MAX_FUEL_CHARGES: BrewingFuelCharges = BrewingFuelCharges(20)
export const BREWING_FUEL_ITEM: ItemType = 'blaze_powder'

export type BrewingRecipe = {
  readonly _tag: 'Brewing'
  readonly id: RecipeIdValue
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
  readonly fuelCharges: BrewingFuelCharges
  readonly brewProgressSecs: FixedDurationSecsValue
}

export type BrewingStateInput = {
  readonly bottles?: ReadonlyArray<Slot>
  readonly ingredient?: Slot
  readonly fuel?: Slot
  readonly fuelCharges?: BrewingFuelCharges
  readonly brewProgressSecs?: FixedDurationSecsValue
}

export type BrewingAdvanceResult = {
  readonly state: BrewingState
  readonly brewedCount: RecipeCompletionCountValue
}

const brewingRecipe = (id: string, input: ItemType, ingredient: ItemType, output: ItemType): BrewingRecipe => ({
  _tag: 'Brewing',
  id: RecipeId(id),
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

export const brewingOutput = (
  recipe: BrewingRecipe,
): Result.Result<ItemStack, RecipeFailure> =>
  Result.mapError(itemStack(recipe.output, StackCount(1)), recipeItemFailure)
