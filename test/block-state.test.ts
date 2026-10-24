import { describe, expect, it } from 'vitest'

import {
  BlockState,
  BlockStateByteOffset,
  BlockStateIndex,
  BlockStateLength,
} from '../src/domain/block/block-state'
import { BLOCK_ID_MAX, BlockId, blockIdOf as blockIdOfOption } from '../src/domain/block/block-registry'
import { optionValue, resultFailure, resultValue } from './block-result-helpers'

const blockIdOf = (type: Parameters<typeof blockIdOfOption>[0]) => optionValue(blockIdOfOption(type))

const expectBrandFailure = (result: ReturnType<typeof BlockStateLength.result>, message: string) => {
  expect(resultFailure(result)).toMatchObject({
    _tag: 'BrandError',
    name: 'BrandError',
    message,
  })
}

describe('block-state quantities', () => {
  it('accepts non-negative safe lengths and reports values outside that range', () => {
    expect(BlockStateLength(0)).toBe(0)
    expect(BlockStateLength(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER)
    expectBrandFailure(
      BlockStateLength.result(-1),
      'BlockStateLength must be a non-negative safe integer, received -1',
    )
    expectBrandFailure(
      BlockStateLength.result(1.5),
      'BlockStateLength must be a non-negative safe integer, received 1.5',
    )
    expectBrandFailure(
      BlockStateLength.result(Number.MAX_SAFE_INTEGER + 1),
      `BlockStateLength must be a non-negative safe integer, received ${Number.MAX_SAFE_INTEGER + 1}`,
    )
  })

  it('accepts non-negative safe indexes and byte offsets', () => {
    expect(BlockStateIndex(0)).toBe(0)
    expect(BlockStateIndex(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER)
    expect(BlockStateByteOffset(0)).toBe(0)
    expect(BlockStateByteOffset(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER)
    expect(resultFailure(BlockStateIndex.result(-1)).message).toMatch(/non-negative safe integer/)
    expect(resultFailure(BlockStateIndex.result(1.5)).message).toMatch(/non-negative safe integer/)
    expect(resultFailure(BlockStateByteOffset.result(-1)).message).toMatch(/non-negative safe integer/)
    expect(resultFailure(BlockStateByteOffset.result(1.5)).message).toMatch(/non-negative safe integer/)
  })
})

describe('block state indexed access and copying', () => {
  it('reads and updates a known block through branded indexes', () => {
    const stone = blockIdOf('stone')
    const water = blockIdOf('water')
    const state = resultValue(BlockState.fromBytes(new Uint8Array([stone])))

    expect(state.length).toBe(1)
    expect(resultValue(state.get(BlockStateIndex(0)))).toBe(stone)
    resultValue(state.set(BlockStateIndex(0), water))
    expect(resultValue(state.get(BlockStateIndex(0)))).toBe(water)
  })

  it('returns failures for an index outside the buffer and an unregistered block id', () => {
    const state = resultValue(BlockState.fromBytes(new Uint8Array([blockIdOf('stone')])))

    expect(resultFailure(state.get(BlockStateIndex(1)))).toMatchObject({
      _tag: 'BlockStateFailure',
      reason: 'invalid-index',
    })
    expect(resultFailure(state.set(BlockStateIndex(0), BlockId(BLOCK_ID_MAX))).reason).toBe('unknown-block-id')
    expect(resultFailure(Reflect.apply(state.set, state, [BlockStateIndex(0), BLOCK_ID_MAX + 1]))).toMatchObject({
      _tag: 'BlockStateFailure',
      reason: 'unknown-block-id',
      message: `Block state contains unknown block id ${BLOCK_ID_MAX + 1} at index 0`,
    })
    expect(Reflect.apply(state.get, state, [-1])).toMatchObject({
      _tag: 'Failure',
      failure: { _tag: 'BlockStateFailure', reason: 'invalid-index' },
    })
  })

  it('copies the complete wire state at a branded byte offset', () => {
    const state = resultValue(BlockState.fromBytes(new Uint8Array([blockIdOf('stone')])))
    const target = new Uint8Array(3)

    resultValue(state.copyTo(target, BlockStateByteOffset(1)))

    expect(target).toStrictEqual(new Uint8Array([0, blockIdOf('stone'), 0]))
    expect(resultFailure(state.copyTo(new Uint8Array(2), BlockStateByteOffset(1))).reason).toBe('invalid-copy-range')
    expect(resultFailure(state.copyTo(new Uint8Array(4), BlockStateByteOffset(3))).reason).toBe('invalid-copy-range')
    expect(Reflect.apply(state.copyTo, state, [new Uint8Array(4), -1])).toMatchObject({
      _tag: 'Failure',
      failure: { _tag: 'BlockStateFailure', reason: 'invalid-copy-range' },
    })
  })

  it('constructs from a branded element count', () => {
    const payload = new Uint8Array([blockIdOf('stone'), 0])
    const state = resultValue(BlockState.fromElementBytes(payload, BlockStateLength(1)))

    expect(state.length).toBe(1)
    expect(resultValue(state.get(BlockStateIndex(0)))).toBe(blockIdOf('stone'))
  })
})

describe('BlockState.fromElementBytes failures', () => {
  it('rejects counts that cannot describe a non-negative number of elements', () => {
    for (const elementCount of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        resultFailure(
          Reflect.apply(BlockState.fromElementBytes, BlockState, [new Uint8Array(), elementCount]),
        ),
      ).toMatchObject({
          _tag: 'BlockStateFailure',
          reason: 'invalid-element-count',
          message: `Block state element count must be a non-negative safe integer, received ${elementCount}`,
        })
    }
  })

  it('rejects a payload shorter than the declared element count', () => {
    expect(
      resultFailure(
        Reflect.apply(BlockState.fromElementBytes, BlockState, [new Uint8Array(1), 1]),
      ),
    ).toMatchObject({
        _tag: 'BlockStateFailure',
        reason: 'invalid-element-count',
        message: 'Block state element payload must contain 2 bytes, received 1',
      })
  })
})
