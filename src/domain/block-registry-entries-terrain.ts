/** Registry entries 36-49; the numeric order is the wire-level BlockId order. */
import { BlockId } from './block-registry-types.js'
import type { BlockRegistryEntry } from './block-registry-types.js'
import { StackCount } from './quantities.js'
import { DEFAULT_BLOCK_DROP } from './block-harvest.js'
import { DROPS_NOTHING, NEEDS_WOODEN_PICKAXE, NEEDS_DIAMOND_PICKAXE, FASTER_WITH_SHOVEL } from './block-registry-rules.js'

export const BLOCK_REGISTRY_TERRAIN: ReadonlyArray<BlockRegistryEntry> = [
  { id: BlockId(36), definition: { type: 'granite', properties: { hardness: 25, friction: 0.8 } } },
  { id: BlockId(37), definition: { type: 'diorite', properties: { hardness: 25, friction: 0.8 } } },
  { id: BlockId(38), definition: { type: 'andesite', properties: { hardness: 25, friction: 0.8 } } },
  { id: BlockId(39), definition: { type: 'deepslate', properties: { hardness: 50, friction: 0.8 } } },
  {
    id: BlockId(40),
    definition: {
      type: 'obsidian',
      properties: { hardness: 90, friction: 0.8, harvestTool: NEEDS_DIAMOND_PICKAXE },
    },
  },
  {
    id: BlockId(41),
    definition: {
      type: 'smooth_basalt',
      properties: { hardness: 30, friction: 0.8, harvestTool: NEEDS_WOODEN_PICKAXE },
    },
  },
  {
    id: BlockId(42),
    definition: {
      type: 'calcite',
      properties: { hardness: 20, friction: 0.8, harvestTool: NEEDS_WOODEN_PICKAXE },
    },
  },
  {
    id: BlockId(43),
    definition: {
      type: 'amethyst_block',
      properties: { hardness: 30, friction: 0.8, harvestTool: NEEDS_WOODEN_PICKAXE },
    },
  },
  {
    id: BlockId(44),
    definition: {
      type: 'amethyst_cluster',
      properties: {
        lightEmission: 15,
        hardness: 15,
        friction: 0.8,
        harvestTool: NEEDS_WOODEN_PICKAXE,
        drops: { ...DEFAULT_BLOCK_DROP, item: 'amethyst_shard', count: StackCount(4) },
      },
    },
  },
  { id: BlockId(45), definition: { type: 'sandstone', properties: { hardness: 10 } } },
  { id: BlockId(46), definition: { type: 'prismarine', properties: { hardness: 25, friction: 0.8 } } },
  { id: BlockId(47), definition: { type: 'soul_sand', properties: { friction: 0.5 } } },
  {
    id: BlockId(48),
    definition: {
      type: 'ice',
      properties: { opacity: 'transparentSolid', hardness: 3, friction: 0.98, drops: DROPS_NOTHING },
    },
  },
  {
    id: BlockId(49),
    definition: {
      type: 'farmland',
      capabilities: { suffocates: false },
      properties: {
        harvestTool: FASTER_WITH_SHOVEL,
        drops: { ...DEFAULT_BLOCK_DROP, item: 'dirt' },
        footstepMaterial: 'grass',
      },
    },
  },

  // ---------------------------------------------------------------------------
  // ids 50-63: ores (`blocks.config.ores.ts`, `harvestable-blocks.ts`)
  // ---------------------------------------------------------------------------
  //
  // Fourteen rows in seven stone/deepslate pairs, and the group that finally
  // makes four separate capabilities carry different information at once.
  //
  //   `harvestTool.minTier`  the reference's four-stage union ladder. Coal is
  //     wooden; iron and lapis are stone; gold, redstone, diamond and emerald
  //     are iron. Deepslate variants sit at the SAME tier as their stone twins —
  //     the ladder pairs them explicitly — so deepslate is harder (60 vs 50) but
  //     not gated higher. Two axes, one of which moves and one of which does not.
  //
  //   `drops.item`   `INVENTORY_DROP_OVERRIDES`. Not one ore drops itself, and
  //     iron and gold drop RAW ore rather than an ingot.
  //
  //   `xpOnBreak`    `ORE_XP_TABLE` (`blocks.config.ores.ts:29-37`). Coal 5,
  //     lapis 5, redstone 5, diamond 7, emerald 7 — and IRON AND GOLD ZERO,
  //     with the reference's reason written at :8-10: they drop raw ore and the
  //     experience is paid at the furnace. A row here that quietly gave iron ore
  //     5 would be indistinguishable from a typo and would pay the player twice.
  //
  //   `drops.count`  `BLOCK_BASE_DROP_COUNT` (:204-215) gives redstone and lapis
  //     4 and everything else 1. The reference's note explains the choice: vanilla
  //     rolls 4-5 and 4-9, and it takes the deterministic MINIMUM so that breaking
  //     a block stays replayable. Kernel needs that property even more than the
  //     reference does — `StageRegistration.run` has no source of randomness.
  //
  //   `affectedByFortune`  `FORTUNE_ORE_BLOCKS` (:270-276), which holds ten of
  //     the fourteen. IRON AND GOLD ORE ARE ABSENT, and that is not the same set
  //     as "the ores with zero XP" even though it happens to contain the same
  //     four. Transcribed as two independent facts, because they are two lists.
  //
  // `redstone_ore` and `deepslate_redstone_ore` also emit light: 9, from
  // `EMISSIVE_LEVEL_OVERRIDES` (`light.ts:24-35`). Nine, not fifteen — an ore
  // that glows dimly is exactly the case a boolean `emissive` could not express.
]
