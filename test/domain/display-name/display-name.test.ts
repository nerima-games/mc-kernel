import * as fc from 'fast-check'
import { Result, Schema } from 'effect'
import { describe, expect, it } from 'vitest'
import * as kernel from '../../../src/index.js'
import {
  englishDisplayNameForId,
  japaneseDisplayNameForId,
  japaneseNameMethodForId,
} from '../../../src/domain/display-name/display-name-naming.js'

const ALLOWED_SHARED_NAME_IDS = [
  'amethyst_block', 'andesite', 'anvil', 'bed', 'bookshelf', 'brewing_stand',
  'brown_mushroom', 'cactus', 'calcite', 'cauldron', 'chest',
  'chorus_flower', 'chorus_plant', 'coal_block', 'coal_ore', 'cobblestone',
  'comparator', 'copper_ore', 'crafting_table', 'dandelion', 'deepslate', 'deepslate_coal_ore',
  'deepslate_copper_ore', 'deepslate_diamond_ore', 'deepslate_emerald_ore', 'deepslate_gold_ore', 'deepslate_iron_ore', 'deepslate_lapis_ore',
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
  'sticky_piston', 'stone_button', 'stone_slab', 'sugar_cane', 'tall_grass', 'tnt',
  'torch', 'wither_skeleton_skull',
] as const

const allowedSharedNameIds = new Set<string>(ALLOWED_SHARED_NAME_IDS)

const COMMON_KATAKANA_NAME_ALLOWLIST: Readonly<
  Record<string, Readonly<{ name: string; reason: string }>>
> = {
  bed: { name: 'ベッド', reason: 'Everyday loanword for a bed.' },
  beetroot: { name: 'ビート', reason: 'Common food loanword for beet.' },
  bread: { name: 'パン', reason: 'Everyday loanword for bread.' },
  brick: { name: 'レンガ', reason: 'Everyday loanword for fired masonry.' },
  bucket: { name: 'バケツ', reason: 'Everyday loanword for a carrying vessel.' },
  chest: { name: 'チェスト', reason: 'Everyday loanword for storage furniture.' },
  cookie: { name: 'クッキー', reason: 'Everyday loanword for a baked snack.' },
  diamond: { name: 'ダイヤモンド', reason: 'Everyday loanword for the gemstone.' },
  door: { name: 'ドア', reason: 'Everyday loanword for an entrance.' },
  emerald: { name: 'エメラルド', reason: 'Everyday loanword for the gemstone.' },
  glass: { name: 'ガラス', reason: 'Everyday loanword for the material.' },
  lever: { name: 'レバー', reason: 'Everyday loanword for a mechanical handle.' },
  rail: { name: 'レール', reason: 'Everyday loanword for a track.' },
} as const

const KATAKANA_ONLY = /^[\p{Script=Katakana}\u30FC\u30FB ]+$/u
const HAS_KATAKANA = /\p{Script=Katakana}/u
const HAS_NON_KATAKANA = /[^\p{Script=Katakana}\u30FC\u30FB ]/u
const HAS_COMMON_JAPANESE_CHARACTER = /[\p{Script=Han}\p{Script=Hiragana}]/u

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
  it('uses the pinned English and Japanese bookshelf names', () => {
    expect(englishDisplayNameForId('bookshelf')).toBe('Bookshelf')
    expect(japaneseDisplayNameForId('bookshelf')).toBe('本棚')
    expect(japaneseNameMethodForId('bookshelf')).toBe('common')
  })

  it('uses the pinned English and Japanese names for the redstone variants', () => {
    expect(englishDisplayNameForId('sticky_piston')).toBe('Sticky Piston')
    expect(japaneseDisplayNameForId('sticky_piston')).toBe('粘着ピストン')
    expect(japaneseNameMethodForId('sticky_piston')).toBe('compound')
    expect(englishDisplayNameForId('redstone_wall_torch')).toBe('Redstone Wall Torch')
    expect(japaneseDisplayNameForId('redstone_wall_torch')).toBe('レッドストーンの壁掛けトーチ')
    expect(japaneseNameMethodForId('redstone_wall_torch')).toBe('compound')
  })

  it('records an allowed Japanese naming method for every current ID', () => {
    const methods = ['katakana', 'common', 'compound'] as const
    const ids: ReadonlyArray<kernel.ItemType | kernel.BlockType> = [
      ...kernel.ITEM_TYPES,
      ...kernel.BLOCK_TYPES,
    ]

    for (const id of ids) {
      expect(methods).toContain(japaneseNameMethodForId(id))
    }
  })

  it('matches every Japanese naming method to its name form', () => {
    const ids: ReadonlyArray<kernel.ItemType | kernel.BlockType> = [
      ...kernel.ITEM_TYPES,
      ...kernel.BLOCK_TYPES,
    ]
    expect(kernel.ITEM_TYPES.length).toBeGreaterThan(0)
    expect(kernel.BLOCK_TYPES.length).toBeGreaterThan(0)

    for (const id of ids) {
      const name = japaneseDisplayNameForId(id)
      const method = japaneseNameMethodForId(id)

      if (method === 'katakana') {
        expect(KATAKANA_ONLY.test(name), id).toBe(true)
      } else if (method === 'common') {
        const allowlistedLoanword = COMMON_KATAKANA_NAME_ALLOWLIST[id]
        if (allowlistedLoanword !== undefined) {
          expect(allowlistedLoanword.name, id).toBe(name)
          expect(allowlistedLoanword.reason.trim().length, id).toBeGreaterThan(0)
          expect(KATAKANA_ONLY.test(name), id).toBe(true)
        }
        expect(
          HAS_COMMON_JAPANESE_CHARACTER.test(name) || allowlistedLoanword?.name === name,
          id,
        ).toBe(true)
      } else {
        expect(HAS_KATAKANA.test(name), id).toBe(true)
        expect(HAS_NON_KATAKANA.test(name), id).toBe(true)
      }
    }

    const currentIds = new Set<string>(ids)
    for (const id of Object.keys(COMMON_KATAKANA_NAME_ALLOWLIST)) {
      expect(currentIds.has(id), id).toBe(true)
    }
  })

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
      expect(actual.en).not.toContain('_')
      expect(actual.ja).not.toContain('_')
      expect(actual.en).not.toContain(':')
      expect(actual.ja).not.toContain(':')
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
      expect(actual.en).not.toContain('_')
      expect(actual.ja).not.toContain('_')
      expect(actual.en).not.toContain(':')
      expect(actual.ja).not.toContain(':')
    }
  })

  it('allows duplicate names only for the explicit same-ID item/block pairs', () => {
    const blockIds = new Set<string>(kernel.BLOCK_TYPES)
    const sharedIds = kernel.ITEM_TYPES.filter((id) => blockIds.has(id)).sort()
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

  it('returns a typed result for arbitrary inputs without throwing', () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        const result = kernel.getDisplayName(input)
        if (Result.isSuccess(result)) {
          expect(Result.isSuccess(Schema.decodeUnknownResult(kernel.DisplayNameSchema)(result.success))).toBe(true)
        } else {
          expect(result.failure).toEqual({ _tag: 'InvalidDisplayNameRequest' })
        }
      }),
    )
  })
})
