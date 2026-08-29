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
import type { Dimension } from './dimension.js'

// ---------------------------------------------------------------------------
// Biome vocabulary
// ---------------------------------------------------------------------------

export const BIOME_TYPES = [
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
] as const

export type BiomeType = (typeof BIOME_TYPES)[number]

// ---------------------------------------------------------------------------
// Precipitation
// ---------------------------------------------------------------------------

/** Which kind of precipitation, not merely whether it rains. */
export const PRECIPITATION_KINDS = ['none', 'rain', 'snow'] as const
export type PrecipitationKind = (typeof PRECIPITATION_KINDS)[number]

/** Vanilla's own boundary: below this temperature, precipitation renders as snow. */
export const SNOW_TEMPERATURE_THRESHOLD = 0.15

/**
 * Derive the snow/rain half of precipitation from temperature so it can
 * never disagree with it. `none` is not derivable from temperature (several
 * hot biomes such as `desert` and `savanna` have no precipitation at all),
 * so it is declared per-biome instead, see `BiomePropertyOverrides`.
 */
export const derivePrecipitationKind = (temperature: number): 'rain' | 'snow' =>
  temperature < SNOW_TEMPERATURE_THRESHOLD ? 'snow' : 'rain'

// ---------------------------------------------------------------------------
// The property table
// ---------------------------------------------------------------------------

/** A fully resolved, per-biome property set with every property present. */
export type BiomeProperties = {
  /** Climate value driving the snow/rain split and (with `downfall`) foliage colour. */
  readonly temperature: number
  /** Rainfall/humidity, 0..1. */
  readonly downfall: number
  /** What falls from the sky here, if anything. */
  readonly precipitation: PrecipitationKind
  /** Grass block tint, packed 0xRRGGBB. */
  readonly grassTint: number
  /** Leaf/foliage tint, packed 0xRRGGBB. */
  readonly foliageTint: number
  /** Water surface tint, packed 0xRRGGBB. */
  readonly waterTint: number
  /** Which dimension generates this biome. */
  readonly dimension: Dimension
}

/** Defaults for an ordinary temperate overworld biome (plains' climate). */
export const BIOME_PROPERTY_DEFAULTS: BiomeProperties = {
  temperature: 0.8,
  downfall: 0.4,
  precipitation: 'rain',
  grassTint: 0x91bd59,
  foliageTint: 0x77ab2f,
  waterTint: 0x3f76e4,
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
  readonly temperature?: number
  readonly downfall?: number
  readonly precipitation?: 'none'
  readonly grassTint?: number
  readonly foliageTint?: number
  readonly waterTint?: number
  readonly dimension?: Dimension
}

/** One row per `BiomeType`; a missing biome is a compile error, not a silent gap. */
export const BIOME_PROPERTY_OVERRIDES: Record<BiomeType, BiomePropertyOverrides> = {
  // ---------------------------------------------------------------------------
  // Oceans
  // ---------------------------------------------------------------------------
  ocean: { temperature: 0.5, downfall: 0.5 },
  deep_ocean: { temperature: 0.5, downfall: 0.5 },
  warm_ocean: { temperature: 0.5, downfall: 0.5, waterTint: 0x43d5ee },
  lukewarm_ocean: { temperature: 0.5, downfall: 0.5, waterTint: 0x45adf2 },
  deep_lukewarm_ocean: { temperature: 0.5, downfall: 0.5, waterTint: 0x45adf2 },
  cold_ocean: { temperature: 0.5, downfall: 0.5, waterTint: 0x3d57d6 },
  deep_cold_ocean: { temperature: 0.5, downfall: 0.5, waterTint: 0x3d57d6 },
  frozen_ocean: { temperature: 0, downfall: 0.5, waterTint: 0x3938c9 },
  // Upstream's stored temperature is 0.5, not 0: vanilla's frozen surface
  // (icebergs, packed ice) comes from the `frozen` temperature_modifier, a
  // noise-based generation-time adjustment this table does not model
  // (mc-worldgen's concern, not the kernel's climate table). Read literally,
  // this makes deep_frozen_ocean derive `rain`, unlike frozen_ocean's `snow`
  // — a real, verified asymmetry between the two biomes, not a bent value.
  deep_frozen_ocean: { temperature: 0.5, downfall: 0.5, waterTint: 0x3938c9 },

  // ---------------------------------------------------------------------------
  // Rivers
  // ---------------------------------------------------------------------------
  river: { temperature: 0.5, downfall: 0.5 },
  frozen_river: { temperature: 0, downfall: 0.5, waterTint: 0x3938c9 },

  // ---------------------------------------------------------------------------
  // Beaches and shores
  // ---------------------------------------------------------------------------
  beach: {},
  snowy_beach: { temperature: 0.05, downfall: 0.3, waterTint: 0x3d57d6 },
  stony_shore: { temperature: 0.2, downfall: 0.3 },

  // ---------------------------------------------------------------------------
  // Plains
  // ---------------------------------------------------------------------------
  plains: {},
  sunflower_plains: {},
  snowy_plains: { temperature: 0, downfall: 0.5 },
  ice_spikes: { temperature: 0, downfall: 0.5 },

  // ---------------------------------------------------------------------------
  // Desert — hot and explicitly dry, not merely too warm for snow.
  // ---------------------------------------------------------------------------
  desert: { temperature: 2, downfall: 0, precipitation: 'none' },

  // ---------------------------------------------------------------------------
  // Mushroom fields
  // ---------------------------------------------------------------------------
  mushroom_fields: { temperature: 0.9, downfall: 1 },

  // ---------------------------------------------------------------------------
  // Swamps — both use the `swamp` grass_color_modifier upstream, so
  // grassTint is left at the default rather than a fixed value; only water
  // and foliage are stored colours.
  // ---------------------------------------------------------------------------
  swamp: { downfall: 0.9, foliageTint: 0x6a7039, waterTint: 0x617b64 },
  mangrove_swamp: { downfall: 0.9, foliageTint: 0x8db127, waterTint: 0x3a7a6a },

  // ---------------------------------------------------------------------------
  // Forests
  // ---------------------------------------------------------------------------
  forest: { temperature: 0.7, downfall: 0.8 },
  flower_forest: { temperature: 0.7, downfall: 0.8 },
  birch_forest: { temperature: 0.6, downfall: 0.6 },
  old_growth_birch_forest: { temperature: 0.6, downfall: 0.6 },
  // Upstream also carries a `dark_forest` grass_color_modifier this table
  // does not model, so grassTint is left at the default rather than a fixed
  // value (same reasoning as the swamp group above).
  dark_forest: { temperature: 0.7, downfall: 0.8 },

  // ---------------------------------------------------------------------------
  // Taigas
  // ---------------------------------------------------------------------------
  taiga: { temperature: 0.25, downfall: 0.8 },
  snowy_taiga: { temperature: -0.5, downfall: 0.4, waterTint: 0x3d57d6 },
  old_growth_pine_taiga: { temperature: 0.3, downfall: 0.8 },
  old_growth_spruce_taiga: { temperature: 0.25, downfall: 0.8 },

  // ---------------------------------------------------------------------------
  // Savannas — hot and explicitly dry, like desert.
  // ---------------------------------------------------------------------------
  savanna: { temperature: 2, downfall: 0, precipitation: 'none' },
  savanna_plateau: { temperature: 2, downfall: 0, precipitation: 'none' },

  // ---------------------------------------------------------------------------
  // Windswept
  // ---------------------------------------------------------------------------
  windswept_hills: { temperature: 0.2, downfall: 0.3 },
  windswept_gravelly_hills: { temperature: 0.2, downfall: 0.3 },
  windswept_forest: { temperature: 0.2, downfall: 0.3 },
  windswept_savanna: { temperature: 2, downfall: 0, precipitation: 'none' },

  // ---------------------------------------------------------------------------
  // Jungles
  // ---------------------------------------------------------------------------
  jungle: { temperature: 0.95, downfall: 0.9 },
  sparse_jungle: { temperature: 0.95, downfall: 0.8 },
  bamboo_jungle: { temperature: 0.95, downfall: 0.9 },

  // ---------------------------------------------------------------------------
  // Badlands — hot, explicitly dry, and the one group with its own fixed
  // grass/foliage tint rather than the temperature/downfall-derived default.
  // ---------------------------------------------------------------------------
  badlands: { temperature: 2, downfall: 0, precipitation: 'none', grassTint: 0x90814d, foliageTint: 0x9e814d },
  eroded_badlands: {
    temperature: 2,
    downfall: 0,
    precipitation: 'none',
    grassTint: 0x90814d,
    foliageTint: 0x9e814d,
  },
  wooded_badlands: {
    temperature: 2,
    downfall: 0,
    precipitation: 'none',
    grassTint: 0x90814d,
    foliageTint: 0x9e814d,
  },

  // ---------------------------------------------------------------------------
  // Mountains and peaks
  // ---------------------------------------------------------------------------
  meadow: { temperature: 0.5, downfall: 0.8, waterTint: 0x0e4ecf },
  cherry_grove: { temperature: 0.5, downfall: 0.8, grassTint: 0xb6db61, foliageTint: 0xb6db61, waterTint: 0x5db7ef },
  grove: { temperature: -0.2, downfall: 0.8 },
  snowy_slopes: { temperature: -0.3, downfall: 0.9 },
  frozen_peaks: { temperature: -0.7, downfall: 0.9 },
  jagged_peaks: { temperature: -0.7, downfall: 0.9 },
  stony_peaks: { temperature: 1, downfall: 0.3 },

  // ---------------------------------------------------------------------------
  // The empty biome
  // ---------------------------------------------------------------------------
  the_void: { temperature: 0.5, downfall: 0.5, precipitation: 'none' },

  // ---------------------------------------------------------------------------
  // Caves — generate within the overworld dimension.
  // ---------------------------------------------------------------------------
  dripstone_caves: {},
  lush_caves: { temperature: 0.5, downfall: 0.5 },
  deep_dark: {},

  // ---------------------------------------------------------------------------
  // Nether — hot, dry, and its own dimension.
  // ---------------------------------------------------------------------------
  nether_wastes: { temperature: 2, downfall: 0, precipitation: 'none', dimension: 'nether' },
  crimson_forest: { temperature: 2, downfall: 0, precipitation: 'none', dimension: 'nether' },
  warped_forest: { temperature: 2, downfall: 0, precipitation: 'none', dimension: 'nether' },
  soul_sand_valley: { temperature: 2, downfall: 0, precipitation: 'none', dimension: 'nether' },
  basalt_deltas: { temperature: 2, downfall: 0, precipitation: 'none', dimension: 'nether' },

  // ---------------------------------------------------------------------------
  // The End — no weather, its own dimension, and its own fixed climate
  // (0.5/0.5, not the overworld-temperate default).
  // ---------------------------------------------------------------------------
  the_end: { temperature: 0.5, downfall: 0.5, precipitation: 'none', dimension: 'end' },
  small_end_islands: { temperature: 0.5, downfall: 0.5, precipitation: 'none', dimension: 'end' },
  end_midlands: { temperature: 0.5, downfall: 0.5, precipitation: 'none', dimension: 'end' },
  end_highlands: { temperature: 0.5, downfall: 0.5, precipitation: 'none', dimension: 'end' },
  end_barrens: { temperature: 0.5, downfall: 0.5, precipitation: 'none', dimension: 'end' },
}
