import type { Inventory } from './inventory-data.js'
import type { ItemStack } from './item-stack.js'
import type { ItemType } from './item-type.js'
import type { RecipeId } from './recipe-data.js'

export type MissingIngredient = {
  readonly item: ItemType
  readonly short: number
}

export type CraftResult =
  | { readonly _tag: 'Crafted'; readonly recipeId: RecipeId; readonly output: ItemStack }
  | { readonly _tag: 'NoMatch' }
  | { readonly _tag: 'MissingIngredients'; readonly missing: ReadonlyArray<MissingIngredient> }
  | { readonly _tag: 'NoRoom' }

export type CraftOutcome = {
  readonly inventory: Inventory
  readonly result: CraftResult
}
