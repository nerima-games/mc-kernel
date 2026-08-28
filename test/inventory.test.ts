import { describe, expect, it } from 'vitest'

import {
  INVENTORY_SLOT_COUNT,
  addItem,
  addItemStack,
  countOf,
  emptyInventory,
  isInventoryEmpty,
  normaliseInventory,
  removeItem,
  removeItemAt,
  slotAt,
} from '../src/domain/inventory'
import type { Inventory } from '../src/domain/inventory'
import { itemComponents } from '../src/domain/item-components'
import { itemStack } from '../src/domain/item-stack'

const inventoryFrom = (slots: ReadonlyArray<unknown>): Inventory => normaliseInventory({ slots }).inventory

describe('inventory values', () => {
  it('creates a fixed-size empty inventory and exposes safe reads', () => {
    const inventory = emptyInventory()

    expect(inventory.slots).toHaveLength(INVENTORY_SLOT_COUNT)
    expect(isInventoryEmpty(inventory)).toBe(true)
    expect(slotAt(inventory, 0)).toBeUndefined()
    expect(slotAt(inventory, INVENTORY_SLOT_COUNT)).toBeUndefined()
    expect(countOf(inventory, 'stone')).toBe(0)
  })

  it('fills existing stacks before creating new stacks', () => {
    const inventory = inventoryFrom([
      { item: 'stone', count: 60 },
      { item: 'dirt', count: 1 },
      undefined,
    ])

    const outcome = addItem(inventory, 'stone', 6)

    expect(outcome).toEqual({
      inventory: {
        slots: [
          { item: 'stone', count: 64 },
          { item: 'dirt', count: 1 },
          { item: 'stone', count: 2 },
          ...Array.from({ length: INVENTORY_SLOT_COUNT - 3 }, () => undefined),
        ],
      },
      leftover: 0,
    })
    expect(isInventoryEmpty(outcome.inventory)).toBe(false)
    expect(countOf(outcome.inventory, 'stone')).toBe(66)
  })

  it('respects item-specific stack limits and reports a full inventory', () => {
    const pearls = addItem(emptyInventory(), 'ender_pearl', 17)
    expect(pearls.inventory.slots.slice(0, 2)).toEqual([
      { item: 'ender_pearl', count: 16 },
      { item: 'ender_pearl', count: 1 },
    ])
    expect(pearls.leftover).toBe(0)

    const fullInventory = inventoryFrom(Array.from({ length: INVENTORY_SLOT_COUNT }, () => ({ item: 'stone', count: 64 })))
    expect(addItem(fullInventory, 'stone', 1)).toEqual({ inventory: fullInventory, leftover: 1 })
  })

  it('preserves component overrides and keeps incompatible stacks separate', () => {
    const rare = itemComponents('stone', { maxStackSize: 2, rarity: 'rare' })
    const epic = itemComponents('stone', { maxStackSize: 2, rarity: 'epic' })
    const inventory = inventoryFrom([
      { item: 'stone', count: 1, components: rare },
      { item: 'stone', count: 1, components: epic },
    ])

    const added = addItemStack(inventory, itemStack('stone', 1, { components: rare }), 2)
    expect(added).toEqual({
      inventory: {
        slots: [
          { item: 'stone', count: 2, components: rare },
          { item: 'stone', count: 1, components: epic },
          { item: 'stone', count: 1, components: rare },
          ...Array.from({ length: INVENTORY_SLOT_COUNT - 3 }, () => undefined),
        ],
      },
      leftover: 0,
    })
    expect(removeItemAt(added.inventory, 0, 'stone', 1)).toEqual({
      inventory: inventoryFrom([
        { item: 'stone', count: 1, components: rare },
        { item: 'stone', count: 1, components: epic },
        { item: 'stone', count: 1, components: rare },
      ]),
      result: { _tag: 'Removed', removed: 1 },
    })
  })

  it('rejects invalid additions without changing the inventory', () => {
    const inventory = emptyInventory()

    expect(addItem(inventory, 'stone', 0)).toEqual({ inventory, leftover: 0 })
    expect(addItem(inventory, 'stone', -2)).toEqual({ inventory, leftover: 0 })
    expect(addItem(inventory, 'stone', 1.5)).toEqual({ inventory, leftover: 1.5 })
    expect(addItem(inventory, 'stone', Number.POSITIVE_INFINITY)).toEqual({ inventory, leftover: 0 })
    expect(addItemStack(inventory, itemStack('stone', 1), 1.5)).toEqual({ inventory, leftover: 1.5 })
    expect(addItemStack(inventory, itemStack('stone', 1), Number.POSITIVE_INFINITY)).toEqual({ inventory, leftover: 0 })
    expect(addItemStack(inventory, itemStack('stone', 1))).toEqual({
      inventory: inventoryFrom([{ item: 'stone', count: 1 }]),
      leftover: 0,
    })
  })

  it('removes from the last matching stack first', () => {
    const inventory = inventoryFrom([
      { item: 'stone', count: 1 },
      { item: 'dirt', count: 1 },
      { item: 'stone', count: 2 },
    ])

    const outcome = removeItem(inventory, 'stone', 2)

    expect(outcome).toEqual({
      inventory: {
        slots: [
          { item: 'stone', count: 1 },
          { item: 'dirt', count: 1 },
          ...Array.from({ length: INVENTORY_SLOT_COUNT - 2 }, () => undefined),
        ],
      },
      removed: 2,
    })
  })

  it('partially removes a stack and reports unavailable items', () => {
    const inventory = inventoryFrom([{ item: 'stone', count: 4 }])

    expect(removeItem(inventory, 'stone', 2)).toEqual({
      inventory: {
        slots: [{ item: 'stone', count: 2 }, ...Array.from({ length: INVENTORY_SLOT_COUNT - 1 }, () => undefined)],
      },
      removed: 2,
    })
    expect(removeItem(inventory, 'stone', 10)).toEqual({
      inventory: emptyInventory(),
      removed: 4,
    })
    expect(removeItem(inventory, 'dirt', 1)).toEqual({ inventory, removed: 0 })
    expect(removeItem(inventory, 'stone', 0)).toEqual({ inventory, removed: 0 })
    expect(removeItem(inventory, 'stone', 1.5)).toEqual({ inventory, removed: 0 })
  })

  it('removes from a slot only when every precondition matches', () => {
    const inventory = inventoryFrom([{ item: 'stone', count: 4 }])

    expect(removeItemAt(inventory, -1, 'stone', 1)).toEqual({ inventory, result: { _tag: 'InvalidSlot' } })
    expect(removeItemAt(inventory, INVENTORY_SLOT_COUNT, 'stone', 1)).toEqual({ inventory, result: { _tag: 'InvalidSlot' } })
    expect(removeItemAt(inventory, 0.5, 'stone', 1)).toEqual({ inventory, result: { _tag: 'InvalidSlot' } })
    expect(removeItemAt(inventory, 0, 'stone', 0)).toEqual({ inventory, result: { _tag: 'InvalidCount' } })
    expect(removeItemAt(inventory, 0, 'stone', 1.5)).toEqual({ inventory, result: { _tag: 'InvalidCount' } })
    expect(removeItemAt(emptyInventory(), 0, 'stone', 1)).toEqual({ inventory: emptyInventory(), result: { _tag: 'EmptySlot' } })
    expect(removeItemAt(inventory, 0, 'dirt', 1)).toEqual({
      inventory,
      result: { _tag: 'ItemMismatch', actualItem: 'stone' },
    })
    expect(removeItemAt(inventory, 0, 'stone', 5)).toEqual({
      inventory,
      result: { _tag: 'Insufficient', available: 4 },
    })
    expect(removeItemAt(inventory, 0, 'stone', 2)).toEqual({
      inventory: inventoryFrom([{ item: 'stone', count: 2 }]),
      result: { _tag: 'Removed', removed: 2 },
    })
    expect(removeItemAt(inventory, 0, 'stone', 4)).toEqual({
      inventory: emptyInventory(),
      result: { _tag: 'Removed', removed: 4 },
    })
  })

  it('normalises unknown persisted slots into fixed-size inventory data', () => {
    const rawSlots: ReadonlyArray<unknown> = [
      null,
      { item: 'stone', count: 0 },
      { item: 'stone', count: 0.5 },
      { item: 'stone', count: Number.NaN },
      { item: 'stone', count: Number.POSITIVE_INFINITY },
      { item: 'stone', count: '1' },
      { item: 'unknown', count: 2.8 },
      { item: 'stone', count: 1.5 },
      { item: 'stone', count: 65 },
      ...Array.from({ length: INVENTORY_SLOT_COUNT - 9 }, () => undefined),
      { item: 'stone', count: 1 },
    ]

    const outcome = normaliseInventory({ slots: rawSlots })

    expect(outcome).toEqual({
      inventory: {
        slots: [
          ...Array.from({ length: 7 }, () => undefined),
          { item: 'stone', count: 3 },
          { item: 'stone', count: 64 },
          ...Array.from({ length: INVENTORY_SLOT_COUNT - 9 }, () => undefined),
        ],
      },
      leftover: 0,
      discarded: 2,
    })
  })

  it('normalises component-aware stacks using their component stack limits', () => {
    const rare = itemComponents('stone', { maxStackSize: 2, rarity: 'rare' })
    const outcome = normaliseInventory({
      slots: [
        { item: 'stone', count: 3, components: rare },
        { item: 'stone', count: 1, components: { rarity: 'invalid' } },
      ],
    })

    expect(outcome).toEqual({
      inventory: {
        slots: [
          { item: 'stone', count: 2, components: rare },
          { item: 'stone', count: 1, components: rare },
          ...Array.from({ length: INVENTORY_SLOT_COUNT - 2 }, () => undefined),
        ],
      },
      leftover: 0,
      discarded: 1,
    })
  })

  it('preserves leftovers when normalised stacks have no capacity', () => {
    const slots = [
      ...Array.from({ length: INVENTORY_SLOT_COUNT }, () => ({ item: 'stone', count: 64 })),
      { item: 'stone', count: 1 },
    ]

    expect(normaliseInventory({ slots })).toEqual({
      inventory: { slots: slots.slice(0, INVENTORY_SLOT_COUNT) },
      leftover: 1,
      discarded: 0,
    })
  })

  it('treats non-array and empty persisted values as empty inventory', () => {
    for (const value of [null, [], {}, { slots: 'not-an-array' }]) {
      expect(normaliseInventory(value)).toEqual({ inventory: emptyInventory(), leftover: 0, discarded: 0 })
    }
  })
})
