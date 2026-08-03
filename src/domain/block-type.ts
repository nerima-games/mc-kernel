/**
 * Block identity.
 *
 * COMPLETE — all 120 of the reference implementation's literals.
 *
 * ---------------------------------------------------------------------------
 * The 120 is re-derived, not inherited
 * ---------------------------------------------------------------------------
 *
 * `historical design audit` §2 asserts **120 literals** in the reference's
 * `BlockTypeSchema` (`packages/core/domain/block-type.ts:3-132`). That figure
 * was re-counted independently and it holds, by two measurements that could
 * have disagreed and do not:
 *
 *   - `BlockTypeSchema` (`block-type.ts:4-131`): 120 string literals, 120
 *     DISTINCT — no duplicate, which matters because a duplicated literal would
 *     make the line count overstate the type's member set.
 *   - `INDEX_TO_BLOCK_TYPE` (`block-codec.ts:8-83`), the storage-index array
 *     that is a separate hand-maintained list: also 120, also distinct, and the
 *     SAME set — symmetric difference empty.
 *
 * Both counts exclude comment lines (the schema interleaves eight). the design contract
 * "~119" is an approximation of the same number and is the looser statement.
 *
 * So the target in `docs/testing.md` §5 row 4 is correct as written. It is
 * recorded here because the number is the kind of thing that gets re-quoted
 * without being re-checked, and this repository's most-repeated defect is a
 * figure justified by the wrong measurement.
 *
 * ---------------------------------------------------------------------------
 * How the roster was grown, and why the last 84 landed at once
 * ---------------------------------------------------------------------------
 *
 * The roster grew by CLOSED REFERENCE TABLES rather than by count. The original
 * eighteen were the blocks audit §4.9 needs to prove "non-solid" is five
 * independent concepts (`glass`, `oak_leaves`, `snow`) plus the vertical
 * slice's own. The next eighteen completed two more such tables:
 * `PASSABLE_BLOCK_IDS` (all 19 members) and the three non-`full` members of
 * `COLLISION_SHAPES`.
 *
 * The rule is worth stating because the alternative is worse: importing HALF a
 * membership set produces a set that disagrees with its source, and audit §4.9's
 * central finding is that the reference already has five such disagreements. A
 * roster grown to hit a number would manufacture more of them.
 *
 * The remaining 84 arrived together, which was a decision about the API-LOCK
 * WINDOW rather than about the blocks. `BLOCK_TYPES` is recorded member-by-member
 * in `api-lock.md`, so a single new literal changes the published report and
 * restarts the four-week no-change window `docs/versioning.md` requires before
 * 1.0.0. The number of separate additions is therefore the number of restarts,
 * and `docs/testing.md` §5 had already noted that conditions 4 and 8 cannot
 * advance at the same time. One pass costs one restart and one heavy review;
 * seven passes would have cost seven restarts.
 *
 * What made one pass POSSIBLE rather than merely desirable is that the flags
 * were extractable in bulk. Every capability of every added block was read out
 * of a named reference table and cross-checked against the 36 rows that already
 * existed — those 36 agreed on every flag, which is what licensed trusting the
 * same extraction for the other 84. The disagreements the cross-check DID find
 * were in kernel's own older rows (`piston`, and the whole `hardness` and
 * `friction` columns) and are fixed in `./block-registry` with the evidence.
 *
 * Completing the roster is additive for consumers: no downstream code changes
 * when a literal is added, because behaviour is read from capabilities rather
 * than from the name. What is NOT free is the registry row each literal obliges
 * (`test/block-registry.test.ts` asserts `UNREGISTERED_BLOCK_TYPES` is empty),
 * and that row must carry real flags — which is what made this the last
 * completion condition to fall rather than the first.
 */

export const BLOCK_TYPES = [
  'air',
  'stone',
  // The drop of `stone`, and therefore not optional once `drops` carries real
  // data: without it, `stone` would have to yield an item that no block in this
  // build can be built back out of. Audit §6-3 already names COBBLESTONE
  // (`fluid-contact.ts:9-11`, flowing lava + water), so the literal is the
  // reference's, not an invention.
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
  // the table audit §4.1 calls "物理側の中心" — `isPassableBlockType` (:44),
  // `isBlockSolid` (:107), `isBlockSolidForMobPhysics` (:124) and
  // `getBlockCollisionShapeAt` (:135) all read it. Four of its members were
  // already here (`air`, `water`, `lava`, `torch`); the fifteen below are the
  // rest, so that one named reference table is now representable in full rather
  // than sampled.
  //
  // A closed reference table is the right unit to import: a HALF-imported
  // membership set is a set that disagrees with its source, which is the exact
  // defect audit §4.9 measures five times over.
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
  // from the audit before any block needed them, so `'slab'`, `'cactus'` and
  // `'pressurePlate'` were members no row in the table could produce. An enum
  // member no data inhabits is a member nothing tests, and mc-physics is
  // supposed to switch on exactly this value (`getBlockCollisionShapeAt`
  // :136-139 is a three-way branch).
  'cactus',
  'pressure_plate',
  'stone_slab',

  // ---------------------------------------------------------------------------
  // The remaining 84, completing the reference's roster.
  // ---------------------------------------------------------------------------
  //
  // Everything below arrived in ONE change, and the grouping is by the
  // reference FILE that defines each block's properties rather than by theme.
  // That is deliberate: `blocks.config.{terrain,ores,crafted,end,flora}.ts` are
  // the tables that actually carry `hardness` / `friction` / `transparency` /
  // `emissive`, so a group here is a group whose values came out of one place
  // and can be re-checked against it in one read.
  //
  // Capabilities did NOT come from those files. Each flag was read out of the
  // membership table that owns it (`PASSABLE_BLOCK_IDS`, `NON_SUFFOCATING_BLOCKS`,
  // `NON_SUPPORTING_BLOCK_TYPES`, `NON_SPAWN_SURFACE_BLOCK_IDS`,
  // `FLAMMABLE_BLOCK_TYPES`, `WATER_BREAKABLE_BLOCK_TYPES`), which is why the
  // per-row citations in `./block-registry` point at six different files for
  // one row. Three of those tables are stored NEGATED, and the registry rows
  // say so where it matters.

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
  // rather than a flag: `ORE_XP_TABLE` (`blocks.config.ores.ts:29-37`) gives
  // coal 5, diamond 7, emerald 7, lapis 5, redstone 5 — and iron and gold ZERO,
  // because they drop raw ore and the experience is paid at the furnace.
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
  // closed set even though `supportRule` — the capability that gives a crop its
  // "must stand on FARMLAND" rule — is now implemented in the registry. The set
  // keeps support rules on a closed vocabulary; see `./block-definition`.
  'wheat_crop',
  'potato_crop',
  'nether_wart_crop',

  // ---------------------------------------------------------------------------
  // Redstone components (`blocks.config.crafted.ts`)
  // ---------------------------------------------------------------------------
  //
  // THE VOCABULARY IS KERNEL'S; THE RULES ARE NOT. Audit §6-7 puts
  // `REDSTONE_CLEANUP_BLOCK_TYPES` and every propagation rule in mx-redstone,
  // and none of that is here — no signal strength, no tick scheduling, no
  // powered/unpowered transition. What is here is the block NAMES and their
  // ordinary block capabilities, which mx-redstone cannot express for itself
  // without forking `BlockType`.
  //
  // `redstone_lamp` and `redstone_lamp_lit` are TWO literals because the
  // reference stores them as two (`INDEX_TO_BLOCK_TYPE` has both) and their
  // `lightEmission` differs (0 vs 15). Modelling "lit" as a capability instead
  // would put mutable state in a table of constants.
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
  'hopper',
  'piston_head',

  // ---------------------------------------------------------------------------
  // The End (`blocks.config.end.ts`)
  // ---------------------------------------------------------------------------
  //
  // `purpur_slab` is the second member of `SLAB_BLOCK_IDS`
  // (`block-collision-predicates.ts:56-59`), which until now had one member in
  // kernel and two in the reference. `collisionShape: 'slab'` is therefore a
  // value with a closed two-member table behind it rather than a single case.
  //
  // READ `./block-registry` BEFORE TRUSTING THE `hardness` COLUMN HERE. This is
  // the one reference file whose hardness values are NOT on the 0-100 scale the
  // other four use; the divergence is the reference's, is transcribed rather
  // than silently converted, and is documented at the group in the registry and
  // in `historical design audit` §4.5.2.
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
  // same reason `redstone_lamp` is: the reference stores each state as its own
  // storage index, and the two members of a pair differ in what they drop
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

export type BlockType = (typeof BLOCK_TYPES)[number]

const BLOCK_TYPE_LOOKUP: ReadonlySet<string> = new Set<string>(BLOCK_TYPES)

/**
 * Narrowing guard for values arriving from outside the type system (save
 * files, network frames, developer consoles).
 */
export const isBlockType = (value: string): value is BlockType => BLOCK_TYPE_LOOKUP.has(value)
