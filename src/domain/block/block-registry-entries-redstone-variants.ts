/** Registry entries appended to preserve every existing BlockId. */
import { DEFAULT_BLOCK_DROP } from './block-harvest-data.js'
import { BlockId } from './block-registry-types.js'
import type { BlockRegistryEntryInput } from './block-registry-entry-input.js'
import { NEEDS_ANY_SUPPORT } from './block-support-data.js'

export const BLOCK_REGISTRY_REDSTONE_VARIANTS: ReadonlyArray<BlockRegistryEntryInput> = [
  {
    id: BlockId(126),
    definition: {
      type: 'sticky_piston',
      capabilities: { validSpawnSurface: false },
      properties: { hardness: 55, footstepMaterial: 'stone', drops: DEFAULT_BLOCK_DROP },
    },
  },
  {
    id: BlockId(127),
    definition: {
      type: 'redstone_wall_torch',
      capabilities: {
        brokenByWaterFlow: true,
        suffocates: false,
        canSupportAttachments: false,
        validSpawnSurface: false,
      },
      properties: {
        opacity: 'transparentSolid',
        lightEmission: 7,
        hardness: 1,
        friction: 0.1,
        drops: { ...DEFAULT_BLOCK_DROP, item: 'redstone_torch' },
        supportRule: NEEDS_ANY_SUPPORT,
      },
    },
  },
]
