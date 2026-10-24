/**
 * Closed biome vocabulary and per-biome climate/tint table for the Java
 * Edition 1.21 biome roster.
 *
 * This module is deliberately data-only. Runtime validation and default
 * resolution live in `./biome-validation` so the table can be read without
 * mixing it with external-input handling.
 *
 * Each row states only its difference from `BIOME_PROPERTY_DEFAULTS`
 * (architecture.md §6, the same "differences only" convention as
 * `BLOCK_REGISTRY`), so a wrong row is a one-line error rather than a fork.
 *
 * The roster and every `temperature` / `downfall` / `has_precipitation` /
 * `effects.water_color` / `effects.grass_color` / `effects.foliage_color`
 * value were read from `data/minecraft/worldgen/biome/*.json` at the
 * `1.21-data` tag of the misode/mcmeta registry mirror (the same source and
 * tag `damage-type-data.ts` pins), not transcribed from an earlier draft of
 * this table. Where upstream's `grass_color` / `foliage_color` is `null`,
 * vanilla derives the tint from `temperature` and `downfall` through its own
 * colour map (or, for the `swamp` / `dark_forest` grass modifiers, a further
 * per-biome adjustment this kernel does not model); this table leaves such a
 * biome's `grassTint` / `foliageTint` at the default rather than inventing a
 * fixed value, per the "differences only" convention above
 * (docs/responsibility.md §3-2).
 */
import { Brand } from 'effect'
import type { Dimension } from './dimension.js'
import { VANILLA_26_3_BIOME_IDS } from './vanilla-26-3-generated.js'

// ---------------------------------------------------------------------------
// Biome vocabulary
// ---------------------------------------------------------------------------

/* The roster is generated from test/golden/vanilla-biome.json. */
export const BIOME_TYPES: typeof VANILLA_26_3_BIOME_IDS = VANILLA_26_3_BIOME_IDS
/*
  // Oceans
  'ocean',
  'deep_ocean',
  'warm_ocean',
  'lukewarm_ocean',
  'deep_lukewarm_ocean',
  'cold_ocean',
  'deep_cold_ocean',
  'frozen_ocean',
  'deep_frozen_ocean',

  // Rivers
  'river',
  'frozen_river',

  // Beaches and shores
  'beach',
  'snowy_beach',
  'stony_shore',

  // Plains
  'plains',
  'sunflower_plains',
  'snowy_plains',
  'ice_spikes',

  // Desert
  'desert',

  // Mushroom fields
  'mushroom_fields',

  // Swamps
  'swamp',
  'mangrove_swamp',

  // Forests
  'forest',
  'flower_forest',
  'birch_forest',
  'old_growth_birch_forest',
  'dark_forest',

  // Taigas
  'taiga',
  'snowy_taiga',
  'old_growth_pine_taiga',
  'old_growth_spruce_taiga',

  // Savannas
  'savanna',
  'savanna_plateau',

  // Windswept
  'windswept_hills',
  'windswept_gravelly_hills',
  'windswept_forest',
  'windswept_savanna',

  // Jungles
  'jungle',
  'sparse_jungle',
  'bamboo_jungle',

  // Badlands
  'badlands',
  'eroded_badlands',
  'wooded_badlands',

  // Mountains and peaks
  'meadow',
  'cherry_grove',
  'grove',
  'snowy_slopes',
  'frozen_peaks',
  'jagged_peaks',
  'stony_peaks',

  // The empty biome
  'the_void',

  // Caves
  'dripstone_caves',
  'lush_caves',
  'deep_dark',

  // Nether
  'nether_wastes',
  'crimson_forest',
  'warped_forest',
  'soul_sand_valley',
  'basalt_deltas',

  // The End
  'the_end',
  'small_end_islands',
  'end_midlands',
  'end_highlands',
  'end_barrens',
] as const */

export type BiomeType = (typeof BIOME_TYPES)[number]

// ---------------------------------------------------------------------------
// Precipitation
// ---------------------------------------------------------------------------

/** Which kind of precipitation, not merely whether it rains. */
export const PRECIPITATION_KINDS = ['none', 'rain', 'snow'] as const
export type PrecipitationKind = (typeof PRECIPITATION_KINDS)[number]

/** Vanilla's own boundary: below this temperature, precipitation renders as snow. */
/** Vanilla biome temperature in climate units, bounded by the shipped roster's [-0.7, 2] range. */
export type BiomeTemperature = number & Brand.Brand<'BiomeTemperature'>
export const BiomeTemperature: Brand.Constructor<BiomeTemperature> = Brand.make<BiomeTemperature>(
  (value) => Number.isFinite(value) && value >= -0.7 && value <= 2
    ? true
    : `BiomeTemperature must be finite and in [-0.7, 2], received ${value}`,
)

/** Biome downfall as a unitless fraction in [0, 1]. */
export type BiomeDownfall = number & Brand.Brand<'BiomeDownfall'>
export const BiomeDownfall: Brand.Constructor<BiomeDownfall> = Brand.make<BiomeDownfall>(
  (value) => Number.isFinite(value) && value >= 0 && value <= 1
    ? true
    : `BiomeDownfall must be a finite fraction in [0, 1], received ${value}`,
)

/** Packed RGB biome tint in 0xRRGGBB form. */
export type BiomeTint = number & Brand.Brand<'BiomeTint'>
export const BiomeTint: Brand.Constructor<BiomeTint> = Brand.make<BiomeTint>(
  (value) => Number.isInteger(value) && value >= 0 && value <= 0xffffff
    ? true
    : `BiomeTint must be an integer in [0, 0xFFFFFF], received ${value}`,
)

export const SNOW_TEMPERATURE_THRESHOLD: BiomeTemperature = BiomeTemperature(0.15)

/**
 * Derive the snow/rain half of precipitation from temperature so it can
 * never disagree with it. `none` is not derivable from temperature (several
 * hot biomes such as `desert` and `savanna` have no precipitation at all),
 * so it is declared per-biome instead, see `BiomePropertyOverrides`.
 */
export const derivePrecipitationKind = (temperature: BiomeTemperature): 'rain' | 'snow' =>
  temperature < SNOW_TEMPERATURE_THRESHOLD ? 'snow' : 'rain'

// ---------------------------------------------------------------------------
// The property table
// ---------------------------------------------------------------------------

/** A fully resolved, per-biome property set with every property present. */
export type BiomeProperties = {
  /** Climate value driving the snow/rain split and (with `downfall`) foliage colour. */
  readonly temperature: BiomeTemperature
  /** Rainfall/humidity, 0..1. */
  readonly downfall: BiomeDownfall
  /** What falls from the sky here, if anything. */
  readonly precipitation: PrecipitationKind
  /** Grass block tint, packed 0xRRGGBB. */
  readonly grassTint: BiomeTint
  /** Leaf/foliage tint, packed 0xRRGGBB. */
  readonly foliageTint: BiomeTint
  /** Water surface tint, packed 0xRRGGBB. */
  readonly waterTint: BiomeTint
  /** Which dimension generates this biome. */
  readonly dimension: Dimension
}

/** Defaults for an ordinary temperate overworld biome (plains' climate). */
export const BIOME_PROPERTY_DEFAULTS: BiomeProperties = {
  temperature: BiomeTemperature(0.8),
  downfall: BiomeDownfall(0.4),
  precipitation: 'rain',
  grassTint: BiomeTint(0x91bd59),
  foliageTint: BiomeTint(0x77ab2f),
  waterTint: BiomeTint(0x3f76e4),
  dimension: 'overworld',
}

/**
 * Optional per-biome differences from `BIOME_PROPERTY_DEFAULTS`.
 *
 * `precipitation` may only be overridden to `'none'`: the snow/rain choice
 * is always derived from `temperature` (see `derivePrecipitationKind`), so
 * the type makes a contradicting override impossible to write rather than
 * merely wrong to write.
 */
export type BiomePropertyOverrides = {
  readonly temperature?: BiomeTemperature
  readonly downfall?: BiomeDownfall
  readonly precipitation?: 'none'
  readonly grassTint?: BiomeTint
  readonly foliageTint?: BiomeTint
  readonly waterTint?: BiomeTint
  readonly dimension?: Dimension
}

/** One row per `BiomeType`; a missing biome is a compile error, not a silent gap. */
export const BIOME_PROPERTY_OVERRIDES: Record<BiomeType, BiomePropertyOverrides> = {
  // ---------------------------------------------------------------------------
  // Oceans
  // ---------------------------------------------------------------------------
  ocean: { temperature: BiomeTemperature(0.5), downfall: BiomeDownfall(0.5) },
  deep_ocean: { temperature: BiomeTemperature(0.5), downfall: BiomeDownfall(0.5) },
  warm_ocean: { temperature: BiomeTemperature(0.5), downfall: BiomeDownfall(0.5), waterTint: BiomeTint(0x43d5ee) },
  lukewarm_ocean: { temperature: BiomeTemperature(0.5), downfall: BiomeDownfall(0.5), waterTint: BiomeTint(0x45adf2) },
  deep_lukewarm_ocean: { temperature: BiomeTemperature(0.5), downfall: BiomeDownfall(0.5), waterTint: BiomeTint(0x45adf2) },
  cold_ocean: { temperature: BiomeTemperature(0.5), downfall: BiomeDownfall(0.5), waterTint: BiomeTint(0x3d57d6) },
  deep_cold_ocean: { temperature: BiomeTemperature(0.5), downfall: BiomeDownfall(0.5), waterTint: BiomeTint(0x3d57d6) },
  frozen_ocean: { temperature: BiomeTemperature(0), downfall: BiomeDownfall(0.5), waterTint: BiomeTint(0x3938c9) },
  // Upstream's stored temperature is 0.5, not 0: vanilla's frozen surface
  // (icebergs, packed ice) comes from the `frozen` temperature_modifier, a
  // noise-based generation-time adjustment this table does not model
  // (mc-worldgen's concern, not the kernel's climate table). Read literally,
  // this makes deep_frozen_ocean derive `rain`, unlike frozen_ocean's `snow`
  // — a real, verified asymmetry between the two biomes, not a bent value.
  deep_frozen_ocean: { temperature: BiomeTemperature(0.5), downfall: BiomeDownfall(0.5), waterTint: BiomeTint(0x3938c9) },

  // ---------------------------------------------------------------------------
  // Rivers
  // ---------------------------------------------------------------------------
  river: { temperature: BiomeTemperature(0.5), downfall: BiomeDownfall(0.5) },
  frozen_river: { temperature: BiomeTemperature(0), downfall: BiomeDownfall(0.5), waterTint: BiomeTint(0x3938c9) },

  // ---------------------------------------------------------------------------
  // Beaches and shores
  // ---------------------------------------------------------------------------
  beach: {},
  snowy_beach: { temperature: BiomeTemperature(0.05), downfall: BiomeDownfall(0.3), waterTint: BiomeTint(0x3d57d6) },
  stony_shore: { temperature: BiomeTemperature(0.2), downfall: BiomeDownfall(0.3) },

  // ---------------------------------------------------------------------------
  // Plains
  // ---------------------------------------------------------------------------
  plains: {},
  sunflower_plains: {},
  snowy_plains: { temperature: BiomeTemperature(0), downfall: BiomeDownfall(0.5) },
  ice_spikes: { temperature: BiomeTemperature(0), downfall: BiomeDownfall(0.5) },

  // ---------------------------------------------------------------------------
  // Desert — hot and explicitly dry, not merely too warm for snow.
  // ---------------------------------------------------------------------------
  desert: { temperature: BiomeTemperature(2), downfall: BiomeDownfall(0), precipitation: 'none' },

  // ---------------------------------------------------------------------------
  // Mushroom fields
  // ---------------------------------------------------------------------------
  mushroom_fields: { temperature: BiomeTemperature(0.9), downfall: BiomeDownfall(1) },

  // ---------------------------------------------------------------------------
  // Swamps — both use the `swamp` grass_color_modifier upstream, so
  // grassTint is left at the default rather than a fixed value; only water
  // and foliage are stored colours.
  // ---------------------------------------------------------------------------
  swamp: { downfall: BiomeDownfall(0.9), foliageTint: BiomeTint(0x6a7039), waterTint: BiomeTint(0x617b64) },
  mangrove_swamp: { downfall: BiomeDownfall(0.9), foliageTint: BiomeTint(0x8db127), waterTint: BiomeTint(0x3a7a6a) },

  // ---------------------------------------------------------------------------
  // Forests
  // ---------------------------------------------------------------------------
  forest: { temperature: BiomeTemperature(0.7), downfall: BiomeDownfall(0.8) },
  flower_forest: { temperature: BiomeTemperature(0.7), downfall: BiomeDownfall(0.8) },
  birch_forest: { temperature: BiomeTemperature(0.6), downfall: BiomeDownfall(0.6) },
  old_growth_birch_forest: { temperature: BiomeTemperature(0.6), downfall: BiomeDownfall(0.6) },
  // Upstream also carries a `dark_forest` grass_color_modifier this table
  // does not model, so grassTint is left at the default rather than a fixed
  // value (same reasoning as the swamp group above).
  dark_forest: { temperature: BiomeTemperature(0.7), downfall: BiomeDownfall(0.8) },

  // ---------------------------------------------------------------------------
  // Taigas
  // ---------------------------------------------------------------------------
  taiga: { temperature: BiomeTemperature(0.25), downfall: BiomeDownfall(0.8) },
  snowy_taiga: { temperature: BiomeTemperature(-0.5), downfall: BiomeDownfall(0.4), waterTint: BiomeTint(0x3d57d6) },
  old_growth_pine_taiga: { temperature: BiomeTemperature(0.3), downfall: BiomeDownfall(0.8) },
  old_growth_spruce_taiga: { temperature: BiomeTemperature(0.25), downfall: BiomeDownfall(0.8) },

  // ---------------------------------------------------------------------------
  // Savannas — hot and explicitly dry, like desert.
  // ---------------------------------------------------------------------------
  savanna: { temperature: BiomeTemperature(2), downfall: BiomeDownfall(0), precipitation: 'none' },
  savanna_plateau: { temperature: BiomeTemperature(2), downfall: BiomeDownfall(0), precipitation: 'none' },

  // ---------------------------------------------------------------------------
  // Windswept
  // ---------------------------------------------------------------------------
  windswept_hills: { temperature: BiomeTemperature(0.2), downfall: BiomeDownfall(0.3) },
  windswept_gravelly_hills: { temperature: BiomeTemperature(0.2), downfall: BiomeDownfall(0.3) },
  windswept_forest: { temperature: BiomeTemperature(0.2), downfall: BiomeDownfall(0.3) },
  windswept_savanna: { temperature: BiomeTemperature(2), downfall: BiomeDownfall(0), precipitation: 'none' },

  // ---------------------------------------------------------------------------
  // Jungles
  // ---------------------------------------------------------------------------
  jungle: { temperature: BiomeTemperature(0.95), downfall: BiomeDownfall(0.9) },
  sparse_jungle: { temperature: BiomeTemperature(0.95), downfall: BiomeDownfall(0.8) },
  bamboo_jungle: { temperature: BiomeTemperature(0.95), downfall: BiomeDownfall(0.9) },

  // ---------------------------------------------------------------------------
  // Badlands — hot, explicitly dry, and the one group with its own fixed
  // grass/foliage tint rather than the temperature/downfall-derived default.
  // ---------------------------------------------------------------------------
  badlands: { temperature: BiomeTemperature(2), downfall: BiomeDownfall(0), precipitation: 'none', grassTint: BiomeTint(0x90814d), foliageTint: BiomeTint(0x9e814d) },
  eroded_badlands: {
    temperature: BiomeTemperature(2),
    downfall: BiomeDownfall(0),
    precipitation: 'none',
    grassTint: BiomeTint(0x90814d),
    foliageTint: BiomeTint(0x9e814d),
  },
  wooded_badlands: {
    temperature: BiomeTemperature(2),
    downfall: BiomeDownfall(0),
    precipitation: 'none',
    grassTint: BiomeTint(0x90814d),
    foliageTint: BiomeTint(0x9e814d),
  },

  // ---------------------------------------------------------------------------
  // Mountains and peaks
  // ---------------------------------------------------------------------------
  meadow: { temperature: BiomeTemperature(0.5), downfall: BiomeDownfall(0.8), waterTint: BiomeTint(0x0e4ecf) },
  cherry_grove: { temperature: BiomeTemperature(0.5), downfall: BiomeDownfall(0.8), grassTint: BiomeTint(0xb6db61), foliageTint: BiomeTint(0xb6db61), waterTint: BiomeTint(0x5db7ef) },
  grove: { temperature: BiomeTemperature(-0.2), downfall: BiomeDownfall(0.8) },
  snowy_slopes: { temperature: BiomeTemperature(-0.3), downfall: BiomeDownfall(0.9) },
  frozen_peaks: { temperature: BiomeTemperature(-0.7), downfall: BiomeDownfall(0.9) },
  jagged_peaks: { temperature: BiomeTemperature(-0.7), downfall: BiomeDownfall(0.9) },
  stony_peaks: { temperature: BiomeTemperature(1), downfall: BiomeDownfall(0.3) },

  // ---------------------------------------------------------------------------
  // The empty biome
  // ---------------------------------------------------------------------------
  the_void: { temperature: BiomeTemperature(0.5), downfall: BiomeDownfall(0.5), precipitation: 'none' },

  // ---------------------------------------------------------------------------
  // Caves — generate within the overworld dimension.
  // ---------------------------------------------------------------------------
  dripstone_caves: {},
  lush_caves: { temperature: BiomeTemperature(0.5), downfall: BiomeDownfall(0.5) },
  deep_dark: {},

  // ---------------------------------------------------------------------------
  // Nether — hot, dry, and its own dimension.
  // ---------------------------------------------------------------------------
  nether_wastes: { temperature: BiomeTemperature(2), downfall: BiomeDownfall(0), precipitation: 'none', dimension: 'nether' },
  crimson_forest: { temperature: BiomeTemperature(2), downfall: BiomeDownfall(0), precipitation: 'none', dimension: 'nether' },
  warped_forest: { temperature: BiomeTemperature(2), downfall: BiomeDownfall(0), precipitation: 'none', dimension: 'nether' },
  soul_sand_valley: { temperature: BiomeTemperature(2), downfall: BiomeDownfall(0), precipitation: 'none', dimension: 'nether' },
  basalt_deltas: { temperature: BiomeTemperature(2), downfall: BiomeDownfall(0), precipitation: 'none', dimension: 'nether' },

  // ---------------------------------------------------------------------------
  // The End — no weather, its own dimension, and its own fixed climate
  // (0.5/0.5, not the overworld-temperate default).
  // ---------------------------------------------------------------------------
  the_end: { temperature: BiomeTemperature(0.5), downfall: BiomeDownfall(0.5), precipitation: 'none', dimension: 'end' },
  small_end_islands: { temperature: BiomeTemperature(0.5), downfall: BiomeDownfall(0.5), precipitation: 'none', dimension: 'end' },
  end_midlands: { temperature: BiomeTemperature(0.5), downfall: BiomeDownfall(0.5), precipitation: 'none', dimension: 'end' },
  end_highlands: { temperature: BiomeTemperature(0.5), downfall: BiomeDownfall(0.5), precipitation: 'none', dimension: 'end' },
  end_barrens: { temperature: BiomeTemperature(0.5), downfall: BiomeDownfall(0.5), precipitation: 'none', dimension: 'end' },
  dappled_forest: { temperature: BiomeTemperature(0.6), downfall: BiomeDownfall(0.6), grassTint: BiomeTint(0xdf6827), foliageTint: BiomeTint(0xe68e30), waterTint: BiomeTint(0x375154) },
  pale_garden: { temperature: BiomeTemperature(0.7), downfall: BiomeDownfall(0.8), grassTint: BiomeTint(0x778272), foliageTint: BiomeTint(0x878d76), waterTint: BiomeTint(0x76889d) },
  sulfur_caves: { grassTint: BiomeTint(0xaba64f), waterTint: BiomeTint(0x34bf89) },
}
