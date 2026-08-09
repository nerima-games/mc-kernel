/** Registry entries 87-102; the numeric order is the wire-level BlockId order. */
import { BlockId } from './block-registry-types.js'
import type { BlockRegistryEntry } from './block-registry-types.js'
import { DROPS_NOTHING } from './block-registry-rules.js'

export const BLOCK_REGISTRY_END: ReadonlyArray<BlockRegistryEntry> = [
  {
    id: BlockId(87),
    definition: {
      type: 'end_portal_frame',
      capabilities: { suffocates: false },
      properties: { lightEmission: 1, hardness: 9000 },
    },
  },
  {
    id: BlockId(88),
    definition: {
      type: 'end_portal_frame_filled',
      capabilities: { suffocates: false },
      properties: { lightEmission: 3, hardness: 9000 },
    },
  },
  {
    id: BlockId(89),
    definition: {
      type: 'end_portal',
      capabilities: { suffocates: false, validSpawnSurface: false },
      properties: {
        opacity: 'transparentSolid',
        lightEmission: 15,
        hardness: 0,
        friction: 0,
        // See `nether_portal`: world state, never carried, and the "nothing" is
        // written down rather than arrived at by having no item form.
        drops: DROPS_NOTHING,
      },
    },
  },
  {
    id: BlockId(90),
    definition: {
      type: 'chorus_flower',
      capabilities: { suffocates: false, validSpawnSurface: false },
      properties: { opacity: 'transparentSolid', hardness: 0.4, friction: 0 },
    },
  },
  {
    id: BlockId(91),
    definition: {
      type: 'chorus_plant',
      capabilities: { suffocates: false, validSpawnSurface: false },
      properties: { opacity: 'transparentSolid', hardness: 0.4, friction: 0 },
    },
  },
  {
    id: BlockId(92),
    definition: {
      type: 'dragon_egg',
      capabilities: { suffocates: false },
      properties: { opacity: 'transparentSolid', hardness: 3 },
    },
  },
  {
    id: BlockId(93),
    definition: {
      type: 'end_crystal',
      capabilities: { suffocates: false, validSpawnSurface: false },
      properties: { opacity: 'transparentSolid', hardness: 0, friction: 0 },
    },
  },
  {
    id: BlockId(94),
    definition: {
      type: 'end_gateway',
      capabilities: { suffocates: false, validSpawnSurface: false },
      properties: { opacity: 'transparentSolid', lightEmission: 15, hardness: 0, friction: 0, drops: DROPS_NOTHING },
    },
  },
  {
    id: BlockId(95),
    definition: {
      type: 'end_rod',
      capabilities: { suffocates: false, validSpawnSurface: false },
      properties: { opacity: 'transparentSolid', lightEmission: 15, hardness: 0, friction: 0 },
    },
  },
  { id: BlockId(96), definition: { type: 'end_stone_bricks', properties: { hardness: 45, footstepMaterial: 'stone' } } },
  {
    id: BlockId(97),
    definition: {
      type: 'ender_chest',
      capabilities: { suffocates: false },
      properties: { lightEmission: 15, hardness: 22.5 },
    },
  },
  { id: BlockId(98), definition: { type: 'purpur_block', properties: { hardness: 1.5 } } },
  { id: BlockId(99), definition: { type: 'purpur_pillar', properties: { hardness: 1.5 } } },
  {
    id: BlockId(100),
    definition: {
      type: 'purpur_slab',
      capabilities: { suffocates: false },
      properties: { opacity: 'transparentSolid', collisionShape: 'slab', hardness: 1.5 },
    },
  },
  {
    id: BlockId(101),
    definition: {
      type: 'purpur_stairs',
      capabilities: { suffocates: false },
      properties: { opacity: 'transparentSolid', hardness: 1.5 },
    },
  },
  {
    id: BlockId(102),
    definition: {
      type: 'shulker_box',
      capabilities: { suffocates: false },
      properties: { hardness: 2 },
    },
  },

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
]
