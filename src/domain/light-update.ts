import type { BlockOpacity, LightLevel } from './block-property-data.js'
import { clampLightLevel, LIGHT_LEVEL_MIN } from './block-property-data.js'
import type { LocalBlockCoord } from './coordinate-conversions.js'
import { BlockAxis, CHUNK_SIZE_XZ, LocalAxis } from './coordinate-primitives.js'
import {
  lightVolume,
  lightVolumeCellCount,
  lightVolumeIndexOf,
  LightVolumeHeight,
  type LightVolume,
} from './light-data.js'

const LIGHT_STEP = 1
const FLUID_LIGHT_STEP = 2
const NEIGHBOUR_STEP = 1
const NEGATIVE_NEIGHBOUR_STEP = -NEIGHBOUR_STEP
const NO_OFFSET = 0

const NO_LIGHT: LightLevel = clampLightLevel(LIGHT_LEVEL_MIN)

/** The block-property inputs a single chunk-local cell contributes to propagation. */
export type LightCellInput = Readonly<{
  lightEmission: LightLevel
  opacity: BlockOpacity
}>

/** A per-cell source of light-relevant block properties, queried on demand. */
export type LightVolumeSource = (local: LocalBlockCoord) => LightCellInput

/** Light already known to arrive at a chunk-local cell, e.g. from a neighbouring chunk or the open sky. */
export type LightSeed = Readonly<{
  local: LocalBlockCoord
  level: LightLevel
}>

/**
 * Chunk-boundary light is an input this module accepts, not something it
 * fetches: the caller supplies the levels already settled outside this
 * chunk, and propagation continues from them.
 */
export type LightBoundarySeeds = Readonly<{
  blockLight?: ReadonlyArray<LightSeed>
  skyLight?: ReadonlyArray<LightSeed>
}>

const EMPTY_SEEDS: ReadonlyArray<LightSeed> = []

type Offset = Readonly<{ lx: number; ly: number; lz: number }>

const NEIGHBOUR_OFFSETS: ReadonlyArray<Offset> = [
  { lx: NEIGHBOUR_STEP, ly: NO_OFFSET, lz: NO_OFFSET },
  { lx: NEGATIVE_NEIGHBOUR_STEP, ly: NO_OFFSET, lz: NO_OFFSET },
  { lx: NO_OFFSET, ly: NEIGHBOUR_STEP, lz: NO_OFFSET },
  { lx: NO_OFFSET, ly: NEGATIVE_NEIGHBOUR_STEP, lz: NO_OFFSET },
  { lx: NO_OFFSET, ly: NO_OFFSET, lz: NEIGHBOUR_STEP },
  { lx: NO_OFFSET, ly: NO_OFFSET, lz: NEGATIVE_NEIGHBOUR_STEP },
]

/** Light decreases by one per cell of travel, further reduced by the destination cell's opacity. */
const attenuatedLevel = (level: LightLevel, targetOpacity: BlockOpacity): LightLevel => {
  if (targetOpacity === 'opaque') {
    return NO_LIGHT
  }
  const step = targetOpacity === 'fluid' ? FLUID_LIGHT_STEP : LIGHT_STEP
  return clampLightLevel(level - step)
}

const forEachLocalCoord = (height: LightVolumeHeight, visit: (local: LocalBlockCoord) => void): void => {
  for (let lx = 0; lx < CHUNK_SIZE_XZ; lx += NEIGHBOUR_STEP) {
    for (let lz = 0; lz < CHUNK_SIZE_XZ; lz += NEIGHBOUR_STEP) {
      for (let ly = 0; ly < height; ly += NEIGHBOUR_STEP) {
        visit({ lx: LocalAxis(lx), ly: BlockAxis(ly), lz: LocalAxis(lz) })
      }
    }
  }
}

const propagateChannel = (
  height: LightVolumeHeight,
  source: LightVolumeSource,
  seeds: ReadonlyArray<LightSeed>,
  emissionOf: ((input: LightCellInput) => LightLevel) | undefined,
): Uint8Array => {
  const levels = new Uint8Array(lightVolumeCellCount(height))
  // A DataView accessor, not indexed array access, so every read has a
  // definite `number` type: the index is always in bounds (computed by
  // `lightVolumeIndexOf`), so there is no real "missing element" case to model.
  const view = new DataView(levels.buffer)
  const queue: Array<LocalBlockCoord> = []

  const enqueueIfBrighter = (local: LocalBlockCoord, level: LightLevel): void => {
    const index = lightVolumeIndexOf(height, local)
    const current = view.getUint8(index)
    if (level > current) {
      view.setUint8(index, level)
      queue.push(local)
    }
  }

  if (emissionOf !== undefined) {
    const emit = emissionOf
    forEachLocalCoord(height, (local) => {
      enqueueIfBrighter(local, emit(source(local)))
    })
  }
  for (const seed of seeds) {
    enqueueIfBrighter(seed.local, seed.level)
  }

  // `queue` grows while this iterates; the array iterator re-reads `length`
  // on every step, so later pushes are visited without a manual index cursor.
  for (const local of queue) {
    // `enqueueIfBrighter` only ever pushes a level that beat a >=0 current
    // level, so every entry here is strictly positive; nothing to spread
    // from a dark cell is not a state this loop can observe.
    const index = lightVolumeIndexOf(height, local)
    const level = clampLightLevel(view.getUint8(index))

    for (const offset of NEIGHBOUR_OFFSETS) {
      const nlx = local.lx + offset.lx
      const nly = local.ly + offset.ly
      const nlz = local.lz + offset.lz
      if (nlx < 0 || nlx >= CHUNK_SIZE_XZ || nlz < 0 || nlz >= CHUNK_SIZE_XZ || nly < 0 || nly >= height) {
        continue
      }
      const neighbour: LocalBlockCoord = { lx: LocalAxis(nlx), ly: BlockAxis(nly), lz: LocalAxis(nlz) }
      const neighbourOpacity = source(neighbour).opacity
      enqueueIfBrighter(neighbour, attenuatedLevel(level, neighbourOpacity))
    }
  }

  return levels
}

/**
 * Settle a single chunk column's two light channels from per-cell block
 * properties. Pure: the same source and boundary seeds always yield the same
 * volume. Cross-chunk propagation queues, recalculation scheduling and
 * applying time-of-day to sky light are upper-layer concerns.
 */
export const updateLight = (
  height: number,
  source: LightVolumeSource,
  boundarySeeds: LightBoundarySeeds = {},
): LightVolume => {
  const validatedHeight = LightVolumeHeight(height)
  const blockLevels = propagateChannel(
    validatedHeight,
    source,
    boundarySeeds.blockLight ?? EMPTY_SEEDS,
    (input) => input.lightEmission,
  )
  const skyLevels = propagateChannel(validatedHeight, source, boundarySeeds.skyLight ?? EMPTY_SEEDS, undefined)

  return lightVolume(validatedHeight, blockLevels, skyLevels)
}
