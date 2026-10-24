/**
 * Runtime validation for block entities arriving from save files.
 *
 * `FurnaceState` and `BrewingState` come from the recipe data modules. Their
 * block-entity guards live here.
 */
import {
  BREWING_BOTTLE_SLOTS,
  BREWING_MAX_FUEL_CHARGES,
  BREWING_TIME_SECS,
  type BrewingBottles,
  type BrewingState,
} from '../recipe/brewing-data.js'
import {
  STORAGE_CONTAINER_CAPACITIES,
  STORAGE_CONTAINER_KINDS,
  type BlockEntity,
  type StorageContainer,
  type StorageContainerKind,
} from './block-entity-data.js'
import type { BlockPosition } from '../coordinates/coordinates.js'
import { isItemStack, type Slot } from '../item/item-stack.js'
import { COOKING_STATIONS, type CookingStation, type FurnaceState } from '../recipe/smelting-data.js'
import { isTextComponent } from '../text/text-component.js'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isSafeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value)

const isFiniteNonNegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

const isFiniteIntegerInRange = (value: unknown, minimum: number, maximum: number): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum

const isSlot = (value: unknown): value is Slot => value === undefined || isItemStack(value)

export const isBlockEntityPosition = (value: unknown): value is BlockPosition => {
  if (!isRecord(value)) {
    return false
  }
  const { x, y, z } = value
  return isSafeInteger(x) && isSafeInteger(y) && isSafeInteger(z)
}

const isStorageContainerKind = (value: unknown): value is StorageContainerKind =>
  typeof value === 'string' && STORAGE_CONTAINER_KINDS.some((kind) => kind === value)

export const isStorageContainer = (value: unknown): value is StorageContainer => {
  if (!isRecord(value)) {
    return false
  }
  const { kind, capacity, slots } = value
  if (!isStorageContainerKind(kind)) {
    return false
  }
  const declaredCapacity = STORAGE_CONTAINER_CAPACITIES[kind]
  if (capacity !== declaredCapacity) {
    return false
  }
  return Array.isArray(slots) && slots.length <= declaredCapacity && slots.every(isSlot)
}

const isCookingStation = (value: unknown): value is CookingStation =>
  typeof value === 'string' && COOKING_STATIONS.some((station) => station === value)

/**
 * Guard for a furnace's cooking state.
 */
export const isFurnaceState = (value: unknown): value is FurnaceState => {
  if (!isRecord(value)) {
    return false
  }
  const { station, input, fuel, output, fuelTimeRemainingSecs, fuelTimeTotalSecs, cookProgressSecs } = value
  return (
    isCookingStation(station) &&
    isSlot(input) &&
    isSlot(fuel) &&
    isSlot(output) &&
    isFiniteNonNegative(fuelTimeRemainingSecs) &&
    isFiniteNonNegative(fuelTimeTotalSecs) &&
    isFiniteNonNegative(cookProgressSecs) &&
    fuelTimeRemainingSecs <= fuelTimeTotalSecs
  )
}

const isBrewingBottles = (value: unknown): value is BrewingBottles =>
  Array.isArray(value) && value.length === BREWING_BOTTLE_SLOTS && value.every(isSlot)

/**
 * Guard for a brewing stand's state.
 */
export const isBrewingState = (value: unknown): value is BrewingState => {
  if (!isRecord(value)) {
    return false
  }
  const { bottles, ingredient, fuel, fuelCharges, brewProgressSecs } = value
  return (
    isBrewingBottles(bottles) &&
    isSlot(ingredient) &&
    isSlot(fuel) &&
    isFiniteIntegerInRange(fuelCharges, 0, BREWING_MAX_FUEL_CHARGES) &&
    isFiniteNonNegative(brewProgressSecs) &&
    brewProgressSecs <= BREWING_TIME_SECS
  )
}

export const isBlockEntity = (value: unknown): value is BlockEntity => {
  if (!isRecord(value)) {
    return false
  }
  const { _tag, position } = value
  if (!isBlockEntityPosition(position)) {
    return false
  }
  switch (_tag) {
    case 'StorageContainer':
      return isStorageContainer(value['container'])
    case 'Furnace':
      return isFurnaceState(value['state'])
    case 'BrewingStand':
      return isBrewingState(value['state'])
    case 'Sign':
      return isTextComponent(value['text'])
    default:
      return false
  }
}
