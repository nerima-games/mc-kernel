/** Explicit ordered registry assembly. Fragment boundaries follow the domain data groups. */

import type { BlockRegistryEntry } from './block-registry-types.js'
import { BLOCK_REGISTRY_CROPS_AND_REDSTONE } from './block-registry-entries-crops-and-redstone.js'
import { BLOCK_REGISTRY_END } from './block-registry-entries-end.js'
import { BLOCK_REGISTRY_FOUNDATION } from './block-registry-entries-foundation.js'
import { BLOCK_REGISTRY_ORES_AND_BLOCKS } from './block-registry-entries-ores-and-blocks.js'
import { BLOCK_REGISTRY_STRUCTURES_AND_NETHER } from './block-registry-entries-structures-and-nether.js'
import { BLOCK_REGISTRY_TERRAIN } from './block-registry-entries-terrain.js'

export const BLOCK_REGISTRY: ReadonlyArray<BlockRegistryEntry> = [
  ...BLOCK_REGISTRY_FOUNDATION,
  ...BLOCK_REGISTRY_TERRAIN,
  ...BLOCK_REGISTRY_ORES_AND_BLOCKS,
  ...BLOCK_REGISTRY_CROPS_AND_REDSTONE,
  ...BLOCK_REGISTRY_END,
  ...BLOCK_REGISTRY_STRUCTURES_AND_NETHER,
]
