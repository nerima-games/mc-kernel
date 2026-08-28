import { describe, expect, it } from 'vitest'
import { blockIdOf } from '../src/domain/block-registry'
import { blockPositionKeyOf } from '../src/domain/coordinate-keys'
import { blockPosition, type BlockPosition } from '../src/domain/coordinate-primitives'
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
} from '../src/domain/fluid'
import {
  emptyFluidState,
  fluidCellAt,
  fluidLevel,
  clearFluidCell,
  scheduleFluidAt,
  setFluidCell,
  unscheduleFluidAt,
} from '../src/domain/fluid'
import type { FluidCell } from '../src/domain/fluid'

describe('fluid', () => {
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

  it('brands only integral levels in the supported range', () => {
    expect(fluidLevel(FLUID_LEVEL_MIN)).toBe(1)
    expect(fluidLevel(FLUID_LEVEL_MAX)).toBe(8)
    expect(() => fluidLevel(0)).toThrow()
    expect(() => fluidLevel(9)).toThrow()
    expect(() => fluidLevel(1.5)).toThrow()
    expect(() => fluidLevel(Number.NaN)).toThrow()
  })

  it('updates cells and scheduled positions without mutating prior state', () => {
    const positionA: BlockPosition = blockPosition(1, 2, 3)
    const positionB: BlockPosition = blockPosition(4, 5, 6)
    const cell: FluidCell = { falling: false, kind: 'water', level: fluidLevel(8) }
    const empty = emptyFluidState()
    const withCell = setFluidCell(empty, positionA, cell)

    expect(fluidCellAt(empty, positionA)).toBeUndefined()
    expect(fluidCellAt(withCell, positionA)).toBe(cell)
    expect(withCell.cells).not.toBe(empty.cells)
    expect(clearFluidCell(withCell, positionB)).toBe(withCell)

    const scheduled = scheduleFluidAt(withCell, positionA)
    expect(scheduled.scheduled.has(blockPositionKeyOf(positionA))).toBe(true)
    expect(scheduleFluidAt(scheduled, positionA)).toBe(scheduled)
    expect(unscheduleFluidAt(scheduled, positionB)).toBe(scheduled)

    const unscheduled = unscheduleFluidAt(scheduled, positionA)
    expect(unscheduled.scheduled.has(blockPositionKeyOf(positionA))).toBe(false)
    expect(clearFluidCell(unscheduled, positionA).cells.size).toBe(0)
  })
})
