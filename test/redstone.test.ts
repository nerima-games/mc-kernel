import { describe, expect, it } from 'vitest'
import { blockIdOf } from '../src/domain/block/block-registry'
import {
  REDSTONE_BLOCK_IDS,
  REDSTONE_POWER_MAX,
  REDSTONE_POWER_MIN,
  REDSTONE_POWER_STEP,
} from '../src/domain/block/redstone-data'

describe('redstone', () => {
  it('exposes device block vocabulary and power ranges', () => {
    expect(REDSTONE_POWER_MIN).toBe(0)
    expect(REDSTONE_POWER_MAX).toBe(15)
    expect(REDSTONE_POWER_STEP).toBe(1)
    expect(REDSTONE_BLOCK_IDS.block).toBe(blockIdOf('redstone_block'))
    expect(REDSTONE_BLOCK_IDS.wire).toBe(blockIdOf('redstone_wire'))
    expect(REDSTONE_BLOCK_IDS.lampLit).toBe(blockIdOf('redstone_lamp_lit'))
  })
})
