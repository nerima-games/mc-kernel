/* eslint-disable max-statements, no-magic-numbers, sort-imports -- Formula examples and import grouping are the reference contract. */
import {
  DEFAULT_MINING_SPEED,
  TOOL_BREAK_SPEED,
} from '../src/domain/block/block-break-speed'
import type { ItemType } from '../src/domain/item/item-type'
import { describe, expect, it } from 'vitest'

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
  ['netherite_axe', 9],
  ['netherite_pickaxe', 9],
  ['netherite_shovel', 9],
  ['stone_axe', 4],
  ['stone_pickaxe', 4],
  ['stone_shovel', 4],
  ['wooden_axe', 2],
  ['wooden_pickaxe', 2],
  ['wooden_shovel', 2],
]

describe('block break speed', () => {
  it('publishes the complete canonical mining speed table', () => {
    expect(TOOL_BREAK_SPEED).toStrictEqual(Object.fromEntries(EXPECTED_TOOL_BREAK_SPEED))
    expect(DEFAULT_MINING_SPEED).toBe(1)
  })
})
