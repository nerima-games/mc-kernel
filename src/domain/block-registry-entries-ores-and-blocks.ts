/** Registry entries 50-70; the numeric order is the wire-level BlockId order. */
import { BlockId } from './block-registry-types.js'
import type { BlockRegistryEntry } from './block-registry-types.js'
import { StackCount } from './quantities.js'
import { DEFAULT_BLOCK_DROP } from './block-harvest.js'
import { NEEDS_WOODEN_PICKAXE, NEEDS_STONE_PICKAXE, NEEDS_IRON_PICKAXE } from './block-registry-rules.js'

export const BLOCK_REGISTRY_ORES_AND_BLOCKS: ReadonlyArray<BlockRegistryEntry> = [
  {
    id: BlockId(50),
    definition: {
      type: 'coal_ore',
      properties: {
        hardness: 50,
        friction: 0.8,
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
  { id: BlockId(64), definition: { type: 'coal_block', properties: { hardness: 65, friction: 0.8 } } },
  { id: BlockId(65), definition: { type: 'iron_block', properties: { hardness: 65, friction: 0.8 } } },
  { id: BlockId(66), definition: { type: 'gold_block', properties: { hardness: 50, friction: 0.8 } } },
  { id: BlockId(67), definition: { type: 'diamond_block', properties: { hardness: 65, friction: 0.8 } } },
  {
    id: BlockId(68),
    definition: {
      type: 'redstone_block',
      properties: { lightEmission: 15, hardness: 65, friction: 0.8 },
    },
  },
  { id: BlockId(69), definition: { type: 'lapis_block', properties: { hardness: 50, friction: 0.8 } } },
  { id: BlockId(70), definition: { type: 'emerald_block', properties: { hardness: 65, friction: 0.8 } } },

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
]
