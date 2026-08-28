import { describe, expect, it } from 'vitest'
import {
  clampHotbarIndex,
  cycleHotbarIndex,
  HOTBAR_SIZE,
  HOTBAR_START,
  hotbarSlotIndex,
  isHotbarIndex,
} from '../src/domain/hotbar'

describe('hotbar projection', () => {
  it('uses the nine selectable slots at the end of the player inventory', () => {
    expect(HOTBAR_SIZE).toBe(9)
    expect(HOTBAR_START).toBe(27)
  })

  it('recognises selectable hotbar indices', () => {
    expect([0, 8].map(isHotbarIndex)).toEqual([true, true])
    expect([-1, 9, 1.5].map(isHotbarIndex)).toEqual([false, false, false])
  })

  it('clamps external selection values to the hotbar range', () => {
    expect([-1, 2.9, 8, 9].map(clampHotbarIndex)).toEqual([0, 2, 8, 8])
    expect([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY].map(clampHotbarIndex)).toEqual([0, 0, 0])
  })

  it('cycles selections with wrapping and integer steps', () => {
    expect(cycleHotbarIndex(0, 0)).toBe(0)
    expect(cycleHotbarIndex(0, Number.NaN)).toBe(0)
    expect(cycleHotbarIndex(0, Number.POSITIVE_INFINITY)).toBe(0)
    expect(cycleHotbarIndex(8, 1)).toBe(0)
    expect(cycleHotbarIndex(0, -1)).toBe(8)
    expect(cycleHotbarIndex(8, 1.9)).toBe(0)
    expect(cycleHotbarIndex(1, -2.9)).toBe(8)
  })

  it('projects selection indices into player-inventory slots', () => {
    expect(hotbarSlotIndex(-1)).toBe(27)
    expect(hotbarSlotIndex(8)).toBe(35)
  })
})
