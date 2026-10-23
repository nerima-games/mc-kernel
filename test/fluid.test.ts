import { describe, expect, it } from 'vitest'
import { blockIdOf } from '../src/domain/block/block-registry'
import {
  blockIdOfFluidKind,
  FLOWING_FLUID_LEVEL,
  FLUID_BLOCK_IDS,
  FLUID_LEVEL_MAX,
  FLUID_LEVEL_MIN,
  FLUID_LEVEL_STEP,
  FLUID_MIX_BLOCK_IDS,
  fluidKindOfBlockId,
  SOURCE_FLUID_LEVEL,
} from '../src/domain/block/fluid'

describe('fluid data', () => {
  it('exposes fluid block vocabulary and level constants', () => {
    expect(FLUID_BLOCK_IDS.water).toBe(blockIdOf('water'))
    expect(FLUID_BLOCK_IDS.lava).toBe(blockIdOf('lava'))
    expect(FLUID_MIX_BLOCK_IDS.cobblestone).toBe(blockIdOf('cobblestone'))
    expect(FLUID_MIX_BLOCK_IDS.obsidian).toBe(blockIdOf('obsidian'))
    expect(FLUID_LEVEL_MIN).toBe(1)
    expect(FLUID_LEVEL_MAX).toBe(8)
    expect(FLUID_LEVEL_STEP).toBe(1)
    expect(SOURCE_FLUID_LEVEL).toBe(8)
    expect(FLOWING_FLUID_LEVEL).toBe(7)
    expect(blockIdOfFluidKind('water')).toBe(FLUID_BLOCK_IDS.water)
    expect(blockIdOfFluidKind('lava')).toBe(FLUID_BLOCK_IDS.lava)
    expect(fluidKindOfBlockId(FLUID_BLOCK_IDS.water)).toBe('water')
    expect(fluidKindOfBlockId(FLUID_BLOCK_IDS.lava)).toBe('lava')
    expect(fluidKindOfBlockId(blockIdOf('air'))).toBeNull()
  })
})
