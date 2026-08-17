/** Registry entries 86-102; the numeric order is the wire-level BlockId order. */
import { BlockId } from './block-registry-types.js'
import type { BlockRegistryEntry } from './block-registry-types.js'
import { DROPS_NOTHING } from './block-registry-rules.js'

export const BLOCK_REGISTRY_END: ReadonlyArray<BlockRegistryEntry> = [
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
]
