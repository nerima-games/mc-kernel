import {
  BONE_MEAL_GROWTH_SECS,
  CROP_REGISTRY,
  CROP_TYPES,
  type CropDefinition,
  type CropType,
} from './crop-data.js'
import { blockPosition, type BlockPosition } from './coordinate-primitives.js'
import type { BlockType } from './block-type.js'
import { isDimension, type Dimension } from './dimension.js'
import type { ItemStack } from './item-stack.js'

export {
  BONE_MEAL_GROWTH_SECS,
  CROP_REGISTRY,
  CROP_TYPES,
  NETHER_WART_MATURITY_SECS,
  POTATO_MATURITY_SECS,
  WHEAT_MATURITY_SECS,
} from './crop-data.js'
export type { CropDefinition, CropType } from './crop-data.js'

export type CropLocation = {
  readonly dimension: Dimension
  readonly position: BlockPosition
}

export type CropState = CropLocation & {
  readonly crop: CropType
  readonly growthSecs: number
}

export type CropSnapshot = {
  readonly crops: ReadonlyArray<CropState>
}

export type CropValidationError = {
  readonly _tag: 'CropValidationError'
  readonly path: string
  readonly reason: string
}

export type CropValidationResult =
  | { readonly _tag: 'Valid'; readonly snapshot: CropSnapshot }
  | { readonly _tag: 'Invalid'; readonly error: CropValidationError }

const CROP_TYPE_LOOKUP: ReadonlySet<string> = new Set(CROP_TYPES)

export const isCropType = (value: unknown): value is CropType =>
  typeof value === 'string' && CROP_TYPE_LOOKUP.has(value)

export const cropDefinitionFor = (crop: CropType): CropDefinition => CROP_REGISTRY[crop]

export const maturitySecsFor = (crop: CropType): number => cropDefinitionFor(crop).maturitySecs

export const canPlantCrop = (crop: CropType, soil: BlockType, dimension: Dimension): boolean => {
  const definition = cropDefinitionFor(crop)
  if (definition.soil !== soil) return false
  return definition.dimensions.includes(dimension)
}

export const isMatureCrop = (crop: CropState): boolean => crop.growthSecs >= maturitySecsFor(crop.crop)

export const matureYieldsFor = (crop: CropState): ReadonlyArray<ItemStack> | null =>
  isMatureCrop(crop)
    ? cropDefinitionFor(crop.crop).guaranteedMatureYield.map((stack) => ({ ...stack }))
    : null

const nonNegativeFinite = (value: number): number => (Number.isFinite(value) ? Math.max(0, value) : 0)

export const advanceCrop = (crop: CropState, deltaSecs: number): CropState => {
  const maturitySecs = maturitySecsFor(crop.crop)
  return {
    ...crop,
    growthSecs: Math.min(
      maturitySecs,
      nonNegativeFinite(crop.growthSecs) + nonNegativeFinite(deltaSecs),
    ),
  }
}

export const advanceCropByBoneMeal = (crop: CropState): CropState => advanceCrop(crop, BONE_MEAL_GROWTH_SECS)

type UnknownRecord = Record<string, unknown>

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const hasExactKeys = (value: UnknownRecord, expected: ReadonlyArray<string>): boolean => {
  const actual = Object.keys(value)
  return actual.length === expected.length && expected.every((key) => Object.hasOwn(value, key))
}

const isSafeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value)

const invalid = (path: string, reason: string): CropValidationResult => ({
  _tag: 'Invalid',
  error: { _tag: 'CropValidationError', path, reason },
})

export const cropLocationKey = ({ dimension, position }: CropLocation): string =>
  JSON.stringify([dimension, position.x, position.y, position.z])

export const validateCropSnapshot = (value: unknown): CropValidationResult => {
  if (!isRecord(value) || !hasExactKeys(value, ['crops']) || !Array.isArray(value['crops'])) {
    return invalid('snapshot', 'expected exactly { crops: CropState[] }')
  }

  const crops: Array<CropState> = []
  const occupied = new Set<string>()

  for (const [index, candidate] of value['crops'].entries()) {
    const path = `crops[${String(index)}]`
    if (!isRecord(candidate) ||
      !hasExactKeys(candidate, ['dimension', 'position', 'crop', 'growthSecs'])) {
      return invalid(path, 'expected exactly dimension, position, crop, and growthSecs')
    }

    const dimension = candidate['dimension']
    if (!isDimension(dimension)) return invalid(`${path}.dimension`, 'unknown dimension')

    const cropType = candidate['crop']
    if (!isCropType(cropType)) return invalid(`${path}.crop`, 'unknown crop')

    const position = candidate['position']
    if (!isRecord(position) || !hasExactKeys(position, ['x', 'y', 'z'])) {
      return invalid(`${path}.position`, 'expected exactly integer x, y, and z')
    }

    const { x, y, z } = position
    if (!isSafeInteger(x) || !isSafeInteger(y) || !isSafeInteger(z)) {
      return invalid(`${path}.position`, 'coordinates must be safe integers')
    }

    const growthSecs = candidate['growthSecs']
    if (typeof growthSecs !== 'number' || !Number.isFinite(growthSecs) || growthSecs < 0 ||
      growthSecs > maturitySecsFor(cropType)) {
      return invalid(`${path}.growthSecs`, 'growth must be finite and within the crop maturity range')
    }

    const crop: CropState = {
      dimension,
      position: blockPosition(x, y, z),
      crop: cropType,
      growthSecs,
    }
    const key = cropLocationKey(crop)
    if (occupied.has(key)) return invalid(path, 'duplicate crop location')
    occupied.add(key)
    crops.push(crop)
  }

  return { _tag: 'Valid', snapshot: { crops } }
}
