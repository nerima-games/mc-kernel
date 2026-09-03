/** Registry entries 103-122; the numeric order is the wire-level BlockId order. */
import { BlockId } from './block-registry-types.js'
import type { BlockRegistryEntry } from './block-registry-types.js'
import { DEFAULT_BLOCK_DROP } from './block-harvest-data.js'
import { NEEDS_ANY_SUPPORT } from './block-support-data.js'
import { DROPS_NOTHING, NEEDS_WOODEN_PICKAXE, FASTER_WITH_AXE } from './block-registry-rules.js'

export const BLOCK_REGISTRY_STRUCTURES_AND_NETHER: ReadonlyArray<BlockRegistryEntry> = [
  // ---------------------------------------------------------------------------
  // ids 103-119: crafted blocks, furniture, and the Nether
  // ---------------------------------------------------------------------------
  //
  // The remainder, and the group with the most `flammable` in it:
  // `FLAMMABLE_BLOCK_TYPES` (`fire-lifecycle.ts:19-30`) has eleven members and
  // seven of them land here — `crafting_table`, `chest`, `door`, `door_open`,
  // `oak_stairs`, `bed`, `tnt` — completing that closed table (the other four,
  // `oak_log`, `oak_leaves`, `oak_planks` and `ladder`, were already in place).
  //
  // `netherrack` is a `fireSource`, which until now only `lava` was.
  // `isFireSourceIndex` (`fire-lifecycle.ts:80-81`) is exactly those two, so the
  // capability finally has the pair that shows it is not a synonym for
  // `flammable`: netherrack sustains a fire without itself burning away.
  //
  // THREE ROWS GET NO ITEM FORM, and the reason is kernel's own judgement rather
  // than a transcription — say so plainly. `fire`, `nether_portal` and (in the
  // End group) `end_portal` are world STATE: created by a rule, never carried,
  // never placed from a hotbar. The reference cannot express that, because its
  // `InventoryItem` is the UNION of block and item names, so it hands an item
  // form to `AIR` as well. Kernel already rejected that union for `air`
  // (audit §6-6) and for the fluids; these three are the same argument applied
  // to the same kind of thing. They surface in `UNITEMISED_BLOCK_TYPES`, where a
  // reviewer can disagree with the decision, rather than in silence.
  //
  // `door`/`door_open` and `cauldron`/`water_cauldron` are the two state pairs.
  // `INVENTORY_DROP_OVERRIDES` maps the second of each to the first, so both
  // pairs drop the item you can actually hold, and neither `door_open` nor
  // `water_cauldron` has an item of its own.
  //
  // `fire` is worth one more line. It is not in `FLAMMABLE_BLOCK_TYPES` — fire
  // does not catch fire — and not in `isFireSourceIndex` either, which is the
  // reference distinguishing "the thing that burns" from "the thing that keeps
  // burning" from "the burning itself". Three concepts, three answers, one row
  // that says `false` to two flags it looks like it should say `true` to.
  {
    id: BlockId(103),
    definition: {
      type: 'crafting_table',
      capabilities: { flammable: true },
      properties: { hardness: 40, footstepMaterial: 'wood', harvestTool: FASTER_WITH_AXE },
    },
  },
  {
    id: BlockId(104),
    definition: { type: 'furnace', properties: { hardness: 55, friction: 0.8, footstepMaterial: 'stone' } },
  },
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
      properties: {
        opacity: 'transparentSolid',
        hardness: 15,
        footstepMaterial: 'wood',
        drops: { ...DEFAULT_BLOCK_DROP, item: 'door' },
      },
    },
  },
  {
    id: BlockId(108),
    definition: {
      type: 'oak_stairs',
      capabilities: { flammable: true, suffocates: false },
      properties: { opacity: 'transparentSolid', hardness: 35, footstepMaterial: 'wood' },
    },
  },
  {
    id: BlockId(109),
    definition: {
      type: 'anvil',
      properties: { hardness: 75, footstepMaterial: 'stone', harvestTool: NEEDS_WOODEN_PICKAXE },
    },
  },
  {
    id: BlockId(110),
    definition: {
      type: 'cauldron',
      properties: { hardness: 35, footstepMaterial: 'stone', harvestTool: NEEDS_WOODEN_PICKAXE },
    },
  },
  {
    id: BlockId(111),
    definition: {
      type: 'water_cauldron',
      properties: {
        hardness: 35,
        footstepMaterial: 'stone',
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
      properties: { opacity: 'transparentSolid', hardness: 10, footstepMaterial: 'wood' },
    },
  },
  {
    id: BlockId(113),
    definition: {
      type: 'enchanting_table',
      capabilities: { suffocates: false },
      properties: { hardness: 30, footstepMaterial: 'stone' },
    },
  },
  {
    id: BlockId(114),
    definition: {
      type: 'brewing_stand',
      properties: { opacity: 'transparentSolid', hardness: 15, footstepMaterial: 'stone' },
    },
  },
  {
    id: BlockId(115),
    definition: {
      type: 'tnt',
      capabilities: { flammable: true },
      properties: { hardness: 0, footstepMaterial: 'wood' },
    },
  },
  {
    id: BlockId(116),
    definition: { type: 'nether_brick', properties: { hardness: 40, footstepMaterial: 'stone' } },
  },
  {
    id: BlockId(117),
    definition: {
      type: 'netherrack',
      capabilities: { fireSource: true },
      properties: { hardness: 5, footstepMaterial: 'stone' },
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
        collisionShape: 'none',
        // Fire is the third of the three world-state rows. It is also the row
        // that says `flammable: false` and `fireSource: false` by saying nothing
        // — fire neither catches fire (`FLAMMABLE_BLOCK_TYPES` omits it) nor
        // sustains one (`isFireSourceIndex` is NETHERRACK and LAVA only).
        drops: DROPS_NOTHING,
      },
    },
  },
  { id: BlockId(120), definition: { type: 'soul_soil', properties: { hardness: 5, footstepMaterial: 'grass' } } },
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
  { id: BlockId(122), definition: { type: 'dropper', properties: { hardness: 60, footstepMaterial: 'stone' } } },
]
