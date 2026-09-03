/** Registry entries 50-70; the numeric order is the wire-level BlockId order. */
import { BlockId } from './block-registry-types.js'
import type { BlockRegistryEntry } from './block-registry-types.js'
import { StackCount } from './quantities.js'
import { DEFAULT_BLOCK_DROP } from './block-harvest-data.js'
import { NEEDS_WOODEN_PICKAXE, NEEDS_STONE_PICKAXE, NEEDS_IRON_PICKAXE } from './block-registry-rules.js'

export const BLOCK_REGISTRY_ORES_AND_BLOCKS: ReadonlyArray<BlockRegistryEntry> = [
  // ---------------------------------------------------------------------------
  // ids 50-63: ores (`blocks.config.ores.ts`, `harvestable-blocks.ts`)
  // ---------------------------------------------------------------------------
  //
  // Fourteen rows in seven stone/deepslate pairs, and the group that finally
  // makes four separate capabilities carry different information at once.
  //
  //   `harvestTool.minTier`  the reference's four-stage union ladder, extended
  //     by the kernel with Java Edition's netherite tier. Coal is
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
  {
    id: BlockId(50),
    definition: {
      type: 'coal_ore',
      properties: {
        hardness: 50,
        friction: 0.8,
        footstepMaterial: 'stone',
        xpOnBreak: 5,
        harvestTool: NEEDS_WOODEN_PICKAXE,
        drops: { ...DEFAULT_BLOCK_DROP, item: 'coal', silkTouchItem: 'coal_ore', affectedByFortune: true },
      },
    },
  },
  {
    id: BlockId(51),
    definition: {
      type: 'iron_ore',
      properties: {
        hardness: 50,
        friction: 0.8,
        footstepMaterial: 'stone',
        harvestTool: NEEDS_STONE_PICKAXE,
        drops: { ...DEFAULT_BLOCK_DROP, item: 'raw_iron', silkTouchItem: 'iron_ore' },
      },
    },
  },
  {
    id: BlockId(52),
    definition: {
      type: 'gold_ore',
      properties: {
        hardness: 50,
        friction: 0.8,
        footstepMaterial: 'stone',
        harvestTool: NEEDS_IRON_PICKAXE,
        drops: { ...DEFAULT_BLOCK_DROP, item: 'raw_gold', silkTouchItem: 'gold_ore' },
      },
    },
  },
  {
    id: BlockId(53),
    definition: {
      type: 'diamond_ore',
      properties: {
        hardness: 50,
        friction: 0.8,
        footstepMaterial: 'stone',
        xpOnBreak: 7,
        harvestTool: NEEDS_IRON_PICKAXE,
        drops: { ...DEFAULT_BLOCK_DROP, item: 'diamond', silkTouchItem: 'diamond_ore', affectedByFortune: true },
      },
    },
  },
  {
    id: BlockId(54),
    definition: {
      type: 'redstone_ore',
      properties: {
        lightEmission: 9,
        hardness: 50,
        friction: 0.8,
        footstepMaterial: 'stone',
        xpOnBreak: 5,
        harvestTool: NEEDS_IRON_PICKAXE,
        drops: {
          ...DEFAULT_BLOCK_DROP,
          item: 'redstone_dust',
          silkTouchItem: 'redstone_ore',
          count: StackCount(4),
          affectedByFortune: true,
        },
      },
    },
  },
  {
    id: BlockId(55),
    definition: {
      type: 'lapis_ore',
      properties: {
        hardness: 50,
        friction: 0.8,
        footstepMaterial: 'stone',
        xpOnBreak: 5,
        harvestTool: NEEDS_STONE_PICKAXE,
        drops: {
          ...DEFAULT_BLOCK_DROP,
          item: 'lapis_lazuli',
          silkTouchItem: 'lapis_ore',
          count: StackCount(4),
          affectedByFortune: true,
        },
      },
    },
  },
  {
    id: BlockId(56),
    definition: {
      type: 'emerald_ore',
      properties: {
        hardness: 50,
        friction: 0.8,
        footstepMaterial: 'stone',
        xpOnBreak: 7,
        harvestTool: NEEDS_IRON_PICKAXE,
        drops: { ...DEFAULT_BLOCK_DROP, item: 'emerald', silkTouchItem: 'emerald_ore', affectedByFortune: true },
      },
    },
  },
  {
    id: BlockId(57),
    definition: {
      type: 'deepslate_coal_ore',
      properties: {
        hardness: 60,
        friction: 0.8,
        footstepMaterial: 'stone',
        xpOnBreak: 5,
        harvestTool: NEEDS_WOODEN_PICKAXE,
        drops: { ...DEFAULT_BLOCK_DROP, item: 'coal', silkTouchItem: 'deepslate_coal_ore', affectedByFortune: true },
      },
    },
  },
  {
    id: BlockId(58),
    definition: {
      type: 'deepslate_iron_ore',
      properties: {
        hardness: 60,
        friction: 0.8,
        footstepMaterial: 'stone',
        harvestTool: NEEDS_STONE_PICKAXE,
        drops: { ...DEFAULT_BLOCK_DROP, item: 'raw_iron', silkTouchItem: 'deepslate_iron_ore' },
      },
    },
  },
  {
    id: BlockId(59),
    definition: {
      type: 'deepslate_gold_ore',
      properties: {
        hardness: 60,
        friction: 0.8,
        footstepMaterial: 'stone',
        harvestTool: NEEDS_IRON_PICKAXE,
        drops: { ...DEFAULT_BLOCK_DROP, item: 'raw_gold', silkTouchItem: 'deepslate_gold_ore' },
      },
    },
  },
  {
    id: BlockId(60),
    definition: {
      type: 'deepslate_diamond_ore',
      properties: {
        hardness: 60,
        friction: 0.8,
        footstepMaterial: 'stone',
        xpOnBreak: 7,
        harvestTool: NEEDS_IRON_PICKAXE,
        drops: {
          ...DEFAULT_BLOCK_DROP,
          item: 'diamond',
          silkTouchItem: 'deepslate_diamond_ore',
          affectedByFortune: true,
        },
      },
    },
  },
  {
    id: BlockId(61),
    definition: {
      type: 'deepslate_redstone_ore',
      properties: {
        lightEmission: 9,
        hardness: 60,
        friction: 0.8,
        footstepMaterial: 'stone',
        xpOnBreak: 5,
        harvestTool: NEEDS_IRON_PICKAXE,
        drops: {
          ...DEFAULT_BLOCK_DROP,
          item: 'redstone_dust',
          silkTouchItem: 'deepslate_redstone_ore',
          count: StackCount(4),
          affectedByFortune: true,
        },
      },
    },
  },
  {
    id: BlockId(62),
    definition: {
      type: 'deepslate_lapis_ore',
      properties: {
        hardness: 60,
        friction: 0.8,
        footstepMaterial: 'stone',
        xpOnBreak: 5,
        harvestTool: NEEDS_STONE_PICKAXE,
        drops: {
          ...DEFAULT_BLOCK_DROP,
          item: 'lapis_lazuli',
          silkTouchItem: 'deepslate_lapis_ore',
          count: StackCount(4),
          affectedByFortune: true,
        },
      },
    },
  },
  {
    id: BlockId(63),
    definition: {
      type: 'deepslate_emerald_ore',
      properties: {
        hardness: 60,
        friction: 0.8,
        footstepMaterial: 'stone',
        xpOnBreak: 7,
        harvestTool: NEEDS_IRON_PICKAXE,
        drops: {
          ...DEFAULT_BLOCK_DROP,
          item: 'emerald',
          silkTouchItem: 'deepslate_emerald_ore',
          affectedByFortune: true,
        },
      },
    },
  },

  // ---------------------------------------------------------------------------
  // ids 64-70: the mineral blocks (`blocks.config.ores.ts`)
  // ---------------------------------------------------------------------------
  //
  // Storage blocks, and — unlike the ores they are crafted from — NOT tool-gated
  // anywhere in `harvestable-blocks.ts`. That reads oddly beside `stone`
  // requiring a pickaxe, and it is transcribed rather than repaired: the sets in
  // that file are the only statement the reference makes about tier gating, and
  // inventing a gate for seven blocks would be inventing content.
  //
  // `redstone_block` emits light 15 (`EMISSIVE_LEVEL_OVERRIDES`, `light.ts:27`),
  // which makes it the third distinct emission level in the roster after
  // `torch` 14 and `redstone_ore` 9.
  {
    id: BlockId(64),
    definition: { type: 'coal_block', properties: { hardness: 65, friction: 0.8, footstepMaterial: 'stone' } },
  },
  {
    id: BlockId(65),
    definition: { type: 'iron_block', properties: { hardness: 65, friction: 0.8, footstepMaterial: 'stone' } },
  },
  {
    id: BlockId(66),
    definition: { type: 'gold_block', properties: { hardness: 50, friction: 0.8, footstepMaterial: 'stone' } },
  },
  {
    id: BlockId(67),
    definition: { type: 'diamond_block', properties: { hardness: 65, friction: 0.8, footstepMaterial: 'stone' } },
  },
  {
    id: BlockId(68),
    definition: {
      type: 'redstone_block',
      properties: { lightEmission: 15, hardness: 65, friction: 0.8, footstepMaterial: 'stone' },
    },
  },
  {
    id: BlockId(69),
    definition: { type: 'lapis_block', properties: { hardness: 50, friction: 0.8, footstepMaterial: 'stone' } },
  },
  {
    id: BlockId(70),
    definition: { type: 'emerald_block', properties: { hardness: 65, friction: 0.8, footstepMaterial: 'stone' } },
  },
]
