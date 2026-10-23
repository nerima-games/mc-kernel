/** Explicit ordered registry assembly. Fragment boundaries follow the domain data groups. */

import type { BlockRegistryEntry } from './block-registry-types.js'
import type { BlockRegistryEntryInput } from './block-registry-entry-input.js'
import { normalizeBlockPropertyOverrides } from './block-property-validation.js'
import { BLOCK_REGISTRY_COLLISION_SHAPES } from './block-registry-entries-collision-shapes.js'
import { BLOCK_REGISTRY_CROPS_AND_REDSTONE } from './block-registry-entries-crops-and-redstone.js'
import { BLOCK_REGISTRY_END } from './block-registry-entries-end.js'
import { BLOCK_REGISTRY_FOUNDATION } from './block-registry-entries-foundation.js'
import { BLOCK_REGISTRY_ORES_AND_BLOCKS } from './block-registry-entries-ores-and-blocks.js'
import { BLOCK_REGISTRY_PASSABLE } from './block-registry-entries-passable.js'
import { BLOCK_REGISTRY_STRUCTURES_AND_NETHER } from './block-registry-entries-structures-and-nether.js'
import { BLOCK_REGISTRY_TERRAIN } from './block-registry-entries-terrain.js'

const BLOCK_REGISTRY_INPUT: ReadonlyArray<BlockRegistryEntryInput> = [
  ...BLOCK_REGISTRY_FOUNDATION,
  ...BLOCK_REGISTRY_PASSABLE,
  ...BLOCK_REGISTRY_COLLISION_SHAPES,
  ...BLOCK_REGISTRY_TERRAIN,
  ...BLOCK_REGISTRY_ORES_AND_BLOCKS,
  ...BLOCK_REGISTRY_CROPS_AND_REDSTONE,
  ...BLOCK_REGISTRY_END,
  ...BLOCK_REGISTRY_STRUCTURES_AND_NETHER,
]

export const normalizeBlockRegistryEntry = (
  { id, definition }: BlockRegistryEntryInput,
): BlockRegistryEntry => {
  const { properties, ...definitionWithoutProperties } = definition
  return {
    id,
    definition: {
      ...definitionWithoutProperties,
      ...(properties === undefined ? {} : { properties: normalizeBlockPropertyOverrides(properties) }),
    },
  }
}

export const BLOCK_REGISTRY: ReadonlyArray<BlockRegistryEntry> =
  BLOCK_REGISTRY_INPUT.map(normalizeBlockRegistryEntry)
