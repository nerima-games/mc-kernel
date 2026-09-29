/** Registry entries 71-85; the numeric order is the wire-level BlockId order. */
import { BlockId } from './block-registry-types.js'
import type { BlockRegistryEntry } from './block-registry-types.js'
import { DEFAULT_BLOCK_DROP } from './block-harvest-data.js'
import { NEEDS_ANY_SUPPORT } from './block-support-data.js'
import { DROPS_NOTHING, NEEDS_FARMLAND, NEEDS_SOUL_SAND } from './block-registry-rules.js'

export const BLOCK_REGISTRY_CROPS_AND_REDSTONE: ReadonlyArray<BlockRegistryEntry> = [
  // ---------------------------------------------------------------------------
  // ids 71-73: crops (`CROP_BLOCK_TYPES`, `block-support.ts:20`)
  // ---------------------------------------------------------------------------
  //
  // READ THE `suffocates` COLUMN BEFORE COPYING THESE ROWS. The three crops are
  // ONE set everywhere in `block-support.ts` and are treated identically by every
  // rule there — and `NON_SUFFOCATING_BLOCKS` splits them:
  //
  //   WHEAT_CROP        listed (`environment-hazard.config.ts:48`)
  //   NETHER_WART_CROP  listed (:49)
  //   POTATO_CROP       *** NOT LISTED ***
  //
  // So the reference suffocates a player standing inside a potato and not inside
  // wheat. This row TRANSCRIBES that, and does not infer the missing entry, for
  // the reason the `PASSABLE_BLOCK_IDS` group above already gives: audit §4.7
  // licenses inferring `suffocates: false` from `passable: true`, and CROPS ARE
  // NOT PASSABLE — none of the three is in `PASSABLE_BLOCK_IDS`, so a crop is a
  // solid full cube for collision and the implication does not apply. There is
  // no rule that lets kernel fill this in, only a hunch, and a hunch that
  // silently makes three rows agree is how a table stops being a transcription.
  //
  // This is a NEW instance of the disagreement audit §4.9 measured, and it is
  // the sharpest one yet: the other cases disagree between tables about blocks
  // that differ, whereas this splits a set the source itself defines as a set.
  //
  // `supportRule` is what these rows actually wanted, and they have it. Wheat
  // and potatoes require farmland; nether wart requires soul sand.
  {
    id: BlockId(71),
    definition: {
      type: 'wheat_crop',
      capabilities: {
        brokenByWaterFlow: true,
        suffocates: false,
        canSupportAttachments: false,
        validSpawnSurface: false,
      },
      properties: {
        opacity: 'transparentSolid',
        hardness: 0,
        friction: 0,
        footstepMaterial: 'grass',
        drops: { ...DEFAULT_BLOCK_DROP, item: 'wheat_seeds' },
        supportRule: NEEDS_FARMLAND,
      },
    },
  },
  {
    id: BlockId(72),
    definition: {
      type: 'potato_crop',
      capabilities: { brokenByWaterFlow: true, canSupportAttachments: false, validSpawnSurface: false },
      properties: {
        opacity: 'transparentSolid',
        hardness: 0,
        friction: 0,
        footstepMaterial: 'grass',
        drops: { ...DEFAULT_BLOCK_DROP, item: 'potato' },
        supportRule: NEEDS_FARMLAND,
      },
    },
  },
  {
    id: BlockId(73),
    definition: {
      type: 'nether_wart_crop',
      capabilities: {
        brokenByWaterFlow: true,
        suffocates: false,
        canSupportAttachments: false,
        validSpawnSurface: false,
      },
      properties: {
        opacity: 'transparentSolid',
        hardness: 0,
        friction: 0,
        footstepMaterial: 'grass',
        drops: { ...DEFAULT_BLOCK_DROP, item: 'nether_wart' },
        supportRule: NEEDS_SOUL_SAND,
      },
    },
  },

  // ---------------------------------------------------------------------------
  // ids 74-85: redstone components (`blocks.config.crafted.ts`)
  // ---------------------------------------------------------------------------
  //
  // VOCABULARY AND ORDINARY CAPABILITIES ONLY. Audit §6-7 assigns
  // `REDSTONE_CLEANUP_BLOCK_TYPES` and every propagation rule to mx-redstone,
  // and nothing here encodes power, signal strength or scheduling. The line is
  // easy to state and worth stating: a block's LIGHT is a property of the block
  // (`redstone_lamp_lit` emits 15), whereas what makes a lamp become lit is a
  // rule, and rules are not in this file.
  //
  // Four of these are in `SUPPORT_SENSITIVE_BLOCK_TYPES` / `WATER_BREAKABLE`
  // (`block-support.ts:22-45`): `redstone_wire`, `redstone_torch`, and — already
  // in the table — `torch`, `pressure_plate`, `rail`, `powered_rail`. The rest
  // are ordinary blocks that happen to be redstone-flavoured.
  //
  // `piston_head` is the extended arm, is in `NEVER_DROPPED_BLOCK_TYPES`
  // (`interaction-break-handler.shared.ts:9`, with AIR / WATER / LAVA), and is
  // the only NON-fluid member of that set. It gets no item form.
  //
  // NOTE the `collisionShape` of this group. `redstone_wire`, `lever`,
  // `stone_button` and `repeater` are `solid: false` in `blocks.config.crafted.ts`
  // and yet are NOT in `PASSABLE_BLOCK_IDS`, so `getBlockCollisionShapeAt`
  // (`block-collision-predicates.ts:135-141`) returns a FULL block hull for all
  // four. `full` is therefore transcribed. Audit §7 already established that
  // `properties.solid` is read nowhere in the reference (`rg '\.solid\b'` -> 0
  // production hits) and kernel rejected the field for that reason; this group is
  // where that decision pays, because believing `solid: false` here would have
  // let the player walk through a wall of repeaters.
  {
    id: BlockId(74),
    definition: {
      type: 'redstone_wire',
      capabilities: {
        brokenByWaterFlow: true,
        suffocates: false,
        canSupportAttachments: false,
        validSpawnSurface: false,
      },
      properties: {
        opacity: 'transparentSolid',
        hardness: 0,
        friction: 0,
        footstepMaterial: 'stone',
        drops: { ...DEFAULT_BLOCK_DROP, item: 'redstone_dust' },
        supportRule: NEEDS_ANY_SUPPORT, // block-support.ts:25, no entry at :75-89
      },
    },
  },
  {
    id: BlockId(75),
    definition: {
      type: 'redstone_torch',
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
        supportRule: NEEDS_ANY_SUPPORT, // block-support.ts:24, no entry at :75-89
      },
    },
  },
  {
    id: BlockId(76),
    definition: {
      type: 'lever',
      capabilities: { suffocates: false, validSpawnSurface: false },
      properties: { opacity: 'transparentSolid', hardness: 5, footstepMaterial: 'stone' },
    },
  },
  {
    id: BlockId(77),
    definition: {
      type: 'stone_button',
      capabilities: { suffocates: false, validSpawnSurface: false },
      properties: { opacity: 'transparentSolid', hardness: 5, footstepMaterial: 'stone' },
    },
  },
  {
    id: BlockId(78),
    definition: {
      type: 'repeater',
      capabilities: { suffocates: false, validSpawnSurface: false },
      properties: { opacity: 'transparentSolid', hardness: 35, footstepMaterial: 'stone' },
    },
  },
  { id: BlockId(79), definition: { type: 'redstone_lamp', properties: { hardness: 10, footstepMaterial: 'stone' } } },
  {
    id: BlockId(80),
    definition: {
      type: 'redstone_lamp_lit',
      properties: {
        lightEmission: 15,
        hardness: 10,
        footstepMaterial: 'stone',
        drops: { ...DEFAULT_BLOCK_DROP, item: 'redstone_lamp' },
      },
    },
  },
  { id: BlockId(81), definition: { type: 'observer', properties: { hardness: 55, footstepMaterial: 'stone' } } },
  { id: BlockId(82), definition: { type: 'comparator', properties: { hardness: 5, footstepMaterial: 'stone' } } },
  { id: BlockId(83), definition: { type: 'dispenser', properties: { hardness: 60, footstepMaterial: 'stone' } } },
  { id: BlockId(84), definition: { type: 'hopper', properties: { hardness: 55, footstepMaterial: 'stone' } } },
  {
    id: BlockId(85),
    definition: { type: 'piston_head', properties: { hardness: 1, footstepMaterial: 'stone', drops: DROPS_NOTHING } },
  },
]
