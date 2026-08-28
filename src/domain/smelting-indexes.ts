import type {
  CookingStation,
  FuelRule,
  FuelRuleTable,
  SmeltingRecipe,
  SmeltingRecipeTable,
} from './smelting-data.js'
import type { ItemType } from './item-type.js'

type MutableSmeltingIndexes = {
  [station in CookingStation]: Map<ItemType, SmeltingRecipe>
}

export type SmeltingIndexes = {
  readonly [station in CookingStation]: ReadonlyMap<ItemType, SmeltingRecipe>
}

type FuelIndexCache = {
  readonly rules: readonly FuelRule[]
  readonly fuels: readonly ItemType[]
  readonly index: ReadonlyMap<ItemType, FuelRule>
}

const FUEL_INDEX_CACHE = new WeakMap<FuelRuleTable, FuelIndexCache>()

export const buildSmeltingIndexes = (recipes: SmeltingRecipeTable): SmeltingIndexes => {
  const indexes: MutableSmeltingIndexes = {
    furnace: new Map<ItemType, SmeltingRecipe>(),
    blast_furnace: new Map<ItemType, SmeltingRecipe>(),
    smoker: new Map<ItemType, SmeltingRecipe>(),
  }
  for (const recipe of recipes) {
    for (const station of recipe.stations) {
      const index = indexes[station]
      if (!index.has(recipe.input)) {
        index.set(recipe.input, recipe)
      }
    }
  }
  return indexes
}

export const buildFuelIndex = (fuels: FuelRuleTable): ReadonlyMap<ItemType, FuelRule> => {
  const index = new Map<ItemType, FuelRule>()
  for (const rule of fuels) {
    if (!index.has(rule.fuel)) {
      index.set(rule.fuel, rule)
    }
  }
  return index
}

const fuelCacheMatches = (fuels: FuelRuleTable, cache: FuelIndexCache): boolean => {
  if (fuels.length !== cache.rules.length) {
    return false
  }
  let index = 0
  for (const rule of fuels) {
    if (rule !== cache.rules[index] || rule.fuel !== cache.fuels[index]) {
      return false
    }
    index += 1
  }
  return true
}

export const cachedFuelIndex = (fuels: FuelRuleTable): ReadonlyMap<ItemType, FuelRule> => {
  const cached = FUEL_INDEX_CACHE.get(fuels)
  if (cached !== undefined && fuelCacheMatches(fuels, cached)) {
    return cached.index
  }

  const index = buildFuelIndex(fuels)
  FUEL_INDEX_CACHE.set(fuels, {
    fuels: fuels.map((rule) => rule.fuel),
    index,
    rules: fuels.slice(),
  })
  return index
}
