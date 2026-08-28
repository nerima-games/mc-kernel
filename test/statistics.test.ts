import { describe, expect, it } from 'vitest'
import {
  EMPTY_STATISTICS,
  counterOf,
  isUnlocked,
  isValidStatistics,
  normaliseStatistics,
  record,
  unlock,
  type Statistics,
} from '../src/domain/statistics'

describe('statistics', () => {
  it('reads and records counters', () => {
    expect(EMPTY_STATISTICS).toEqual({ counters: {}, unlocked: [] })

    const statistics: Statistics = {
      counters: { mined: 2, negative: -3 },
      unlocked: [],
    }
    expect(counterOf(statistics, 'mined')).toBe(2)
    expect(counterOf(statistics, 'negative')).toBe(0)
    expect(counterOf(statistics, 'missing')).toBe(0)
    expect(record(statistics, 'mined').counters['mined']).toBe(3)
    expect(record(statistics, 'negative', -5).counters['negative']).toBe(0)
    expect(record(statistics, 'new', 0)).toBe(statistics)
    expect(record(statistics, 'new', Number.NaN)).toBe(statistics)
    expect(record(statistics, 'new', Number.POSITIVE_INFINITY)).toBe(statistics)
  })

  it('unlocks achievements idempotently', () => {
    const statistics: Statistics = { counters: {}, unlocked: ['first'] }
    expect(isUnlocked(statistics, 'first')).toBe(true)
    expect(isUnlocked(statistics, 'missing')).toBe(false)
    expect(unlock(statistics, 'first')).toBe(statistics)
    expect(unlock(statistics, 'second')).toEqual({ counters: {}, unlocked: ['first', 'second'] })
  })

  it('normalises malformed counters and achievements', () => {
    expect(normaliseStatistics(null)).toEqual(EMPTY_STATISTICS)
    expect(normaliseStatistics([])).toEqual(EMPTY_STATISTICS)
    expect(normaliseStatistics({ counters: [], unlocked: 'first' })).toEqual(EMPTY_STATISTICS)
    expect(
      normaliseStatistics({
        counters: {
          mined: 2,
          zero: 0,
          negative: -1,
          nan: Number.NaN,
          infinite: Number.POSITIVE_INFINITY,
          text: '2',
        },
        unlocked: ['first', 'first', 2, null, 'second'],
      }),
    ).toEqual({ counters: { mined: 2 }, unlocked: ['first', 'second'] })
  })

  it('validates counters and unique achievement identifiers', () => {
    expect(isValidStatistics({ counters: { mined: 1 }, unlocked: ['first'] })).toBe(true)

    const invalidStatistics: unknown[] = [
      null,
      [],
      {},
      { counters: null, unlocked: [] },
      { counters: [], unlocked: [] },
      { counters: { zero: 0 }, unlocked: [] },
      { counters: { nan: Number.NaN }, unlocked: [] },
      { counters: { infinite: Number.POSITIVE_INFINITY }, unlocked: [] },
      { counters: { text: '1' }, unlocked: [] },
      { counters: { mined: 1 }, unlocked: 'first' },
      { counters: { mined: 1 }, unlocked: ['first', 'first'] },
      { counters: { mined: 1 }, unlocked: ['first', 2] },
    ]

    for (const statistics of invalidStatistics) {
      expect(isValidStatistics(statistics)).toBe(false)
    }
  })
})
