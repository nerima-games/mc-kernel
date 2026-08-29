import { describe, expect, it } from 'vitest'
import {
  BIOME_PROPERTY_DEFAULTS,
  BIOME_PROPERTY_OVERRIDES,
  BIOME_TYPES,
  SNOW_TEMPERATURE_THRESHOLD,
  derivePrecipitationKind,
  isBiomeType,
  propertiesOfBiome,
  propertiesOfBiomeType,
  resolveBiomeProperties,
  type BiomeType,
} from '../src/domain/biome'

const TEMPERATURE_STEP = 0.01
const BELOW_THRESHOLD_TEMPERATURE = SNOW_TEMPERATURE_THRESHOLD - TEMPERATURE_STEP
const ABOVE_THRESHOLD_TEMPERATURE = SNOW_TEMPERATURE_THRESHOLD + TEMPERATURE_STEP

const KNOWN_BIOME: BiomeType = 'plains'
const UNKNOWN_BIOME_NAME = 'not_a_biome'
const NON_STRING_BIOME = 42

const SWAMP_GRASS_TINT = 0x6a7039
const BADLANDS_FOLIAGE_TINT = 0x9e814d

const NETHER_BIOMES: ReadonlyArray<BiomeType> = [
  'nether_wastes',
  'crimson_forest',
  'warped_forest',
  'soul_sand_valley',
  'basalt_deltas',
]

const END_BIOMES: ReadonlyArray<BiomeType> = [
  'the_end',
  'small_end_islands',
  'end_midlands',
  'end_highlands',
  'end_barrens',
]

const CAVE_BIOMES: ReadonlyArray<BiomeType> = ['dripstone_caves', 'lush_caves', 'deep_dark']

const NO_PRECIPITATION_BIOMES: ReadonlyArray<BiomeType> = [
  'desert',
  'savanna',
  'savanna_plateau',
  'windswept_savanna',
  'badlands',
  'eroded_badlands',
  'wooded_badlands',
  ...NETHER_BIOMES,
  ...END_BIOMES,
]

describe('the biome vocabulary', () => {
  it('is non-empty and has no duplicate entries', () => {
    expect(BIOME_TYPES.length).toBeGreaterThan(0)
    expect(new Set(BIOME_TYPES).size).toBe(BIOME_TYPES.length)
  })

  it('has exactly one property row per biome, so a missing row cannot ship silently', () => {
    expect(Object.keys(BIOME_PROPERTY_OVERRIDES).sort()).toStrictEqual([...BIOME_TYPES].sort())
  })
})

describe('precipitation derivation', () => {
  it('derives snow strictly below the threshold and rain at or above it', () => {
    expect(derivePrecipitationKind(BELOW_THRESHOLD_TEMPERATURE)).toBe('snow')
    expect(derivePrecipitationKind(SNOW_TEMPERATURE_THRESHOLD)).toBe('rain')
    expect(derivePrecipitationKind(ABOVE_THRESHOLD_TEMPERATURE)).toBe('rain')
  })

  it('can never disagree with temperature for any biome in the table', () => {
    for (const biome of BIOME_TYPES) {
      const properties = propertiesOfBiomeType(biome)

      if (properties.precipitation === 'none') {
        continue
      }

      expect(properties.precipitation).toBe(derivePrecipitationKind(properties.temperature))
    }
  })

  it('reserves `none` for the biomes that are dry regardless of temperature', () => {
    for (const biome of NO_PRECIPITATION_BIOMES) {
      expect(propertiesOfBiomeType(biome).precipitation).toBe('none')
    }

    expect(propertiesOfBiomeType('plains').precipitation).toBe('rain')
    expect(propertiesOfBiomeType('snowy_plains').precipitation).toBe('snow')
  })
})

describe('default resolution', () => {
  it('a biome whose overrides are empty resolves to exactly the defaults', () => {
    expect(BIOME_PROPERTY_OVERRIDES.plains).toStrictEqual({})
    expect(resolveBiomeProperties({})).toStrictEqual(BIOME_PROPERTY_DEFAULTS)
    expect(propertiesOfBiomeType('plains')).toStrictEqual(BIOME_PROPERTY_DEFAULTS)
  })

  it('agrees with resolveBiomeProperties for every declared row', () => {
    for (const biome of BIOME_TYPES) {
      expect(propertiesOfBiomeType(biome)).toStrictEqual(resolveBiomeProperties(BIOME_PROPERTY_OVERRIDES[biome]))
    }
  })

  it('every property has a default, so no property can be introduced without one', () => {
    expect(Object.keys(BIOME_PROPERTY_DEFAULTS).sort()).toStrictEqual(
      ['temperature', 'downfall', 'precipitation', 'grassTint', 'foliageTint', 'waterTint', 'dimension'].sort(),
    )
  })
})

describe('dimension assignment', () => {
  it('assigns nether biomes to the nether dimension', () => {
    for (const biome of NETHER_BIOMES) {
      expect(propertiesOfBiomeType(biome).dimension).toBe('nether')
    }
  })

  it('assigns End biomes to the end dimension', () => {
    for (const biome of END_BIOMES) {
      expect(propertiesOfBiomeType(biome).dimension).toBe('end')
    }
  })

  it('assigns overworld and cave biomes to the overworld dimension', () => {
    expect(propertiesOfBiomeType('plains').dimension).toBe('overworld')

    for (const biome of CAVE_BIOMES) {
      expect(propertiesOfBiomeType(biome).dimension).toBe('overworld')
    }
  })
})

describe('tint overrides', () => {
  it('gives the swamp and badlands groups their vanilla fixed tints, not the default', () => {
    const swamp = propertiesOfBiomeType('swamp')
    expect(swamp.grassTint).toBe(SWAMP_GRASS_TINT)
    expect(swamp.grassTint).not.toBe(BIOME_PROPERTY_DEFAULTS.grassTint)

    const badlands = propertiesOfBiomeType('badlands')
    expect(badlands.foliageTint).toBe(BADLANDS_FOLIAGE_TINT)
    expect(badlands.foliageTint).not.toBe(BIOME_PROPERTY_DEFAULTS.foliageTint)
  })

  it('leaves grass, foliage and water tint at the default for a biome that does not override them', () => {
    const forest = propertiesOfBiomeType('forest')
    expect(forest.grassTint).toBe(BIOME_PROPERTY_DEFAULTS.grassTint)
    expect(forest.foliageTint).toBe(BIOME_PROPERTY_DEFAULTS.foliageTint)
    expect(forest.waterTint).toBe(BIOME_PROPERTY_DEFAULTS.waterTint)
  })
})

describe('isBiomeType', () => {
  it('accepts every declared biome name', () => {
    for (const biome of BIOME_TYPES) {
      expect(isBiomeType(biome)).toBe(true)
    }
  })

  it('rejects an unknown string', () => {
    expect(isBiomeType(UNKNOWN_BIOME_NAME)).toBe(false)
  })

  it('rejects non-string values', () => {
    expect(isBiomeType(NON_STRING_BIOME)).toBe(false)
    expect(isBiomeType(null)).toBe(false)
    expect(isBiomeType(undefined)).toBe(false)
    expect(isBiomeType({})).toBe(false)
  })
})

describe('propertiesOfBiome (the unknown-input boundary)', () => {
  it('resolves a valid, untyped biome name the same way as the typed accessor', () => {
    const value: unknown = KNOWN_BIOME
    expect(propertiesOfBiome(value)).toStrictEqual(propertiesOfBiomeType(KNOWN_BIOME))
  })

  it('throws a TypeError naming the rejected value for an unknown biome', () => {
    expect(() => propertiesOfBiome(UNKNOWN_BIOME_NAME)).toThrow(TypeError)
    expect(() => propertiesOfBiome(UNKNOWN_BIOME_NAME)).toThrow(UNKNOWN_BIOME_NAME)
  })

  it('throws for non-string input', () => {
    expect(() => propertiesOfBiome(NON_STRING_BIOME)).toThrow(TypeError)
  })
})
