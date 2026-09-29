/**
 * Runtime validation and default resolution for biomes.
 *
 * Keeping this module separate from the property table makes the accepted
 * external shape and the resolved domain data independently readable.
 */
import {
  BIOME_PROPERTY_DEFAULTS,
  BIOME_PROPERTY_OVERRIDES,
  BIOME_TYPES,
  derivePrecipitationKind,
  type BiomeProperties,
  type BiomePropertyOverrides,
  type BiomeType,
} from './biome-data.js'

const BIOME_TYPE_LOOKUP: ReadonlySet<string> = new Set<string>(BIOME_TYPES)

/** Narrowing guard for a biome name arriving from a save file or network frame. */
export const isBiomeType = (value: unknown): value is BiomeType =>
  typeof value === 'string' && BIOME_TYPE_LOOKUP.has(value)

/** Fill in defaults for every property a biome's overrides do not mention. */
export const resolveBiomeProperties = (overrides: BiomePropertyOverrides): BiomeProperties => {
  const temperature = overrides.temperature ?? BIOME_PROPERTY_DEFAULTS.temperature

  return {
    temperature,
    downfall: overrides.downfall ?? BIOME_PROPERTY_DEFAULTS.downfall,
    precipitation: overrides.precipitation ?? derivePrecipitationKind(temperature),
    grassTint: overrides.grassTint ?? BIOME_PROPERTY_DEFAULTS.grassTint,
    foliageTint: overrides.foliageTint ?? BIOME_PROPERTY_DEFAULTS.foliageTint,
    waterTint: overrides.waterTint ?? BIOME_PROPERTY_DEFAULTS.waterTint,
    dimension: overrides.dimension ?? BIOME_PROPERTY_DEFAULTS.dimension,
  }
}

/**
 * Resolve one biome's properties. Total over `BiomeType`: every member of
 * `BIOME_TYPES` has a row in `BIOME_PROPERTY_OVERRIDES` by construction
 * (`Record<BiomeType, BiomePropertyOverrides>` makes a missing row a
 * compile error), so this never needs an absent-row fallback.
 */
export const propertiesOfBiomeType = (biome: BiomeType): BiomeProperties =>
  resolveBiomeProperties(BIOME_PROPERTY_OVERRIDES[biome])

/** Resolve a biome's properties from an untrusted value such as save-file or network input. */
export const propertiesOfBiome = (biome: unknown): BiomeProperties => {
  if (!isBiomeType(biome)) {
    throw new TypeError(`unknown biome ${String(biome)}`)
  }

  return propertiesOfBiomeType(biome)
}
