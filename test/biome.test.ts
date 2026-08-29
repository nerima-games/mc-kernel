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

const SWAMP_FOLIAGE_TINT = 0x6a7039
const BADLANDS_FOLIAGE_TINT = 0x9e814d
const CHERRY_GROVE_GRASS_TINT = 0xb6db61

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
  'the_void',
  ...NETHER_BIOMES,
  ...END_BIOMES,
]

/**
 * Every field below was read from `data/minecraft/worldgen/biome/*.json` at
 * the `1.21-data` tag of the misode/mcmeta registry mirror
 * (https://github.com/misode/mcmeta/tree/1.21-data/data/minecraft/worldgen/biome),
 * the same source and tag `test/damage-type.test.ts` pins its roster to —
 * not transcribed from `biome-data.ts`. `water`/`grass`/`foliage` are the
 * hex form of `effects.water_color` / `effects.grass_color` /
 * `effects.foliage_color`; `null` means upstream stores no fixed colour
 * there (vanilla derives it from temperature/downfall, or a further
 * per-biome modifier), matching `biome-data.ts`'s "leave it at the default"
 * convention.
 */
type UpstreamBiomeFixture = {
  readonly biome: BiomeType
  readonly temperature: number
  readonly downfall: number
  readonly hasPrecipitation: boolean
  readonly water: number
  readonly grass: number | null
  readonly foliage: number | null
}

const UPSTREAM_BIOME_FIXTURES: ReadonlyArray<UpstreamBiomeFixture> = [
  { biome: 'ocean', temperature: 0.5, downfall: 0.5, hasPrecipitation: true, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'deep_ocean', temperature: 0.5, downfall: 0.5, hasPrecipitation: true, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'warm_ocean', temperature: 0.5, downfall: 0.5, hasPrecipitation: true, water: 0x43d5ee, grass: null, foliage: null },
  { biome: 'lukewarm_ocean', temperature: 0.5, downfall: 0.5, hasPrecipitation: true, water: 0x45adf2, grass: null, foliage: null },
  { biome: 'deep_lukewarm_ocean', temperature: 0.5, downfall: 0.5, hasPrecipitation: true, water: 0x45adf2, grass: null, foliage: null },
  { biome: 'cold_ocean', temperature: 0.5, downfall: 0.5, hasPrecipitation: true, water: 0x3d57d6, grass: null, foliage: null },
  { biome: 'deep_cold_ocean', temperature: 0.5, downfall: 0.5, hasPrecipitation: true, water: 0x3d57d6, grass: null, foliage: null },
  { biome: 'frozen_ocean', temperature: 0, downfall: 0.5, hasPrecipitation: true, water: 0x3938c9, grass: null, foliage: null },
  // Upstream's stored temperature is 0.5; the frozen appearance comes from
  // the `frozen` temperature_modifier (a generation-time noise adjustment
  // outside biome-data.ts's scope), so 0.5 is the correct pin here, not 0.
  { biome: 'deep_frozen_ocean', temperature: 0.5, downfall: 0.5, hasPrecipitation: true, water: 0x3938c9, grass: null, foliage: null },
  { biome: 'river', temperature: 0.5, downfall: 0.5, hasPrecipitation: true, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'frozen_river', temperature: 0, downfall: 0.5, hasPrecipitation: true, water: 0x3938c9, grass: null, foliage: null },
  { biome: 'beach', temperature: 0.8, downfall: 0.4, hasPrecipitation: true, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'snowy_beach', temperature: 0.05, downfall: 0.3, hasPrecipitation: true, water: 0x3d57d6, grass: null, foliage: null },
  { biome: 'stony_shore', temperature: 0.2, downfall: 0.3, hasPrecipitation: true, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'plains', temperature: 0.8, downfall: 0.4, hasPrecipitation: true, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'sunflower_plains', temperature: 0.8, downfall: 0.4, hasPrecipitation: true, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'snowy_plains', temperature: 0, downfall: 0.5, hasPrecipitation: true, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'ice_spikes', temperature: 0, downfall: 0.5, hasPrecipitation: true, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'desert', temperature: 2, downfall: 0, hasPrecipitation: false, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'mushroom_fields', temperature: 0.9, downfall: 1, hasPrecipitation: true, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'swamp', temperature: 0.8, downfall: 0.9, hasPrecipitation: true, water: 0x617b64, grass: null, foliage: 0x6a7039 },
  { biome: 'mangrove_swamp', temperature: 0.8, downfall: 0.9, hasPrecipitation: true, water: 0x3a7a6a, grass: null, foliage: 0x8db127 },
  { biome: 'forest', temperature: 0.7, downfall: 0.8, hasPrecipitation: true, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'flower_forest', temperature: 0.7, downfall: 0.8, hasPrecipitation: true, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'birch_forest', temperature: 0.6, downfall: 0.6, hasPrecipitation: true, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'old_growth_birch_forest', temperature: 0.6, downfall: 0.6, hasPrecipitation: true, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'dark_forest', temperature: 0.7, downfall: 0.8, hasPrecipitation: true, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'taiga', temperature: 0.25, downfall: 0.8, hasPrecipitation: true, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'snowy_taiga', temperature: -0.5, downfall: 0.4, hasPrecipitation: true, water: 0x3d57d6, grass: null, foliage: null },
  { biome: 'old_growth_pine_taiga', temperature: 0.3, downfall: 0.8, hasPrecipitation: true, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'old_growth_spruce_taiga', temperature: 0.25, downfall: 0.8, hasPrecipitation: true, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'savanna', temperature: 2, downfall: 0, hasPrecipitation: false, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'savanna_plateau', temperature: 2, downfall: 0, hasPrecipitation: false, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'windswept_hills', temperature: 0.2, downfall: 0.3, hasPrecipitation: true, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'windswept_gravelly_hills', temperature: 0.2, downfall: 0.3, hasPrecipitation: true, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'windswept_forest', temperature: 0.2, downfall: 0.3, hasPrecipitation: true, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'windswept_savanna', temperature: 2, downfall: 0, hasPrecipitation: false, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'jungle', temperature: 0.95, downfall: 0.9, hasPrecipitation: true, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'sparse_jungle', temperature: 0.95, downfall: 0.8, hasPrecipitation: true, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'bamboo_jungle', temperature: 0.95, downfall: 0.9, hasPrecipitation: true, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'badlands', temperature: 2, downfall: 0, hasPrecipitation: false, water: 0x3f76e4, grass: 0x90814d, foliage: 0x9e814d },
  { biome: 'eroded_badlands', temperature: 2, downfall: 0, hasPrecipitation: false, water: 0x3f76e4, grass: 0x90814d, foliage: 0x9e814d },
  { biome: 'wooded_badlands', temperature: 2, downfall: 0, hasPrecipitation: false, water: 0x3f76e4, grass: 0x90814d, foliage: 0x9e814d },
  { biome: 'meadow', temperature: 0.5, downfall: 0.8, hasPrecipitation: true, water: 0x0e4ecf, grass: null, foliage: null },
  { biome: 'cherry_grove', temperature: 0.5, downfall: 0.8, hasPrecipitation: true, water: 0x5db7ef, grass: 0xb6db61, foliage: 0xb6db61 },
  { biome: 'grove', temperature: -0.2, downfall: 0.8, hasPrecipitation: true, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'snowy_slopes', temperature: -0.3, downfall: 0.9, hasPrecipitation: true, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'frozen_peaks', temperature: -0.7, downfall: 0.9, hasPrecipitation: true, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'jagged_peaks', temperature: -0.7, downfall: 0.9, hasPrecipitation: true, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'stony_peaks', temperature: 1, downfall: 0.3, hasPrecipitation: true, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'the_void', temperature: 0.5, downfall: 0.5, hasPrecipitation: false, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'dripstone_caves', temperature: 0.8, downfall: 0.4, hasPrecipitation: true, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'lush_caves', temperature: 0.5, downfall: 0.5, hasPrecipitation: true, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'deep_dark', temperature: 0.8, downfall: 0.4, hasPrecipitation: true, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'nether_wastes', temperature: 2, downfall: 0, hasPrecipitation: false, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'crimson_forest', temperature: 2, downfall: 0, hasPrecipitation: false, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'warped_forest', temperature: 2, downfall: 0, hasPrecipitation: false, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'soul_sand_valley', temperature: 2, downfall: 0, hasPrecipitation: false, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'basalt_deltas', temperature: 2, downfall: 0, hasPrecipitation: false, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'the_end', temperature: 0.5, downfall: 0.5, hasPrecipitation: false, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'small_end_islands', temperature: 0.5, downfall: 0.5, hasPrecipitation: false, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'end_midlands', temperature: 0.5, downfall: 0.5, hasPrecipitation: false, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'end_highlands', temperature: 0.5, downfall: 0.5, hasPrecipitation: false, water: 0x3f76e4, grass: null, foliage: null },
  { biome: 'end_barrens', temperature: 0.5, downfall: 0.5, hasPrecipitation: false, water: 0x3f76e4, grass: null, foliage: null },
]

const EXPECTED_UPSTREAM_BIOME_COUNT = 64

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
  it('gives the swamp and badlands groups their vanilla fixed foliage tints, not the default', () => {
    const swamp = propertiesOfBiomeType('swamp')
    expect(swamp.foliageTint).toBe(SWAMP_FOLIAGE_TINT)
    expect(swamp.foliageTint).not.toBe(BIOME_PROPERTY_DEFAULTS.foliageTint)

    const badlands = propertiesOfBiomeType('badlands')
    expect(badlands.foliageTint).toBe(BADLANDS_FOLIAGE_TINT)
    expect(badlands.foliageTint).not.toBe(BIOME_PROPERTY_DEFAULTS.foliageTint)
  })

  it('gives cherry_grove its own fixed grass tint, not the default', () => {
    const cherryGrove = propertiesOfBiomeType('cherry_grove')
    expect(cherryGrove.grassTint).toBe(CHERRY_GROVE_GRASS_TINT)
    expect(cherryGrove.grassTint).not.toBe(BIOME_PROPERTY_DEFAULTS.grassTint)
  })

  it('leaves grassTint at the default for swamp and mangrove_swamp, since upstream has no fixed grass_color for either (it uses the swamp grass_color_modifier instead)', () => {
    expect(propertiesOfBiomeType('swamp').grassTint).toBe(BIOME_PROPERTY_DEFAULTS.grassTint)
    expect(propertiesOfBiomeType('mangrove_swamp').grassTint).toBe(BIOME_PROPERTY_DEFAULTS.grassTint)
  })

  it('leaves grass, foliage and water tint at the default for a biome that does not override them', () => {
    const forest = propertiesOfBiomeType('forest')
    expect(forest.grassTint).toBe(BIOME_PROPERTY_DEFAULTS.grassTint)
    expect(forest.foliageTint).toBe(BIOME_PROPERTY_DEFAULTS.foliageTint)
    expect(forest.waterTint).toBe(BIOME_PROPERTY_DEFAULTS.waterTint)
  })
})

describe('upstream roster (data/minecraft/worldgen/biome/*.json at the 1.21-data tag)', () => {
  it('lists exactly the 64 upstream biome names, each unique', () => {
    const upstreamNames = UPSTREAM_BIOME_FIXTURES.map((fixture) => fixture.biome)
    expect(upstreamNames.length).toBe(EXPECTED_UPSTREAM_BIOME_COUNT)
    expect(new Set(upstreamNames).size).toBe(EXPECTED_UPSTREAM_BIOME_COUNT)
  })

  it('matches BIOME_TYPES exactly, so a missing or renamed upstream biome fails here rather than silently', () => {
    expect([...BIOME_TYPES].sort()).toStrictEqual(UPSTREAM_BIOME_FIXTURES.map((fixture) => fixture.biome).sort())
  })
})

describe('resolved properties against the fetched upstream fixture (independent of biome-data.ts)', () => {
  it.each(UPSTREAM_BIOME_FIXTURES)(
    'resolves $biome to the upstream temperature, downfall and derived precipitation',
    ({ biome, temperature, downfall, hasPrecipitation }) => {
      const resolved = propertiesOfBiomeType(biome)
      expect(resolved.temperature).toBe(temperature)
      expect(resolved.downfall).toBe(downfall)
      expect(resolved.precipitation).toBe(hasPrecipitation ? derivePrecipitationKind(temperature) : 'none')
    },
  )

  it.each(UPSTREAM_BIOME_FIXTURES)('resolves $biome to the upstream water tint', ({ biome, water }) => {
    expect(propertiesOfBiomeType(biome).waterTint).toBe(water)
  })

  it.each(UPSTREAM_BIOME_FIXTURES)(
    'resolves $biome to the upstream grass tint when upstream fixes one, or the default when upstream derives it',
    ({ biome, grass }) => {
      expect(propertiesOfBiomeType(biome).grassTint).toBe(grass ?? BIOME_PROPERTY_DEFAULTS.grassTint)
    },
  )

  it.each(UPSTREAM_BIOME_FIXTURES)(
    'resolves $biome to the upstream foliage tint when upstream fixes one, or the default when upstream derives it',
    ({ biome, foliage }) => {
      expect(propertiesOfBiomeType(biome).foliageTint).toBe(foliage ?? BIOME_PROPERTY_DEFAULTS.foliageTint)
    },
  )
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
