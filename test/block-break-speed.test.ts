/* eslint-disable max-statements, no-magic-numbers, sort-imports -- Formula examples and import grouping are the reference contract. */
import {
  blockHardnessOf,
  computeBreakTicks,
  DEFAULT_MINING_SPEED,
  miningSpeedOf,
  TOOL_BREAK_SPEED,
} from '../src/domain/block-break-speed'
import type { ItemType } from '../src/domain/item-type'
import { describe, expect, it } from 'vitest'
import { Effect } from 'effect'

const EXPECTED_TOOL_BREAK_SPEED: ReadonlyArray<readonly [ItemType, number]> = [
  ['diamond_axe', 8],
  ['diamond_pickaxe', 8],
  ['diamond_shovel', 8],
  ['gold_axe', 12],
  ['gold_pickaxe', 12],
  ['gold_shovel', 12],
  ['iron_axe', 6],
  ['iron_pickaxe', 6],
  ['iron_shovel', 6],
  ['stone_axe', 4],
  ['stone_pickaxe', 4],
  ['stone_shovel', 4],
  ['wooden_axe', 2],
  ['wooden_pickaxe', 2],
  ['wooden_shovel', 2],
]

describe('block break speed', () => {
  it('reads hardness from the block registry', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(blockHardnessOf('air')).toBe(0)
      expect(blockHardnessOf('dirt')).toBe(8)
      expect(blockHardnessOf('stone')).toBe(25)
      expect(blockHardnessOf('bedrock')).toBe(100)
    })),
  )

  it('returns zero ticks for non-positive hardness', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(computeBreakTicks({ correctForDrops: false, hardness: 0, miningSpeed: DEFAULT_MINING_SPEED })).toBe(0)
      expect(computeBreakTicks({ correctForDrops: false, hardness: -1, miningSpeed: DEFAULT_MINING_SPEED })).toBe(0)
    })),
  )

  it('uses the complete canonical mining speed table', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(TOOL_BREAK_SPEED).toStrictEqual(Object.fromEntries(EXPECTED_TOOL_BREAK_SPEED))
      for (const [type, speed] of EXPECTED_TOOL_BREAK_SPEED) {
        expect(miningSpeedOf(type), type).toBe(speed)
        expect(
          computeBreakTicks({ correctForDrops: true, hardness: 10, miningSpeed: speed }),
          type,
        ).toBe(Math.ceil(30 / speed))
      }
    })),
  )

  it('resolves the default speed separately from drop correctness', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(miningSpeedOf()).toBe(DEFAULT_MINING_SPEED)
      expect(miningSpeedOf('stick')).toBe(DEFAULT_MINING_SPEED)
      expect(computeBreakTicks({ correctForDrops: false, hardness: 8, miningSpeed: DEFAULT_MINING_SPEED })).toBe(24)
      expect(computeBreakTicks({ correctForDrops: false, hardness: 8, miningSpeed: miningSpeedOf('gold_pickaxe') })).toBe(2)
    })),
  )

  it('applies efficiency only to a rule that is correct for drops', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(
        computeBreakTicks({ correctForDrops: true, efficiencyLevel: 2, hardness: 8, miningSpeed: 2 }),
      ).toBe(4)
      expect(
        computeBreakTicks({ correctForDrops: true, efficiencyLevel: 0, hardness: 8, miningSpeed: 2 }),
      ).toBe(8)
      expect(
        computeBreakTicks({ correctForDrops: false, efficiencyLevel: 2, hardness: 8, miningSpeed: 12 }),
      ).toBe(2)
    })),
  )

  it('applies the player break-speed multiplier', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(
        computeBreakTicks({ correctForDrops: false, hardness: 8, miningSpeed: 1, playerBreakSpeed: 2 }),
      ).toBe(12)
    })),
  )

  it('rejects invalid resolved speed inputs', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(() => computeBreakTicks({ correctForDrops: true, hardness: 8, miningSpeed: 0 })).toThrow(
        'miningSpeed must be greater than zero',
      )
      expect(() => computeBreakTicks({ correctForDrops: true, hardness: 8, miningSpeed: 1, efficiencyLevel: -1 })).toThrow(
        'efficiencyLevel must be a non-negative integer',
      )
      expect(() => computeBreakTicks({ correctForDrops: true, hardness: Number.NaN, miningSpeed: 1 })).toThrow(
        'hardness must be finite',
      )
    })),
  )
})
