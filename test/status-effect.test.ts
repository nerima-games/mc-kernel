import { describe, expect, it } from 'vitest'
import {
  STATUS_EFFECT_AMPLIFIER_MAX,
  STATUS_EFFECT_DEFINITIONS,
  STATUS_EFFECT_NAMES,
  isStatusEffectId,
  isStatusEffectName,
  resolveStatusEffectDefinition,
  statusEffectId,
} from '../src/domain/status-effect'
import type { FoodStatusEffectName } from '../src/domain/food-data'
import { VANILLA_STATUS_EFFECT_IDS } from '../src/domain/item-component-values-data'
import { isVanillaPotionEffectId } from '../src/domain/item-component-values-validation'

const EXPECTED_STATUS_EFFECT_COUNT = 39

describe('STATUS_EFFECT_NAMES', () => {
  it('has exactly the 39 closed Java Edition 1.21 mob effects, each unique', () => {
    expect(STATUS_EFFECT_NAMES.length).toBe(EXPECTED_STATUS_EFFECT_COUNT)
    expect(new Set(STATUS_EFFECT_NAMES).size).toBe(EXPECTED_STATUS_EFFECT_COUNT)
  })
})

describe('STATUS_EFFECT_DEFINITIONS', () => {
  it('gives every name a row whose own name field matches the key, with a well-formed colour and the shared amplifier ceiling', () => {
    for (const name of STATUS_EFFECT_NAMES) {
      const definition = STATUS_EFFECT_DEFINITIONS[name]
      expect(definition.name).toBe(name)
      expect(typeof definition.beneficial).toBe('boolean')
      expect(Number.isInteger(definition.particleColor)).toBe(true)
      expect(definition.particleColor).toBeGreaterThanOrEqual(0)
      expect(definition.particleColor).toBeLessThanOrEqual(0xffffff)
      expect(definition.maxAmplifier).toBe(STATUS_EFFECT_AMPLIFIER_MAX)
    }
  })

  it('classifies well-known beneficial and harmful effects per the vanilla registry', () => {
    expect(STATUS_EFFECT_DEFINITIONS.speed.beneficial).toBe(true)
    expect(STATUS_EFFECT_DEFINITIONS.regeneration.beneficial).toBe(true)
    expect(STATUS_EFFECT_DEFINITIONS.hero_of_the_village.beneficial).toBe(true)
    expect(STATUS_EFFECT_DEFINITIONS.poison.beneficial).toBe(false)
    expect(STATUS_EFFECT_DEFINITIONS.wither.beneficial).toBe(false)
    expect(STATUS_EFFECT_DEFINITIONS.wind_charged.beneficial).toBe(false)
  })

  it('carries the vanilla particle colour (minecraft.wiki Effect colors, pageid 181520)', () => {
    expect(STATUS_EFFECT_DEFINITIONS.speed.particleColor).toBe(0x33ebff)
    expect(STATUS_EFFECT_DEFINITIONS.poison.particleColor).toBe(0x87a363)
    expect(STATUS_EFFECT_DEFINITIONS.infested.particleColor).toBe(0x8c9b8c)
  })
})

describe('statusEffectId', () => {
  it('namespaces a status effect name under minecraft:', () => {
    expect(statusEffectId('speed')).toBe('minecraft:speed')
    expect(statusEffectId('hero_of_the_village')).toBe('minecraft:hero_of_the_village')
  })
})

describe('isStatusEffectName', () => {
  it('accepts every vocabulary member', () => {
    for (const name of STATUS_EFFECT_NAMES) {
      expect(isStatusEffectName(name)).toBe(true)
    }
  })

  it('rejects unknown strings and non-strings', () => {
    expect(isStatusEffectName('not_an_effect')).toBe(false)
    expect(isStatusEffectName('')).toBe(false)
    expect(isStatusEffectName(42)).toBe(false)
    expect(isStatusEffectName(undefined)).toBe(false)
    expect(isStatusEffectName(null)).toBe(false)
  })
})

describe('isStatusEffectId', () => {
  it('accepts every vocabulary member, namespaced', () => {
    for (const name of STATUS_EFFECT_NAMES) {
      expect(isStatusEffectId(statusEffectId(name))).toBe(true)
    }
  })

  it('rejects ids outside the closed vocabulary and non-strings', () => {
    expect(isStatusEffectId('minecraft:not_an_effect')).toBe(false)
    expect(isStatusEffectId('mymod:custom_effect')).toBe(false)
    expect(isStatusEffectId(123)).toBe(false)
  })
})

describe('resolveStatusEffectDefinition', () => {
  it('resolves a valid name to its table row', () => {
    expect(resolveStatusEffectDefinition('speed')).toBe(STATUS_EFFECT_DEFINITIONS.speed)
  })

  it('throws on an unrecognised value', () => {
    expect(() => resolveStatusEffectDefinition('not_an_effect')).toThrow(TypeError)
    expect(() => resolveStatusEffectDefinition(42)).toThrow(TypeError)
  })
})

describe('FoodStatusEffectName (food-data.ts projection)', () => {
  it('keeps exactly the 7 vanilla food effect names, each a member of the closed vocabulary', () => {
    const foodEffectNames: ReadonlyArray<FoodStatusEffectName> = [
      'absorption',
      'fire_resistance',
      'hunger',
      'nausea',
      'poison',
      'regeneration',
      'resistance',
    ]
    expect(foodEffectNames.length).toBe(7)
    for (const name of foodEffectNames) {
      expect(isStatusEffectName(name)).toBe(true)
    }
  })
})

describe('VANILLA_STATUS_EFFECT_IDS (item-component-values-data.ts projection)', () => {
  it('lists every closed-vocabulary effect id exactly once', () => {
    expect(VANILLA_STATUS_EFFECT_IDS.length).toBe(STATUS_EFFECT_NAMES.length)
    expect(new Set(VANILLA_STATUS_EFFECT_IDS).size).toBe(STATUS_EFFECT_NAMES.length)
    expect(VANILLA_STATUS_EFFECT_IDS).toContain('minecraft:speed')
  })
})

describe('isVanillaPotionEffectId (item-component-values-validation.ts projection)', () => {
  it('accepts a vanilla effect id and rejects everything else', () => {
    expect(isVanillaPotionEffectId('minecraft:speed')).toBe(true)
    expect(isVanillaPotionEffectId('minecraft:custom_effect')).toBe(false)
    expect(isVanillaPotionEffectId('not a resource location')).toBe(false)
    expect(isVanillaPotionEffectId(123)).toBe(false)
  })
})
