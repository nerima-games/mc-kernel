import { describe, expect, it } from 'vitest'
import { blockPosition, blockPositionKey, blockPositionOfKey, isBlockPositionKey } from '../src'

describe('block position keys', () => {
  it('round-trips negative and zero coordinates', () => {
    const position = blockPosition(-1, 0, 32)
    const key = blockPositionKey(position)

    expect(key).toBe('-1,0,32')
    expect(blockPositionOfKey(key)).toStrictEqual(position)
    expect(isBlockPositionKey(key)).toBe(true)
  })

  it('rejects non-canonical and unsafe input', () => {
    for (const value of ['01,0,0', '-0,0,0', '1,2', '1,2,3,4', '9007199254740992,0,0']) {
      expect(blockPositionOfKey(value)).toBeUndefined()
      expect(isBlockPositionKey(value)).toBe(false)
    }
  })
})
