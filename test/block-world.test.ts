import { describe, expect, it } from 'vitest'
import { AIR_BLOCK_ID, blockIdOf } from '../src/domain/block-registry'
import {
  blockAt,
  blockReaderOf,
  emptyBlockWorld,
  readBlockAt,
  setBlockAt,
} from '../src/domain/block-world'
import { blockPosition } from '../src/domain/coordinate-primitives'

describe('block world', () => {
  it('reads air by default and keeps block writes immutable', () => {
    const position = blockPosition(1, 2, 3)
    const empty = emptyBlockWorld()
    const stone = blockIdOf('stone')

    expect(empty.size).toBe(0)
    expect(blockAt(empty, position)).toBe(AIR_BLOCK_ID)

    const placed = setBlockAt(empty, position, stone)
    expect(blockAt(placed, position)).toBe(stone)
    expect(blockAt(empty, position)).toBe(AIR_BLOCK_ID)
    expect(placed).not.toBe(empty)

    const cleared = setBlockAt(placed, position, AIR_BLOCK_ID)
    expect(cleared.size).toBe(0)
    expect(blockAt(cleared, position)).toBe(AIR_BLOCK_ID)
  })

  it('reads both map and function block sources', () => {
    const position = blockPosition(-2, 0, 4)
    const stone = blockIdOf('stone')
    const world = setBlockAt(emptyBlockWorld(), position, stone)
    const reader = blockReaderOf(world)

    expect(reader(position)).toBe(stone)
    expect(readBlockAt(world, position)).toBe(stone)
    expect(readBlockAt(() => stone, position)).toBe(stone)
  })
})
