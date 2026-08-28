import { DIMENSIONS, type Dimension } from './dimension.js'
import { itemStack, type ItemStack } from './item-stack.js'
import type { BlockType } from './block-type.js'
import type { ItemType } from './item-type.js'

export const CROP_TYPES: readonly ['wheat_crop', 'potato_crop', 'nether_wart_crop'] = [
  'wheat_crop',
  'potato_crop',
  'nether_wart_crop',
]

export type CropType = (typeof CROP_TYPES)[number]

export const WHEAT_MATURITY_SECS = 480
export const POTATO_MATURITY_SECS = 480
export const NETHER_WART_MATURITY_SECS = 480
export const BONE_MEAL_GROWTH_SECS = 30

export type CropDefinition = {
  readonly crop: CropType
  readonly maturitySecs: number
  readonly seed: ItemType
  readonly soil: BlockType
  readonly dimensions: ReadonlyArray<Dimension>
  readonly guaranteedMatureYield: ReadonlyArray<ItemStack>
}

const ALL_DIMENSIONS: ReadonlyArray<Dimension> = DIMENSIONS

export const CROP_REGISTRY: Readonly<Record<CropType, CropDefinition>> = {
  wheat_crop: {
    crop: 'wheat_crop',
    maturitySecs: WHEAT_MATURITY_SECS,
    seed: 'wheat_seeds',
    soil: 'farmland',
    dimensions: ALL_DIMENSIONS,
    guaranteedMatureYield: [itemStack('wheat', 1), itemStack('wheat_seeds', 1)],
  },
  potato_crop: {
    crop: 'potato_crop',
    maturitySecs: POTATO_MATURITY_SECS,
    seed: 'potato',
    soil: 'farmland',
    dimensions: ALL_DIMENSIONS,
    guaranteedMatureYield: [itemStack('potato', 2)],
  },
  nether_wart_crop: {
    crop: 'nether_wart_crop',
    maturitySecs: NETHER_WART_MATURITY_SECS,
    seed: 'nether_wart',
    soil: 'soul_sand',
    dimensions: ALL_DIMENSIONS,
    guaranteedMatureYield: [itemStack('nether_wart', 2)],
  },
}
