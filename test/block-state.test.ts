import { describe, expect, it } from 'vitest'

import {
  BlockState,
  BlockStateByteOffset,
  BlockStateIndex,
  BlockStateLength,
} from '../src/domain/block/block-state'
import { BLOCK_ID_MAX, BlockId, blockIdOf } from '../src/domain/block/block-registry'

describe('block-state quantities', () => {
  it('accepts non-negative safe lengths and rejects values outside that range', () => {
    expect(BlockStateLength(0)).toBe(0)
    expect(BlockStateLength(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER)
    expect(() => BlockStateLength(-1)).toThrow()
    expect(() => BlockStateLength(1.5)).toThrow()
    expect(() => BlockStateLength(Number.MAX_SAFE_INTEGER + 1)).toThrow()
  })

  it('accepts non-negative safe indexes and byte offsets', () => {
    expect(BlockStateIndex(0)).toBe(0)
    expect(BlockStateIndex(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER)
    expect(BlockStateByteOffset(0)).toBe(0)
    expect(BlockStateByteOffset(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER)
    expect(() => BlockStateIndex(-1)).toThrow()
    expect(() => BlockStateIndex(1.5)).toThrow()
    expect(() => BlockStateByteOffset(-1)).toThrow()
    expect(() => BlockStateByteOffset(1.5)).toThrow()
  })
})

describe('block state indexed access and copying', () => {
  it('reads and updates a known block through branded indexes', () => {
    const stone = blockIdOf('stone')
    const water = blockIdOf('water')
    const state = BlockState.fromBytes(new Uint8Array([stone]))

    expect(state.length).toBe(1)
    expect(state.get(BlockStateIndex(0))).toBe(stone)
    state.set(BlockStateIndex(0), water)
    expect(state.get(BlockStateIndex(0))).toBe(water)
  })

  it('rejects an index outside the buffer and an unregistered block id', () => {
    const state = BlockState.fromBytes(new Uint8Array([blockIdOf('stone')]))

    expect(() => state.get(BlockStateIndex(1))).toThrow(RangeError)
    expect(() => state.set(BlockStateIndex(0), BlockId(BLOCK_ID_MAX))).toThrow(RangeError)
    expect(() => Reflect.apply(state.get, state, [-1])).toThrow(RangeError)
  })

  it('copies the complete wire state at a branded byte offset', () => {
    const state = BlockState.fromBytes(new Uint8Array([blockIdOf('stone')]))
    const target = new Uint8Array(3)

    state.copyTo(target, BlockStateByteOffset(1))

    expect(target).toStrictEqual(new Uint8Array([0, blockIdOf('stone'), 0]))
    expect(() => state.copyTo(new Uint8Array(2), BlockStateByteOffset(1))).toThrow(RangeError)
    expect(() => state.copyTo(new Uint8Array(4), BlockStateByteOffset(3))).toThrow(RangeError)
    expect(() => Reflect.apply(state.copyTo, state, [new Uint8Array(4), -1])).toThrow(RangeError)
  })

  it('constructs from a branded element count', () => {
    const payload = new Uint8Array([blockIdOf('stone'), 0])
    const state = BlockState.fromElementBytes(payload, BlockStateLength(1))

    expect(state.length).toBe(1)
    expect(state.get(BlockStateIndex(0))).toBe(blockIdOf('stone'))
  })
})
