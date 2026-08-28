import type { BrewingRecipe, BrewingRecipeTable } from './brewing-data.js'
import type { ItemType } from './item-type.js'

export type BrewingRecipeIndex = ReadonlyMap<ItemType, ReadonlyMap<ItemType, BrewingRecipe>>

type BrewingRecipeIndexCache = {
  readonly recipes: readonly BrewingRecipe[]
  readonly inputs: readonly ItemType[]
  readonly ingredients: readonly ItemType[]
  readonly index: BrewingRecipeIndex
}

const BREWING_RECIPE_INDEX_CACHE = new WeakMap<BrewingRecipeTable, BrewingRecipeIndexCache>()

export const buildBrewingRecipeIndex = (recipes: BrewingRecipeTable): BrewingRecipeIndex => {
  const byIngredient = new Map<ItemType, Map<ItemType, BrewingRecipe>>()
  for (const recipe of recipes) {
    let byInput = byIngredient.get(recipe.ingredient)
    if (byInput === undefined) {
      byInput = new Map<ItemType, BrewingRecipe>()
      byIngredient.set(recipe.ingredient, byInput)
    }
    if (!byInput.has(recipe.input)) {
      byInput.set(recipe.input, recipe)
    }
  }
  return byIngredient
}

const cacheMatches = (recipes: BrewingRecipeTable, cache: BrewingRecipeIndexCache): boolean => {
  if (recipes.length !== cache.recipes.length) {
    return false
  }
  let index = 0
  for (const recipe of recipes) {
    if (
      recipe !== cache.recipes[index] ||
      recipe.input !== cache.inputs[index] ||
      recipe.ingredient !== cache.ingredients[index]
    ) {
      return false
    }
    index += 1
  }
  return true
}

export const cachedBrewingRecipeIndex = (recipes: BrewingRecipeTable): BrewingRecipeIndex => {
  const cached = BREWING_RECIPE_INDEX_CACHE.get(recipes)
  if (cached !== undefined && cacheMatches(recipes, cached)) {
    return cached.index
  }

  const index = buildBrewingRecipeIndex(recipes)
  BREWING_RECIPE_INDEX_CACHE.set(recipes, {
    index,
    ingredients: recipes.map((recipe) => recipe.ingredient),
    inputs: recipes.map((recipe) => recipe.input),
    recipes: recipes.slice(),
  })
  return index
}
