import { addItemStack, countOf, removeItem } from './inventory.js'
import type { Inventory } from './inventory-data.js'
import type { ItemType } from './item-type.js'
import {
  matchRecipeWithAssignments,
  type CraftGrid,
  type RecipeMatchContext,
  type RecipeTable,
} from './recipe.js'
import type { RecipeIngredientAssignment } from './recipe.js'
import type { CraftOutcome, MissingIngredient } from './crafting-data.js'

export type { CraftOutcome, CraftResult, MissingIngredient } from './crafting-data.js'

const ingredientCosts = (assignments: ReadonlyArray<RecipeIngredientAssignment>): ReadonlyMap<ItemType, number> => {
  const costs = new Map<ItemType, number>()
  for (const assignment of assignments) {
    const current = costs.get(assignment.item) ?? 0
    costs.set(assignment.item, current + assignment.ingredient.count)
  }
  return costs
}

const missingIngredients = (inventory: Inventory, costs: ReadonlyMap<ItemType, number>): ReadonlyArray<MissingIngredient> => {
  const missing: Array<MissingIngredient> = []
  for (const [item, required] of costs) {
    const short = required - countOf(inventory, item)
    if (short > 0) {
      missing.push({ item, short })
    }
  }
  return missing
}

export const craftFromGrid = (
  inventory: Inventory,
  table: RecipeTable,
  grid: CraftGrid,
  context: RecipeMatchContext = {},
): CraftOutcome => {
  const match = matchRecipeWithAssignments(table, grid, context)
  if (match._tag === 'NoMatch') {
    return { inventory, result: { _tag: 'NoMatch' } }
  }

  const costs = ingredientCosts(match.assignments)
  const missing = missingIngredients(inventory, costs)
  if (missing.length > 0) {
    return { inventory, result: { _tag: 'MissingIngredients', missing } }
  }

  let charged = inventory
  for (const [item, count] of costs) {
    charged = removeItem(charged, item, count).inventory
  }
  const added = addItemStack(charged, match.output)
  if (added.leftover > 0) {
    return { inventory, result: { _tag: 'NoRoom' } }
  }
  return {
    inventory: added.inventory,
    result: { _tag: 'Crafted', output: match.output, recipeId: match.recipe.id },
  }
}
