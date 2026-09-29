import {
  BlockAxis,
  LocalAxis,
  blockPositionFromAxes,
  chunkCoord,
} from '../src/domain/coordinate-primitives.js'
import { chunkKeyOf } from '../src/domain/coordinate-keys.js'
import { ChunkRevision, LightRevision, WorldEpoch, readView } from '../src/domain/world-read-write.js'

const block = BlockAxis(0)
const local = LocalAxis(0)
blockPositionFromAxes(block, block, block)

// @ts-expect-error LocalAxis and BlockAxis are distinct brands.
blockPositionFromAxes(local, block, block)

const view = readView({
  epoch: WorldEpoch(0),
  chunk: chunkKeyOf(chunkCoord(0, 0)),
  blockRevision: ChunkRevision(0),
  lightRevision: LightRevision(0),
  blocks: new Uint16Array(1),
  light: new Uint16Array(1),
})
const section = view.blocks

// @ts-expect-error ReadView does not expose mutable typed-array methods.
section.set(new Uint16Array(1))
