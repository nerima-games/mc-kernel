/** Registry entries 71-86; the numeric order is the wire-level BlockId order. */
import { BlockId } from './block-registry-types.js'
import type { BlockRegistryEntry } from './block-registry-types.js'
import { DEFAULT_BLOCK_DROP } from './block-harvest.js'
import { NEEDS_ANY_SUPPORT } from './block-support.js'
import { DROPS_NOTHING, NEEDS_FARMLAND, NEEDS_SOUL_SAND } from './block-registry-rules.js'

export const BLOCK_REGISTRY_CROPS_AND_REDSTONE: ReadonlyArray<BlockRegistryEntry> = [
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
      properties: { opacity: 'transparentSolid', hardness: 5 },
    },
  },
  {
    id: BlockId(77),
    definition: {
      type: 'stone_button',
      capabilities: { suffocates: false, validSpawnSurface: false },
      properties: { opacity: 'transparentSolid', hardness: 5 },
    },
  },
  {
    id: BlockId(78),
    definition: {
      type: 'repeater',
      capabilities: { suffocates: false, validSpawnSurface: false },
      properties: { opacity: 'transparentSolid', hardness: 35 },
    },
  },
  { id: BlockId(79), definition: { type: 'redstone_lamp', properties: { hardness: 10 } } },
  {
    id: BlockId(80),
    definition: {
      type: 'redstone_lamp_lit',
      properties: { lightEmission: 15, hardness: 10, drops: { ...DEFAULT_BLOCK_DROP, item: 'redstone_lamp' } },
    },
  },
  { id: BlockId(81), definition: { type: 'observer', properties: { hardness: 55 } } },
  { id: BlockId(82), definition: { type: 'comparator', properties: { hardness: 5 } } },
  { id: BlockId(83), definition: { type: 'dispenser', properties: { hardness: 60 } } },
  { id: BlockId(84), definition: { type: 'hopper', properties: { hardness: 55 } } },
  { id: BlockId(85), definition: { type: 'piston_head', properties: { hardness: 1, drops: DROPS_NOTHING } } },

  // ---------------------------------------------------------------------------
  // ids 86-102: The End (`blocks.config.end.ts`)
  // ---------------------------------------------------------------------------
  //
  // THE HARDNESS VALUES IN THIS GROUP ARE ON A DIFFERENT SCALE FROM EVERY OTHER
  // GROUP, AND THAT IS THE REFERENCE'S DOING. `blocks.config.end.ts` builds its
  // rows through one helper and passes vanilla floats to it — `PURPUR_BLOCK` 1.5,
  // `SHULKER_BOX` 2, `DRAGON_EGG` 3, `ENDER_CHEST` 22.5, `CHORUS_FLOWER` 0.4 —
  // while `END_STONE_BRICKS` in the same array is 45, which is the 0-100 scale.
  // Twelve of thirteen on one scale, one on the other, in one file.
  //
  // Transcribed, not converted. The reference's own float-to-scale mapping is a
  // hand-made ordering (0.5->8, 1.5->25, 2.0->35, 3.0->50, 50->90), not a
  // formula, so "converting" would mean choosing numbers — content invented to
  // make a column look tidy. The visible consequence: purpur reads as SOFTER
  // than dirt. That is what the source says, it is recorded in audit §4.5.2, and
  // it is the reason `historical design audit` says this column may not be
  // compared across group boundaries.
  //
  // TWO VALUES ARE OUTSIDE THE DOCUMENTED 0-100 RANGE, in opposite directions:
  //
  //   `end_portal_frame` / `_filled` are 9000. The reference's spelling of
  //     "unbreakable", above `bedrock`'s 100. Kept verbatim: it is monotone with
  //     the rest of the column (bigger is harder), so it is comparable even
  //     though it is off the end of the stated range.
  //
  //   `end_gateway` is -1 in the reference, and that one is NOT kept. A negative
  //     hardness is not "very hard": `computeBreakTicks` (`break-speed.ts:29-31`)
  //     returns 0 for `hardness <= 0`, so -1 means INSTANT, which is the exact
  //     opposite of the intent and is a bug in the reference. This row says 0,
  //     which is behaviourally identical to -1 under that function and is inside
  //     the range the column claims. The bug is recorded rather than inherited,
  //     and `end_gateway` drops nothing anyway (`endBlockDrops` maps it to AIR).
  //
  // `purpur_slab` is the second member of `SLAB_BLOCK_IDS`
  // (`block-collision-predicates.ts:56-59`). `collisionShape: 'slab'` now has
  // the complete two-member set behind it that the reference has.
  //
  // Ten of the seventeen are in `NON_SUFFOCATING_BLOCKS` and seven of those are
  // also in `NON_SPAWN_SURFACE_BLOCK_IDS`, but the two sets are NOT nested here:
  // `dragon_egg`, `ender_chest`, `purpur_slab`, `purpur_stairs` and `shulker_box`
  // are non-suffocating and ARE valid spawn surfaces. Another five rows where
  // collapsing the two flags into one would change behaviour.
  { id: BlockId(86), definition: { type: 'end_stone', properties: { hardness: 45 } } },
]
