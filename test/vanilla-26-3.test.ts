import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as Schema from 'effect/Schema'
import { BIOME_TYPES } from '../src/domain/biome-data.js'
import { DAMAGE_TYPE_NAMES } from '../src/domain/damage-type-data.js'
import { SUPPORTED_VANILLA_ENCHANTMENT_IDS, SUPPORTED_VANILLA_ENCHANTMENT_RULES } from '../src/domain/enchantment-data.js'
import { STATUS_EFFECT_NAMES } from '../src/domain/status-effect-data.js'

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
const subset = (current: ReadonlyArray<string>, target: ReadonlyArray<string>): void => {
  expect(current.filter((id) => !target.includes(id))).toEqual([])
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

  it('keeps the current kernel rosters within the pinned 26.3 rosters', () => {
    subset(BIOME_TYPES, keysOf(golden.biome).map((id) => id.split('/').pop()?.replace('.json', '') ?? id))
    subset(DAMAGE_TYPE_NAMES, golden.damageType)
    subset(SUPPORTED_VANILLA_ENCHANTMENT_IDS, keysOf(golden.enchantment))
    subset(STATUS_EFFECT_NAMES, golden.mobEffect)
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
})
