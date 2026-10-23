import { describe, expect, it } from 'vitest'
import { EMPTY_STATISTICS } from '../src/domain/text/statistics'

describe('statistics data', () => {
  it('publishes the empty statistics value', () => {
    expect(EMPTY_STATISTICS).toEqual({ counters: {}, unlocked: [] })
  })
})
