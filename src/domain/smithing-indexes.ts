import type { ItemType } from './item-type.js'
import type { SmithingRecipe, SmithingRecipeTable } from './smithing-data.js'

export type SmithingRecipeIndex = {
  readonly exact: ReadonlyMap<
    ItemType,
    ReadonlyMap<ItemType, ReadonlyMap<ItemType, ReadonlyArray<SmithingRecipe>>>
  >
  readonly fallback: ReadonlyArray<SmithingRecipe>
}

export const buildSmithingRecipeIndex = (recipes: SmithingRecipeTable): SmithingRecipeIndex => {
  const exact = new Map<ItemType, Map<ItemType, Map<ItemType, Array<SmithingRecipe>>>>()
  const fallback: Array<SmithingRecipe> = []

  for (const recipe of recipes) {
    if (
      recipe.template._tag !== 'Exact'
      || recipe.base._tag !== 'Exact'
      || recipe.addition._tag !== 'Exact'
    ) {
      fallback.push(recipe)
      continue
    }

    let byBase = exact.get(recipe.template.item)
    if (byBase === undefined) {
      byBase = new Map<ItemType, Map<ItemType, Array<SmithingRecipe>>>()
      exact.set(recipe.template.item, byBase)
    }

    let byAddition = byBase.get(recipe.base.item)
    if (byAddition === undefined) {
      byAddition = new Map<ItemType, Array<SmithingRecipe>>()
      byBase.set(recipe.base.item, byAddition)
    }

    const candidates = byAddition.get(recipe.addition.item)
    if (candidates === undefined) {
      byAddition.set(recipe.addition.item, [recipe])
    } else {
      candidates.push(recipe)
    }
  }

  return { exact, fallback }
}
