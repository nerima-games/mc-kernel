/**
 * Canonical block vocabulary. Keep this module data-only so consumers can
 * inspect the registry without loading validation logic.
 */

export const BLOCK_TYPES = [
  'air',
  'stone',
  // The drop of `stone`, and therefore not optional once `drops` carries real
  // Data: without it, `stone` would have to yield an item that no block in this
  // Build can be built back out of. Audit §6-3 already names COBBLESTONE
  // (`fluid-contact.ts:9-11`, flowing lava + water), so the literal is the
  // Reference's, not an invention.
  'cobblestone',
  'dirt',
  'grass_block',
  'sand',
  'gravel',
  'water',
  'lava',
  'oak_log',
  'oak_planks',
  'oak_leaves',
  'glass',
  'torch',
  'glowstone',
  'bedrock',
  'piston',
  'snow',

  // -------------------------------------------------------------------------
  // The reference's `PASSABLE_BLOCK_IDS`, completed.
  // -------------------------------------------------------------------------
  //
  // `block-collision-predicates.ts:22-42` is a CLOSED list of 19 ids, and it is
  // The table audit §4.1 calls "物理側の中心" — `isPassableBlockType` (:44),
  // `isBlockSolid` (:107), `isBlockSolidForMobPhysics` (:124) and
  // `getBlockCollisionShapeAt` (:135) all read it. Four of its members were
  // Already here (`air`, `water`, `lava`, `torch`); the fifteen below are the
  // Rest, so that one named reference table is now representable in full rather
  // Than sampled.
  //
  // A closed reference table is the right unit to import: a HALF-imported
  // Membership set is a set that disagrees with its source, which is the exact
  // Defect audit §4.9 measures five times over.
  'ladder',
  'cobweb',
  'sapling',
  'dandelion',
  'poppy',
  'brown_mushroom',
  'red_mushroom',
  'tall_grass',
  'fern',
  'sugar_cane',
  'lily_pad',
  'kelp',
  'seagrass',
  'rail',
  'powered_rail',

  // -------------------------------------------------------------------------
  // The three non-`full` collision shapes, so `COLLISION_SHAPES` is inhabited.
  // -------------------------------------------------------------------------
  //
  // `BLOCK_OPACITIES`, `RENDER_KINDS` and `COLLISION_SHAPES` were enumerated
  // From the audit before any block needed them, so `'slab'`, `'cactus'` and
  // `'pressurePlate'` were members no row in the table could produce. An enum
  // Member no data inhabits is a member nothing tests, and mc-physics is
  // Supposed to switch on exactly this value (`getBlockCollisionShapeAt`
  // :136-139 is a three-way branch).
  'cactus',
  'pressure_plate',
  'stone_slab',

  // ---------------------------------------------------------------------------
  // The remaining 84, completing the reference's roster.
  // ---------------------------------------------------------------------------
  //
  // Everything below arrived in ONE change, and the grouping is by the
  // Reference FILE that defines each block's properties rather than by theme.
  // That is deliberate: `blocks.config.{terrain,ores,crafted,end,flora}.ts` are
  // The tables that actually carry `hardness` / `friction` / `transparency` /
  // `emissive`, so a group here is a group whose values came out of one place
  // And can be re-checked against it in one read.
  //
  // Capabilities did NOT come from those files. Each flag was read out of the
  // Membership table that owns it (`PASSABLE_BLOCK_IDS`, `NON_SUFFOCATING_BLOCKS`,
  // `NON_SUPPORTING_BLOCK_TYPES`, `NON_SPAWN_SURFACE_BLOCK_IDS`,
  // `FLAMMABLE_BLOCK_TYPES`, `WATER_BREAKABLE_BLOCK_TYPES`), which is why the
  // Per-row citations in `./block-registry` point at six different files for
  // One row. Three of those tables are stored NEGATED, and the registry rows
  // Say so where it matters.

  // ---------------------------------------------------------------------------
  // Terrain and mineral stone (`blocks.config.terrain.ts`)
  // ---------------------------------------------------------------------------
  'granite',
  'diorite',
  'andesite',
  'deepslate',
  'obsidian',
  'smooth_basalt',
  'calcite',
  'amethyst_block',
  'amethyst_cluster',
  'sandstone',
  'prismarine',
  'soul_sand',
  'ice',
  'farmland',

  // ---------------------------------------------------------------------------
  // Ores, and the mineral blocks they craft into (`blocks.config.ores.ts`)
  // ---------------------------------------------------------------------------
  //
  // The stone/deepslate pairs are the reason `xpOnBreak` is a per-block number
  // Rather than a flag: `ORE_XP_TABLE` (`blocks.config.ores.ts:29-37`) gives
  // Coal 5, diamond 7, emerald 7, lapis 5, redstone 5 — and iron and gold ZERO,
  // Because they drop raw ore and the experience is paid at the furnace.
  // A boolean `givesXp` would have made iron ore indistinguishable from stone.
  'coal_ore',
  'iron_ore',
  'gold_ore',
  'diamond_ore',
  'redstone_ore',
  'lapis_ore',
  'emerald_ore',
  'deepslate_coal_ore',
  'deepslate_iron_ore',
  'deepslate_gold_ore',
  'deepslate_diamond_ore',
  'deepslate_redstone_ore',
  'deepslate_lapis_ore',
  'deepslate_emerald_ore',
  'coal_block',
  'iron_block',
  'gold_block',
  'diamond_block',
  'redstone_block',
  'lapis_block',
  'emerald_block',

  // ---------------------------------------------------------------------------
  // Crops (`blocks.config.terrain.ts`, `block-support.ts:20`)
  // ---------------------------------------------------------------------------
  //
  // These are the three members of `CROP_BLOCK_TYPES`, and they are here as a
  // Closed set even though `supportRule` — the capability that gives a crop its
  // "must stand on FARMLAND" rule — is now implemented in the registry. The set
  // Keeps support rules on a closed vocabulary; see `./block-definition`.
  'wheat_crop',
  'potato_crop',
  'nether_wart_crop',

  // ---------------------------------------------------------------------------
  // Redstone components (`blocks.config.crafted.ts`)
  // ---------------------------------------------------------------------------
  //
  // THE VOCABULARY IS KERNEL'S; THE RULES ARE NOT. Audit §6-7 puts
  // `REDSTONE_CLEANUP_BLOCK_TYPES` and every propagation rule in mx-redstone,
  // And none of that is here — no signal strength, no tick scheduling, no
  // Powered/unpowered transition. What is here is the block NAMES and their
  // Ordinary block capabilities, which mx-redstone cannot express for itself
  // Without forking `BlockType`.
  //
  // `redstone_lamp` and `redstone_lamp_lit` are TWO literals because the
  // Reference stores them as two (`INDEX_TO_BLOCK_TYPE` has both) and their
  // `lightEmission` differs (0 vs 15). Modelling "lit" as a capability instead
  // Would put mutable state in a table of constants.
  'redstone_wire',
  'redstone_torch',
  'lever',
  'stone_button',
  'repeater',
  'redstone_lamp',
  'redstone_lamp_lit',
  'observer',
  'comparator',
  'dispenser',
  'dropper',
  'hopper',
  'piston_head',

  // ---------------------------------------------------------------------------
  // The End (`blocks.config.end.ts`)
  // ---------------------------------------------------------------------------
  //
  // `purpur_slab` is the second member of `SLAB_BLOCK_IDS`
  // (`block-collision-predicates.ts:56-59`), which until now had one member in
  // Kernel and two in the reference. `collisionShape: 'slab'` is therefore a
  // Value with a closed two-member table behind it rather than a single case.
  //
  // READ `./block-registry` BEFORE TRUSTING THE `hardness` COLUMN HERE. This is
  // The one reference file whose hardness values are NOT on the 0-100 scale the
  // Other four use; the divergence is the reference's, is transcribed rather
  // Than silently converted, and is documented at the group in the registry and
  // In `historical design audit` §4.5.2.
  'end_stone',
  'end_portal_frame',
  'end_portal_frame_filled',
  'end_portal',
  'chorus_flower',
  'chorus_plant',
  'dragon_egg',
  'end_crystal',
  'end_gateway',
  'end_rod',
  'end_stone_bricks',
  'ender_chest',
  'purpur_block',
  'purpur_pillar',
  'purpur_slab',
  'purpur_stairs',
  'shulker_box',

  // ---------------------------------------------------------------------------
  // Crafted blocks, furniture, and the Nether (`blocks.config.crafted.ts`)
  // ---------------------------------------------------------------------------
  //
  // `door` / `door_open` and `cauldron` / `water_cauldron` are pairs for the
  // Same reason `redstone_lamp` is: the reference stores each state as its own
  // Storage index, and the two members of a pair differ in what they drop
  // (`INVENTORY_DROP_OVERRIDES` maps `DOOR_OPEN`->`DOOR` and
  // `WATER_CAULDRON`->`CAULDRON`), which a single literal cannot say.
  'crafting_table',
  'furnace',
  'chest',
  'door',
  'door_open',
  'oak_stairs',
  'anvil',
  'cauldron',
  'water_cauldron',
  'bed',
  'enchanting_table',
  'brewing_stand',
  'tnt',
  'nether_brick',
  'netherrack',
  'nether_portal',
  'fire',
  'soul_soil',
  'wither_skeleton_skull',
] as const
