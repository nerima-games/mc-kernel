/** Registry entry for the bookshelf block. */
import { StackCount } from '../time/quantities.js'
import { DEFAULT_BLOCK_DROP } from './block-harvest-data.js'
import { BlockId } from './block-registry-types.js'
import { FASTER_WITH_AXE } from './block-registry-rules.js'
import type { BlockRegistryEntryInput } from './block-registry-entry-input.js'

export const BLOCK_REGISTRY_BOOKSHELF: ReadonlyArray<BlockRegistryEntryInput> = [
  {
    id: BlockId(125),
    definition: {
      type: 'bookshelf',
      capabilities: { flammable: true },
      properties: {
        hardness: 1.5,
        footstepMaterial: 'wood',
        harvestTool: FASTER_WITH_AXE,
        drops: {
          ...DEFAULT_BLOCK_DROP,
          item: 'book',
          silkTouchItem: 'bookshelf',
          count: StackCount(3),
          silkTouchCount: StackCount(1),
        },
      },
    },
  },
]
