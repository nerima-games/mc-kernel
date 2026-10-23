import { describe, expect, it } from 'vitest'
import {
  BONE_MEAL_GROWTH_SECS,
  CROP_REGISTRY,
  CROP_TYPES,
  NETHER_WART_MATURITY_SECS,
  POTATO_MATURITY_SECS,
  WHEAT_MATURITY_SECS,
} from '../src/domain/block/crop'

describe('crop', () => {
  it('publishes the vanilla crop definitions', () => {
    expect(CROP_TYPES).toEqual(['wheat_crop', 'potato_crop', 'nether_wart_crop'])
    expect(CROP_REGISTRY.wheat_crop).toMatchObject({
      maturitySecs: WHEAT_MATURITY_SECS,
      seed: 'wheat_seeds',
      soil: 'farmland',
      dimensions: ['overworld', 'nether', 'end'],
    })
    expect(CROP_REGISTRY.potato_crop).toMatchObject({
      maturitySecs: POTATO_MATURITY_SECS,
      seed: 'potato',
      soil: 'farmland',
    })
    expect(CROP_REGISTRY.nether_wart_crop).toMatchObject({
      maturitySecs: NETHER_WART_MATURITY_SECS,
      seed: 'nether_wart',
      soil: 'soul_sand',
    })
    expect(BONE_MEAL_GROWTH_SECS).toBe(30)
  })
})
