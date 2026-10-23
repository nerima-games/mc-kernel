import { Option, Result } from 'effect'
import { blockIdOf, propertyOfBlockId, type BlockId } from './block-registry.js'
import type { FluidKind } from './block-properties.js'
import type { BlockRegistryResolutionFailure } from './block-registry-indexes.js'

export type FlowingFluidKind = Exclude<FluidKind, 'none'>

export const FLUID_BLOCK_IDS: Readonly<{
  readonly lava: Option.Option<BlockId>
  readonly water: Option.Option<BlockId>
}> = {
  lava: blockIdOf('lava'),
  water: blockIdOf('water'),
}

export const FLUID_MIX_BLOCK_IDS: Readonly<{
  readonly cobblestone: Option.Option<BlockId>
  readonly obsidian: Option.Option<BlockId>
}> = {
  cobblestone: blockIdOf('cobblestone'),
  obsidian: blockIdOf('obsidian'),
}

export const FLUID_LEVEL_MIN = 1
export const FLUID_LEVEL_MAX = 8
export const FLUID_LEVEL_STEP = 1
export const SOURCE_FLUID_LEVEL = 8
export const FLOWING_FLUID_LEVEL = 7

export const blockIdOfFluidKind = (kind: FlowingFluidKind): Option.Option<BlockId> => FLUID_BLOCK_IDS[kind]

export const fluidKindOfBlockId = (
  blockId: BlockId,
): Result.Result<FlowingFluidKind | null, BlockRegistryResolutionFailure> =>
  Result.map(propertyOfBlockId(blockId, 'fluid'), (kind) => kind === 'none' ? null : kind)
