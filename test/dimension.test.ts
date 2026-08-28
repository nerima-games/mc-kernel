import { describe, expect, it } from 'vitest'
import { DIMENSIONS, isDimension } from '../src/domain/dimension'

describe('dimension', () => {
  it('exposes the closed vanilla dimension vocabulary', () => {
    expect(DIMENSIONS).toEqual(['overworld', 'nether', 'end'])
    expect(new Set(DIMENSIONS).size).toBe(DIMENSIONS.length)
  })

  it('guards values arriving from external data', () => {
    expect(isDimension('overworld')).toBe(true)
    expect(isDimension('nether')).toBe(true)
    expect(isDimension('end')).toBe(true)
    expect(isDimension('moon')).toBe(false)
    expect(isDimension(null)).toBe(false)
  })
})
