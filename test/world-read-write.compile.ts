import {
  BlockAxis,
  ChunkAxis,
  LocalAxis,
  blockPositionFromAxes,
  chunkCoord,
} from '../src/domain/coordinates/coordinate-primitives.js'
import { chunkKeyOf } from '../src/domain/coordinates/coordinate-keys.js'
import { ChunkRevision, LightRevision, WorldEpoch, readView } from '../src/domain/world/world-read-write.js'

const block = BlockAxis(0)
const chunk = ChunkAxis(0)
const local = LocalAxis(0)
blockPositionFromAxes(block, block, block)

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
const epoch = WorldEpoch(0)
const chunkRevision = ChunkRevision(0)
const lightRevision = LightRevision(0)
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
const view = readView({
  epoch,
  chunk: chunkKeyOf(chunkCoord(0, 0)),
  blockRevision: chunkRevision,
  lightRevision,
  blocks: new Uint16Array(1),
  light: new Uint16Array(1),
})
const section = view.blocks

// @ts-expect-error ReadView does not expose mutable typed-array methods.
section.set(new Uint16Array(1))
