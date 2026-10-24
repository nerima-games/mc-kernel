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
import { optionValue, resultValue } from './block-result-helpers'

describe('fluid data', () => {
  it('exposes fluid block vocabulary and level constants', () => {
    const waterId = optionValue(blockIdOf('water'))
    const lavaId = optionValue(blockIdOf('lava'))
    expect(optionValue(FLUID_BLOCK_IDS.water)).toBe(waterId)
    expect(optionValue(FLUID_BLOCK_IDS.lava)).toBe(lavaId)
    expect(optionValue(FLUID_MIX_BLOCK_IDS.cobblestone)).toBe(optionValue(blockIdOf('cobblestone')))
    expect(optionValue(FLUID_MIX_BLOCK_IDS.obsidian)).toBe(optionValue(blockIdOf('obsidian')))
    expect(FLUID_LEVEL_MIN).toBe(1)
    expect(FLUID_LEVEL_MAX).toBe(8)
    expect(FLUID_LEVEL_STEP).toBe(1)
    expect(SOURCE_FLUID_LEVEL).toBe(8)
    expect(FLOWING_FLUID_LEVEL).toBe(7)
    expect(optionValue(blockIdOfFluidKind('water'))).toBe(waterId)
    expect(optionValue(blockIdOfFluidKind('lava'))).toBe(lavaId)
    expect(resultValue(fluidKindOfBlockId(waterId))).toBe('water')
    expect(resultValue(fluidKindOfBlockId(lavaId))).toBe('lava')
    expect(resultValue(fluidKindOfBlockId(optionValue(blockIdOf('air'))))).toBeNull()
  })
})
