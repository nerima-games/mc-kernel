import { describe, expect, it } from 'vitest'
import {
  WITHER_ARMOUR_THRESHOLD,
  WITHER_MAX_HEALTH,
  WITHER_MAX_SPEED,
  WITHER_REGEN_PER_SEC,
  WITHER_SPAWN_CHARGE_SECS,
} from '../src/domain/entity/wither-data'

describe('wither data', () => {
  it('keeps the static wither combat constants', () => {
    expect(WITHER_MAX_HEALTH).toBe(300)
    expect(WITHER_SPAWN_CHARGE_SECS).toBe(10)
    expect(WITHER_ARMOUR_THRESHOLD).toBe(150)
    expect(WITHER_REGEN_PER_SEC).toBe(1)
    expect(WITHER_MAX_SPEED).toBe(5)
  })
})
