import {
  COOKING_STATIONS,
  type CookingStation,
  type FuelRule,
  type FuelRuleTable,
  type FurnaceAdvanceResult,
  type FurnaceState,
  type FurnaceStateInput,
  type SmeltingRecipe,
  type SmeltingRecipeTable,
  VANILLA_FUEL_RULES,
  VANILLA_SMELTING_RECIPES,
} from './smelting-data.js'
import {
  buildFuelIndex,
  buildSmeltingIndexes,
  cachedFuelIndex,
  type SmeltingIndexes,
} from './smelting-indexes.js'
import {
  isItemStack,
  itemStackWithCount,
  itemStacksCanMerge,
  maxStackCountForStack,
  type ItemStack,
  type Slot,
} from './item-stack.js'
import { isItemType } from './item-type.js'

export {
  COOKING_STATIONS,
  VANILLA_FUEL_RULES,
  VANILLA_SMELTING_RECIPES,
}
export type {
  CookingStation,
  FuelRule,
  FuelRuleTable,
  FurnaceAdvanceResult,
  FurnaceState,
  FurnaceStateInput,
  SmeltingRecipe,
  SmeltingRecipeTable,
}

type RecordValue = {
  readonly _tag?: unknown
  readonly id?: unknown
  readonly input?: unknown
  readonly output?: unknown
  readonly cookTimeSecs?: unknown
  readonly experience?: unknown
  readonly stations?: unknown
  readonly fuel?: unknown
  readonly burnTimeSecs?: unknown
  readonly station?: unknown
  readonly fuelTimeRemainingSecs?: unknown
  readonly fuelTimeTotalSecs?: unknown
  readonly cookProgressSecs?: unknown
}

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isCookingStation = (value: unknown): value is CookingStation =>
  typeof value === 'string' && COOKING_STATIONS.some((station) => station === value)

function assertFiniteNonNegative(value: unknown, field: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new RangeError(`${field} must be a finite, non-negative number`)
  }
}

function assertPositiveFinite(value: unknown, field: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${field} must be a finite, positive number`)
  }
}

function assertSlot(value: unknown, field: string): asserts value is Slot {
  if (value !== undefined && !isItemStack(value)) {
    throw new TypeError(`${field} must be an ItemStack or undefined`)
  }
}

function assertRecipe(value: unknown): asserts value is SmeltingRecipe {
  if (!isRecord(value)) {
    throw new TypeError('Smelting recipe must be an object')
  }
  const recipe = value
  if (recipe._tag !== 'Smelting') {
    throw new TypeError('Smelting recipe has an invalid tag')
  }
  if (typeof recipe.id !== 'string' || recipe.id.trim().length === 0) {
    throw new TypeError('Smelting recipe id must be a non-empty string')
  }
  if (!isItemType(recipe.input)) {
    throw new TypeError(`Unknown smelting input item: ${String(recipe.input)}`)
  }
  if (!isItemStack(recipe.output)) {
    throw new TypeError('Smelting recipe output must be an ItemStack')
  }
  assertPositiveFinite(recipe.cookTimeSecs, 'Smelting recipe cookTimeSecs')
  assertFiniteNonNegative(recipe.experience, 'Smelting recipe experience')
  if (!Array.isArray(recipe.stations) || recipe.stations.length === 0 || recipe.stations.some((station) => !isCookingStation(station))) {
    throw new TypeError('Smelting recipe stations must contain at least one known cooking station')
  }
}

function assertRecipeTable(recipes: unknown): asserts recipes is SmeltingRecipeTable {
  if (!Array.isArray(recipes)) {
    throw new TypeError('Smelting recipes must be an array')
  }
  recipes.forEach(assertRecipe)
}

function assertFuelRule(value: unknown): asserts value is FuelRule {
  if (!isRecord(value)) {
    throw new TypeError('Fuel rule must be an object')
  }
  const rule = value
  if (!isItemType(rule.fuel)) {
    throw new TypeError(`Unknown fuel item: ${String(rule.fuel)}`)
  }
  assertPositiveFinite(rule.burnTimeSecs, 'Fuel burnTimeSecs')
}

function assertFuelTable(fuels: unknown): asserts fuels is FuelRuleTable {
  if (!Array.isArray(fuels)) {
    throw new TypeError('Fuel rules must be an array')
  }
  fuels.forEach(assertFuelRule)
}

// Field-for-field mirror of `isFurnaceState` in `./block-entity-validation.ts`,
// including the derived bound `fuelTimeRemainingSecs <= fuelTimeTotalSecs`.
// An edit to one invariant requires the matching edit there.
function assertFurnaceState(value: unknown): asserts value is FurnaceState {
  if (!isRecord(value)) {
    throw new TypeError('Furnace state must be an object')
  }
  const state = value
  if (!isCookingStation(state.station)) {
    throw new TypeError(`Unknown cooking station: ${String(state.station)}`)
  }
  assertSlot(state.input, 'Furnace input')
  assertSlot(state.fuel, 'Furnace fuel')
  assertSlot(state.output, 'Furnace output')
  assertFiniteNonNegative(state.fuelTimeRemainingSecs, 'Furnace fuelTimeRemainingSecs')
  assertFiniteNonNegative(state.fuelTimeTotalSecs, 'Furnace fuelTimeTotalSecs')
  assertFiniteNonNegative(state.cookProgressSecs, 'Furnace cookProgressSecs')
  if (state.fuelTimeRemainingSecs > state.fuelTimeTotalSecs) {
    throw new RangeError('Furnace fuelTimeRemainingSecs cannot exceed fuelTimeTotalSecs')
  }
}

export function furnaceState(input?: FurnaceStateInput): FurnaceState
export function furnaceState(input: FurnaceStateInput = {}): FurnaceState {
  if (!isRecord(input)) {
    throw new TypeError('Furnace state input must be an object')
  }
  const station = input.station ?? 'furnace'
  if (!isCookingStation(station)) {
    throw new TypeError(`Unknown cooking station: ${String(station)}`)
  }
  const furnaceInput = input.input
  assertSlot(furnaceInput, 'Furnace input')
  const fuel = input.fuel
  assertSlot(fuel, 'Furnace fuel')
  const output = input.output
  assertSlot(output, 'Furnace output')
  const fuelTimeRemainingSecs = input.fuelTimeRemainingSecs ?? 0
  assertFiniteNonNegative(fuelTimeRemainingSecs, 'Furnace fuelTimeRemainingSecs')
  const fuelTimeTotalSecs = input.fuelTimeTotalSecs ?? 0
  assertFiniteNonNegative(fuelTimeTotalSecs, 'Furnace fuelTimeTotalSecs')
  const cookProgressSecs = input.cookProgressSecs ?? 0
  assertFiniteNonNegative(cookProgressSecs, 'Furnace cookProgressSecs')
  if (fuelTimeRemainingSecs > fuelTimeTotalSecs) {
    throw new RangeError('Furnace fuelTimeRemainingSecs cannot exceed fuelTimeTotalSecs')
  }
  return {
    station,
    input: furnaceInput,
    fuel,
    output,
    fuelTimeRemainingSecs,
    fuelTimeTotalSecs,
    cookProgressSecs,
  }
}

export const emptyFurnaceState = (station: CookingStation = 'furnace'): FurnaceState =>
  furnaceState({ station })

const VANILLA_SMELTING_INDEX = buildSmeltingIndexes(VANILLA_SMELTING_RECIPES)

const VANILLA_FUEL_INDEX = buildFuelIndex(VANILLA_FUEL_RULES)
const FUEL_INDEX_MIN_RULES = 8

const recipeIndexFor = (recipes: SmeltingRecipeTable): SmeltingIndexes | undefined =>
  recipes === VANILLA_SMELTING_RECIPES ? VANILLA_SMELTING_INDEX : undefined

const resolveSmeltingRecipeTable = (recipes: unknown): SmeltingRecipeTable => {
  if (recipes === VANILLA_SMELTING_RECIPES) {
    return VANILLA_SMELTING_RECIPES
  }
  assertRecipeTable(recipes)
  return recipes
}

const resolveFuelRuleTable = (fuels: unknown): FuelRuleTable => {
  if (fuels === VANILLA_FUEL_RULES) {
    return VANILLA_FUEL_RULES
  }
  assertFuelTable(fuels)
  return fuels
}

const fuelIndexFor = (fuels: FuelRuleTable): ReadonlyMap<ItemStack['item'], FuelRule> | undefined =>
  fuels === VANILLA_FUEL_RULES
    ? VANILLA_FUEL_INDEX
    : fuels.length >= FUEL_INDEX_MIN_RULES
      ? cachedFuelIndex(fuels)
      : undefined

const findSmeltingRecipe = (
  input: ItemStack,
  station: CookingStation,
  recipes: SmeltingRecipeTable,
  recipeIndex: SmeltingIndexes | undefined,
): SmeltingRecipe | undefined =>
  recipeIndex === undefined
    ? recipes.find((recipe) => recipe.input === input.item && recipe.stations.includes(station))
    : recipeIndex[station].get(input.item)

export function matchSmeltingRecipe(
  input: Slot,
  station: CookingStation,
  recipes?: SmeltingRecipeTable,
): SmeltingRecipe | undefined
export function matchSmeltingRecipe(
  input: Slot,
  station: CookingStation,
  recipes: SmeltingRecipeTable = VANILLA_SMELTING_RECIPES,
): SmeltingRecipe | undefined {
  if (!isCookingStation(station)) {
    throw new TypeError(`Unknown cooking station: ${String(station)}`)
  }
  assertSlot(input, 'Smelting input')
  const recipeTable = resolveSmeltingRecipeTable(recipes)
  if (input === undefined) {
    return undefined
  }
  return findSmeltingRecipe(
    input,
    station,
    recipeTable,
    recipeIndexFor(recipeTable),
  )
}

const matchFuelRule = (
  fuel: Slot,
  fuels: FuelRuleTable,
  fuelIndex: ReadonlyMap<ItemStack['item'], FuelRule> | undefined,
): FuelRule | undefined => {
  if (fuel === undefined) {
    return undefined
  }
  return fuelIndex === undefined
    ? fuels.find((rule) => rule.fuel === fuel.item)
    : fuelIndex.get(fuel.item)
}

const consumeOne = (stack: Slot): Slot => {
  if (stack === undefined || stack.count === 1) {
    return undefined
  }
  return itemStackWithCount(stack, stack.count - 1)
}

const outputCanAccept = (output: Slot, addition: ItemStack): boolean =>
  output === undefined || (itemStacksCanMerge(output, addition) && output.count + addition.count <= maxStackCountForStack(output))

const appendOutput = (output: Slot, addition: ItemStack): ItemStack => {
  if (output === undefined) {
    return addition
  }
  return itemStackWithCount(output, output.count + addition.count)
}

export function advanceFurnace(
  state: FurnaceState,
  elapsedSecs: number,
  recipes?: SmeltingRecipeTable,
  fuels?: FuelRuleTable,
): FurnaceAdvanceResult
export function advanceFurnace(
  state: FurnaceState,
  elapsedSecs: number,
  recipes: SmeltingRecipeTable = VANILLA_SMELTING_RECIPES,
  fuels: FuelRuleTable = VANILLA_FUEL_RULES,
): FurnaceAdvanceResult {
  assertFurnaceState(state)
  assertFiniteNonNegative(elapsedSecs, 'Furnace elapsedSecs')
  const recipeTable = resolveSmeltingRecipeTable(recipes)
  const fuelTable = resolveFuelRuleTable(fuels)
  const recipeIndex = recipeIndexFor(recipeTable)
  const fuelIndex = fuelIndexFor(fuelTable)

  let current = state
  let remaining = elapsedSecs
  let smeltedCount = 0
  let experienceGained = 0
  let recipe: SmeltingRecipe | undefined

  while (remaining > 0) {
    if (current.input === undefined) {
      current = { ...current, cookProgressSecs: 0 }
      break
    }
    recipe ??= findSmeltingRecipe(current.input, current.station, recipeTable, recipeIndex)
    if (recipe === undefined || !outputCanAccept(current.output, recipe.output)) {
      current = { ...current, cookProgressSecs: 0 }
      break
    }

    if (current.fuelTimeRemainingSecs === 0) {
      const fuelRule = matchFuelRule(current.fuel, fuelTable, fuelIndex)
      if (fuelRule === undefined) {
        break
      }
      current = {
        ...current,
        fuel: consumeOne(current.fuel),
        fuelTimeRemainingSecs: fuelRule.burnTimeSecs,
        fuelTimeTotalSecs: fuelRule.burnTimeSecs,
      }
    }

    const cookRemaining = recipe.cookTimeSecs - current.cookProgressSecs
    const step = Math.min(remaining, cookRemaining, current.fuelTimeRemainingSecs)
    if (step <= 0) {
      break
    }
    current = {
      ...current,
      fuelTimeRemainingSecs: current.fuelTimeRemainingSecs - step,
      cookProgressSecs: current.cookProgressSecs + step,
    }
    remaining -= step

    if (current.cookProgressSecs >= recipe.cookTimeSecs) {
      current = {
        ...current,
        input: consumeOne(current.input),
        output: appendOutput(current.output, recipe.output),
        cookProgressSecs: 0,
      }
      smeltedCount += 1
      experienceGained += recipe.experience
    }
  }

  return { experienceGained, smeltedCount, state: current }
}
