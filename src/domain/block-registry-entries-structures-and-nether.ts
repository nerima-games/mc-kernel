/** Registry entries 103-122; the numeric order is the wire-level BlockId order. */
import { BlockId } from './block-registry-types.js'
import type { BlockRegistryEntry } from './block-registry-types.js'
import { DEFAULT_BLOCK_DROP } from './block-harvest.js'
import { NEEDS_ANY_SUPPORT } from './block-support.js'
import { DROPS_NOTHING, NEEDS_WOODEN_PICKAXE, FASTER_WITH_AXE } from './block-registry-rules.js'

export const BLOCK_REGISTRY_STRUCTURES_AND_NETHER: ReadonlyArray<BlockRegistryEntry> = [
  {
    id: BlockId(103),
    definition: {
      type: 'crafting_table',
      capabilities: { flammable: true },
      properties: { hardness: 40, harvestTool: FASTER_WITH_AXE },
    },
  },
  { id: BlockId(104), definition: { type: 'furnace', properties: { hardness: 55, friction: 0.8 } } },
  {
    id: BlockId(105),
    definition: {
      type: 'chest',
      capabilities: { flammable: true },
      properties: { hardness: 35, footstepMaterial: 'wood' },
    },
  },
  {
    id: BlockId(106),
    definition: {
      type: 'door',
      capabilities: { flammable: true, suffocates: false, validSpawnSurface: false },
      properties: { opacity: 'transparentSolid', hardness: 15, footstepMaterial: 'wood' },
    },
  },
  {
    id: BlockId(107),
    definition: {
      type: 'door_open',
      capabilities: { flammable: true, suffocates: false, validSpawnSurface: false },
      properties: { opacity: 'transparentSolid', hardness: 15, drops: { ...DEFAULT_BLOCK_DROP, item: 'door' } },
    },
  },
  {
    id: BlockId(108),
    definition: {
      type: 'oak_stairs',
      capabilities: { flammable: true, suffocates: false },
      properties: { opacity: 'transparentSolid', hardness: 35 },
    },
  },
  {
    id: BlockId(109),
    definition: {
      type: 'anvil',
      properties: { hardness: 75, harvestTool: NEEDS_WOODEN_PICKAXE },
    },
  },
  {
    id: BlockId(110),
    definition: {
      type: 'cauldron',
      properties: { hardness: 35, harvestTool: NEEDS_WOODEN_PICKAXE },
    },
  },
  {
    id: BlockId(111),
    definition: {
      type: 'water_cauldron',
      properties: {
        hardness: 35,
        harvestTool: NEEDS_WOODEN_PICKAXE,
        drops: { ...DEFAULT_BLOCK_DROP, item: 'cauldron' },
      },
    },
  },
  {
    id: BlockId(112),
    definition: {
      type: 'bed',
      capabilities: { flammable: true, suffocates: false, validSpawnSurface: false },
      properties: { opacity: 'transparentSolid', hardness: 10 },
    },
  },
  {
    id: BlockId(113),
    definition: {
      type: 'enchanting_table',
      capabilities: { suffocates: false },
      properties: { hardness: 30 },
    },
  },
  {
    id: BlockId(114),
    definition: {
      type: 'brewing_stand',
      properties: { opacity: 'transparentSolid', hardness: 15 },
    },
  },
  { id: BlockId(115), definition: { type: 'tnt', capabilities: { flammable: true }, properties: { hardness: 0 } } },
  { id: BlockId(116), definition: { type: 'nether_brick', properties: { hardness: 40 } } },
  {
    id: BlockId(117),
    definition: {
      type: 'netherrack',
      capabilities: { fireSource: true },
      properties: { hardness: 5 },
    },
  },
  {
    id: BlockId(118),
    definition: {
      type: 'nether_portal',
      capabilities: { suffocates: false, validSpawnSurface: false },
      properties: {
        opacity: 'transparentSolid',
        lightEmission: 11,
        hardness: 0,
        friction: 0,
        // STATED, not left to the missing item form. Without this the row would
        // carry the default "yields itself", resolve to nothing because
        // `nether_portal` has no item, and be indistinguishable from an
        // oversight — which is the failure `test/item-drops.test.ts` now
        // forbids. A portal is lit by a rule and is never carried.
        drops: DROPS_NOTHING,
      },
    },
  },
  {
    id: BlockId(119),
    definition: {
      type: 'fire',
      properties: {
        opacity: 'transparentSolid',
        lightEmission: 15,
        hardness: 0,
        friction: 0,
        // Fire is the third of the three world-state rows. It is also the row
        // that says `flammable: false` and `fireSource: false` by saying nothing
        // — fire neither catches fire (`FLAMMABLE_BLOCK_TYPES` omits it) nor
        // sustains one (`isFireSourceIndex` is NETHERRACK and LAVA only).
        drops: DROPS_NOTHING,
      },
    },
  },
  { id: BlockId(120), definition: { type: 'soul_soil', properties: { hardness: 5 } } },
  {
    id: BlockId(121),
    definition: {
      type: 'wither_skeleton_skull',
      capabilities: {
        suffocates: false,
        validSpawnSurface: false,
        canSupportAttachments: false,
      },
      properties: {
        opacity: 'transparentSolid',
        collisionShape: 'none',
        supportRule: NEEDS_ANY_SUPPORT,
      },
    },
  },
  { id: BlockId(122), definition: { type: 'dropper', properties: { hardness: 60 } } },
]
