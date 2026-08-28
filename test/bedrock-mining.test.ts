/* eslint-disable max-statements, no-magic-numbers, sort-imports -- The test matrix is the executable Bedrock JSON boundary. */
import {
  BEDROCK_DESTRUCTIBLE_BY_MINING_MIN_FORMAT_VERSION,
  BEDROCK_DIGGER_MIN_FORMAT_VERSION,
  DEFAULT_BEDROCK_SECONDS_TO_DESTROY,
  bedrockBlockDescriptorMatches,
  bedrockDiggerUsesEfficiency,
  bedrockItemDescriptorMatches,
  bedrockTagQueryMatches,
  parseBedrockTagQuery,
  resolveBedrockDestructionSeconds,
  resolveBedrockDiggerSpeed,
  resolveBedrockItemSpecificDestroySpeed,
  validateBedrockBlockDescriptor,
  validateBedrockBlockStates,
  validateBedrockDiggerComponent,
  validateBedrockDiggerSpeed,
  validateBedrockDestructibleByMining,
  validateBedrockDestroySpeed,
  validateBedrockItemDescriptor,
} from '../src'
import type {
  BedrockBlock,
  BedrockDiggerComponent,
  BedrockItem,
} from '../src'
import { describe, expect, it } from 'vitest'

const BLOCK: BedrockBlock = {
  name: 'minecraft:oak_log',
  states: { axis: 'y', stripped: false },
  tags: new Set(['minecraft:wood', 'minecraft:is_axeable']),
}

const ITEM: BedrockItem = {
  name: 'minecraft:diamond_axe',
  tags: new Set(['minecraft:is_axe', 'minecraft:diamond_tier']),
}

const DIGGER: BedrockDiggerComponent = {
  destroy_speeds: [
    { block: { tags: "q.any_tag('minecraft:wood')" }, speed: 6 },
    { block: 'minecraft:oak_log', speed: 12 },
  ],
  use_efficiency: true,
}

describe('Bedrock mining components', () => {
  it('publishes the official component format floors and defaults', () => {
    expect(BEDROCK_DIGGER_MIN_FORMAT_VERSION).toBe('1.20.30')
    expect(BEDROCK_DESTRUCTIBLE_BY_MINING_MIN_FORMAT_VERSION).toBe('1.21.50')
    expect(DEFAULT_BEDROCK_SECONDS_TO_DESTROY).toBe(0)
  })

  it('parses the supported any/all tag query forms', () => {
    expect(parseBedrockTagQuery("query.any_tag( 'minecraft:wood', \"minecraft:stone\" )")).toStrictEqual({
      operator: 'any_tag',
      tags: ['minecraft:wood', 'minecraft:stone'],
    })
    expect(parseBedrockTagQuery("q.all_tags('minecraft:is_pickaxe')")).toStrictEqual({
      operator: 'all_tags',
      tags: ['minecraft:is_pickaxe'],
    })
    expect(bedrockTagQueryMatches("q.any_tag('minecraft:wood', 'minecraft:stone')", BLOCK.tags)).toBe(true)
    expect(bedrockTagQueryMatches("q.any_tag('minecraft:glass')", BLOCK.tags)).toBe(false)
    expect(bedrockTagQueryMatches("q.all_tags('minecraft:wood', 'minecraft:is_axeable')", BLOCK.tags)).toBe(true)
    expect(bedrockTagQueryMatches("q.all_tags('minecraft:wood', 'minecraft:glass')", BLOCK.tags)).toBe(false)
    expect(() => parseBedrockTagQuery(null)).toThrow('Bedrock tag query must be a string')
    expect(() => parseBedrockTagQuery('minecraft:wood')).toThrow('unsupported Bedrock tag query')
    expect(() => parseBedrockTagQuery("q.any_tag('minecraft:wood', )")).toThrow('unsupported Bedrock tag query')
    expect(() => parseBedrockTagQuery("q.any_tag('   ')")).toThrow('non-empty tag names')
    expect(() => parseBedrockTagQuery("q.any_tag(' minecraft:wood ')")).toThrow('non-empty tag names')
  })

  it('validates block descriptors, states, and item descriptors', () => {
    expect(() => validateBedrockBlockDescriptor('minecraft:stone')).not.toThrow()
    expect(() => validateBedrockBlockDescriptor({ name: 'minecraft:stone' })).not.toThrow()
    expect(() => validateBedrockBlockDescriptor({ tags: "q.any_tag('minecraft:stone')" })).not.toThrow()
    expect(() =>
      validateBedrockBlockDescriptor({
        name: 'minecraft:oak_log',
        states: { axis: 'y', stripped: false, age: 2 },
        tags: "q.all_tags('minecraft:wood')",
      }),
    ).not.toThrow()
    expect(() => validateBedrockItemDescriptor('minecraft:diamond_axe')).not.toThrow()
    expect(() => validateBedrockItemDescriptor({ tags: "q.any_tag('minecraft:is_axe')" })).not.toThrow()
    expect(() => validateBedrockBlockStates({ powered: true, age: 2, axis: 'y' })).not.toThrow()

    expect(() => validateBedrockBlockDescriptor(null)).toThrow('Bedrock block descriptor must be an object')
    expect(() => validateBedrockBlockDescriptor([])).toThrow('Bedrock block descriptor must be an object')
    expect(() => validateBedrockBlockDescriptor({})).toThrow('must define name or tags')
    expect(() => validateBedrockBlockDescriptor({ future: true })).toThrow('unsupported property future')
    expect(() => validateBedrockBlockDescriptor({ name: '' })).toThrow('name must be a non-empty string')
    expect(() => validateBedrockBlockDescriptor({ tags: 'minecraft:wood' })).toThrow('unsupported Bedrock tag query')
    expect(() =>
      validateBedrockBlockDescriptor({ tags: "q.any_tag('minecraft:stone')", states: { age: 1 } }),
    ).toThrow('states require a name')
    expect(() => validateBedrockBlockDescriptor({ name: 'minecraft:stone', states: null })).toThrow(
      'Bedrock block descriptor states must be an object',
    )
    expect(() => validateBedrockBlockDescriptor({ name: 'minecraft:stone', states: { age: 1.5 } })).toThrow(
      'must be an integer, string, or boolean',
    )
    expect(() => validateBedrockBlockDescriptor({ name: 'minecraft:stone', states: { age: null } })).toThrow(
      'must be an integer, string, or boolean',
    )
    expect(() => validateBedrockItemDescriptor(null)).toThrow('Bedrock item descriptor must be an object')
    expect(() => validateBedrockItemDescriptor({})).toThrow('Bedrock tag query must be a string')
    expect(() => validateBedrockItemDescriptor({ tags: 'minecraft:is_axe' })).toThrow('unsupported Bedrock tag query')
    expect(() => validateBedrockBlockStates(null)).toThrow('Bedrock block states must be an object')
    expect(() => validateBedrockBlockStates([])).toThrow('Bedrock block states must be an object')
    expect(() => validateBedrockDiggerSpeed(-1)).toThrow('non-negative integer')
    expect(() => validateBedrockDiggerSpeed(1.5)).toThrow('non-negative integer')
    expect(() => validateBedrockDiggerSpeed(Number.NaN)).toThrow('non-negative integer')
    expect(() => validateBedrockDestroySpeed(-1)).toThrow('greater than or equal to zero')
    expect(() => validateBedrockDestroySpeed(Number.POSITIVE_INFINITY)).toThrow('greater than or equal to zero')
  })

  it('matches exact, state-qualified, and tag-qualified descriptors', () => {
    expect(bedrockBlockDescriptorMatches('minecraft:oak_log', BLOCK)).toBe(true)
    expect(bedrockBlockDescriptorMatches('minecraft:stone', BLOCK)).toBe(false)
    expect(bedrockBlockDescriptorMatches({ name: 'minecraft:stone' }, BLOCK)).toBe(false)
    expect(
      bedrockBlockDescriptorMatches(
        { name: 'minecraft:oak_log', states: { axis: 'y', stripped: false } },
        BLOCK,
      ),
    ).toBe(true)
    expect(
      bedrockBlockDescriptorMatches({ name: 'minecraft:oak_log', states: { axis: 'x' } }, BLOCK),
    ).toBe(false)
    expect(bedrockBlockDescriptorMatches({ tags: "q.any_tag('minecraft:wood')" }, BLOCK)).toBe(true)
    expect(bedrockBlockDescriptorMatches({ tags: "q.any_tag('minecraft:glass')" }, BLOCK)).toBe(false)
    expect(bedrockItemDescriptorMatches('minecraft:diamond_axe', ITEM)).toBe(true)
    expect(bedrockItemDescriptorMatches('minecraft:iron_axe', ITEM)).toBe(false)
    expect(bedrockItemDescriptorMatches({ tags: "q.all_tags('minecraft:is_axe', 'minecraft:diamond_tier')" }, ITEM)).toBe(
      true,
    )
    expect(bedrockItemDescriptorMatches({ tags: "q.all_tags('minecraft:is_axe', 'minecraft:wooden_tier')" }, ITEM)).toBe(
      false,
    )
  })

  it('validates and resolves minecraft:digger', () => {
    expect(() => validateBedrockDiggerComponent(DIGGER)).not.toThrow()
    expect(resolveBedrockDiggerSpeed(undefined, BLOCK)).toBeUndefined()
    expect(resolveBedrockDiggerSpeed({}, BLOCK)).toBeUndefined()
    expect(resolveBedrockDiggerSpeed(DIGGER, BLOCK)).toBe(6)
    const readonlyTags = {
      has: (tag: unknown): boolean => tag === 'minecraft:wood',
      [Symbol.iterator]: function* () {
        yield 'minecraft:wood'
      },
      }
    expect(
      resolveBedrockDiggerSpeed(DIGGER, {
        name: 'minecraft:oak_log',
        states: { axis: 'y', stripped: false },
        tags: readonlyTags,
      }),
    ).toBe(6)
    expect(bedrockDiggerUsesEfficiency(undefined)).toBe(false)
    expect(bedrockDiggerUsesEfficiency({})).toBe(false)
    expect(bedrockDiggerUsesEfficiency(DIGGER)).toBe(true)
    expect(
      resolveBedrockDiggerSpeed(
        { destroy_speeds: [{ block: 'minecraft:oak_log', speed: 12 }] },
        BLOCK,
      ),
    ).toBe(12)

    expect(() => validateBedrockDiggerComponent(null)).toThrow('Bedrock digger component must be an object')
    expect(() => validateBedrockDiggerComponent([])).toThrow('Bedrock digger component must be an object')
    expect(() => validateBedrockDiggerComponent({ future: true })).toThrow('unsupported property future')
    expect(() => validateBedrockDiggerComponent({ destroy_speeds: null })).toThrow('must be an array')
    expect(() => validateBedrockDiggerComponent({ destroy_speeds: [null] })).toThrow('must be an object')
    expect(() => validateBedrockDiggerComponent({ destroy_speeds: [{ block: 'minecraft:stone' }] })).toThrow(
      'non-negative integer',
    )
    expect(() => validateBedrockDiggerComponent({ destroy_speeds: [{ block: 'minecraft:stone', speed: -1 }] })).toThrow(
      'non-negative integer',
    )
    expect(() => validateBedrockDiggerComponent({ use_efficiency: 'yes' })).toThrow('must be a boolean')
    expect(() => resolveBedrockDiggerSpeed(DIGGER, null)).toThrow('Bedrock block must be an object')
    expect(() => resolveBedrockDiggerSpeed(DIGGER, { name: '', states: {}, tags: new Set() })).toThrow(
      'Bedrock block name must be a non-empty string',
    )
    expect(() =>
      resolveBedrockDiggerSpeed(DIGGER, { name: 'minecraft:oak_log', states: {}, tags: [] }),
    ).toThrow('Bedrock block tags must be a Set or Set-like iterable')
    expect(() =>
      resolveBedrockDiggerSpeed(DIGGER, { name: 'minecraft:oak_log', states: {}, tags: null }),
    ).toThrow('Bedrock block tags must be a Set or Set-like iterable')
    expect(() =>
      resolveBedrockDiggerSpeed(DIGGER, { name: 'minecraft:oak_log', states: {}, tags: new Set([1]) }),
    ).toThrow('Bedrock block tags must contain non-empty strings')
  })

  it('validates and resolves minecraft:destructible_by_mining', () => {
    const component = {
      seconds_to_destroy: 7.5,
      item_specific_speeds: [
        { item: { tags: "q.any_tag('minecraft:diamond_tier')" }, destroy_speed: 0.3 },
        { item: 'minecraft:diamond_axe', destroy_speed: 0.25 },
      ],
    }
    expect(() => validateBedrockDestructibleByMining(true)).not.toThrow()
    expect(() => validateBedrockDestructibleByMining(false)).not.toThrow()
    expect(() => validateBedrockDestructibleByMining(component)).not.toThrow()
    expect(resolveBedrockDestructionSeconds(undefined, 5)).toBe(5)
    expect(resolveBedrockDestructionSeconds(true, 5)).toBe(5)
    expect(resolveBedrockDestructionSeconds(false, 5)).toBe(Number.POSITIVE_INFINITY)
    expect(resolveBedrockDestructionSeconds({}, 5)).toBe(DEFAULT_BEDROCK_SECONDS_TO_DESTROY)
    expect(resolveBedrockDestructionSeconds(component, 5)).toBe(7.5)
    expect(resolveBedrockItemSpecificDestroySpeed(undefined, ITEM)).toBeUndefined()
    expect(resolveBedrockItemSpecificDestroySpeed(true, ITEM)).toBeUndefined()
    expect(resolveBedrockItemSpecificDestroySpeed(false, ITEM)).toBeUndefined()
    expect(resolveBedrockItemSpecificDestroySpeed(component, ITEM)).toBe(0.3)
    expect(
      resolveBedrockItemSpecificDestroySpeed(
        { item_specific_speeds: [{ item: 'minecraft:iron_axe', destroy_speed: 0.4 }] },
        ITEM,
      ),
    ).toBeUndefined()
    expect(
      resolveBedrockItemSpecificDestroySpeed(
        { item_specific_speeds: [{ item: 'minecraft:diamond_axe', destroy_speed: 0.25 }] },
        ITEM,
      ),
    ).toBe(0.25)

    expect(() => resolveBedrockDestructionSeconds({}, -1)).toThrow('greater than or equal to zero')
    expect(() => validateBedrockDestructibleByMining(null)).toThrow(
      'Bedrock destructible_by_mining component must be an object',
    )
    expect(() => validateBedrockDestructibleByMining([])).toThrow(
      'Bedrock destructible_by_mining component must be an object',
    )
    expect(() => validateBedrockDestructibleByMining({ future: true })).toThrow('unsupported property future')
    expect(() => validateBedrockDestructibleByMining({ seconds_to_destroy: -1 })).toThrow(
      'greater than or equal to zero',
    )
    expect(() => validateBedrockDestructibleByMining({ item_specific_speeds: null })).toThrow('must be an array')
    expect(() => validateBedrockDestructibleByMining({ item_specific_speeds: [null] })).toThrow('must be an object')
    expect(() =>
      validateBedrockDestructibleByMining({ item_specific_speeds: [{ item: 'minecraft:stone' }] }),
    ).toThrow('greater than or equal to zero')
    expect(() =>
      validateBedrockDestructibleByMining({
        item_specific_speeds: [{ item: 'minecraft:stone', destroy_speed: -1 }],
      }),
    ).toThrow('greater than or equal to zero')
    expect(() => resolveBedrockItemSpecificDestroySpeed(component, null)).toThrow(
      'Bedrock item must be an object',
    )
    expect(() =>
      resolveBedrockItemSpecificDestroySpeed(component, { name: '', tags: new Set() }),
    ).toThrow('Bedrock item name must be a non-empty string')
    expect(() =>
      resolveBedrockItemSpecificDestroySpeed(component, { name: 'minecraft:diamond_axe', tags: [] }),
    ).toThrow('Bedrock item tags must be a Set or Set-like iterable')
    expect(() =>
      resolveBedrockItemSpecificDestroySpeed(component, {
        name: 'minecraft:diamond_axe',
        tags: new Set([1]),
      }),
    ).toThrow('Bedrock item tags must contain non-empty strings')
  })
})
