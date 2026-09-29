import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import * as Schema from 'effect/Schema'
import {
  BIOME_TYPES,
  BLOCK_TYPES,
  DAMAGE_TYPE_NAMES,
  ITEM_TYPES,
  STATUS_EFFECT_NAMES,
  SUPPORTED_VANILLA_ENCHANTMENT_IDS,
  SUPPORTED_VANILLA_ENCHANTMENT_RULES,
  VANILLA_CRAFTING_RECIPES,
  VANILLA_ITEM_TAG_MEMBERSHIPS,
} from '../src/index.js'
import { propertiesOfBiomeType } from '../src/domain/world/biome-validation.js'

const GOLDEN = join(process.cwd(), 'test', 'golden')

const parseJson = (text: string): unknown => JSON.parse(text)

const readGolden = <A, I>(name: string, schema: Schema.Schema<A, I>): A =>
  Schema.decodeUnknownSync(schema)(parseJson(readFileSync(join(GOLDEN, name), 'utf8')))

const stringArray = Schema.Array(Schema.String)
const unknownRecord = Schema.Record({ key: Schema.String, value: Schema.Unknown })
const golden = {
  biome: readGolden('vanilla-biome.json', unknownRecord),
  block: readGolden('vanilla-block.json', unknownRecord),
  damageType: readGolden('vanilla-damage-type.json', stringArray),
  enchantment: readGolden('vanilla-enchantment.json', unknownRecord),
  item: readGolden('vanilla-item.json', stringArray),
  mobEffect: readGolden('vanilla-mob-effect.json', stringArray),
  recipe: readGolden('vanilla-recipe.json', unknownRecord),
  tag: readGolden('vanilla-tag.json', unknownRecord),
}

const keysOf = (value: Readonly<Record<string, unknown>>): ReadonlyArray<string> => Object.keys(value)

const conformanceDocument = readFileSync(join(process.cwd(), 'docs', 'conformance.md'), 'utf8')

const conformanceCounts = (id: string, prefix: string): readonly [number, number] => {
  const row = conformanceDocument.split('\n').find((line) => line.startsWith(`| \`mc-kernel:${id}\` |`))
  if (row === undefined) throw new Error(`missing conformance row: ${id}`)
  const match = new RegExp(`^\\| [\\u0060]mc-kernel:${id}[\\u0060] \\| [\\u0060]mc-kernel[\\u0060] \\| ${prefix} (\\d+)\\/(\\d+)\\b`).exec(row)
  if (match === null) throw new Error(`invalid conformance row counts: ${id}`)
  return [Number(match[1]), Number(match[2])]
}

describe('Minecraft Java Edition 26.3 V-1 golden', () => {
  it('decodes all kernel-owned golden categories through Schema', () => {
    expect(keysOf(golden.biome)).toHaveLength(67)
    expect(keysOf(golden.block)).toHaveLength(1286)
    expect(golden.damageType).toHaveLength(51)
    expect(keysOf(golden.enchantment)).toHaveLength(43)
    expect(golden.item).toHaveLength(1658)
    expect(golden.mobEffect).toHaveLength(40)
    expect(keysOf(golden.recipe)).toHaveLength(2042)
    expect(keysOf(golden.tag)).toHaveLength(236)
  })

  it('matches the complete 26.3 id sets for the five regenerated categories', () => {
    const biomeIds = keysOf(golden.biome).map((id) => id.split('/').pop()?.replace('.json', '') ?? id)
    expect([...BIOME_TYPES].sort()).toEqual([...biomeIds].sort())
    expect([...DAMAGE_TYPE_NAMES].sort()).toEqual([...golden.damageType].sort())
    expect([...SUPPORTED_VANILLA_ENCHANTMENT_IDS].sort()).toEqual([...keysOf(golden.enchantment)].sort())
    expect([...STATUS_EFFECT_NAMES].sort()).toEqual([...golden.mobEffect].sort())
    const tagIds = [...VANILLA_ITEM_TAG_MEMBERSHIPS.keys()]
      .filter((tag) => tag !== '#minecraft:trim_templates')
      .map((tag) => tag.replace(/^#minecraft:/, ''))
    expect([...tagIds].sort()).toEqual([...keysOf(golden.tag)].sort())
  })

  it('keeps the generated kernel tables fresh', () => {
    const temporaryDirectory = mkdtempSync(join(tmpdir(), 'mc-kernel-vanilla-'))
    const generatedPath = join(temporaryDirectory, 'vanilla-26-3-generated.ts')
    try {
      execFileSync(process.execPath, [
        '--experimental-strip-types',
        join(process.cwd(), 'scripts', 'generate-vanilla-tables.ts'),
        '--output',
        generatedPath,
      ], { cwd: process.cwd(), stdio: 'pipe' })
      expect(readFileSync(generatedPath)).toEqual(readFileSync(join(process.cwd(), 'src', 'domain', 'vanilla-26-3-generated.ts')))
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true })
    }
  })

  it('keeps block, item, and recipe ids within the intentionally divergent scope', () => {
    const blockExtensions = new Set(['sapling', 'pressure_plate', 'wheat_crop', 'potato_crop', 'nether_wart_crop', 'redstone_lamp_lit', 'end_portal_frame_filled', 'end_crystal', 'door', 'door_open', 'bed', 'nether_brick'])
    const itemExtensions = new Set(['end_portal_frame_filled', 'door', 'bed', 'redstone_dust', 'pressure_plate', 'sapling', 'water_bottle', 'awkward_potion', 'potion_of_swiftness', 'potion_of_poison', 'potion_of_regeneration', 'eye_of_ender', 'wool', 'gold_pickaxe', 'gold_shovel', 'gold_axe', 'gold_hoe', 'gold_sword'])
    const recipeExtensions = new Set(['bone_meal', 'oak_planks', 'coal_from_block', 'iron_from_block', 'diamond_from_block', 'redstone_from_block', 'lapis_from_block', 'emerald_from_block', 'amethyst_from_block', 'stone_button', 'purpur_slab', 'stone_slab', 'wool', 'sugar', 'eye_of_ender', 'door', 'bed', 'pressure_plate', 'gold_ingot', 'gold_shovel', 'gold_axe', 'gold_pickaxe', 'gold_hoe', 'gold_sword'])
    expect(BLOCK_TYPES.filter((id) => !blockExtensions.has(id)).every((id) => id === 'air' || id in golden.block)).toBe(true)
    expect(ITEM_TYPES.filter((id) => !itemExtensions.has(id)).every((id) => golden.item.includes(id))).toBe(true)
    expect(VANILLA_CRAFTING_RECIPES.every((recipe) => {
      const id = recipe.id.replace('minecraft:', '').replaceAll('-', '_')
      return recipeExtensions.has(id) || golden.recipe[id] !== undefined
    })).toBe(true)
    expect(BLOCK_TYPES).toHaveLength(123)
    expect(ITEM_TYPES).toHaveLength(280)
    expect(VANILLA_CRAFTING_RECIPES).toHaveLength(100)
  })

  it('keeps conformance catalog counts aligned with the exposed tables', () => {
    expect(conformanceCounts('block-registry-26-3', 'Block table remains')).toEqual([BLOCK_TYPES.length, keysOf(golden.block).length])
    expect(conformanceCounts('item-registry-26-3', 'Item table remains')).toEqual([ITEM_TYPES.length, golden.item.length])
    expect(conformanceCounts('recipe-types-26-3', 'Kernel schema represents')).toEqual([VANILLA_CRAFTING_RECIPES.length, keysOf(golden.recipe).length])
  })

  it('matches enchantment max levels for every currently represented rule', () => {
    for (const rule of SUPPORTED_VANILLA_ENCHANTMENT_RULES) {
      const row = golden.enchantment[rule.id]
      if (typeof row !== 'object' || row === null || !('max_level' in row) || typeof row.max_level !== 'number') {
        throw new Error(`missing max_level in enchantment golden: ${rule.id}`)
      }
      expect(rule.maxLevel).toBe(row.max_level)
    }
  })

  it('matches golden biome climate attributes for every regenerated biome', () => {
    for (const biome of BIOME_TYPES) {
      const row = golden.biome[`data/minecraft/worldgen/biome/${biome}.json`]
      if (typeof row !== 'object' || row === null || !('temperature' in row) || !('downfall' in row) ||
          !('has_precipitation' in row) || typeof row.temperature !== 'number' ||
          typeof row.downfall !== 'number' || typeof row.has_precipitation !== 'boolean') {
        throw new Error(`missing climate attributes in biome golden: ${biome}`)
      }
      const properties = propertiesOfBiomeType(biome)
      expect(properties.temperature).toBe(row.temperature)
      expect(properties.downfall).toBe(row.downfall)
      expect(properties.precipitation === 'none').toBe(!row.has_precipitation)
    }
  })
})
