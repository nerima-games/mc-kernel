import { isItemComponents } from './item-components-validation.js'
import {
  itemStack,
  itemStackWithCount,
  itemStacksCanMerge,
  maxStackCountForStack,
  type ItemStack,
  type Slot,
} from './item-stack.js'
import { isItemType, type ItemType } from './item-type.js'
import { INVENTORY_SLOT_COUNT, type Inventory } from './inventory-data.js'

export { INVENTORY_SLOT_COUNT, type Inventory } from './inventory-data.js'

type ReadonlyRecord = Readonly<Record<string, unknown>>
type CountRecord = { readonly count?: unknown }

const isRecord = (value: unknown): value is ReadonlyRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const slotsOf = (value: unknown): ReadonlyArray<unknown> => {
  if (!isRecord(value) || !Array.isArray(value['slots'])) {
    return []
  }
  return value['slots']
}

const heldCount = (value: CountRecord): number => {
  const count = value.count
  if (typeof count !== 'number' || !Number.isFinite(count) || count <= 0) {
    return 0
  }
  return Math.floor(count)
}

export const emptyInventory = (): Inventory => ({
  slots: Array.from({ length: INVENTORY_SLOT_COUNT }, () => undefined),
})

export const slotAt = (inventory: Inventory, index: number): Slot => inventory.slots[index]

export const countOf = (inventory: Inventory, item: ItemType): number =>
  inventory.slots.reduce((total, slot) => (slot?.item === item ? total + heldCount(slot) : total), 0)

export const isInventoryEmpty = (inventory: Inventory): boolean => inventory.slots.every((slot) => slot === undefined)

export type AddOutcome = {
  readonly inventory: Inventory
  readonly leftover: number
}

const addStack = (inventory: Inventory, stack: ItemStack, count: number): AddOutcome => {
  if (!Number.isInteger(count) || count <= 0) {
    return { inventory, leftover: Number.isFinite(count) ? Math.max(0, count) : 0 }
  }

  const slots = [...inventory.slots]
  let remaining = count
  const maxStackCount = maxStackCountForStack(stack)

  for (let index = 0; index < slots.length && remaining > 0; index += 1) {
    const slot = slots[index]
    if (slot === undefined || !itemStacksCanMerge(slot, stack)) {
      continue
    }
    const held = heldCount(slot)
    const capacity = Math.max(0, maxStackCountForStack(slot) - held)
    const accepted = Math.min(capacity, remaining)
    if (accepted === 0) {
      continue
    }
    slots[index] = itemStackWithCount(slot, held + accepted)
    remaining -= accepted
  }

  for (let index = 0; index < slots.length && remaining > 0; index += 1) {
    if (slots[index] !== undefined) {
      continue
    }
    const accepted = Math.min(maxStackCount, remaining)
    slots[index] = itemStackWithCount(stack, accepted)
    remaining -= accepted
  }

  return { inventory: { slots }, leftover: remaining }
}

export const addItemStack = (inventory: Inventory, stack: ItemStack, count: number = stack.count): AddOutcome =>
  addStack(inventory, stack, count)

export const addItem = (inventory: Inventory, item: ItemType, count: number): AddOutcome => {
  if (!Number.isInteger(count) || count <= 0) {
    return { inventory, leftover: Number.isFinite(count) ? Math.max(0, count) : 0 }
  }
  return addItemStack(inventory, itemStack(item, 1), count)
}

export type RemoveOutcome = {
  readonly inventory: Inventory
  readonly removed: number
}

export type RemoveAtResult =
  | { readonly _tag: 'Removed'; readonly removed: number }
  | { readonly _tag: 'InvalidSlot' }
  | { readonly _tag: 'InvalidCount' }
  | { readonly _tag: 'EmptySlot' }
  | { readonly _tag: 'ItemMismatch'; readonly actualItem: ItemType }
  | { readonly _tag: 'Insufficient'; readonly available: number }

export type RemoveAtOutcome = {
  readonly inventory: Inventory
  readonly result: RemoveAtResult
}

export const removeItemAt = (
  inventory: Inventory,
  slotIndex: number,
  expectedItem: ItemType,
  count: number,
): RemoveAtOutcome => {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= INVENTORY_SLOT_COUNT) {
    return { inventory, result: { _tag: 'InvalidSlot' } }
  }
  if (!Number.isInteger(count) || count <= 0) {
    return { inventory, result: { _tag: 'InvalidCount' } }
  }

  const slot = inventory.slots[slotIndex]
  if (slot === undefined) {
    return { inventory, result: { _tag: 'EmptySlot' } }
  }
  if (slot.item !== expectedItem) {
    return { inventory, result: { _tag: 'ItemMismatch', actualItem: slot.item } }
  }

  const available = heldCount(slot)
  if (available < count) {
    return { inventory, result: { _tag: 'Insufficient', available } }
  }

  const remaining = available - count
  const slots = [...inventory.slots]
  slots[slotIndex] = remaining === 0 ? undefined : itemStackWithCount(slot, remaining)
  return { inventory: { slots }, result: { _tag: 'Removed', removed: count } }
}

export const removeItem = (inventory: Inventory, item: ItemType, count: number): RemoveOutcome => {
  if (!Number.isInteger(count) || count <= 0) {
    return { inventory, removed: 0 }
  }

  const slots = [...inventory.slots]
  let remaining = count

  for (let index = slots.length - 1; index >= 0 && remaining > 0; index -= 1) {
    const slot = slots[index]
    if (slot === undefined || slot.item !== item) {
      continue
    }
    const held = heldCount(slot)
    const taken = Math.min(held, remaining)
    const left = held - taken
    slots[index] = left === 0 ? undefined : itemStackWithCount(slot, left)
    remaining -= taken
  }

  return { inventory: { slots }, removed: count - remaining }
}

export type NormaliseOutcome = {
  readonly inventory: Inventory
  readonly leftover: number
  readonly discarded: number
}

export const normaliseInventory = (value: unknown): NormaliseOutcome => {
  const slots: Array<Slot> = Array.from({ length: INVENTORY_SLOT_COUNT }, () => undefined)
  const spilled: Array<{ readonly stack: ItemStack; readonly count: number }> = []
  let discarded = 0

  for (const [index, rawSlot] of slotsOf(value).entries()) {
    if (!isRecord(rawSlot)) {
      continue
    }
    const held = heldCount(rawSlot)
    if (held === 0) {
      continue
    }
    const rawItem = rawSlot['item']
    if (!isItemType(rawItem)) {
      discarded += held
      continue
    }

    const item = rawItem
    const rawComponents = rawSlot['components']
    if (rawComponents !== undefined && !isItemComponents(rawComponents)) {
      discarded += held
      continue
    }
    const prototype = rawComponents === undefined
      ? itemStack(item, 1)
      : itemStack(item, 1, { components: rawComponents })
    const maxStackCount = maxStackCountForStack(prototype)
    if (index >= INVENTORY_SLOT_COUNT) {
      spilled.push({ stack: prototype, count: held })
      continue
    }

    slots[index] = itemStackWithCount(prototype, Math.min(held, maxStackCount))
    if (held > maxStackCount) {
      spilled.push({ stack: prototype, count: held - maxStackCount })
    }
  }

  return spilled.reduce<NormaliseOutcome>(
    (outcome, stack) => {
      const added = addStack(outcome.inventory, stack.stack, stack.count)
      return {
        inventory: added.inventory,
        leftover: outcome.leftover + added.leftover,
        discarded: outcome.discarded,
      }
    },
    { inventory: { slots }, leftover: 0, discarded },
  )
}
