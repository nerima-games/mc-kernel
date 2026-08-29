import { describe, expect, it } from 'vitest'
import { itemStack } from '../src/domain/item-stack'
import {
  anyOf,
  exactly,
  tagged,
  type ItemTagMemberships,
  type RecipeItemTag,
} from '../src/domain/recipe-data'
import type { ItemType } from '../src/domain/item-type'
import { buildStonecuttingRecipeIndex } from '../src/domain/stonecutting-indexes'
import {
  STONECUTTING_STATION_TAG,
  VANILLA_STONECUTTING_RECIPES,
  applyStonecutting,
  matchStonecuttingRecipe,
  matchStonecuttingRecipes,
  stonecuttingRecipe,
} from '../src/domain/stonecutting'

const STONE_INPUT_TAG: RecipeItemTag = '#minecraft:stone_inputs'
const STONE_TAGS: ItemTagMemberships = new Map<RecipeItemTag, ReadonlySet<ItemType>>([
  [STONE_INPUT_TAG, new Set<ItemType>(['stone'])],
])

describe('stonecutting', () => {
  it('normalizes exact and tagged recipes and validates their boundaries', () => {
    expect(stonecuttingRecipe('minecraft:exact', 'stone', itemStack('stone_slab', 1))).toEqual({
      _tag: 'Stonecutting',
      id: 'minecraft:exact',
      ingredient: exactly('stone'),
      output: itemStack('stone_slab', 1),
      priority: 0,
    })
    expect(stonecuttingRecipe('minecraft:tag', STONE_INPUT_TAG, itemStack('stone_slab', 1))).toEqual({
      _tag: 'Stonecutting',
      id: 'minecraft:tag',
      ingredient: tagged(STONE_INPUT_TAG),
      output: itemStack('stone_slab', 1),
      priority: 0,
    })
    expect(
      stonecuttingRecipe(
        'minecraft:object',
        { _tag: 'Exact', item: 'stone', count: 2 },
        itemStack('stone_slab', 1),
        { priority: 2 },
      ),
    ).toEqual({
      _tag: 'Stonecutting',
      id: 'minecraft:object',
      ingredient: exactly('stone', 2),
      output: itemStack('stone_slab', 1),
      priority: 2,
    })
    expect(
      stonecuttingRecipe(
        'minecraft:tag-object',
        { _tag: 'ItemTag', tag: STONE_INPUT_TAG, count: 1 },
        itemStack('stone_slab', 1),
      ).ingredient,
    ).toEqual(tagged(STONE_INPUT_TAG))
    expect(stonecuttingRecipe('minecraft:default-priority', 'stone', itemStack('stone_slab', 1), {})).toMatchObject({
      priority: 0,
    })

    expect(() => stonecuttingRecipe('', 'stone', itemStack('stone_slab', 1))).toThrow(TypeError)
    expect(() => Reflect.apply(stonecuttingRecipe, undefined, ['minecraft:bad', null, itemStack('stone_slab', 1)])).toThrow(TypeError)
    expect(() => Reflect.apply(stonecuttingRecipe, undefined, ['minecraft:bad', [], itemStack('stone_slab', 1)])).toThrow(TypeError)
    expect(() => Reflect.apply(stonecuttingRecipe, undefined, ['minecraft:bad', 'not-an-item', itemStack('stone_slab', 1)])).toThrow(TypeError)
    expect(() => stonecuttingRecipe('minecraft:bad', { _tag: 'Exact', item: 'stone', count: 0 }, itemStack('stone_slab', 1))).toThrow(RangeError)
    expect(() => Reflect.apply(stonecuttingRecipe, undefined, ['minecraft:bad', { _tag: 'ItemTag', tag: 'stone', count: 1 }, itemStack('stone_slab', 1)])).toThrow(TypeError)
    expect(() => Reflect.apply(stonecuttingRecipe, undefined, ['minecraft:bad', { _tag: 'Other', item: 'stone', count: 1 }, itemStack('stone_slab', 1)])).toThrow(TypeError)
    expect(() => Reflect.apply(stonecuttingRecipe, undefined, ['minecraft:bad', 'stone', {}])).toThrow(TypeError)
    expect(() => Reflect.apply(stonecuttingRecipe, undefined, ['minecraft:bad', 'stone', itemStack('stone_slab', 1), null])).toThrow(TypeError)
    expect(() => stonecuttingRecipe('minecraft:bad', 'stone', itemStack('stone_slab', 1), { priority: -1 })).toThrow(RangeError)
    expect(() => stonecuttingRecipe('minecraft:bad', 'stone', itemStack('stone_slab', 1), { priority: 1.5 })).toThrow(RangeError)
    expect(() => Reflect.apply(stonecuttingRecipe, undefined, ['minecraft:bad', 'stone', itemStack('stone_slab', 1), { showNotification: 1 }])).toThrow(TypeError)

    // The ingredient may also arrive as a list or as an AnyOf record, and each
    // of those shapes has its own emptiness and membership rules.
    expect(stonecuttingRecipe('minecraft:list', ['stone', 'cobblestone'], itemStack('stone_slab', 1)).ingredient).toEqual(
      anyOf([exactly('stone'), exactly('cobblestone')]),
    )
    expect(stonecuttingRecipe('minecraft:any_of', anyOf([exactly('stone')]), itemStack('stone_slab', 1)).ingredient).toEqual(
      anyOf([exactly('stone')]),
    )
    expect(() => Reflect.apply(stonecuttingRecipe, undefined, ['minecraft:bad', ['stone', 'not-an-item'], itemStack('stone_slab', 1)])).toThrow(TypeError)
    expect(() => Reflect.apply(stonecuttingRecipe, undefined, ['minecraft:bad', { _tag: 'AnyOf', options: [], count: 1 }, itemStack('stone_slab', 1)])).toThrow(TypeError)
    expect(() => Reflect.apply(stonecuttingRecipe, undefined, ['minecraft:bad', { _tag: 'AnyOf', options: ['not-an-item'], count: 1 }, itemStack('stone_slab', 1)])).toThrow(TypeError)
    expect(() => Reflect.apply(stonecuttingRecipe, undefined, ['minecraft:bad', { _tag: 'AnyOf', options: 'stone', count: 1 }, itemStack('stone_slab', 1)])).toThrow(TypeError)
    expect(() => Reflect.apply(stonecuttingRecipe, undefined, ['minecraft:bad', { _tag: 'AnyOf', options: ['stone'] }, itemStack('stone_slab', 1)])).toThrow(TypeError)
  })

  it('indexes exact and tagged candidates', () => {
    const exact = stonecuttingRecipe('minecraft:exact', exactly('stone'), itemStack('stone_slab', 1))
    const taggedRecipe = stonecuttingRecipe('minecraft:tagged', tagged(STONE_INPUT_TAG), itemStack('stone_slab', 1))
    const index = buildStonecuttingRecipeIndex([taggedRecipe, exact, exact])

    expect(index.exactByItem.get('stone')).toEqual([exact, exact])
    expect(index.tagged).toEqual([taggedRecipe])
  })

  it('matches vanilla and custom recipes by station, tags, count, priority, and id', () => {
    expect(VANILLA_STONECUTTING_RECIPES).toHaveLength(5)
    expect(matchStonecuttingRecipes(itemStack('purpur_block', 1))).toHaveLength(3)
    expect(matchStonecuttingRecipe(itemStack('purpur_block', 1))).toMatchObject({
      _tag: 'Match',
      recipe: { id: 'minecraft:purpur_pillar_from_purpur_block' },
      output: itemStack('purpur_pillar', 1),
    })
    expect(matchStonecuttingRecipe(itemStack('stone', 1))).toMatchObject({
      _tag: 'Match',
      recipe: { id: 'minecraft:stone_slab_from_stone' },
      output: itemStack('stone_slab', 2),
    })

    const tagMatch = stonecuttingRecipe('minecraft:tag_match', tagged(STONE_INPUT_TAG), itemStack('stone_slab', 1))
    const exactEarlier = stonecuttingRecipe('minecraft:a_exact', exactly('stone'), itemStack('purpur_slab', 1), { priority: 1 })
    const exactLater = stonecuttingRecipe('minecraft:z_exact', exactly('stone'), itemStack('purpur_stairs', 1), { priority: 1 })
    const customRecipes = [exactLater, tagMatch, exactEarlier]

    expect(matchStonecuttingRecipes(itemStack('stone', 1), { itemTags: STONE_TAGS }, customRecipes)).toEqual([
      tagMatch,
      exactEarlier,
      exactLater,
    ])
    expect(matchStonecuttingRecipes(itemStack('stone', 1), {}, [tagMatch])).toEqual([])
    expect(matchStonecuttingRecipes(itemStack('stone', 1), { station: STONECUTTING_STATION_TAG }, customRecipes)).toHaveLength(2)
    expect(matchStonecuttingRecipes(itemStack('stone', 1), {}, [stonecuttingRecipe('minecraft:two', exactly('stone', 2), itemStack('stone_slab', 1))])).toEqual([])
    expect(matchStonecuttingRecipes(itemStack('cobblestone', 1), {}, customRecipes)).toEqual([])
    expect(matchStonecuttingRecipes(itemStack('stone', 1), {}, [])).toEqual([])
    expect(matchStonecuttingRecipes(undefined)).toEqual([])
    expect(matchStonecuttingRecipes(itemStack('stone', 1), { station: 'furnace' })).toEqual([])
    expect(matchStonecuttingRecipe(itemStack('stone', 1), { itemTags: STONE_TAGS }, [tagMatch])).toMatchObject({
      _tag: 'Match',
      recipe: tagMatch,
    })
    expect(matchStonecuttingRecipe(itemStack('cobblestone', 1), {}, customRecipes)).toEqual({ _tag: 'NoMatch' })
  })

  it('resolves a genuine vanilla tag when itemTags is omitted from the match context', () => {
    const trimMaterialTag: RecipeItemTag = '#minecraft:trim_materials'
    const vanillaTagRecipe = stonecuttingRecipe('minecraft:trim_material_cut', tagged(trimMaterialTag), itemStack('stone_slab', 1))

    expect(matchStonecuttingRecipe(itemStack('iron_ingot', 1), {}, [vanillaTagRecipe])).toMatchObject({
      _tag: 'Match',
      recipe: vanillaTagRecipe,
    })
  })

  it('applies a matching recipe and preserves remaining input', () => {
    const oneInput = stonecuttingRecipe('minecraft:one', exactly('stone'), itemStack('stone_slab', 1))
    const twoInput = stonecuttingRecipe('minecraft:two', exactly('stone', 2), itemStack('stone_slab', 1))

    expect(applyStonecutting(oneInput, itemStack('stone', 1))).toEqual({
      _tag: 'Applied',
      recipe: oneInput,
      output: itemStack('stone_slab', 1),
      remainingInput: undefined,
    })
    expect(applyStonecutting(twoInput, itemStack('stone', 3))).toEqual({
      _tag: 'Applied',
      recipe: twoInput,
      output: itemStack('stone_slab', 1),
      remainingInput: itemStack('stone', 1),
    })
    expect(applyStonecutting(oneInput, undefined)).toEqual({ _tag: 'NoMatch' })
    expect(applyStonecutting(twoInput, itemStack('stone', 1))).toEqual({ _tag: 'NoMatch' })
    expect(applyStonecutting(oneInput, itemStack('stone', 1), { station: 'furnace' })).toEqual({ _tag: 'NoMatch' })
    expect(applyStonecutting(oneInput, itemStack('cobblestone', 1))).toEqual({ _tag: 'NoMatch' })
  })

  it('rejects malformed runtime inputs at the public boundaries', () => {
    const input = itemStack('stone', 1)
    const validRecipe = stonecuttingRecipe('minecraft:valid', exactly('stone'), itemStack('stone_slab', 1))
    const malformedRecipes: ReadonlyArray<unknown> = [
      null,
      [],
      { ...validRecipe, _tag: 'Other' },
    { ...validRecipe, priority: '1' },
    { ...validRecipe, id: '' },
    { ...validRecipe, id: 1 },
    { ...validRecipe, ingredient: null },
    { ...validRecipe, ingredient: 'not-an-item' },
    { ...validRecipe, output: {} },
      { ...validRecipe, priority: -1 },
      { ...validRecipe, priority: 1.5 },
      { ...validRecipe, showNotification: 1 },
    ]

    expect(() =>
      Reflect.apply(matchStonecuttingRecipes, undefined, [
        input,
        {},
        [{ ...validRecipe, showNotification: true }],
      ]),
    ).not.toThrow()

    expect(() => Reflect.apply(matchStonecuttingRecipes, undefined, [null])).toThrow(TypeError)
    expect(() => Reflect.apply(matchStonecuttingRecipes, undefined, [input, null])).toThrow(TypeError)
    expect(() => Reflect.apply(matchStonecuttingRecipes, undefined, [input, { station: 1 }])).toThrow(TypeError)
    expect(() => Reflect.apply(matchStonecuttingRecipes, undefined, [input, { itemTags: {} }])).toThrow(TypeError)
    expect(() => Reflect.apply(matchStonecuttingRecipes, undefined, [input, { itemTags: new Map([['bad', new Set<ItemType>(['stone'])]]) }])).toThrow(TypeError)
    expect(() => Reflect.apply(matchStonecuttingRecipes, undefined, [input, { itemTags: new Map([[STONE_INPUT_TAG, new Set(['unknown'])]]) }])).toThrow(TypeError)
    expect(() => Reflect.apply(matchStonecuttingRecipes, undefined, [input, {}, null])).toThrow(TypeError)
    for (const malformedRecipe of malformedRecipes) {
      expect(() => Reflect.apply(matchStonecuttingRecipes, undefined, [input, {}, [malformedRecipe]])).toThrow()
    }

    expect(() => Reflect.apply(applyStonecutting, undefined, [null, input])).toThrow(TypeError)
    expect(() => Reflect.apply(applyStonecutting, undefined, [validRecipe, 1])).toThrow(TypeError)
    expect(() => Reflect.apply(applyStonecutting, undefined, [validRecipe, input, null])).toThrow(TypeError)
  })
})
