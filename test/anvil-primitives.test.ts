import {
  AnvilCustomName,
  AnvilEnchantmentId,
  AnvilMaterialCost,
} from '../src/domain/item/anvil-primitives'
import { Result } from 'effect'
import { itemResultValue } from './item-result-assertions'
import { describe, expect, it } from 'vitest'

const expectBrandFailure = <A>(result: Result.Result<A, { readonly _tag: string; readonly name: string; readonly message: string }>, message: string) => {
  expect(Result.isFailure(result)).toBe(true)
  if (Result.isFailure(result)) {
    expect(result.failure).toMatchObject({ _tag: 'BrandError', name: 'BrandError', message })
  }
}

describe('anvil branded values', () => {
  it('constructs valid enchantment ids and custom names', () => {
    expect(itemResultValue(AnvilEnchantmentId.result('sharpness'))).toBe('sharpness')
    expect(itemResultValue(AnvilCustomName.result('Named sword'))).toBe('Named sword')
  })

  it('rejects invalid enchantment ids and custom names', () => {
    expectBrandFailure(AnvilEnchantmentId.result('Not Lowercase'), 'Invalid AnvilEnchantmentId: Not Lowercase')
    expectBrandFailure(AnvilCustomName.result(''), 'Invalid AnvilCustomName: ')
  })

  it('validates material costs', () => {
    expect(itemResultValue(AnvilMaterialCost.result(0))).toBe(0)
    expectBrandFailure(AnvilMaterialCost.result(Number.NaN), 'AnvilMaterialCost must be an integer in [0, 99], received NaN')
  })
})
