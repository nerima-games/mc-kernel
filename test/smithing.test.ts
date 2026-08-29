import { describe, expect, it } from 'vitest'

import { exactly, tagged } from '../src/domain/recipe-data'
import {
  SMITHING_STATION_TAG,
  SMITHING_TRIM_MATERIAL_TAG,
  SMITHING_TRIM_TEMPLATE_TAG,
  SMITHING_TRIMMABLE_ARMOR_TAG,
  VANILLA_SMITHING_RECIPES,
  applySmithing,
  matchSmithingRecipe,
  matchesSmithingRecipe,
  smithingInput,
  smithingTransformRecipe,
  smithingTrimRecipe,
} from '../src/domain/smithing'
import type { ItemType } from '../src/domain/item-type'
import { itemStack } from '../src/domain/item-stack'
import { buildSmithingRecipeIndex } from '../src/domain/smithing-indexes'
import type {
  ItemTagMemberships,
  RecipeItemTag,
} from '../src/domain/recipe-data'

const transformRecipe = smithingTransformRecipe(
  'minecraft:test_transform',
  exactly('netherite_upgrade_smithing_template'),
  exactly('diamond_sword'),
  exactly('netherite_ingot'),
  itemStack('netherite_sword', 1),
  { tags: [SMITHING_STATION_TAG] },
)

const bulkTransformRecipe = smithingTransformRecipe(
  'minecraft:test_bulk_transform',
  exactly('stone'),
  exactly('stone'),
  exactly('stick'),
  itemStack('torch', 1),
  { tags: [SMITHING_STATION_TAG] },
)

const trimRecipe = smithingTrimRecipe(
  'minecraft:test_trim',
  tagged(SMITHING_TRIM_TEMPLATE_TAG),
  tagged(SMITHING_TRIMMABLE_ARMOR_TAG),
  tagged(SMITHING_TRIM_MATERIAL_TAG),
  { tags: [SMITHING_STATION_TAG] },
)

const trimTags: ItemTagMemberships = new Map<RecipeItemTag, ReadonlySet<ItemType>>([
  [SMITHING_TRIM_TEMPLATE_TAG, new Set<ItemType>(['netherite_upgrade_smithing_template'])],
  [SMITHING_TRIMMABLE_ARMOR_TAG, new Set<ItemType>(['diamond_helmet'])],
  [SMITHING_TRIM_MATERIAL_TAG, new Set<ItemType>(['gold_ingot'])],
])

const transformInput = () => smithingInput({
  template: itemStack('netherite_upgrade_smithing_template', 1),
  base: itemStack('diamond_sword', 1),
  addition: itemStack('netherite_ingot', 1),
})

describe('smithing recipe data', () => {
  it('constructs transform and trim recipes with normalized options', () => {
    expect(SMITHING_STATION_TAG).toBe('smithing_table')
    expect(SMITHING_TRIM_TEMPLATE_TAG).toBe('#minecraft:trim_templates')
    expect(SMITHING_TRIMMABLE_ARMOR_TAG).toBe('#minecraft:trimmable_armor')
    expect(SMITHING_TRIM_MATERIAL_TAG).toBe('#minecraft:trim_materials')

    const tags = [SMITHING_STATION_TAG]
    const transform = smithingTransformRecipe(
      'minecraft:normalized',
      exactly('diamond_sword', 1),
      exactly('diamond_sword'),
      exactly('netherite_ingot'),
      itemStack('netherite_sword', 1),
      { priority: 2, tags },
    )
    tags.push('other_station')
    expect(transform).toEqual({
      _tag: 'SmithingTransform',
      id: 'minecraft:normalized',
      template: exactly('diamond_sword'),
      base: exactly('diamond_sword'),
      addition: exactly('netherite_ingot'),
      output: itemStack('netherite_sword', 1),
      priority: 2,
      tags: [SMITHING_STATION_TAG],
    })

    expect(smithingTrimRecipe('minecraft:untagged', tagged('#minecraft:trim_templates'), tagged('#minecraft:trimmable_armor'), tagged('#minecraft:trim_materials'))).toEqual({
      _tag: 'SmithingTrim',
      id: 'minecraft:untagged',
      template: tagged('#minecraft:trim_templates'),
      base: tagged('#minecraft:trimmable_armor'),
      addition: tagged('#minecraft:trim_materials'),
      priority: 0,
      tags: [],
    })
    expect(VANILLA_SMITHING_RECIPES).toHaveLength(10)
    expect(VANILLA_SMITHING_RECIPES.at(-1)?._tag).toBe('SmithingTrim')
  })

  it('rejects malformed recipe definitions and options', () => {
    expect(() => smithingTransformRecipe('', exactly('stone'), exactly('stone'), exactly('stick'), itemStack('stone', 1))).toThrow(TypeError)
    expect(() => Reflect.apply(smithingTransformRecipe, undefined, ['minecraft:test', {}, exactly('stone'), exactly('stick'), itemStack('stone', 1)])).toThrow(TypeError)
    expect(() => Reflect.apply(smithingTransformRecipe, undefined, ['minecraft:test', null, exactly('stone'), exactly('stick'), itemStack('stone', 1)])).toThrow(TypeError)
    expect(() => Reflect.apply(smithingTransformRecipe, undefined, ['minecraft:test', { _tag: 'Exact', item: 'unknown', count: 1 }, exactly('stone'), exactly('stick'), itemStack('stone', 1)])).toThrow(TypeError)
    expect(() => Reflect.apply(smithingTransformRecipe, undefined, ['minecraft:test', { _tag: 'ItemTag', tag: 'not-a-tag', count: 1 }, exactly('stone'), exactly('stick'), itemStack('stone', 1)])).toThrow(TypeError)
    expect(() => smithingTransformRecipe('minecraft:test', { _tag: 'Exact', item: 'stone', count: 0 }, exactly('stone'), exactly('stick'), itemStack('stone', 1))).toThrow(TypeError)
    expect(() => Reflect.apply(smithingTransformRecipe, undefined, ['minecraft:test', exactly('stone'), exactly('stone'), exactly('stick'), {}])).toThrow(TypeError)
    expect(() => Reflect.apply(smithingTransformRecipe, undefined, ['minecraft:test', exactly('stone'), exactly('stone'), exactly('stick'), itemStack('stone', 1), null])).toThrow(TypeError)
    expect(() => smithingTransformRecipe('minecraft:test', exactly('stone'), exactly('stone'), exactly('stick'), itemStack('stone', 1), { priority: -1 })).toThrow(RangeError)
    expect(() => smithingTransformRecipe('minecraft:test', exactly('stone'), exactly('stone'), exactly('stick'), itemStack('stone', 1), { priority: 1.5 })).toThrow(RangeError)
    expect(() => smithingTransformRecipe('minecraft:test', exactly('stone'), exactly('stone'), exactly('stick'), itemStack('stone', 1), { tags: [''] })).toThrow(TypeError)
    expect(() => Reflect.apply(smithingTransformRecipe, undefined, ['minecraft:test', exactly('stone'), exactly('stone'), exactly('stick'), itemStack('stone', 1), { tags: 'smithing_table' }])).toThrow(TypeError)
    expect(() => Reflect.apply(smithingTrimRecipe, undefined, ['minecraft:test', tagged('#minecraft:trim_templates'), tagged('#minecraft:trimmable_armor'), tagged('#minecraft:trim_materials'), { tags: [1] }])).toThrow(TypeError)
    expect(() => Reflect.apply(smithingTransformRecipe, undefined, ['minecraft:test', exactly('stone'), exactly('stone'), exactly('stick'), itemStack('stone', 1), { showNotification: 1 }])).toThrow(TypeError)
  })
})

describe('smithing recipe matching', () => {
  it('matches exact ingredients, item tags, stations, and priorities', () => {
    expect(matchesSmithingRecipe(transformRecipe, transformInput())).toBe(true)
    expect(matchesSmithingRecipe(transformRecipe, smithingInput({
      template: itemStack('netherite_upgrade_smithing_template', 1),
      base: itemStack('diamond_sword', 1),
      addition: itemStack('netherite_ingot', 1),
    }), { station: 'wrong_station' })).toBe(false)
    expect(matchesSmithingRecipe(smithingTrimRecipe('minecraft:any_station', exactly('stone'), exactly('stone'), exactly('stick')), smithingInput({
      template: itemStack('stone', 1),
      base: itemStack('stone', 1),
      addition: itemStack('stick', 1),
    }), {})).toBe(true)
    expect(matchesSmithingRecipe(trimRecipe, smithingInput({
      template: itemStack('netherite_upgrade_smithing_template', 1),
      base: itemStack('diamond_helmet', 1),
      addition: itemStack('gold_ingot', 1),
    }), { station: SMITHING_STATION_TAG, itemTags: trimTags })).toBe(true)
    // Deliberate behaviour change: an omitted itemTags now resolves to the
    // kernel's vanilla tag table (tag-membership.ts) instead of an empty map,
    // and diamond_helmet/gold_ingot/netherite_upgrade_smithing_template are
    // genuine vanilla trim membership, so this now matches.
    expect(matchesSmithingRecipe(trimRecipe, smithingInput({
      template: itemStack('netherite_upgrade_smithing_template', 1),
      base: itemStack('diamond_helmet', 1),
      addition: itemStack('gold_ingot', 1),
    }))).toBe(true)

    const lowPriority = smithingTransformRecipe('minecraft:z_low', exactly('stone'), exactly('stone'), exactly('stick'), itemStack('stone', 1), { priority: 1 })
    const samePriorityEarlier = smithingTransformRecipe('minecraft:a_same', exactly('stone'), exactly('stone'), exactly('stick'), itemStack('stick', 1), { priority: 1 })
    const samePriorityLater = smithingTransformRecipe('minecraft:z_same', exactly('stone'), exactly('stone'), exactly('stick'), itemStack('torch', 1), { priority: 1 })
    const higherPriority = smithingTransformRecipe('minecraft:high', exactly('stone'), exactly('stone'), exactly('stick'), itemStack('torch', 1), { priority: 2 })
    const input = smithingInput({ template: itemStack('stone', 1), base: itemStack('stone', 1), addition: itemStack('stick', 1) })
    expect(matchSmithingRecipe(input, {}, [higherPriority, lowPriority, samePriorityEarlier, samePriorityLater])).toBe(samePriorityEarlier)
    expect(matchSmithingRecipe(input, {}, [higherPriority])?._tag).toBe('SmithingTransform')
    expect(matchSmithingRecipe(transformInput(), { station: SMITHING_STATION_TAG }, [transformRecipe])?.id).toBe('minecraft:test_transform')
    expect(matchSmithingRecipe(transformInput())?.id).toBe('minecraft:netherite_netherite_sword')
    expect(matchSmithingRecipe(transformInput(), { station: 'wrong_station' })).toBeUndefined()
    expect(matchSmithingRecipe(smithingInput({
      template: itemStack('netherite_upgrade_smithing_template', 1),
      base: itemStack('diamond_helmet', 1),
      addition: itemStack('gold_ingot', 1),
    }), { station: SMITHING_STATION_TAG, itemTags: trimTags })?.id).toBe('minecraft:trim')
    expect(matchSmithingRecipe(smithingInput())).toBeUndefined()
    expect(matchSmithingRecipe(input, {}, [transformRecipe])).toBeUndefined()
    expect(matchSmithingRecipe(smithingInput({ template: itemStack('stone', 1), base: itemStack('stone', 1), addition: itemStack('stone', 1) }), {}, [])).toBeUndefined()
  })

  it('rejects malformed inputs, contexts, and recipe tables', () => {
    expect(() => Reflect.apply(smithingInput, undefined, [null])).toThrow(TypeError)
    expect(() => Reflect.apply(smithingInput, undefined, [[]])).toThrow(TypeError)
    expect(() => Reflect.apply(smithingInput, undefined, [{ template: {} }])).toThrow(TypeError)
    expect(() => Reflect.apply(matchesSmithingRecipe, undefined, [null, smithingInput()])).toThrow(TypeError)
    expect(() => Reflect.apply(matchesSmithingRecipe, undefined, [transformRecipe, null])).toThrow(TypeError)
    expect(() => Reflect.apply(matchesSmithingRecipe, undefined, [transformRecipe, smithingInput(), null])).toThrow(TypeError)
    expect(() => Reflect.apply(matchesSmithingRecipe, undefined, [transformRecipe, smithingInput(), []])).toThrow(TypeError)
    expect(() => Reflect.apply(matchesSmithingRecipe, undefined, [transformRecipe, smithingInput(), { station: '' }])).toThrow(TypeError)
    expect(() => Reflect.apply(matchesSmithingRecipe, undefined, [transformRecipe, smithingInput(), { station: 1 }])).toThrow(TypeError)
    expect(() => Reflect.apply(matchesSmithingRecipe, undefined, [transformRecipe, smithingInput(), { itemTags: { get: 1 } }])).toThrow(TypeError)
    expect(() => Reflect.apply(matchSmithingRecipe, undefined, [null])).toThrow(TypeError)
    expect(() => Reflect.apply(matchSmithingRecipe, undefined, [smithingInput(), null])).toThrow(TypeError)
    expect(() => Reflect.apply(matchSmithingRecipe, undefined, [smithingInput(), {}, null])).toThrow(TypeError)

    const malformedRecipes: unknown[] = [
      null,
      [],
      { ...transformRecipe, _tag: 'Other' },
      { ...transformRecipe, id: ' ' },
      { ...transformRecipe, template: null },
      { ...transformRecipe, template: { _tag: 'Exact', item: 'unknown', count: 1 } },
      { ...transformRecipe, template: { _tag: 'Exact', item: 'stone', count: 0 } },
      { ...transformRecipe, template: { _tag: 'ItemTag', tag: 'not-a-tag', count: 1 } },
      { ...transformRecipe, template: { _tag: 'Unknown' } },
      { ...transformRecipe, output: undefined },
      { ...transformRecipe, priority: -1 },
      { ...transformRecipe, tags: undefined },
      { ...transformRecipe, tags: [''] },
    ]
    expect(() => Reflect.apply(matchSmithingRecipe, undefined, [smithingInput(), {}, malformedRecipes[0]])).toThrow(TypeError)
    expect(() => Reflect.apply(matchSmithingRecipe, undefined, [smithingInput(), {}, [malformedRecipes[1]]])).toThrow(TypeError)
    for (const malformed of malformedRecipes.slice(2)) {
      expect(() => Reflect.apply(matchSmithingRecipe, undefined, [smithingInput(), {}, [malformed]])).toThrow()
    }
  })
})

describe('smithing recipe indexes', () => {
  it('retains duplicate exact candidates and fallback recipes', () => {
    const index = buildSmithingRecipeIndex([transformRecipe, trimRecipe, transformRecipe])
    expect(index.exact
      .get('netherite_upgrade_smithing_template')
      ?.get('diamond_sword')
      ?.get('netherite_ingot')).toEqual([transformRecipe, transformRecipe])
    expect(index.fallback).toEqual([trimRecipe])
  })
})

describe('smithing application', () => {
  it('consumes transform ingredients and returns the output', () => {
    const input = smithingInput({
      template: itemStack('stone', 2),
      base: itemStack('stone', 2),
      addition: itemStack('stick', 2),
    })
    const operation = applySmithing(input, undefined, [bulkTransformRecipe])
    expect(operation).toEqual({
      _tag: 'Transform',
      recipe: bulkTransformRecipe,
      output: itemStack('torch', 1),
      remaining: smithingInput({
        template: itemStack('stone', 1),
        base: itemStack('stone', 1),
        addition: itemStack('stick', 1),
      }),
    })
  })

  it('returns a trim operation without inventing unsupported metadata', () => {
    const base = itemStack('diamond_helmet', 1)
    const operation = applySmithing(smithingInput({
      template: itemStack('netherite_upgrade_smithing_template', 1),
      base,
      addition: itemStack('gold_ingot', 2),
    }), { station: SMITHING_STATION_TAG, itemTags: trimTags }, [trimRecipe])
    expect(operation._tag).toBe('Trim')
    if (operation._tag !== 'Trim') return
    expect(operation.recipe).toBe(trimRecipe)
    expect(operation.base).toBe(base)
    expect(operation.remaining).toEqual(smithingInput({
      addition: itemStack('gold_ingot', 1),
    }))
  })

  it('returns NoMatch and validates application arguments', () => {
    expect(applySmithing(smithingInput(), {}, [])).toEqual({ _tag: 'NoMatch' })
    expect(() => Reflect.apply(applySmithing, undefined, [null])).toThrow(TypeError)
    expect(() => Reflect.apply(applySmithing, undefined, [smithingInput(), null])).toThrow(TypeError)
    expect(() => Reflect.apply(applySmithing, undefined, [smithingInput(), {}, null])).toThrow(TypeError)
    expect(() =>
      Reflect.apply(applySmithing, undefined, [
        smithingInput(),
        {},
        [{ ...bulkTransformRecipe, showNotification: 1 }],
      ]),
    ).toThrow(TypeError)
  })

  it('rejects an input that changes after matching', () => {
    const template = itemStack('stone', 1)
    const base = itemStack('stone', 1)
    const addition = itemStack('stick', 1)
    let templateReads = 0
    let baseReads = 0
    let additionReads = 0
    const unstableInput = {
      get template() {
        templateReads += 1
        return templateReads <= 3 ? template : undefined
      },
      get base() {
        baseReads += 1
        return baseReads <= 3 ? base : undefined
      },
      get addition() {
        additionReads += 1
        return additionReads <= 3 ? addition : undefined
      },
    }

    expect(() => applySmithing(unstableInput, { station: SMITHING_STATION_TAG }, [bulkTransformRecipe])).toThrow(
      'Smithing recipe matched an incomplete input',
    )
  })
})
