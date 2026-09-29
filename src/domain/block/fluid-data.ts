import { blockIdOf, propertyOfBlockId, type BlockId } from './block-registry.js'
import type { FluidKind } from './block-properties.js'

export type FlowingFluidKind = Exclude<FluidKind, 'none'>

export const FLUID_BLOCK_IDS: Readonly<{
  readonly lava: BlockId
  readonly water: BlockId
}> = {
  lava: blockIdOf('lava'),
  water: blockIdOf('water'),
}

export const FLUID_MIX_BLOCK_IDS: Readonly<{
  readonly cobblestone: BlockId
  readonly obsidian: BlockId
}> = {
  cobblestone: blockIdOf('cobblestone'),
  obsidian: blockIdOf('obsidian'),
}

export const FLUID_LEVEL_MIN = 1
export const FLUID_LEVEL_MAX = 8
export const FLUID_LEVEL_STEP = 1
export const SOURCE_FLUID_LEVEL = 8
export const FLOWING_FLUID_LEVEL = 7

export const blockIdOfFluidKind = (kind: FlowingFluidKind): BlockId => FLUID_BLOCK_IDS[kind]

export const fluidKindOfBlockId = (blockId: BlockId): FlowingFluidKind | null => {
  const kind = propertyOfBlockId(blockId, 'fluid')
  return kind === 'none' ? null : kind
}
