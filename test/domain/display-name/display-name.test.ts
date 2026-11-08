import { Result, Schema } from 'effect'
import { describe, expect, it } from 'vitest'
import * as kernel from '../../../src/index.js'
import {
  englishDisplayNameForId,
  japaneseDisplayNameForId,
} from '../../../src/domain/display-name/display-name-naming.js'

const ALLOWED_SHARED_NAME_IDS = [
  'amethyst_block', 'andesite', 'anvil', 'bed', 'brewing_stand',
  'brown_mushroom', 'cactus', 'calcite', 'cauldron', 'chest',
  'chorus_flower', 'chorus_plant', 'coal_block', 'coal_ore', 'cobblestone',
  'comparator', 'crafting_table', 'dandelion', 'deepslate', 'deepslate_coal_ore',
  'deepslate_diamond_ore', 'deepslate_emerald_ore', 'deepslate_gold_ore', 'deepslate_iron_ore', 'deepslate_lapis_ore',
  'deepslate_redstone_ore', 'diamond_block', 'diamond_ore', 'diorite', 'dirt',
  'dispenser', 'door', 'dragon_egg', 'dropper', 'emerald_block',
  'emerald_ore', 'enchanting_table', 'end_crystal', 'end_portal_frame', 'end_portal_frame_filled',
  'end_rod', 'end_stone', 'end_stone_bricks', 'ender_chest', 'fern',
  'furnace', 'glass', 'glowstone', 'gold_block', 'gold_ore',
  'granite', 'grass_block', 'gravel', 'hopper', 'iron_block',
  'iron_ore', 'kelp', 'ladder', 'lapis_block', 'lapis_ore',
  'lever', 'lily_pad', 'nether_brick', 'netherrack', 'oak_leaves',
  'oak_log', 'oak_planks', 'oak_stairs', 'observer', 'obsidian',
  'piston', 'poppy', 'powered_rail', 'pressure_plate', 'prismarine',
  'purpur_block', 'purpur_pillar', 'purpur_slab', 'purpur_stairs', 'rail',
  'red_mushroom', 'redstone_block', 'redstone_lamp', 'redstone_ore', 'redstone_torch',
  'repeater', 'sand', 'sandstone', 'sapling', 'seagrass',
  'shulker_box', 'smooth_basalt', 'soul_sand', 'soul_soil', 'stone',
  'stone_button', 'stone_slab', 'sugar_cane', 'tall_grass', 'tnt',
  'torch', 'wither_skeleton_skull',
] as const

const allowedSharedNameIds = new Set<string>(ALLOWED_SHARED_NAME_IDS)

type NameExpectation = Readonly<{
  kind: 'item' | 'block'
  id: string
  en: string
  ja: string
}>

const expectedNamesForId = (id: kernel.ItemType | kernel.BlockType): Readonly<{ en: string; ja: string }> => ({
  en: englishDisplayNameForId(id),
  ja: japaneseDisplayNameForId(id),
})

const expectedRows: ReadonlyArray<NameExpectation> = [
  ...kernel.ITEM_TYPES.map((id) => ({ kind: 'item' as const, id, ...expectedNamesForId(id) })),
  ...kernel.BLOCK_TYPES.map((id) => ({ kind: 'block' as const, id, ...expectedNamesForId(id) })),
]

const repeatedNameGroups = (language: 'en' | 'ja'): ReadonlyArray<ReadonlyArray<NameExpectation>> => {
  const rowsByName = new Map<string, Array<NameExpectation>>()
  for (const row of expectedRows) {
    const rows = rowsByName.get(row[language]) ?? []
    rows.push(row)
    rowsByName.set(row[language], rows)
  }
  return [...rowsByName.values()].filter((rows) => rows.length > 1)
}

const isAllowedSharedNameGroup = (rows: ReadonlyArray<NameExpectation>): boolean =>
  rows.length === 2 &&
  rows[0]?.kind !== rows[1]?.kind &&
  rows[0]?.id === rows[1]?.id &&
  allowedSharedNameIds.has(rows[0]?.id ?? '')

describe('display names', () => {
  it('covers every current item and block ID with trimmed non-empty names computed from that ID', () => {
    expect(Object.keys(kernel.ITEM_DISPLAY_NAMES).sort()).toEqual([...kernel.ITEM_TYPES].sort())
    expect(Object.keys(kernel.BLOCK_DISPLAY_NAMES).sort()).toEqual([...kernel.BLOCK_TYPES].sort())

    for (const id of kernel.ITEM_TYPES) {
      const actual = kernel.ITEM_DISPLAY_NAMES[id]
      const expected = expectedNamesForId(id)
      expect(actual.en).toBe(expected.en)
      expect(actual.ja).toBe(expected.ja)
      expect(actual.en.length).toBeGreaterThan(0)
      expect(actual.ja.length).toBeGreaterThan(0)
      expect(actual.en.trim()).toBe(actual.en)
      expect(actual.ja.trim()).toBe(actual.ja)
    }

    for (const id of kernel.BLOCK_TYPES) {
      const actual = kernel.BLOCK_DISPLAY_NAMES[id]
      const expected = expectedNamesForId(id)
      expect(actual.en).toBe(expected.en)
      expect(actual.ja).toBe(expected.ja)
      expect(actual.en.length).toBeGreaterThan(0)
      expect(actual.ja.length).toBeGreaterThan(0)
      expect(actual.en.trim()).toBe(actual.en)
      expect(actual.ja.trim()).toBe(actual.ja)
    }
  })

  it('allows duplicate names only for the explicit same-ID item/block pairs', () => {
    const sharedIds = kernel.ITEM_TYPES.filter((id) => kernel.BLOCK_TYPES.includes(id as kernel.BlockType)).sort()
    expect([...ALLOWED_SHARED_NAME_IDS].sort()).toEqual(sharedIds)

    for (const language of ['en', 'ja'] as const) {
      const unexpectedGroups = repeatedNameGroups(language).filter((rows) => !isAllowedSharedNameGroup(rows))
      expect(unexpectedGroups).toEqual([])
    }
  })

  it('returns the name computed from each request ID and language', () => {
    for (const id of kernel.ITEM_TYPES) {
      for (const language of ['en', 'ja'] as const) {
        const result = kernel.getDisplayName({ kind: 'item', id, language })
        expect(Result.isSuccess(result)).toBe(true)
        if (Result.isSuccess(result)) {
          expect(result.success).toBe(expectedNamesForId(id)[language])
        }
      }
    }

    for (const id of kernel.BLOCK_TYPES) {
      for (const language of ['en', 'ja'] as const) {
        const result = kernel.getDisplayName({ kind: 'block', id, language })
        expect(Result.isSuccess(result)).toBe(true)
        if (Result.isSuccess(result)) {
          expect(result.success).toBe(expectedNamesForId(id)[language])
        }
      }
    }
  })

  it('rejects invalid requests without retaining the input', () => {
    const invalidRequests: ReadonlyArray<unknown> = [
      null,
      {},
      { kind: 'item', id: 'unknown_item', language: 'en' },
      { kind: 'block', id: 'stone', language: 'fr' },
      { kind: 'item', id: 'stone', language: 'en', extra: true },
    ]

    for (const input of invalidRequests) {
      expect(kernel.getDisplayName(input)).toEqual(
        Result.fail({ _tag: 'InvalidDisplayNameRequest' }),
      )
    }
  })

  it('keeps DisplayNameSchema as a non-empty boundary for restored strings', () => {
    expect(Result.isFailure(Schema.decodeUnknownResult(kernel.DisplayNameSchema)(''))).toBe(true)
    expect(Result.isFailure(Schema.decodeUnknownResult(kernel.DisplayNameSchema)('label'))).toBe(false)
  })
})
