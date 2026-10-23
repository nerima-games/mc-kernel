import { describe, expect, it } from 'vitest'
import { blockIdOf } from '../src/domain/block/block-registry'
import {
  REDSTONE_BLOCK_IDS,
  REDSTONE_POWER_MAX,
  REDSTONE_POWER_MIN,
  REDSTONE_POWER_STEP,
} from '../src/domain/block/redstone-data'
import { optionValue } from './block-result-helpers'

describe('redstone', () => {
  it('exposes device block vocabulary and power ranges', () => {
    expect(REDSTONE_POWER_MIN).toBe(0)
    expect(REDSTONE_POWER_MAX).toBe(15)
    expect(REDSTONE_POWER_STEP).toBe(1)
    expect(optionValue(REDSTONE_BLOCK_IDS.block)).toBe(optionValue(blockIdOf('redstone_block')))
    expect(optionValue(REDSTONE_BLOCK_IDS.wire)).toBe(optionValue(blockIdOf('redstone_wire')))
    expect(optionValue(REDSTONE_BLOCK_IDS.lampLit)).toBe(optionValue(blockIdOf('redstone_lamp_lit')))
  })
})
