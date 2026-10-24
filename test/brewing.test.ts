import { Result } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  BREWING_BOTTLE_SLOTS,
  BREWING_FUEL_ITEM,
  BREWING_MAX_FUEL_CHARGES,
  BREWING_TIME_SECS,
  brewingOutput,
  VANILLA_BREWING_RECIPES,
} from '../src/domain/recipe/brewing-data'
import { itemStack } from '../src/domain/item/item-stack'
import { StackCount } from '../src/domain/time/quantities'

const success = <A, E>(result: Result.Result<A, E>): A => {
  expect(Result.isSuccess(result)).toBe(true)
  if (Result.isSuccess(result)) return result.success
  throw new Error(`Expected success, received ${JSON.stringify(result.failure)}`)
}

describe('brewing data', () => {
  it('keeps the brewing constants and built-in recipe table', () => {
    expect(BREWING_BOTTLE_SLOTS).toBe(3)
    expect(BREWING_TIME_SECS).toBe(20)
    expect(BREWING_MAX_FUEL_CHARGES).toBe(20)
    expect(BREWING_FUEL_ITEM).toBe('blaze_powder')
    expect(VANILLA_BREWING_RECIPES.length).toBeGreaterThan(3)
    expect(success(Result.all(VANILLA_BREWING_RECIPES.map(brewingOutput)))).toContainEqual(
      success(itemStack('awkward_potion', StackCount(1))),
    )
  })
})
