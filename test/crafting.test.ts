import { describe, expect, it } from 'vitest'

import {
  addItem,
  countOf,
  emptyInventory,
  INVENTORY_SLOT_COUNT,
} from '../src/domain/inventory'
import { itemComponents } from '../src/domain/item-components'
import { itemStack } from '../src/domain/item-stack'
import type { ItemType } from '../src/domain/item-type'
import { craftFromGrid } from '../src/domain/crafting'
import {
  craftGrid,
  exactly,
  matchRecipeWithAssignments,
  shapelessRecipe,
  shapedRecipe,
  tagged,
  type ItemTagMemberships,
} from '../src/domain/recipe'
import type { Inventory } from '../src/domain/inventory'

const inventoryWith = (items: ReadonlyArray<readonly [ItemType, number]>): Inventory => {
  let inventory = emptyInventory()
  for (const [item, count] of items) {
    inventory = addItem(inventory, item, count).inventory
  }
  return inventory
}

describe('crafting', () => {
  it('crafts a shaped recipe with counted ingredients', () => {
    const recipe = shapedRecipe(
      'minecraft:stone-stick',
      ['S'],
      { S: exactly('stone', 2) },
      itemStack('stick', 1),
    )
    const inventory = inventoryWith([['stone', 2]])
    const outcome = craftFromGrid(inventory, [recipe], craftGrid(1, 1, [itemStack('stone', 2)]))

    expect(outcome.result).toEqual({
      _tag: 'Crafted',
      recipeId: 'minecraft:stone-stick',
      output: itemStack('stick', 1),
    })
    expect(countOf(outcome.inventory, 'stone')).toBe(0)
    expect(countOf(outcome.inventory, 'stick')).toBe(1)
    expect(outcome.inventory).not.toBe(inventory)
  })

  it('keeps component overrides on crafted outputs', () => {
    const components = itemComponents('stick', { rarity: 'rare' })
    const output = itemStack('stick', 1, { components })
    const recipe = shapedRecipe(
      'minecraft:rare-stick',
      ['S'],
      { S: exactly('stone') },
      output,
    )
    const outcome = craftFromGrid(
      inventoryWith([['stone', 1]]),
      [recipe],
      craftGrid(1, 1, [itemStack('stone', 1)]),
    )

    expect(outcome.result).toEqual({
      _tag: 'Crafted',
      recipeId: 'minecraft:rare-stick',
      output,
    })
    expect(outcome.inventory.slots[0]).toEqual(output)
  })

  it('assigns tagged shapeless ingredients to concrete items before charging inventory', () => {
    const itemTags: ItemTagMemberships = new Map([
      [tagged('#minecraft:both').tag, new Set<ItemType>(['oak_planks', 'stone'])],
    ])
    const recipe = shapelessRecipe(
      'minecraft:stone-plank-mix',
      [tagged('#minecraft:both'), exactly('stone')],
      itemStack('stick', 1),
    )
    const grid = craftGrid(2, 1, ['stone', 'oak_planks'])
    const match = matchRecipeWithAssignments([recipe], grid, { itemTags })

    expect(match._tag).toBe('Match')
    if (match._tag === 'Match') {
      expect(match.assignments).toEqual([
        { slotIndex: 0, item: 'stone', ingredient: exactly('stone') },
        { slotIndex: 1, item: 'oak_planks', ingredient: tagged('#minecraft:both') },
      ])
    }

    const inventory = inventoryWith([['stone', 1], ['oak_planks', 1]])
    const outcome = craftFromGrid(inventory, [recipe], grid, { itemTags })

    expect(outcome.result).toEqual({
      _tag: 'Crafted',
      recipeId: 'minecraft:stone-plank-mix',
      output: itemStack('stick', 1),
    })
    expect(countOf(outcome.inventory, 'stone')).toBe(0)
    expect(countOf(outcome.inventory, 'oak_planks')).toBe(0)
    expect(countOf(outcome.inventory, 'stick')).toBe(1)
  })

  it('keeps unmatched and under-supplied inventories unchanged', () => {
    const recipe = shapedRecipe(
      'minecraft:stone-stick',
      ['S'],
      { S: exactly('stone', 2) },
      itemStack('stick', 1),
    )
    const inventory = emptyInventory()

    const noMatch = craftFromGrid(inventory, [recipe], craftGrid(1, 1, ['dirt']))
    expect(noMatch).toEqual({ inventory, result: { _tag: 'NoMatch' } })

    const missing = craftFromGrid(inventory, [recipe], craftGrid(1, 1, [itemStack('stone', 2)]))
    expect(missing).toEqual({
      inventory,
      result: { _tag: 'MissingIngredients', missing: [{ item: 'stone', short: 2 }] },
    })
  })

  it('rolls back the transaction when the crafted output has no room', () => {
    const recipe = shapedRecipe(
      'minecraft:stone-loop',
      ['S'],
      { S: 'stone' },
      itemStack('stone', 64),
    )
    const inventory = inventoryWith([['stone', INVENTORY_SLOT_COUNT * 64]])
    const outcome = craftFromGrid(inventory, [recipe], craftGrid(1, 1, ['stone']))

    expect(outcome).toEqual({ inventory, result: { _tag: 'NoRoom' } })
  })

  it('returns assignments for mirrored shaped recipes and rejects invalid shapes', () => {
    const recipe = shapedRecipe(
      'minecraft:mirrored-pair',
      ['AB'],
      { A: 'stone', B: 'dirt' },
      itemStack('stick', 1),
      { assumeSymmetry: true, tags: ['crafting_table'] },
    )
    const mirrored = craftGrid(2, 1, ['dirt', 'stone'])
    const match = matchRecipeWithAssignments([recipe], mirrored, { station: 'crafting_table' })

    expect(match._tag).toBe('Match')
    if (match._tag === 'Match') {
      expect(match.assignments).toEqual([
        { slotIndex: 0, item: 'dirt', ingredient: exactly('dirt') },
        { slotIndex: 1, item: 'stone', ingredient: exactly('stone') },
      ])
    }

    expect(matchRecipeWithAssignments([recipe], mirrored)).toEqual({ _tag: 'NoMatch' })
    expect(matchRecipeWithAssignments([recipe], craftGrid(2, 1, ['stone', undefined]), { station: 'crafting_table' })).toEqual({ _tag: 'NoMatch' })
    expect(matchRecipeWithAssignments([recipe], craftGrid(2, 1, ['stone', 'stone']), { station: 'crafting_table' })).toEqual({ _tag: 'NoMatch' })
    expect(matchRecipeWithAssignments([recipe], craftGrid(3, 1, ['stone', 'dirt', 'dirt']), { station: 'crafting_table' })).toEqual({ _tag: 'NoMatch' })
    expect(matchRecipeWithAssignments([recipe], craftGrid(0, 0, []), { station: 'crafting_table' })).toEqual({ _tag: 'NoMatch' })
  })

  it('memoizes failed shapeless assignment states', () => {
    const itemTags: ItemTagMemberships = new Map([
      [tagged('#minecraft:both').tag, new Set<ItemType>(['oak_planks', 'stone'])],
    ])
    const recipe = shapelessRecipe(
      'minecraft:impossible-mix',
      [tagged('#minecraft:both'), tagged('#minecraft:both'), 'dirt'],
      itemStack('stick', 1),
    )
    const match = matchRecipeWithAssignments(
      [recipe],
      craftGrid(3, 1, ['stone', 'oak_planks', 'stone']),
      { itemTags },
    )

    expect(match).toEqual({ _tag: 'NoMatch' })
  })

  it('does not match empty or differently sized shapeless grids', () => {
    const recipe = shapelessRecipe('minecraft:pair', ['stone', 'dirt'], itemStack('stick', 1))

    expect(matchRecipeWithAssignments([recipe], craftGrid(0, 0, []))).toEqual({ _tag: 'NoMatch' })
    expect(matchRecipeWithAssignments([recipe], craftGrid(1, 1, ['stone']))).toEqual({ _tag: 'NoMatch' })
    expect(matchRecipeWithAssignments([recipe], craftGrid(2, 1, ['stone', undefined]))).toEqual({ _tag: 'NoMatch' })
  })

  it('resolves a genuine vanilla tag when itemTags is omitted from the match context', () => {
    const recipe = shapelessRecipe(
      'minecraft:trim-material-mix',
      [tagged('#minecraft:trim_materials'), exactly('stick')],
      itemStack('torch', 1),
    )
    const grid = craftGrid(2, 1, ['iron_ingot', 'stick'])
    const match = matchRecipeWithAssignments([recipe], grid)

    expect(match._tag).toBe('Match')
    if (match._tag === 'Match') {
      expect(match.assignments).toEqual([
        { slotIndex: 0, item: 'iron_ingot', ingredient: tagged('#minecraft:trim_materials') },
        { slotIndex: 1, item: 'stick', ingredient: exactly('stick') },
      ])
    }

    const inventory = inventoryWith([['iron_ingot', 1], ['stick', 1]])
    const outcome = craftFromGrid(inventory, [recipe], grid)

    expect(outcome.result).toEqual({
      _tag: 'Crafted',
      recipeId: 'minecraft:trim-material-mix',
      output: itemStack('torch', 1),
    })
  })
})
