import { describe, expect, it } from 'vitest'
import { blockPosition } from '../src/domain/coordinate-primitives'
import {
  BONE_MEAL_GROWTH_SECS,
  CROP_REGISTRY,
  CROP_TYPES,
  advanceCrop,
  advanceCropByBoneMeal,
  canPlantCrop,
  cropDefinitionFor,
  cropLocationKey,
  isCropType,
  isMatureCrop,
  matureYieldsFor,
  maturitySecsFor,
  validateCropSnapshot,
  type CropState,
} from '../src/domain/crop'

const wheatCrop = (growthSecs: number): CropState => ({
  dimension: 'overworld',
  position: blockPosition(3, 64, -2),
  crop: 'wheat_crop',
  growthSecs,
})

describe('crop', () => {
  it('publishes the vanilla crop definitions', () => {
    expect(CROP_TYPES).toEqual(['wheat_crop', 'potato_crop', 'nether_wart_crop'])
    expect(cropDefinitionFor('wheat_crop')).toBe(CROP_REGISTRY.wheat_crop)
    expect(CROP_REGISTRY.wheat_crop).toMatchObject({
      maturitySecs: 480,
      seed: 'wheat_seeds',
      soil: 'farmland',
      dimensions: ['overworld', 'nether', 'end'],
    })
    expect(CROP_REGISTRY.potato_crop).toMatchObject({ seed: 'potato', soil: 'farmland' })
    expect(CROP_REGISTRY.nether_wart_crop).toMatchObject({ seed: 'nether_wart', soil: 'soul_sand' })
    expect(maturitySecsFor('potato_crop')).toBe(480)
  })

  it('narrows crop names without accepting unknown values', () => {
    expect(isCropType('wheat_crop')).toBe(true)
    expect(isCropType('unknown_crop')).toBe(false)
    expect(isCropType(null)).toBe(false)
  })

  it('checks the crop soil and dimension rules', () => {
    expect(canPlantCrop('wheat_crop', 'farmland', 'overworld')).toBe(true)
    expect(canPlantCrop('wheat_crop', 'soul_sand', 'overworld')).toBe(false)
    expect(canPlantCrop('nether_wart_crop', 'soul_sand', 'end')).toBe(true)
    expect(canPlantCrop('nether_wart_crop', 'farmland', 'nether')).toBe(false)
  })

  it('advances growth, caps at maturity, and sanitizes elapsed values', () => {
    expect(advanceCrop(wheatCrop(10), 20).growthSecs).toBe(30)
    expect(advanceCrop(wheatCrop(480), 20).growthSecs).toBe(480)
    expect(advanceCrop(wheatCrop(-10), Number.NaN).growthSecs).toBe(0)
    expect(advanceCrop(wheatCrop(10), Number.POSITIVE_INFINITY).growthSecs).toBe(10)
    expect(advanceCropByBoneMeal(wheatCrop(0)).growthSecs).toBe(BONE_MEAL_GROWTH_SECS)
  })

  it('reports maturity and returns independent guaranteed yields', () => {
    const immature = wheatCrop(479)
    const mature = wheatCrop(480)

    expect(isMatureCrop(immature)).toBe(false)
    expect(isMatureCrop(mature)).toBe(true)
    expect(matureYieldsFor(immature)).toBeNull()
    const yields = matureYieldsFor(mature)
    expect(yields).toEqual(CROP_REGISTRY.wheat_crop.guaranteedMatureYield)
    expect(yields).not.toBe(CROP_REGISTRY.wheat_crop.guaranteedMatureYield)
  })

  it('creates a stable key for a crop location', () => {
    expect(cropLocationKey(wheatCrop(0))).toBe('["overworld",3,64,-2]')
  })

  it('validates and canonicalizes crop snapshots', () => {
    expect(validateCropSnapshot({ crops: [] })).toEqual({ _tag: 'Valid', snapshot: { crops: [] } })
    expect(validateCropSnapshot({
      crops: [{
        dimension: 'overworld',
        position: { x: 3, y: 64, z: -2 },
        crop: 'wheat_crop',
        growthSecs: 10,
      }],
    })).toEqual({ _tag: 'Valid', snapshot: { crops: [wheatCrop(10)] } })
  })

  it.each([
    ['not an object', null, 'snapshot'],
    ['missing crops', {}, 'snapshot'],
    ['crops is not an array', { crops: 'invalid' }, 'snapshot'],
    ['crop has an extra key', {
      crops: [{ dimension: 'overworld', position: { x: 0, y: 0, z: 0 }, crop: 'wheat_crop', growthSecs: 0, extra: true }],
    }, 'crops[0]'],
    ['crop has a wrong key', {
      crops: [{ dimension: 'overworld', position: { x: 0, y: 0, z: 0 }, crop: 'wheat_crop', growth: 0 }],
    }, 'crops[0]'],
    ['crop is not an object', { crops: [null] }, 'crops[0]'],
    ['dimension is unknown', {
      crops: [{ dimension: 'moon', position: { x: 0, y: 0, z: 0 }, crop: 'wheat_crop', growthSecs: 0 }],
    }, 'crops[0].dimension'],
    ['crop type is unknown', {
      crops: [{ dimension: 'overworld', position: { x: 0, y: 0, z: 0 }, crop: 'unknown', growthSecs: 0 }],
    }, 'crops[0].crop'],
    ['position is not an object', {
      crops: [{ dimension: 'overworld', position: null, crop: 'wheat_crop', growthSecs: 0 }],
    }, 'crops[0].position'],
    ['position has an extra key', {
      crops: [{ dimension: 'overworld', position: { x: 0, y: 0, z: 0, extra: true }, crop: 'wheat_crop', growthSecs: 0 }],
    }, 'crops[0].position'],
    ['position has a wrong key', {
      crops: [{ dimension: 'overworld', position: { x: 0, y: 0, z: 0, w: 0 }, crop: 'wheat_crop', growthSecs: 0 }],
    }, 'crops[0].position'],
    ['coordinate is not a safe integer', {
      crops: [{ dimension: 'overworld', position: { x: 0.5, y: 0, z: 0 }, crop: 'wheat_crop', growthSecs: 0 }],
    }, 'crops[0].position'],
    ['growth is not a number', {
      crops: [{ dimension: 'overworld', position: { x: 0, y: 0, z: 0 }, crop: 'wheat_crop', growthSecs: '0' }],
    }, 'crops[0].growthSecs'],
    ['growth is infinite', {
      crops: [{ dimension: 'overworld', position: { x: 0, y: 0, z: 0 }, crop: 'wheat_crop', growthSecs: Number.POSITIVE_INFINITY }],
    }, 'crops[0].growthSecs'],
    ['growth is negative', {
      crops: [{ dimension: 'overworld', position: { x: 0, y: 0, z: 0 }, crop: 'wheat_crop', growthSecs: -1 }],
    }, 'crops[0].growthSecs'],
    ['growth exceeds maturity', {
      crops: [{ dimension: 'overworld', position: { x: 0, y: 0, z: 0 }, crop: 'wheat_crop', growthSecs: 481 }],
    }, 'crops[0].growthSecs'],
    ['location is duplicated', {
      crops: [wheatCrop(0), wheatCrop(10)],
    }, 'crops[1]'],
  ] as const)('%s', (_name, value, path) => {
    const result = validateCropSnapshot(value)
    expect(result._tag).toBe('Invalid')
    if (result._tag === 'Invalid') expect(result.error.path).toBe(path)
  })
})
