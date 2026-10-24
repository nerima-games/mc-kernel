import {
  BlockBlastResistance,
  BlockContactDamage,
  BlockExperiencePoints,
  BlockFriction,
  BlockHardness,
  BlockMovementDrag,
  LightLevel,
  LightLevelCandidate,
  clampLightLevel,
  resolveBlockProperties,
  type BlockProperties,
} from '../src/domain/block/block-properties'
import { BlockId, blockIdOf, blockTypeOfId, isEmpty } from '../src/domain/block/block-registry'
import { BlockState, BlockStateByteOffset, BlockStateIndex, BlockStateLength } from '../src/domain/block/block-state'
import { ContainerSlotCount, type StorageContainer } from '../src/domain/block/block-entity'
import {
  BlockAxis,
  LocalAxis,
} from '../src/domain/coordinates/coordinate-primitives'
import type { LocalBlockCoord } from '../src/domain/coordinates/coordinate-conversions'
import {
  LightChannelByteOffset,
  LightChannelIndex,
  LightChannelLength,
  LightVolumeHeight,
  lightChannel,
  lightVolume,
  lightVolumeCellCount,
  lightVolumeIndexOf,
} from '../src/domain/block/light'
import { optionValue, resultValue } from './block-result-helpers'

const hardness = BlockHardness(1)
const friction = BlockFriction(0.5)
const blastResistance = BlockBlastResistance(10)
const contactDamage = BlockContactDamage(1)
const movementDrag = BlockMovementDrag(0.2)
const experience = BlockExperiencePoints(5)
const resolvedProperties: BlockProperties = resultValue(resolveBlockProperties({
  blastResistance,
  contactDamage,
  friction,
  hardness,
  lightEmission: LightLevel(4),
  movementDrag,
  xpOnBreak: experience,
}))
const clampedLightLevel = clampLightLevel(LightLevelCandidate(4))

const stoneId = optionValue(blockIdOf('stone'))
const stoneType = resultValue(blockTypeOfId(stoneId))
const empty = isEmpty(resultValue(BlockId.result(0)))
const state = resultValue(BlockState.fromBytes(new Uint8Array([stoneId])))
const stateLength: BlockStateLength = state.length
const stateId: BlockId = resultValue(state.get(BlockStateIndex(0)))
resultValue(state.set(BlockStateIndex(0), stoneId))
resultValue(state.copyTo(new Uint8Array(2), BlockStateByteOffset(0)))
resultValue(BlockState.fromElementBytes(new Uint8Array(2), BlockStateLength(1)))

const channel = resultValue(lightChannel(new Uint8Array([0])))
const channelLength: LightChannelLength = channel.length
const channelValue = channel.at(LightChannelIndex(0))
channel.copyTo(new Uint8Array(1), LightChannelByteOffset(0))
const volume = resultValue(lightVolume(resultValue(LightVolumeHeight(1)), new Uint8Array(256), new Uint8Array(256)))
const volumeHeight: LightVolumeHeight = volume.height
const volumeCellCount: LightChannelLength = lightVolumeCellCount(volume.height)
const local: LocalBlockCoord = { lx: LocalAxis(0), ly: BlockAxis(0), lz: LocalAxis(0) }
const volumeIndex: LightChannelIndex = resultValue(lightVolumeIndexOf(volume.height, local))
const container: StorageContainer = {
  capacity: ContainerSlotCount(1),
  kind: 'chest',
  slots: [],
}

// @ts-expect-error Block properties require the brand matching each quantity.
resolveBlockProperties({ hardness: 1 })
// @ts-expect-error Light-level clamping takes an explicit numeric candidate.
clampLightLevel(4)
// @ts-expect-error A block id must pass through its validating constructor.
blockTypeOfId(1)
// @ts-expect-error `isEmpty` requires a validated block identifier.
isEmpty(0)
// @ts-expect-error Block-state element counts use their own brand.
BlockState.fromElementBytes(new Uint8Array(2), 1)
// @ts-expect-error Block-state indexes use their own brand.
state.get(0)
// @ts-expect-error Block-state byte offsets use their own brand.
state.copyTo(new Uint8Array(2), 0)
// @ts-expect-error Light-channel indexes use their own brand.
channel.at(0)
// @ts-expect-error Light-channel byte offsets use their own brand.
channel.copyTo(new Uint8Array(2), 0)
// @ts-expect-error Light volumes require a validated height.
lightVolume(1, new Uint8Array(256), new Uint8Array(256))
// @ts-expect-error Storage capacity fields use a positive slot-count brand.
const rawCapacity: StorageContainer = { capacity: 1, kind: 'chest', slots: [] }

export const blockBrandFixtures: readonly unknown[] = [
  resolvedProperties,
  clampedLightLevel,
  stoneType,
  empty,
  stateLength,
  stateId,
  channelValue,
  channelLength,
  volume,
  volumeHeight,
  volumeCellCount,
  volumeIndex,
  container,
  rawCapacity,
]
