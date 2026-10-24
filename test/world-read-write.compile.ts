import { resultValue } from './block-result-helpers.js'
import {
  BlockAxis,
  ChunkAxis,
  LocalAxis,
  blockPositionFromAxes,
  blockPosition,
  chunkCoord,
  PositionAxis,
  position,
  type Position,
} from '../src/domain/coordinates/coordinate-primitives.js'
import { chunkKeyOf } from '../src/domain/coordinates/coordinate-keys.js'
import { ChunkHeight, ChunkLocalY, chunk as makeChunk, chunkBlockCount, type ChunkBlockCount } from '../src/domain/world/chunk.js'
import { BIOME_PROPERTY_DEFAULTS, BiomeTemperature, derivePrecipitationKind } from '../src/domain/world/biome-data.js'
import { DataPackFormat, DataPackPriority, dataPackLayer, dataPackResourcePath, type DataPackResourcePath } from '../src/domain/world/data-pack-registry.js'
import { NamespacedResourceLocation, TagLocation } from '../src/domain/text/identifiers.js'
import { tagged } from '../src/domain/recipe/recipe-data.js'
import { heightmapColumnIndex, type HeightmapColumnIndex } from '../src/domain/world/heightmap.js'
import { ChunkRevision, LightRevision, SectionIndex, SectionLength, WorldEpoch, readView } from '../src/domain/world/world-read-write.js'

const block = BlockAxis(0)
const chunk = ChunkAxis(0)
const local = LocalAxis(0)
blockPositionFromAxes(block, block, block)
const positionAxis = PositionAxis(0)
position(positionAxis, positionAxis, positionAxis)

// @ts-expect-error Position requires PositionAxis rather than raw numbers.
position(0, 0, 0)
// @ts-expect-error Block positions require BlockAxis rather than raw numbers.
blockPosition(0, 0, 0)
// @ts-expect-error Chunk coordinates require ChunkAxis rather than raw numbers.
chunkCoord(0, 0)
// @ts-expect-error Position fields must carry PositionAxis.
export const invalidPosition: Position = { x: 0, y: 0, z: 0 }

// @ts-expect-error LocalAxis and BlockAxis are distinct brands.
blockPositionFromAxes(local, block, block)

export const blockAxes: readonly [BlockAxis, BlockAxis, BlockAxis] = [
  block,
  // @ts-expect-error ChunkAxis and BlockAxis are distinct brands.
  chunk,
  // @ts-expect-error LocalAxis and BlockAxis are distinct brands.
  local,
]
export const chunkAxes: readonly [ChunkAxis, ChunkAxis, ChunkAxis] = [
  chunk,
  // @ts-expect-error BlockAxis and ChunkAxis are distinct brands.
  block,
  // @ts-expect-error LocalAxis and ChunkAxis are distinct brands.
  local,
]
export const localAxes: readonly [LocalAxis, LocalAxis, LocalAxis] = [
  local,
  // @ts-expect-error BlockAxis and LocalAxis are distinct brands.
  block,
  // @ts-expect-error ChunkAxis and LocalAxis are distinct brands.
  chunk,
]
const epoch = resultValue(WorldEpoch(0))
const chunkRevision = resultValue(ChunkRevision(0))
const lightRevision = resultValue(LightRevision(0))
export const epochRevisions: readonly [WorldEpoch, WorldEpoch, WorldEpoch] = [
  epoch,
  // @ts-expect-error ChunkRevision and WorldEpoch are distinct brands.
  chunkRevision,
  // @ts-expect-error LightRevision and WorldEpoch are distinct brands.
  lightRevision,
]
export const chunkRevisions: readonly [ChunkRevision, ChunkRevision, ChunkRevision] = [
  chunkRevision,
  // @ts-expect-error WorldEpoch and ChunkRevision are distinct brands.
  epoch,
  // @ts-expect-error LightRevision and ChunkRevision are distinct brands.
  lightRevision,
]
export const lightRevisions: readonly [LightRevision, LightRevision, LightRevision] = [
  lightRevision,
  // @ts-expect-error WorldEpoch and LightRevision are distinct brands.
  epoch,
  // @ts-expect-error ChunkRevision and LightRevision are distinct brands.
  chunkRevision,
]
const view = resultValue(readView({
  epoch,
  chunk: chunkKeyOf(chunkCoord(chunk, chunk)),
  blockRevision: chunkRevision,
  lightRevision,
  blocks: new Uint16Array(1),
  light: new Uint16Array(1),
}))
const section = view.blocks
const sectionIndex = resultValue(SectionIndex(0))
export const sectionLength: SectionLength = view.length
view.getBlock(sectionIndex)
view.getLight(sectionIndex)
section.get(sectionIndex)

export const heightmapIndex: HeightmapColumnIndex = heightmapColumnIndex(local, local)
const chunkHeight = resultValue(ChunkHeight(1))
export const blockCount: ChunkBlockCount = chunkBlockCount(chunkHeight)
resultValue(makeChunk(chunkCoord(chunk, chunk), chunkHeight, new Uint8Array(0)))
export const localY: ChunkLocalY = ChunkLocalY(0)
export const biomeTemperature: BiomeTemperature = BIOME_PROPERTY_DEFAULTS.temperature
export const dataPath: DataPackResourcePath = resultValue(dataPackResourcePath(
  NamespacedResourceLocation('minecraft:recipe'),
  NamespacedResourceLocation('example:iron_block'),
))
derivePrecipitationKind(BiomeTemperature(0))
dataPackLayer({
  pack: NamespacedResourceLocation('example:pack'),
  format: resultValue(DataPackFormat(1)),
  priority: resultValue(DataPackPriority(0)),
  entries: [{ id: NamespacedResourceLocation('example:entry'), value: 1 }],
})
resultValue(tagged(TagLocation('#minecraft:planks')))

// @ts-expect-error Chunk construction requires a validated height.
makeChunk(chunkCoord(chunk, chunk), 1, new Uint8Array(0))
// @ts-expect-error Biome climate functions require a branded temperature.
derivePrecipitationKind(0)
// @ts-expect-error Data-pack options require branded identifiers and numbers.
dataPackLayer({ pack: 'example:pack', format: 1, priority: 0, entries: [] })
// @ts-expect-error Heightmap columns require branded chunk-local axes.
heightmapColumnIndex(0, 0)
// @ts-expect-error Recipe item tags require the TagLocation brand.
tagged('#minecraft:planks')

// @ts-expect-error Section access requires a branded index.
view.getBlock(0)
// @ts-expect-error Section array access requires a branded index.
section.get(0)

// @ts-expect-error ReadView does not expose mutable typed-array methods.
section.set(new Uint16Array(1))
