import {
  AnvilCustomName,
  AnvilEnchantmentId,
  AnvilMaterialCost,
} from '../src/domain/item/anvil-primitives'
import { describe, expect, it } from 'vitest'

describe('anvil branded values', () => {
  it('constructs valid enchantment ids and custom names', () => {
    expect(AnvilEnchantmentId('sharpness')).toBe('sharpness')
    expect(AnvilCustomName('Named sword')).toBe('Named sword')
  })

  it('rejects invalid enchantment ids and custom names', () => {
    expect(() => AnvilEnchantmentId('Not Lowercase')).toThrowError(TypeError)
    expect(() => AnvilCustomName('')).toThrowError(TypeError)
  })

  it('validates material costs', () => {
    expect(AnvilMaterialCost(0)).toBe(0)
    expect(AnvilMaterialCost.result(Number.NaN)).toBeDefined()
  })
})
