/** Registry entries 36-49; the numeric order is the wire-level BlockId order. */
import { BlockId } from './block-registry-types.js'
import type { BlockRegistryEntry } from './block-registry-types.js'
import { StackCount } from './quantities.js'
import { DEFAULT_BLOCK_DROP } from './block-harvest-data.js'
import { DROPS_NOTHING, NEEDS_WOODEN_PICKAXE, NEEDS_DIAMOND_PICKAXE, FASTER_WITH_SHOVEL } from './block-registry-rules.js'

export const BLOCK_REGISTRY_TERRAIN: ReadonlyArray<BlockRegistryEntry> = [
  // ---------------------------------------------------------------------------
  // ids 36-49: terrain and mineral stone (`blocks.config.terrain.ts`)
  // ---------------------------------------------------------------------------
  //
  // The plainest group in the table, and useful precisely for that: fourteen
  // rows whose only overrides are `hardness` and `friction`, which is what a
  // table of differences looks like when a block really is an ordinary opaque
  // solid cube that happens to be hard. None of them appears in ANY of the six
  // membership tables (`PASSABLE_BLOCK_IDS`, `NON_SUFFOCATING_BLOCKS`,
  // `NON_SUPPORTING_BLOCK_TYPES`, `NON_SPAWN_SURFACE_BLOCK_IDS`,
  // `FLAMMABLE_BLOCK_TYPES`, `WATER_BREAKABLE_BLOCK_TYPES`), so every capability
  // resolves to its default and that ABSENCE is the citation.
  //
  // Three rows do have something to say:
  //
  //   `obsidian` is the sole member of the diamond tier (`harvestable-blocks.ts:53-56`).
  //   `ice` drops nothing: `NO_BASE_DROP_BLOCK_TYPES` (`block-service.config.ts:199`)
  //     contains ICE and nothing else, which is what `blockDropsBaseItem` reads.
  //     It is therefore the only block in the roster whose drop is refused by
  //     name rather than by a tool gate or a silk-touch gate.
  //   `farmland` yields `dirt`, not itself, so it gets NO item form — see the
  //     rule at the top of the `ITEM_TYPES` additions.
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
]
