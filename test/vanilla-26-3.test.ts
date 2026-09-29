import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as Schema from 'effect/Schema'
import { BIOME_TYPES } from '../src/domain/biome-data.js'
import { propertiesOfBiomeType } from '../src/domain/biome-validation.js'
import { BLOCK_TYPES } from '../src/domain/block-type-data.js'
import { DAMAGE_TYPE_NAMES } from '../src/domain/damage-type-data.js'
import { SUPPORTED_VANILLA_ENCHANTMENT_IDS, SUPPORTED_VANILLA_ENCHANTMENT_RULES } from '../src/domain/enchantment-data.js'
import { ITEM_TYPES } from '../src/domain/item-type-data.js'
import { VANILLA_CRAFTING_RECIPES } from '../src/domain/recipe-vanilla-data.js'
import { STATUS_EFFECT_NAMES } from '../src/domain/status-effect-data.js'
import { VANILLA_ITEM_TAG_MEMBERSHIP_ENTRIES } from '../src/domain/tag-membership-data.js'

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
    expect(VANILLA_ITEM_TAG_MEMBERSHIP_ENTRIES.map((entry) => entry.tag).sort()).toEqual(keysOf(golden.tag).map((id) => `minecraft:${id}`).sort())
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
