/** Registry entries for copper ores appended after the existing block ids. */
import { BlockId } from './block-registry-types.js'
import type { BlockRegistryEntryInput } from './block-registry-entry-input.js'
import { StackCount } from '../time/quantities.js'
import { DEFAULT_BLOCK_DROP } from './block-harvest-data.js'
import { NEEDS_STONE_PICKAXE } from './block-registry-rules.js'

// The stored count is the vanilla minimum of 2; Fortune's random bonus is resolved by gameplay.
export const BLOCK_REGISTRY_COPPER: ReadonlyArray<BlockRegistryEntryInput> = [
  {
    id: BlockId(123),
    definition: {
      type: 'copper_ore',
      properties: {
        hardness: 3,
        friction: 0.8,
        footstepMaterial: 'stone',
        harvestTool: NEEDS_STONE_PICKAXE,
        drops: {
          ...DEFAULT_BLOCK_DROP,
          item: 'raw_copper',
          silkTouchItem: 'copper_ore',
          count: StackCount(2),
          affectedByFortune: true,
        },
      },
    },
  },
  {
    id: BlockId(124),
    definition: {
      type: 'deepslate_copper_ore',
      properties: {
        hardness: 4.5,
        friction: 0.8,
        footstepMaterial: 'stone',
        harvestTool: NEEDS_STONE_PICKAXE,
        drops: {
          ...DEFAULT_BLOCK_DROP,
          item: 'raw_copper',
          silkTouchItem: 'deepslate_copper_ore',
          count: StackCount(2),
          affectedByFortune: true,
        },
      },
    },
  },
]
