import {
  BREWING_BOTTLE_SLOTS,
  BREWING_FUEL_ITEM,
  BREWING_MAX_FUEL_CHARGES,
  BREWING_TIME_SECS,
  brewingOutput,
  type BrewingAdvanceResult,
  type BrewingBottles,
  type BrewingRecipe,
  type BrewingRecipeTable,
  type BrewingState,
  type BrewingStateInput,
  VANILLA_BREWING_RECIPES,
} from './brewing-data.js'
import { buildBrewingRecipeIndex, cachedBrewingRecipeIndex, type BrewingRecipeIndex } from './brewing-indexes.js'
import { isItemStack, itemStackWithCount, type Slot } from './item-stack.js'
import { isItemType } from './item-type.js'

export {
  BREWING_BOTTLE_SLOTS,
  BREWING_FUEL_ITEM,
  BREWING_MAX_FUEL_CHARGES,
  BREWING_TIME_SECS,
  VANILLA_BREWING_RECIPES,
}
export type {
  BrewingAdvanceResult,
  BrewingBottles,
  BrewingRecipe,
  BrewingRecipeTable,
  BrewingState,
  BrewingStateInput,
}

type RecordValue = {
  readonly _tag?: unknown
  readonly id?: unknown
  readonly input?: unknown
  readonly ingredient?: unknown
  readonly output?: unknown
  readonly bottles?: unknown
  readonly fuel?: unknown
  readonly fuelCharges?: unknown
  readonly brewProgressSecs?: unknown
}

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function assertFiniteNonNegative(value: unknown, field: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new RangeError(`${field} must be a finite, non-negative number`)
  }
}

function assertIntegerRange(value: unknown, minimum: number, maximum: number, field: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${field} must be an integer in [${minimum}, ${maximum}]`)
  }
}

function assertSlot(value: unknown, field: string): asserts value is Slot {
  if (value !== undefined && !isItemStack(value)) {
    throw new TypeError(`${field} must be an ItemStack or undefined`)
  }
}

function assertBottles(value: unknown): asserts value is BrewingBottles {
  if (!Array.isArray(value) || value.length !== BREWING_BOTTLE_SLOTS) {
    throw new TypeError(`Brewing bottles must contain exactly ${BREWING_BOTTLE_SLOTS} slots`)
  }
  value.forEach((bottle, index) => assertSlot(bottle, `Brewing bottle ${index}`))
}

function assertRecipe(value: unknown): asserts value is BrewingRecipe {
  if (!isRecord(value)) {
    throw new TypeError('Brewing recipe must be an object')
  }
  const recipe = value
  if (recipe._tag !== 'Brewing') {
    throw new TypeError('Brewing recipe has an invalid tag')
  }
  if (typeof recipe.id !== 'string' || recipe.id.trim().length === 0) {
    throw new TypeError('Brewing recipe id must be a non-empty string')
  }
  if (!isItemType(recipe.input)) {
    throw new TypeError(`Unknown brewing input item: ${String(recipe.input)}`)
  }
  if (!isItemType(recipe.ingredient)) {
    throw new TypeError(`Unknown brewing ingredient item: ${String(recipe.ingredient)}`)
  }
  if (!isItemType(recipe.output)) {
    throw new TypeError(`Unknown brewing output item: ${String(recipe.output)}`)
  }
}

function assertRecipeTable(recipes: unknown): asserts recipes is BrewingRecipeTable {
  if (!Array.isArray(recipes)) {
    throw new TypeError('Brewing recipes must be an array')
  }
  recipes.forEach(assertRecipe)
}

function assertBrewingState(value: unknown): asserts value is BrewingState {
  if (!isRecord(value)) {
    throw new TypeError('Brewing state must be an object')
  }
  const state = value
  assertBottles(state.bottles)
  assertSlot(state.ingredient, 'Brewing ingredient')
  assertSlot(state.fuel, 'Brewing fuel')
  assertIntegerRange(state.fuelCharges, 0, BREWING_MAX_FUEL_CHARGES, 'Brewing fuelCharges')
  assertFiniteNonNegative(state.brewProgressSecs, 'Brewing brewProgressSecs')
  if (state.brewProgressSecs > BREWING_TIME_SECS) {
    throw new RangeError(`Brewing brewProgressSecs cannot exceed ${BREWING_TIME_SECS}`)
  }
}

export function brewingState(input?: BrewingStateInput): BrewingState
export function brewingState(input: BrewingStateInput = {}): BrewingState {
  if (!isRecord(input)) {
    throw new TypeError('Brewing state input must be an object')
  }
  const bottles = input.bottles ?? [undefined, undefined, undefined]
  assertBottles(bottles)
  const ingredient = input.ingredient
  assertSlot(ingredient, 'Brewing ingredient')
  const fuel = input.fuel
  assertSlot(fuel, 'Brewing fuel')
  const fuelCharges = input.fuelCharges ?? 0
  assertIntegerRange(fuelCharges, 0, BREWING_MAX_FUEL_CHARGES, 'Brewing fuelCharges')
  const brewProgressSecs = input.brewProgressSecs ?? 0
  assertFiniteNonNegative(brewProgressSecs, 'Brewing brewProgressSecs')
  if (brewProgressSecs > BREWING_TIME_SECS) {
    throw new RangeError(`Brewing brewProgressSecs cannot exceed ${BREWING_TIME_SECS}`)
  }
  return {
    bottles: [bottles[0], bottles[1], bottles[2]],
    ingredient,
    fuel,
    fuelCharges,
    brewProgressSecs,
  }
}

export const emptyBrewingState = (): BrewingState => brewingState()

const VANILLA_BREWING_INDEX = buildBrewingRecipeIndex(VANILLA_BREWING_RECIPES)
const BREWING_INDEX_MIN_RECIPES = 64

const recipeIndexFor = (recipes: BrewingRecipeTable): BrewingRecipeIndex | undefined =>
  recipes === VANILLA_BREWING_RECIPES
    ? VANILLA_BREWING_INDEX
    : recipes.length >= BREWING_INDEX_MIN_RECIPES
      ? cachedBrewingRecipeIndex(recipes)
      : undefined

const resolveBrewingRecipeTable = (recipes: unknown): BrewingRecipeTable => {
  if (recipes === VANILLA_BREWING_RECIPES) {
    return VANILLA_BREWING_RECIPES
  }
  assertRecipeTable(recipes)
  return recipes
}

const findBrewingRecipe = (
  bottles: BrewingBottles,
  ingredient: Slot,
  recipes: BrewingRecipeTable,
  recipeIndex: BrewingRecipeIndex | undefined,
): BrewingRecipe | undefined => {
  const firstBottle = bottles[0]
  const secondBottle = bottles[1]
  const thirdBottle = bottles[2]
  const occupiedBottle = firstBottle ?? secondBottle ?? thirdBottle
  if (ingredient === undefined || occupiedBottle === undefined) {
    return undefined
  }
  const ingredientItem = ingredient.item
  const firstBottleItem = occupiedBottle.item
  const recipe = recipeIndex === undefined
    ? recipes.find(
        (candidate) => candidate.ingredient === ingredientItem
          && (firstBottle === undefined || firstBottle.item === candidate.input)
          && (secondBottle === undefined || secondBottle.item === candidate.input)
          && (thirdBottle === undefined || thirdBottle.item === candidate.input),
      )
    : recipeIndex.get(ingredientItem)?.get(firstBottleItem)
  if (recipe === undefined) {
    return undefined
  }
  return (
    (firstBottle === undefined || firstBottle.item === recipe.input) &&
    (secondBottle === undefined || secondBottle.item === recipe.input) &&
    (thirdBottle === undefined || thirdBottle.item === recipe.input)
  ) ? recipe : undefined
}

export function matchBrewingRecipe(
  bottles: BrewingBottles,
  ingredient: Slot,
  recipes?: BrewingRecipeTable,
): BrewingRecipe | undefined
export function matchBrewingRecipe(
  bottles: BrewingBottles,
  ingredient: Slot,
  recipes: BrewingRecipeTable = VANILLA_BREWING_RECIPES,
): BrewingRecipe | undefined {
  assertBottles(bottles)
  assertSlot(ingredient, 'Brewing ingredient')
  const recipeTable = resolveBrewingRecipeTable(recipes)
  return findBrewingRecipe(
    bottles,
    ingredient,
    recipeTable,
    recipeIndexFor(recipeTable),
  )
}

const consumeOne = (stack: Slot): Slot => {
  if (stack === undefined || stack.count === 1) {
    return undefined
  }
  return itemStackWithCount(stack, stack.count - 1)
}

export function addBrewingFuel(state: BrewingState): BrewingState
export function addBrewingFuel(state: BrewingState): BrewingState {
  assertBrewingState(state)
  if (state.fuel === undefined || state.fuel.item !== BREWING_FUEL_ITEM || state.fuelCharges === BREWING_MAX_FUEL_CHARGES) {
    return state
  }
  return {
    ...state,
    fuel: consumeOne(state.fuel),
    fuelCharges: BREWING_MAX_FUEL_CHARGES,
  }
}

export function advanceBrewing(
  state: BrewingState,
  elapsedSecs: number,
  recipes?: BrewingRecipeTable,
): BrewingAdvanceResult
export function advanceBrewing(
  state: BrewingState,
  elapsedSecs: number,
  recipes: BrewingRecipeTable = VANILLA_BREWING_RECIPES,
): BrewingAdvanceResult {
  assertBrewingState(state)
  assertFiniteNonNegative(elapsedSecs, 'Brewing elapsedSecs')
  const recipeTable = resolveBrewingRecipeTable(recipes)
  const recipeIndex = recipeIndexFor(recipeTable)

  let current = state
  let remaining = elapsedSecs
  let brewedCount = 0

  while (remaining > 0) {
    const recipe = findBrewingRecipe(current.bottles, current.ingredient, recipeTable, recipeIndex)
    if (recipe === undefined) {
      current = { ...current, brewProgressSecs: 0 }
      break
    }
    if (current.fuelCharges === 0) {
      break
    }

    const step = Math.min(remaining, BREWING_TIME_SECS - current.brewProgressSecs)
    if (step <= 0) {
      break
    }
    current = {
      ...current,
      brewProgressSecs: current.brewProgressSecs + step,
    }
    remaining -= step

    if (current.brewProgressSecs >= BREWING_TIME_SECS) {
      current = {
        ...current,
        bottles: [
          current.bottles[0] === undefined ? undefined : brewingOutput(recipe),
          current.bottles[1] === undefined ? undefined : brewingOutput(recipe),
          current.bottles[2] === undefined ? undefined : brewingOutput(recipe),
        ],
        ingredient: consumeOne(current.ingredient),
        fuelCharges: current.fuelCharges - 1,
        brewProgressSecs: 0,
      }
      brewedCount += 1
    }
  }

  return { brewedCount, state: current }
}
