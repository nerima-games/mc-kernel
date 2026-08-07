/**
 * Stable block ID registry and O(1) metadata lookups for chunk buffers.
 *
 * IDs are wire-format values: entries stay explicit, are never reused, and
 * unknown values resolve to inert defaults so chunk reads remain total.
 */
import type { BlockCapabilities, BlockCapabilityFlag } from './block-capabilities.js'
import { BLOCK_CAPABILITY_DEFAULTS, BLOCK_CAPABILITY_FLAGS } from './block-capabilities.js'
import type { ResolvedBlock } from './block-definition.js'
import { resolveBlock } from './block-definition.js'
import type { BlockDrop, HarvestContext } from './block-harvest.js'
import { BARE_HANDED, DEFAULT_BLOCK_DROP, DEFAULT_HARVEST_TOOL, resolveDrop } from './block-harvest.js'
import type { BlockOpacity, BlockProperties, BlockPropertyName } from './block-properties.js'
import { BLOCK_OPACITIES, BLOCK_PROPERTY_DEFAULTS, LightLevel } from './block-properties.js'
import type { SupportRule } from './block-support.js'
import { NEEDS_ANY_SUPPORT, isSupportSensitive, needsOneOf, satisfiesSupportRule } from './block-support.js'
import type { BlockType } from './block-type.js'
import { BLOCK_TYPES } from './block-type.js'
import type { BlockRegistryEntry } from './block-registry-types.js'
import { AIR_BLOCK_ID, BLOCK_ID_MAX, BlockId } from './block-registry-types.js'
import { StackCount } from './quantities.js'

/**
 * Drops nothing, to anyone, ever.
 *
 * Spelled as a spread of the default rather than as a four-member literal,
 * which is the rule `docs/versioning.md` §5-3 states for consumers and which
 * the table below follows for itself: a hand-written full record gains a
 * required key every time `BlockDropRule` grows, and that is the breakage this
 * whole design exists to avoid.
 */
const DROPS_NOTHING = { ...DEFAULT_BLOCK_DROP, count: StackCount(0) } as const

/**
 * The tier gate that separates "mined stone" from "wasted a swing".
 *
 * The four constants are the four stages of the reference's HashSet ladder
 * (`harvestable-blocks.ts:14-67`), which is built by UNION — each tier contains
 * every block the tier below it can mine. A block therefore belongs to exactly
 * one of these four by the tier at which it FIRST appears, and that is the value
 * transcribed into its row:
 *
 *   wooden   `WOODEN_PICKAXE_HARVESTABLE_BLOCKS` (:16-29), 12 blocks
 *   stone    the four added at :31-38 (iron and lapis ores)
 *   iron     the eight added at :40-51 (gold, redstone, diamond, emerald ores)
 *   diamond  the one added at :53-56 (`OBSIDIAN`)
 *
 * `GOLD_PICKAXE` is deliberately mapped to the WOODEN set by the reference
 * (`PICKAXE_HARVEST_SETS`, :58-64) — gold is fast and weak, exactly as in
 * vanilla. That is a property of the TOOL, not of any block, so it does not
 * appear here; it belongs to whichever repository models the tool.
 */
const NEEDS_WOODEN_PICKAXE = { ...DEFAULT_HARVEST_TOOL, category: 'pickaxe', minTier: 'wooden' } as const
const NEEDS_STONE_PICKAXE = { ...DEFAULT_HARVEST_TOOL, category: 'pickaxe', minTier: 'stone' } as const
const NEEDS_IRON_PICKAXE = { ...DEFAULT_HARVEST_TOOL, category: 'pickaxe', minTier: 'iron' } as const
const NEEDS_DIAMOND_PICKAXE = { ...DEFAULT_HARVEST_TOOL, category: 'pickaxe', minTier: 'diamond' } as const

/**
 * Category-only requirements: faster with the named tool, but NOT gated.
 *
 * `satisfiesHarvestTier` never reads `category`, so these rows change break
 * SPEED and nothing else. They are in the table precisely because forgetting
 * that the two axes are independent is the bug `./block-harvest` is shaped to
 * prevent, and a table with no category-only row would never exercise it.
 */
const FASTER_WITH_SHOVEL = { ...DEFAULT_HARVEST_TOOL, category: 'shovel' } as const
const FASTER_WITH_AXE = { ...DEFAULT_HARVEST_TOOL, category: 'axe' } as const
const FASTER_WITH_SHEARS = { ...DEFAULT_HARVEST_TOOL, category: 'shears' } as const

// ---------------------------------------------------------------------------
// Shared plant rows, because the REFERENCE shares them
// ---------------------------------------------------------------------------
//
// These two constants are not a shortcut for typing the same override five
// times. They exist because `block-support.ts:4-12` defines exactly one set,
// `SURFACE_PLANT_BLOCK_TYPES`, and then feeds that one set into
// `SUPPORT_SENSITIVE_BLOCK_TYPES` (:22), `WATER_BREAKABLE_BLOCK_TYPES` (:34)
// and `NON_SUPPORTING_BLOCK_TYPES` (:47) — while `environment-hazard.config.ts`
// and `spawn-selection-search.ts` list the same seven names individually and
// happen to agree. Writing the seven rows out separately would be a claim that
// they were decided separately, which is not what the source says.
//
// The membership was checked name-by-name across all five tables rather than
// assumed from the grouping; see the block comment on the plant rows below.

/**
 * `sapling` / `dandelion` / `poppy` / `brown_mushroom` / `red_mushroom` /
 * `tall_grass` / `fern` — identical in every capability table the reference has.
 *
 *   passable              `block-collision-predicates.ts:29-35` (`PASSABLE_BLOCK_IDS`)
 *   brokenByWaterFlow     `block-support.ts:34-44` (via `SURFACE_PLANT_BLOCK_TYPES`)
 *   canSupportAttachments `block-support.ts:47-60` (`NON_SUPPORTING_BLOCK_TYPES`)
 *   suffocates            `environment-hazard.config.ts:66-72` (`NON_SUFFOCATING_BLOCKS`)
 *   validSpawnSurface     `spawn-selection-search.ts:47-54` (`NON_SPAWN_SURFACE_BLOCK_IDS`)
 *
 * `supportRule` USED TO BE the one capability these blocks needed and kernel did
 * not have. It exists now (`./block-support`), and `block-support.ts:85-88`
 * gives all seven the same rule — "DIRT | GRASS | FARMLAND below" — so it is
 * `NEEDS_PLANTABLE_GROUND` on each of the seven rows.
 *
 * It is NOT in this constant, and that is the one asymmetry worth stating: this
 * is a CAPABILITY block and `supportRule` is a PROPERTY, so it cannot go here
 * even though its membership is the same seven rows. The rows spell it
 * individually and `NEEDS_PLANTABLE_GROUND` carries the shared-ness instead.
 */
const SURFACE_PLANT_CAPABILITIES = {
  passable: true,
  brokenByWaterFlow: true,
  canSupportAttachments: false,
  suffocates: false,
  validSpawnSurface: false,
} as const

/**
 * The reference's `plantBlockProperties` (`blocks.config.terrain.ts:29-35`),
 * shared by `blocks.config.flora.ts` across every small plant.
 *
 * `friction: 0` is transcribed rather than defaulted, and it is a real value:
 * `getBlockFrictionAt` (`block-collision-predicates.ts:152-161`) reads
 * `BLOCK_FRICTION_BY_ID` for whatever block a player is standing on, and every
 * plant is 0 there while kernel's default is 0.6.
 *
 * `opacity: 'transparentSolid'` follows the `torch` row's precedent rather than
 * `meshing-worker-config.ts:7-13`, whose `TRANSPARENT_SOLID_IDS_ARRAY` holds
 * only GLASS and LEAVES. Plants never reach greedy meshing at all — they are
 * diverted by `isPlantMeshBlockId` (`plant-mesh.ts:45`) — so the meshing bucket
 * does not decide their value, and the OTHER thing `opacity` governs does:
 * `light.ts:14-17` builds the light-attenuation table from
 * `properties.transparency`, which is `true` for every plant. Opaque would make
 * a flower cast a shadow.
 */
const PLANT_PROPERTIES = {
  opacity: 'transparentSolid',
  collisionShape: 'none',
  hardness: 0,
  friction: 0,
} as const

// ---------------------------------------------------------------------------
// supportRule: the five per-block lists, and the fallback (audit §4.6)
// ---------------------------------------------------------------------------
//
// `SUPPORT_RULE_ENTRIES` (`block-support.ts:75-89`) has exactly five distinct
// values across thirteen blocks, and they are named here rather than repeated
// per row so that the seven surface plants demonstrably share ONE rule instead
// of seven rules that happen to agree — the same argument
// `SURFACE_PLANT_CAPABILITIES` above makes about capabilities.
//
// `supportRule` is NOT part of `PLANT_PROPERTIES`, and that is the whole shape
// of this column: `PLANT_PROPERTIES` is shared by fourteen rows that take FOUR
// different support rules (surface plants, sugar cane, cactus, lily pad) and by
// `kelp` / `seagrass`, which take none at all. A support rule folded into the
// shared plant block would have given a kelp the floor requirements of a fern.
//
// SIX BLOCKS FALL THROUGH TO THE FALLBACK, and they are named where they sit:
// `torch`, `redstone_torch`, `redstone_wire`, `pressure_plate`, `rail` and
// `powered_rail`. The reference gives them no `SUPPORT_RULES` entry — an
// ABSENCE, so their rows cite `block-support.ts:23-28` (their membership of the
// sensitive set) and the absence of a line between :75 and :89. They get
// `NEEDS_ANY_SUPPORT`, which is that absence written down.

/** Wheat and potatoes grow only on farmland. */
const NEEDS_FARMLAND: SupportRule = needsOneOf('farmland')

/** Nether wart grows only on soul sand. */
const NEEDS_SOUL_SAND: SupportRule = needsOneOf('soul_sand')

/**
 * `SURFACE_PLANT_SUPPORT_BLOCK_TYPES` (`block-support.ts:63-67`), for the seven
 * members of `SURFACE_PLANT_BLOCK_TYPES` (:4-12).
 *
 * The reference's `GRASS` is the grass BLOCK and is `grass_block` here; its
 * `TALL_GRASS` is a different literal and is one of the seven plants this rule
 * applies TO, not one of the three it names.
 */
const NEEDS_PLANTABLE_GROUND: SupportRule = needsOneOf('dirt', 'grass_block', 'farmland')

/** `SUGAR_CANE_SUPPORT_BLOCK_TYPES` (`block-support.ts:68`). Stacks on itself. */
const NEEDS_SUGAR_CANE_GROUND: SupportRule = needsOneOf('dirt', 'grass_block', 'sand', 'sugar_cane')

/** `CACTUS_SUPPORT_BLOCK_TYPES` (`block-support.ts:69`). Stacks on itself. */
const NEEDS_SAND_OR_CACTUS: SupportRule = needsOneOf('sand', 'cactus')

/**
 * `block-support.ts:84`. THE row that makes this column worth having.
 *
 * `water` is in `NON_SUPPORTING_BLOCK_TYPES` (:49), so the fallback arm refuses
 * a lily pad on water and allows it on stone — wrong in both directions at once,
 * on the only cell a lily pad belongs on. mx-gameplay's F7 measured exactly that
 * and could not fix it without this column.
 */
const NEEDS_WATER: SupportRule = needsOneOf('water')

/**
 * THE block table.
 *
 * Every row states only its differences from an ordinary opaque solid cube.
 * A row with no overrides (`piston`) is not an omission — it is the statement
 * that the block IS an ordinary opaque solid cube. That used to describe
 * `stone`, `dirt` and `grass_block` too; filling in `drops` and `harvestTool`
 * gave those three something to say, which is what a table of differences
 * looks like when the differences are real.
 *
 * Ids 0-10 reproduce `mc-worldgen/domain/biome.ts`'s `BLOCK` constant exactly.
 * Ids 11+ are new and are appended in the order the blocks were needed.
 *
 * ---------------------------------------------------------------------------
 * The `hardness` and `friction` columns were RE-DERIVED, and both were wrong
 * ---------------------------------------------------------------------------
 *
 * `historical design audit` §4.5.1 recorded, and left open, that this
 * table's `hardness` column held values on two different scales. Completing the
 * roster forced the decision, because 84 new rows on one scale beside 13 old
 * ones on another is a column whose values cannot be compared to each other at
 * all — which is what §4.5.1 says must not be allowed to persist.
 *
 * THE SCALE IS THE REFERENCE'S 0-100 RELATIVE SCALE, stated in so many words at
 * `blocks.config.terrain.ts:4-8` ("Hardness uses a 0-100 scale"). It was chosen
 * over vanilla's floats because it is the only scale with a citation, and
 * because kernel's own two anchors were already on it: the default 8 is
 * `defaultBlockProperties.hardness` and `bedrock` is 100.
 *
 * Thirteen existing rows were corrected. The correction that matters most is
 * `oak_log` and `oak_planks`, which were 2 — BELOW the default 8, making a tree
 * trunk softer than dirt, where the reference has 35. `break-speed.ts:29-43`
 * multiplies hardness into mining time linearly, so the ordering was not
 * cosmetic; it was inverted.
 *
 * `friction` had a quieter version of the same problem: ten rows omitted it and
 * took the 0.6 default where the reference states a value — stone-family 0.8,
 * sand and gravel 0.5, snow 0.3, the fluids and torch lower still.
 * `getBlockFrictionAt` (`block-collision-predicates.ts:152-161`) reads it for
 * whatever a player is standing on, so every one of those was a movement
 * difference. `test/block-registry.test.ts` now pins both columns against the
 * reference values block by block.
 *
 * ONE SCALE INCONSISTENCY SURVIVES, AND IT IS THE REFERENCE'S. The seventeen
 * End rows come from `blocks.config.end.ts`, which is itself mixed: twelve of
 * its thirteen entries are vanilla floats (`PURPUR_BLOCK` 1.5, `DRAGON_EGG` 3,
 * `SHULKER_BOX` 2, `ENDER_CHEST` 22.5) while `END_STONE_BRICKS` is 45 on the
 * 0-100 scale. Those values are TRANSCRIBED rather than converted, because the
 * reference's own mapping from vanilla floats to the scale is not a formula
 * (0.5->8, 1.5->25, 2.0->35, 3.0->50, 50->90) and inventing one would be
 * manufacturing content. The consequence is written at the End group below and
 * in audit §4.5.2: purpur reads as softer than dirt, and that is what the
 * source says.
 */
export const BLOCK_REGISTRY: ReadonlyArray<BlockRegistryEntry> = [
  {
    // Not a block so much as the absence of one. Everything about it is an
    // override, which is what you would expect of the one entry that is not a
    // cube at all.
    id: BlockId(0),
    definition: {
      type: 'air',
      capabilities: {
        passable: true,
        replaceable: true,
        suffocates: false,
        canSupportAttachments: false,
        validSpawnSurface: false,
      },
      properties: {
        // NOTE: `BLOCK_OPACITIES` has no 'invisible' member, so air is filed
        // under the nearest non-attenuating class. Consumers branch on
        // `id === AIR_BLOCK_ID` before consulting opacity (mc-meshing already
        // does), so nothing reads this today. Recorded rather than fixed,
        // because adding an opacity member is an audit change and audit §4.4
        // enumerates exactly three.
        opacity: 'transparentSolid',
        collisionShape: 'none',
        renderKind: 'cube',
        hardness: 0,
        // `blocks.config.terrain.ts` `block:air`. Nothing stands on air, so this
        // is transcription for the column's sake rather than a value with a
        // consequence — but a column that is right except where nobody looks is
        // a column nobody can check.
        friction: 0,
        // Swinging at empty space must not manufacture an item. mx-gameplay's
        // `breakBlock` already refuses to reach here (`Unchanged` ->
        // `NothingThere`), but the table must not depend on the caller getting
        // that right: `air` is a sentinel, not a thing (audit §6-6).
        drops: DROPS_NOTHING,
      },
    },
  },
  {
    // the design contract: the piston-immovable set is a kernel capability rather than
    // the reference's local constant.
    id: BlockId(1),
    definition: {
      type: 'bedrock',
      capabilities: { pistonImmovable: true },
      properties: { hardness: 100, friction: 0.8, drops: DROPS_NOTHING },
    },
  },
  {
    // THE tool-gated row, and the reason `harvestTool` and `drops` are one
    // decision rather than two: stone mined bare-handed yields nothing, and
    // stone mined with a pickaxe yields something that is not stone.
    id: BlockId(2),
    definition: {
      type: 'stone',
      properties: {
        // CORRECTED, with the whole `hardness` column — see the block comment
        // above `BLOCK_REGISTRY`. This row said nothing and so resolved to the
        // default 8, which claimed stone is exactly as hard as dirt.
        hardness: 25,
        friction: 0.8,
        footstepMaterial: 'stone',
        harvestTool: NEEDS_WOODEN_PICKAXE,
        drops: { ...DEFAULT_BLOCK_DROP, item: 'cobblestone', silkTouchItem: 'stone' },
      },
    },
  },
  {
    id: BlockId(3),
    definition: {
      type: 'dirt',
      capabilities: { tillable: true },
      properties: { harvestTool: FASTER_WITH_SHOVEL, footstepMaterial: 'grass' },
    },
  },
  {
    // Different-drop with NO tool gate — the row that keeps the two axes
    // visibly separate. Grass yields dirt to bare hands.
    id: BlockId(4),
    definition: {
      type: 'grass_block',
      capabilities: { tillable: true },
      properties: {
        hardness: 10,
        harvestTool: FASTER_WITH_SHOVEL,
        footstepMaterial: 'grass',
        drops: { ...DEFAULT_BLOCK_DROP, item: 'dirt', silkTouchItem: 'grass_block' },
      },
    },
  },
  {
    // The block the vertical slice is about. `fallsWhenUnsupported` here is what
    // lets mx-gameplay's falling-block rule read a chunk buffer byte and decide,
    // instead of testing `blockType === 'SAND'` (the design contract).
    id: BlockId(5),
    definition: {
      type: 'sand',
      capabilities: { fallsWhenUnsupported: true },
      properties: { hardness: 8, friction: 0.5, harvestTool: FASTER_WITH_SHOVEL, footstepMaterial: 'stone' },
    },
  },
  {
    id: BlockId(6),
    definition: {
      type: 'water',
      capabilities: {
        passable: true,
        replaceable: true,
        suffocates: false,
        canSupportAttachments: false,
        validSpawnSurface: false,
      },
      properties: {
        opacity: 'fluid',
        fluid: 'water',
        collisionShape: 'none',
        renderKind: 'fluid',
        hardness: 0,
        friction: 0,
        drops: DROPS_NOTHING,
      },
    },
  },
  {
    // Audit §4.9: SNOW is non-supporting but NOT passable. It is the row that
    // proves `passable` and `canSupportAttachments` are two capabilities.
    id: BlockId(7),
    definition: {
      type: 'snow',
      capabilities: { canSupportAttachments: false },
      // THE DAY ARRIVED, AND THIS IS THE ONE-LINE CHANGE. This row used to say
      // `DROPS_NOTHING` with a note that vanilla yields snowballs, that
      // `snowball` was not in `ITEM_TYPES`, and that inventing it would be the
      // guessed-roster failure. The item now exists on the same evidence every
      // other drop target rests on — `INVENTORY_DROP_OVERRIDES` maps
      // SNOW -> SNOWBALL (`block-service.config.ts:183`) — so the gap is closed
      // by transcription rather than by invention.
      //
      // `count: 4` is `BLOCK_BASE_DROP_COUNT` (:204-215), which lists SNOW with
      // the ores. A shovelled snow layer yields four snowballs.
      properties: {
        hardness: 2,
        friction: 0.3,
        harvestTool: FASTER_WITH_SHOVEL,
        drops: { ...DEFAULT_BLOCK_DROP, item: 'snowball', count: StackCount(4) },
      },
    },
  },
  {
    id: BlockId(8),
    definition: {
      type: 'gravel',
      capabilities: { fallsWhenUnsupported: true },
      // Vanilla's 10% flint is a RANDOM drop, and audit §6-9 places random drop
      // rules in mx-gameplay ("`drops` では表現できない"). The deterministic
      // half — gravel yields gravel — is what belongs here.
      properties: { hardness: 10, friction: 0.5, harvestTool: FASTER_WITH_SHOVEL, footstepMaterial: 'stone' },
    },
  },
  {
    id: BlockId(9),
    definition: {
      type: 'oak_log',
      capabilities: {
        flammable: true, // fire-lifecycle.ts:20 (`WOOD`)
        // CORRECTED. This row said nothing about `validSpawnSurface` and so
        // resolved to the default `true`, but the reference lists `WOOD` in
        // `NON_SPAWN_SURFACE_BLOCK_IDS` (`spawn-selection-search.ts:45`,
        // commented "log — semi-solid / tree") and again in
        // `VILLAGE_NON_GROUND_IDS` (`village-placement-surface.ts:11`). Both
        // near-duplicate lists agree, which is rare enough in this family of
        // tables to be worth noting — the disagreement audit §4.9 measures is
        // between the lists, and here there is none to hide behind.
        //
        // The default was doing the damage silently: mobs and village placement
        // would treat the top of a tree trunk as ground. `mx-gameplay`'s
        // transcription (`chunk-store-port.ts`, `NON_SPAWN_SURFACE_IDS`) had the
        // same hole, and `pnpm check:mirrors` could not see it because
        // `validSpawnSurface` had no probe in `MIRROR_SPECS`. It has one now.
        validSpawnSurface: false,
      },
      // CORRECTED. hardness was 2 — vanilla's float — which put a tree trunk
      // BELOW the default 8 and so made a log softer than dirt. The reference
      // has 35, above cobblestone. The direction of the error is the reason the
      // whole column was re-derived rather than spot-fixed.
      properties: { hardness: 35, harvestTool: FASTER_WITH_AXE, footstepMaterial: 'wood' },
    },
  },
  {
    // Audit §4.9: LEAVES is not a spawn surface and does not suffocate, but IS
    // solid for collision — `block-collision-predicates.ts:18-21` records the
    // canopy fall-through bug that listing it as passable caused.
    id: BlockId(10),
    definition: {
      type: 'oak_leaves',
      capabilities: { flammable: true, suffocates: false, validSpawnSurface: false },
      // THE no-drop row, and the one with an argument behind it rather than a
      // shrug. Vanilla leaves yield saplings and apples at a probability that
      // depends on fortune; audit §6-9 records that shape as inexpressible in
      // `drops` and assigns it to mx-gameplay. Writing `item: 'oak_leaves'`
      // here to avoid an empty cell would be a WRONG answer rather than an
      // absent one, so the cell says nothing drops and the rule that owns the
      // RNG adds the saplings.
      properties: {
        opacity: 'transparentSolid',
        hardness: 3,
        footstepMaterial: 'wood',
        // DECLARED DIVERGENCE, kept. `shears` is not a category the reference's
        // `isEffectiveTool` (`block-utils.ts:32-63`) knows — it has only
        // axe/shovel/pickaxe sets, and LEAVES is in none of them. The category
        // is kernel's, is speed-only (`satisfiesHarvestTier` never reads it, so
        // it gates nothing), and exists so the table has a row exercising a
        // category with no tier. Recorded here because a value with no citation
        // must say that it has none.
        harvestTool: FASTER_WITH_SHEARS,
        drops: DROPS_NOTHING,
      },
    },
  },
  {
    id: BlockId(11),
    definition: {
      type: 'lava',
      capabilities: {
        passable: true,
        replaceable: true,
        fireSource: true,
        suffocates: false,
        canSupportAttachments: false,
        validSpawnSurface: false,
      },
      properties: {
        opacity: 'fluid',
        fluid: 'lava',
        collisionShape: 'none',
        renderKind: 'fluid',
        lightEmission: 15,
        contactDamage: 4,
        hardness: 0,
        friction: 0,
        drops: DROPS_NOTHING,
      },
    },
  },
  {
    id: BlockId(12),
    definition: {
      type: 'oak_planks',
      capabilities: { flammable: true },
      // `PLANKS` is 35 in the reference with the comment "Vanilla planks 2.0 =
      // wood (35 on this scale), not stone-soft" — the reference wrote down the
      // exact mistake this row used to make.
      properties: { hardness: 35, harvestTool: FASTER_WITH_AXE, footstepMaterial: 'wood' },
    },
  },
  {
    // Audit §4.9: GLASS is non-suffocating and not a spawn surface but IS solid
    // for collision.
    id: BlockId(13),
    definition: {
      type: 'glass',
      capabilities: { suffocates: false, validSpawnSurface: false },
      // Glass remains a Silk Touch gate; block substitutions such as stone and
      // ores are modelled separately by `silkTouchItem` in block-harvest.
      properties: {
        opacity: 'transparentSolid',
        hardness: 4,
        drops: { ...DEFAULT_BLOCK_DROP, requiresSilkTouch: true },
      },
    },
  },
  {
    id: BlockId(14),
    definition: {
      type: 'torch',
      capabilities: {
        passable: true,
        brokenByWaterFlow: true,
        canSupportAttachments: false,
        validSpawnSurface: false,
        suffocates: false,
      },
      properties: {
        opacity: 'transparentSolid',
        collisionShape: 'none',
        // DECLARED DIVERGENCE, kept. `TORCH` is absent from `CROSS_PLANT_IDS`
        // and from `plantMeshLookup` (`plant-mesh.ts:19-44`), so the reference
        // meshes it as a cube. `'cross'` is kernel's reading of what a torch
        // looks like, is not transcribed from anywhere, and says so here.
        renderKind: 'cross',
        // `light.ts:24-46` `EMISSIVE_LEVEL_OVERRIDES`: TORCH is 14, not 15. The
        // one-level gap from glowstone is the reason `lightEmission` is a number
        // and not the `emissive: boolean` the design contract asked for.
        lightEmission: 14,
        hardness: 1,
        friction: 0.1,
        // `block-support.ts:23` puts TORCH in the sensitive set and :75-89 gives
        // it NO entry, so the reference answers it with the negative list. The
        // fallback arm is that absence, written down.
        supportRule: NEEDS_ANY_SUPPORT,
      },
    },
  },
  {
    // The row that forced `ItemType` to exist. `glowstone_dust` is not a block
    // and never will be, so `drops.item: BlockType | 'self'` could not write
    // this line at all — it could express "a different block", never "not a
    // block". It is also the fortune row: audit §4.5 cites `FORTUNE_ORE_BLOCKS`
    // (`block-service.config.ts:270-276`), and the multiplication itself stays
    // in mx-gameplay because it is random (see `./block-harvest`).
    id: BlockId(15),
    definition: {
      type: 'glowstone',
      properties: {
        lightEmission: 15,
        hardness: 4,
        // NOTE: `count: 2` is kernel's and diverges from the reference's
        // `BLOCK_BASE_DROP_COUNT` (`block-service.config.ts:204-215`), which
        // gives `GLOWSTONE` 4. Left as it is rather than corrected in passing:
        // it is a content value, not a transcription error, and changing a drop
        // count is a gameplay change that should be reviewed on its own.
        drops: { ...DEFAULT_BLOCK_DROP, item: 'glowstone_dust', count: StackCount(2), affectedByFortune: true },
      },
    },
  },
  {
    // THIS ROW WAS BARE, AND BEING BARE IS WHAT MADE IT WRONG. It used to be
    // the file's worked example of "an empty row is not an omission, it is the
    // statement that the block IS an ordinary opaque solid cube". The statement
    // was false in two columns at once, and both were found by re-deriving the
    // whole table from the reference rather than by reading this row.
    //
    //   `validSpawnSurface` — `PISTON` is listed in `NON_SPAWN_SURFACE_BLOCK_IDS`
    //   (`spawn-selection-search.ts:68`, under "Redstone / interactive"). The
    //   default is `true`, so silence here meant mobs and village placement
    //   treated the top of a piston as ground. This is the SECOND time this
    //   exact defect has been found in this file — `oak_log` had it, and the
    //   note on that row already says the damage is done silently because the
    //   flag defaults the wrong way for anything that is not a plain cube.
    //
    //   `hardness` — 55 in the reference, not the default 8. A piston is
    //   furnace-tier, and 8 made it as soft as dirt.
    //
    // The lesson recorded rather than the fix: a row that states nothing is
    // only honest when the block really is a plain cube, and "I did not check"
    // and "I checked and there was nothing to say" are written identically.
    // Every one of the 84 rows below states its values explicitly for that
    // reason, including where they equal the default.
    id: BlockId(16),
    definition: {
      type: 'piston',
      capabilities: { validSpawnSurface: false },
      properties: { hardness: 55 },
    },
  },
  {
    // Appended, not inserted: ids 0-16 were already assigned when this block was
    // added, and an id is a wire format. This row is also the worked example of
    // the additive-safety property `test/item-drops.test.ts` asserts — it was
    // added without touching any row above it, and no answer above it moved.
    id: BlockId(17),
    definition: {
      type: 'cobblestone',
      // DECLARED DIVERGENCE on the tool gate, kept and now written down.
      // `COBBLESTONE` is NOT in `WOODEN_PICKAXE_HARVESTABLE_BLOCKS`
      // (`harvestable-blocks.ts:16-29`), so the reference lets you collect
      // cobblestone bare-handed while requiring a pickaxe for the `stone` it
      // came from. That is almost certainly a hole in the reference's set
      // rather than a design; kernel keeps the gate, because the alternative is
      // an infinite bare-handed cobblestone supply from any stone wall. Flagged
      // rather than silently matched, since it is the one row in this file
      // where kernel is deliberately STRICTER than its source.
      properties: { hardness: 35, friction: 0.8, harvestTool: NEEDS_WOODEN_PICKAXE, footstepMaterial: 'stone' },
    },
  },

  // -------------------------------------------------------------------------
  // ids 18-32: the rest of `PASSABLE_BLOCK_IDS`
  // -------------------------------------------------------------------------
  //
  // READ THIS BEFORE ADDING A ROW BELOW. Two of the reference's five "non-solid"
  // tables (audit §4.9) turn out to omit members the other three contain, and
  // the omissions are load-bearing for these rows specifically:
  //
  //   - `NON_SUFFOCATING_BLOCKS` (`environment-hazard.config.ts:39-85`) does NOT
  //     contain `SUGAR_CANE`, `LILY_PAD`, `KELP`, `SEAGRASS`, `RAIL` or
  //     `POWERED_RAIL`, although `PASSABLE_BLOCK_IDS` does. Read literally, the
  //     reference suffocates a player standing inside a rail.
  //   - `NON_SPAWN_SURFACE_BLOCK_IDS` (`spawn-selection-search.ts:41-84`) does
  //     NOT contain `RAIL`, `POWERED_RAIL`, `KELP`, `SEAGRASS` or `STONE_SLAB`.
  //
  // These are SIX and FIVE new instances of the disagreement audit §4.9 found
  // three of, and they are handled differently from each other on purpose:
  //
  //   `suffocates` IS inferred to `false` for the six, because audit §4.7 states
  //   the one-way implication — 「`passable=true` なら常に false を導出する方が
  //   安全」 — and a passable block that suffocates is incoherent rather than
  //   merely unlisted. Each such row says so at the row.
  //
  //   `validSpawnSurface` is NOT inferred. No implication licenses it: audit
  //   §4.9's whole finding is that these five concepts are independent, and it
  //   cites `snow` (non-supporting, not passable) and `glass` (solid, not a
  //   spawn surface) as proof that "passable" predicts neither. Those rows
  //   therefore transcribe the reference's silence and default to `true`, with
  //   the omission recorded. Guessing here would be inventing content.
  {
    // Exercises `climbable`, which no row could reach before — kernel had the
    // flag from audit §4.1 and nothing to hang it on.
    //
    // Also the counter-example to "passable implies non-supporting": `ladder` is
    // in `PASSABLE_BLOCK_IDS` (:29) yet is absent from
    // `NON_SUPPORTING_BLOCK_TYPES` (`block-support.ts:47-60`), so a torch may be
    // attached to it. That is the reference's answer, not a default falling
    // through, and it is why `canSupportAttachments` is left unsaid here.
    id: BlockId(18),
    definition: {
      type: 'ladder',
      capabilities: {
        passable: true, // block-collision-predicates.ts:29
        climbable: true, // block-collision-predicates.ts:177-182 (`isInLadder`)
        flammable: true, // fire-lifecycle.ts:26 (`FLAMMABLE_BLOCK_TYPES`)
        suffocates: false, // environment-hazard.config.ts:63 (`NON_SUFFOCATING_BLOCKS`)
        validSpawnSurface: false, // spawn-selection-search.ts:46
      },
      // hardness 4 / friction 0.6: blocks.config.crafted.ts (`block:ladder`).
      properties: { opacity: 'transparentSolid', collisionShape: 'none', hardness: 4, footstepMaterial: 'wood' },
    },
  },
  {
    // Exercises `movementDrag`, the other flag that had no inhabitant.
    //
    // INFERRED VALUE, and the inference is lossy. The reference slows an entity
    // in a cobweb with TWO multipliers — `COBWEB_HORIZONTAL_MULTIPLIER = 0.25`
    // and `COBWEB_VERTICAL_MULTIPLIER = 0.05` (`player-physics.ts:19-20`,
    // applied at :123-125) — and `movementDrag` is one number. 0.75 is the
    // horizontal figure expressed as drag (`1 - 0.25`), chosen because kernel's
    // default is 0 = "no slowdown", so the field must count drag and not
    // survival.
    //
    // The vertical component is LOST. Recorded rather than silently dropped: a
    // second field (`verticalMovementDrag`) is the additive fix if mc-physics
    // ever needs the fall-through-a-cobweb behaviour, and until then this row
    // is the only place that says the model is lossy here.
    id: BlockId(19),
    definition: {
      type: 'cobweb',
      capabilities: {
        passable: true, // block-collision-predicates.ts:30
        suffocates: false, // environment-hazard.config.ts:64
        validSpawnSurface: false, // spawn-selection-search.ts:47
      },
      properties: {
        opacity: 'transparentSolid',
        collisionShape: 'none',
        movementDrag: 0.75,
        // hardness 4 / friction 0.2: blocks.config.crafted.ts (`block:cobweb`).
        hardness: 4,
        friction: 0.2,
        // `INVENTORY_DROP_OVERRIDES` maps COBWEB -> STRING
        // (`block-service.config.ts:170`). This row previously carried the
        // DEFAULT rule — "yields itself" — while `cobweb` had no item form, so
        // it resolved to nothing through the `'self'` sentinel and looked like a
        // deliberate no-drop. It was neither: it was an untranscribed override.
        drops: { ...DEFAULT_BLOCK_DROP, item: 'string' },
      },
    },
  },
  {
    // The one surface plant that is NOT a cross-mesh plant. `CROSS_PLANT_IDS`
    // (`plant-mesh.ts:18-28`) lists the other six and omits `SAPLING`, so
    // `isPlantMeshBlockId` (:45) sends a sapling down the greedy-meshing path
    // and it meshes as a cube.
    //
    // Transcribed rather than corrected. It looks like a reference defect — a
    // sapling is a cross-quad in every version of the game — but "looks like a
    // bug" is not a citation, and kernel's job here is to state what the
    // reference does. The row is flagged so that whoever ports the mesher
    // decides it deliberately instead of discovering it.
    id: BlockId(20),
    definition: {
      type: 'sapling',
      capabilities: SURFACE_PLANT_CAPABILITIES,
      properties: {
        ...PLANT_PROPERTIES,
        footstepMaterial: 'wood',
        supportRule: NEEDS_PLANTABLE_GROUND, // block-support.ts:85-88 via SURFACE_PLANT_BLOCK_TYPES (:5)
      },
    },
  },
  {
    id: BlockId(21),
    definition: {
      type: 'dandelion',
      capabilities: SURFACE_PLANT_CAPABILITIES,
      properties: {
        ...PLANT_PROPERTIES,
        renderKind: 'cross',
        supportRule: NEEDS_PLANTABLE_GROUND, // block-support.ts:85-88 via SURFACE_PLANT_BLOCK_TYPES (:6)
      }, // plant-mesh.ts:19
    },
  },
  {
    id: BlockId(22),
    definition: {
      type: 'poppy',
      capabilities: SURFACE_PLANT_CAPABILITIES,
      properties: {
        ...PLANT_PROPERTIES,
        renderKind: 'cross',
        supportRule: NEEDS_PLANTABLE_GROUND, // block-support.ts:85-88 via SURFACE_PLANT_BLOCK_TYPES (:7)
      }, // plant-mesh.ts:20
    },
  },
  {
    id: BlockId(23),
    definition: {
      type: 'brown_mushroom',
      capabilities: SURFACE_PLANT_CAPABILITIES,
      properties: {
        ...PLANT_PROPERTIES,
        renderKind: 'cross',
        supportRule: NEEDS_PLANTABLE_GROUND, // block-support.ts:85-88 via SURFACE_PLANT_BLOCK_TYPES (:8)
      }, // plant-mesh.ts:21
    },
  },
  {
    id: BlockId(24),
    definition: {
      type: 'red_mushroom',
      capabilities: SURFACE_PLANT_CAPABILITIES,
      properties: {
        ...PLANT_PROPERTIES,
        renderKind: 'cross',
        supportRule: NEEDS_PLANTABLE_GROUND, // block-support.ts:85-88 via SURFACE_PLANT_BLOCK_TYPES (:9)
      }, // plant-mesh.ts:22
    },
  },
  {
    id: BlockId(25),
    definition: {
      type: 'tall_grass',
      capabilities: SURFACE_PLANT_CAPABILITIES,
      properties: {
        ...PLANT_PROPERTIES,
        renderKind: 'cross',
        supportRule: NEEDS_PLANTABLE_GROUND, // block-support.ts:85-88 via SURFACE_PLANT_BLOCK_TYPES (:10)
      }, // plant-mesh.ts:23
    },
  },
  {
    id: BlockId(26),
    definition: {
      type: 'fern',
      capabilities: SURFACE_PLANT_CAPABILITIES,
      properties: {
        ...PLANT_PROPERTIES,
        renderKind: 'cross',
        supportRule: NEEDS_PLANTABLE_GROUND, // block-support.ts:85-88 via SURFACE_PLANT_BLOCK_TYPES (:11)
      }, // plant-mesh.ts:24
    },
  },
  {
    // A WATERSIDE plant, not a surface plant: `block-support.ts:14-18` puts it
    // in a different set with a different support rule (DIRT | GRASS | SAND |
    // itself, :81) — so it does NOT get `SURFACE_PLANT_CAPABILITIES` even
    // though the resolved flags come out close.
    //
    // `suffocates: false` is INFERRED (audit §4.7): `SUGAR_CANE` is passable
    // (`block-collision-predicates.ts:36`) but absent from
    // `NON_SUFFOCATING_BLOCKS`.
    id: BlockId(27),
    definition: {
      type: 'sugar_cane',
      capabilities: {
        passable: true,
        brokenByWaterFlow: true, // block-support.ts:43 (named individually, not via the plant set)
        canSupportAttachments: false, // block-support.ts:47-60 (via WATERSIDE_PLANT_BLOCK_TYPES)
        suffocates: false, // INFERRED — audit §4.7
        validSpawnSurface: false, // spawn-selection-search.ts:55
      },
      properties: {
        ...PLANT_PROPERTIES,
        renderKind: 'cross',
        supportRule: NEEDS_SUGAR_CANE_GROUND, // block-support.ts:82
      }, // plant-mesh.ts:25
    },
  },
  {
    // `brokenByWaterFlow` is deliberately ABSENT, and this is the row where that
    // absence is a statement. `WATER_BREAKABLE_BLOCK_TYPES` (`block-support.ts:
    // 34-44`) names `SUGAR_CANE` and `CACTUS` individually right next to the
    // plant set, and does NOT name `LILY_PAD` — which is correct, since a lily
    // pad's support rule IS water (:83). A blanket "plants break in water" would
    // have deleted every lily pad on contact with the thing it floats on.
    id: BlockId(28),
    definition: {
      type: 'lily_pad',
      capabilities: {
        passable: true, // block-collision-predicates.ts:37
        canSupportAttachments: false, // block-support.ts:47-60
        suffocates: false, // INFERRED — audit §4.7
        validSpawnSurface: false, // spawn-selection-search.ts:57
      },
      properties: {
        ...PLANT_PROPERTIES,
        renderKind: 'lilyPad',
        supportRule: NEEDS_WATER, // block-support.ts:84
      }, // plant-mesh.ts:34
    },
  },
  {
    // `kelp` and `seagrass` are the reference's newest block types — the
    // append-only tail of `INDEX_TO_BLOCK_TYPE` (`block-codec.ts:74-82`) — and
    // they are missing from THREE of the five membership tables:
    // `NON_SUFFOCATING_BLOCKS`, `NON_SPAWN_SURFACE_BLOCK_IDS` and
    // `NON_SUPPORTING_BLOCK_TYPES`. Audit §6-8 already caught the same pair
    // missing from `BLOCK_ITEMS`.
    //
    // That is what a hand-maintained membership set does when the roster grows,
    // and it is the argument for this registry existing at all: here the roster
    // and the capabilities are the same table, so a new literal cannot be added
    // to one and forgotten in the other (`test/block-registry.test.ts` asserts
    // `UNREGISTERED_BLOCK_TYPES` is empty).
    //
    // Only `suffocates` is inferred. `validSpawnSurface` and
    // `canSupportAttachments` transcribe the silence — see the block comment
    // above on why the two are treated differently.
    id: BlockId(29),
    definition: {
      type: 'kelp',
      capabilities: {
        passable: true, // block-collision-predicates.ts:38
        suffocates: false, // INFERRED — audit §4.7
      },
      properties: { ...PLANT_PROPERTIES, renderKind: 'cross' }, // plant-mesh.ts:26
    },
  },
  {
    id: BlockId(30),
    definition: {
      type: 'seagrass',
      capabilities: {
        passable: true, // block-collision-predicates.ts:39
        suffocates: false, // INFERRED — audit §4.7
      },
      properties: { ...PLANT_PROPERTIES, renderKind: 'cross' }, // plant-mesh.ts:27
    },
  },
  {
    // Exercises `railKind`, the third flag audit §4.1 defined with no inhabitant.
    id: BlockId(31),
    definition: {
      type: 'rail',
      capabilities: {
        passable: true, // block-collision-predicates.ts:40
        brokenByWaterFlow: true, // block-support.ts:38
        canSupportAttachments: false, // block-support.ts:53
        suffocates: false, // INFERRED — audit §4.7
      },
      properties: {
        opacity: 'transparentSolid',
        collisionShape: 'none',
        renderKind: 'rail', // plant-mesh.ts:32
        railKind: 'normal', // block-collision-predicates.ts:184-195 (`isOnRail`)
        // hardness 7 / friction 0.6: blocks.config.crafted.ts (`block:rail`).
        hardness: 7,
        supportRule: NEEDS_ANY_SUPPORT, // block-support.ts:27, no entry at :75-89
      },
    },
  },
  {
    // The `railKind` distinction is not decorative: `isOnPoweredRail`
    // (`block-collision-predicates.ts:197-201`) is a SEPARATE predicate from
    // `isOnRail` (:184), and `minecart-mount.ts:45` names both. A boolean
    // `isRail` would collapse the speed tier.
    id: BlockId(32),
    definition: {
      type: 'powered_rail',
      capabilities: {
        passable: true, // block-collision-predicates.ts:41
        brokenByWaterFlow: true, // block-support.ts:39
        canSupportAttachments: false, // block-support.ts:54
        suffocates: false, // INFERRED — audit §4.7
      },
      properties: {
        opacity: 'transparentSolid',
        collisionShape: 'none',
        renderKind: 'rail', // plant-mesh.ts:33
        railKind: 'powered', // block-collision-predicates.ts:197-201
        hardness: 7,
        supportRule: NEEDS_ANY_SUPPORT, // block-support.ts:28, no entry at :75-89
      },
    },
  },

  // -------------------------------------------------------------------------
  // ids 33-35: the three non-`full` collision shapes
  // -------------------------------------------------------------------------
  {
    // THE row that most repays audit §4.9, and the reason it is worth having.
    // `cactus` disagrees with itself four ways in a single row:
    //
    //   passable              false  — absent from `PASSABLE_BLOCK_IDS`; it collides
    //   suffocates            false  — `NON_SUFFOCATING_BLOCKS` (:65)
    //   canSupportAttachments false  — `NON_SUPPORTING_BLOCK_TYPES` (:47-60)
    //   validSpawnSurface     false  — `NON_SPAWN_SURFACE_BLOCK_IDS` (:56)
    //
    // A single `solid` boolean would have to be true (you cannot walk through a
    // cactus) and false (it neither suffocates you nor holds a torch nor spawns
    // a mob) at the same time. `glass` and `oak_leaves` make that argument with
    // two disagreements each; this row makes it with three, and adds contact
    // damage on top.
    id: BlockId(33),
    definition: {
      type: 'cactus',
      capabilities: {
        suffocates: false,
        canSupportAttachments: false,
        validSpawnSurface: false,
        brokenByWaterFlow: true, // block-support.ts:44 — named individually
      },
      properties: {
        // `cactusBlockProperties` (`blocks.config.flora.ts:9-15`): solid AND
        // transparent, hardness 8, friction 0.6 — the only block in the flora
        // config that is not `plantBlockProperties`.
        opacity: 'transparentSolid',
        collisionShape: 'cactus', // block-collision-predicates.ts:136
        renderKind: 'cactus', // plant-mesh.ts:30
        contactDamage: 1, // environment-hazard.config.ts:26 (`CACTUS_DAMAGE`)
        supportRule: NEEDS_SAND_OR_CACTUS, // block-support.ts:83
      },
    },
  },
  {
    // Not passable — `PRESSURE_PLATE` is absent from `PASSABLE_BLOCK_IDS`, and
    // `getBlockCollisionShapeAt` (:137) returns a shape for it rather than
    // `null`. The plate is a very short box you stand ON, which is exactly the
    // distinction `collisionShape` exists to carry and `passable` cannot.
    id: BlockId(34),
    definition: {
      type: 'pressure_plate',
      capabilities: {
        brokenByWaterFlow: true, // block-support.ts:37
        canSupportAttachments: false, // block-support.ts:52
        suffocates: false, // environment-hazard.config.ts:55
        validSpawnSurface: false, // spawn-selection-search.ts:66
      },
      properties: {
        opacity: 'transparentSolid',
        collisionShape: 'pressurePlate', // block-collision-predicates.ts:137
        // harvestable-blocks.ts:16-17 lists PRESSURE_PLATE in
        // WOODEN_PICKAXE_HARVESTABLE_BLOCKS — a tier GATE, so bare hands yield
        // nothing. hardness 5: blocks.config.crafted.ts.
        harvestTool: NEEDS_WOODEN_PICKAXE,
        hardness: 5,
        supportRule: NEEDS_ANY_SUPPORT, // block-support.ts:26, no entry at :75-89
      },
    },
  },
  {
    // `SLAB_BLOCK_IDS` (`block-collision-predicates.ts:56-59`) holds two
    // members, `PURPUR_SLAB` and `STONE_SLAB`; only the second is in this
    // roster, so `collisionShape: 'slab'` is inhabited but its reference table
    // is not yet complete. Recorded so the next roster pass knows the shape is
    // already exercised and `purpur_slab` is about the End dimension, not about
    // collision.
    //
    // `validSpawnSurface` is left at the default `true`: `STONE_SLAB` is one of
    // the five blocks `NON_SPAWN_SURFACE_BLOCK_IDS` omits (see the block comment
    // on ids 18-32). A mob standing on a slab is at least physically coherent,
    // unlike one standing on a rail, but the reason it is `true` here is that
    // the reference does not say otherwise — not that it seems reasonable.
    id: BlockId(35),
    definition: {
      type: 'stone_slab',
      capabilities: {
        // `NON_SUFFOCATING_BLOCKS` (:56) contains STONE_SLAB, and audit §4.7
        // names it as one of the three entries (with GLASS and OAK_STAIRS) that
        // make `suffocates` underivable from `passable && opacity`. This row is
        // that argument's evidence: not passable, and still does not suffocate.
        suffocates: false,
      },
      properties: {
        opacity: 'transparentSolid', // transparency: true in blocks.config.crafted.ts
        collisionShape: 'slab', // block-collision-predicates.ts:56-59, applied at :138
        harvestTool: NEEDS_WOODEN_PICKAXE, // harvestable-blocks.ts:18
        hardness: 25,
      },
    },
  },

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
  {
    id: BlockId(103),
    definition: {
      type: 'crafting_table',
      capabilities: { flammable: true },
      properties: { hardness: 40, harvestTool: FASTER_WITH_AXE },
    },
  },
  { id: BlockId(104), definition: { type: 'furnace', properties: { hardness: 55, friction: 0.8 } } },
  {
    id: BlockId(105),
    definition: {
      type: 'chest',
      capabilities: { flammable: true },
      properties: { hardness: 35, footstepMaterial: 'wood' },
    },
  },
  {
    id: BlockId(106),
    definition: {
      type: 'door',
      capabilities: { flammable: true, suffocates: false, validSpawnSurface: false },
      properties: { opacity: 'transparentSolid', hardness: 15, footstepMaterial: 'wood' },
    },
  },
  {
    id: BlockId(107),
    definition: {
      type: 'door_open',
      capabilities: { flammable: true, suffocates: false, validSpawnSurface: false },
      properties: { opacity: 'transparentSolid', hardness: 15, drops: { ...DEFAULT_BLOCK_DROP, item: 'door' } },
    },
  },
  {
    id: BlockId(108),
    definition: {
      type: 'oak_stairs',
      capabilities: { flammable: true, suffocates: false },
      properties: { opacity: 'transparentSolid', hardness: 35 },
    },
  },
  {
    id: BlockId(109),
    definition: {
      type: 'anvil',
      properties: { hardness: 75, harvestTool: NEEDS_WOODEN_PICKAXE },
    },
  },
  {
    id: BlockId(110),
    definition: {
      type: 'cauldron',
      properties: { hardness: 35, harvestTool: NEEDS_WOODEN_PICKAXE },
    },
  },
  {
    id: BlockId(111),
    definition: {
      type: 'water_cauldron',
      properties: {
        hardness: 35,
        harvestTool: NEEDS_WOODEN_PICKAXE,
        drops: { ...DEFAULT_BLOCK_DROP, item: 'cauldron' },
      },
    },
  },
  {
    id: BlockId(112),
    definition: {
      type: 'bed',
      capabilities: { flammable: true, suffocates: false, validSpawnSurface: false },
      properties: { opacity: 'transparentSolid', hardness: 10 },
    },
  },
  {
    id: BlockId(113),
    definition: {
      type: 'enchanting_table',
      capabilities: { suffocates: false },
      properties: { hardness: 30 },
    },
  },
  {
    id: BlockId(114),
    definition: {
      type: 'brewing_stand',
      properties: { opacity: 'transparentSolid', hardness: 15 },
    },
  },
  { id: BlockId(115), definition: { type: 'tnt', capabilities: { flammable: true }, properties: { hardness: 0 } } },
  { id: BlockId(116), definition: { type: 'nether_brick', properties: { hardness: 40 } } },
  {
    id: BlockId(117),
    definition: {
      type: 'netherrack',
      capabilities: { fireSource: true },
      properties: { hardness: 5 },
    },
  },
  {
    id: BlockId(118),
    definition: {
      type: 'nether_portal',
      capabilities: { suffocates: false, validSpawnSurface: false },
      properties: {
        opacity: 'transparentSolid',
        lightEmission: 11,
        hardness: 0,
        friction: 0,
        // STATED, not left to the missing item form. Without this the row would
        // carry the default "yields itself", resolve to nothing because
        // `nether_portal` has no item, and be indistinguishable from an
        // oversight — which is the failure `test/item-drops.test.ts` now
        // forbids. A portal is lit by a rule and is never carried.
        drops: DROPS_NOTHING,
      },
    },
  },
  {
    id: BlockId(119),
    definition: {
      type: 'fire',
      properties: {
        opacity: 'transparentSolid',
        lightEmission: 15,
        hardness: 0,
        friction: 0,
        // Fire is the third of the three world-state rows. It is also the row
        // that says `flammable: false` and `fireSource: false` by saying nothing
        // — fire neither catches fire (`FLAMMABLE_BLOCK_TYPES` omits it) nor
        // sustains one (`isFireSourceIndex` is NETHERRACK and LAVA only).
        drops: DROPS_NOTHING,
      },
    },
  },
  { id: BlockId(120), definition: { type: 'soul_soil', properties: { hardness: 5 } } },
  {
    id: BlockId(121),
    definition: {
      type: 'wither_skeleton_skull',
      capabilities: {
        suffocates: false,
        validSpawnSurface: false,
        canSupportAttachments: false,
      },
      properties: {
        opacity: 'transparentSolid',
        collisionShape: 'none',
        supportRule: NEEDS_ANY_SUPPORT,
      },
    },
  },
  { id: BlockId(122), definition: { type: 'dropper', properties: { hardness: 60 } } },
]

// ---------------------------------------------------------------------------
// Derived lookups. Everything below is computed from BLOCK_REGISTRY once, at
// module load, so that no consumer is tempted to build its own index.
// ---------------------------------------------------------------------------

const buildResolvedById = (): ReadonlyArray<ResolvedBlock | undefined> => {
  const table: Array<ResolvedBlock | undefined> = Array.from({ length: BLOCK_ID_MAX + 1 }, () => undefined)

  for (const entry of BLOCK_REGISTRY) {
    table[entry.id] = resolveBlock(entry.definition)
  }

  return table
}

/** Dense, id-indexed. A plain array read, because this is on the meshing path. */
const RESOLVED_BY_ID = buildResolvedById()

const isAddressableBlockId = (id: number): boolean =>
  Number.isInteger(id) && id >= 0 && id <= BLOCK_ID_MAX

const buildCapabilitiesById = (): Readonly<Record<BlockCapabilityFlag, Uint8Array>> => {
  const columns = {} as Record<BlockCapabilityFlag, Uint8Array>

  for (const flag of BLOCK_CAPABILITY_FLAGS) {
    const column = new Uint8Array(BLOCK_ID_MAX + 1)
    column.fill(BLOCK_CAPABILITY_DEFAULTS[flag] ? 1 : 0)
    columns[flag] = column
  }

  for (const entry of BLOCK_REGISTRY) {
    const resolved = RESOLVED_BY_ID[entry.id]
    if (resolved === undefined) continue

    for (const flag of BLOCK_CAPABILITY_FLAGS) {
      columns[flag][entry.id] = resolved.capabilities[flag] ? 1 : 0
    }
  }

  return columns
}

const CAPABILITIES_BY_ID = buildCapabilitiesById()

const buildPropertyColumns = (): {
  readonly opacity: ReadonlyArray<BlockOpacity>
  readonly lightEmission: Uint8Array
  readonly supportRule: ReadonlyArray<SupportRule>
  readonly supportSensitive: Uint8Array
} => {
  const opacity: BlockOpacity[] = Array.from({ length: BLOCK_ID_MAX + 1 }, () => BLOCK_PROPERTY_DEFAULTS.opacity)
  const lightEmission = new Uint8Array(BLOCK_ID_MAX + 1)
  const supportRule: SupportRule[] = Array.from(
    { length: BLOCK_ID_MAX + 1 },
    () => BLOCK_PROPERTY_DEFAULTS.supportRule,
  )
  const supportSensitive = new Uint8Array(BLOCK_ID_MAX + 1)

  lightEmission.fill(BLOCK_PROPERTY_DEFAULTS.lightEmission)

  for (const entry of BLOCK_REGISTRY) {
    const resolved = RESOLVED_BY_ID[entry.id]
    if (resolved === undefined) continue

    const { properties } = resolved
    opacity[entry.id] = properties.opacity
    lightEmission[entry.id] = properties.lightEmission
    supportRule[entry.id] = properties.supportRule
    supportSensitive[entry.id] = isSupportSensitive(properties.supportRule) ? 1 : 0
  }

  return { opacity, lightEmission, supportRule, supportSensitive }
}

const PROPERTY_COLUMNS = buildPropertyColumns()

const buildIdByType = (): Readonly<Record<BlockType, BlockId>> => {
  const table: Partial<Record<BlockType, BlockId>> = {}

  for (const entry of BLOCK_REGISTRY) {
    table[entry.definition.type] = entry.id
  }

  for (const type of BLOCK_TYPES) {
    if (table[type] === undefined) {
      throw new Error(`Block registry is missing a row for ${type}`)
    }
  }

  return table as Readonly<Record<BlockType, BlockId>>
}

const ID_BY_TYPE = buildIdByType()

/**
 * Every id currently assigned, ascending. Holes left by a removed block are
 * absent from this array but still consume their number forever.
 */
export const BLOCK_IDS: ReadonlyArray<BlockId> = BLOCK_REGISTRY.map((entry) => entry.id)

/**
 * `BlockType` -> id. Registry completeness is validated at initialization;
 * unknown values that bypass the type guard preserve the historic air fallback.
 */
export const blockIdOf = (type: BlockType): BlockId => ID_BY_TYPE[type] ?? AIR_BLOCK_ID

/** id -> `BlockType`. `undefined` for a byte this build does not recognise. */
export function blockTypeOfId(id: BlockId): BlockType
export function blockTypeOfId(id: number): BlockType | undefined
export function blockTypeOfId(id: number): BlockType | undefined {
  return isAddressableBlockId(id) ? RESOLVED_BY_ID[id]?.type : undefined
}

/** id -> the fully resolved row. `undefined` for an unrecognised byte. */
export function resolvedBlockOfId(id: BlockId): ResolvedBlock
export function resolvedBlockOfId(id: number): ResolvedBlock | undefined
export function resolvedBlockOfId(id: number): ResolvedBlock | undefined {
  return isAddressableBlockId(id) ? RESOLVED_BY_ID[id] : undefined
}

/** Does this number name a block this build knows about? */
export const isKnownBlockId = (id: number): id is BlockId => resolvedBlockOfId(id) !== undefined

/**
 * Read one capability straight off a chunk buffer byte. TOTAL — see the module
 * header on why an unknown id resolves to an ordinary opaque cube.
 *
 * This is THE function the vertical slice was missing: `fallsWhenUnsupported`
 * for the byte that came out of a `Uint8Array`, with no block name anywhere in
 * the caller.
 */
export const capabilityOfBlockId = (id: number, flag: BlockCapabilityFlag): boolean =>
  isAddressableBlockId(id) ? CAPABILITIES_BY_ID[flag][id] === 1 : BLOCK_CAPABILITY_DEFAULTS[flag]

/** Read one property straight off a chunk buffer byte. TOTAL, same rule. */
export const propertyOfBlockId = <K extends BlockPropertyName>(id: number, name: K): BlockProperties[K] =>
  resolvedBlockOfId(id)?.properties[name] ?? BLOCK_PROPERTY_DEFAULTS[name]

/** Both halves at once, for a caller that needs several answers about one byte. */
export const capabilitiesOfBlockId = (id: number): BlockCapabilities =>
  resolvedBlockOfId(id)?.capabilities ?? BLOCK_CAPABILITY_DEFAULTS

/**
 * Chunk buffer byte -> the item that lands in the inventory. THE mining bridge.
 *
 * This is the function mc-compose's cross-module E2E suite could not write.
 * `breakBlock` yields a `BlockId` — a number out of a `Uint8Array` — and
 * `InventoryService.add` takes an item; nothing in kernel joined the two, so
 * "mining reflected in the inventory", the whole reason mc-compose exists,
 * could not be expressed. One call, no block name on the read side, exactly as
 * `capabilityOfBlockId` is for the falling-block rule.
 *
 * TOTAL, and `undefined` is a first-class answer meaning "nothing drops" — the
 * bare-handed swing at stone, the pane of glass without silk touch, the block
 * that yields nothing to anyone.
 *
 * An UNKNOWN id also yields `undefined`, which is a different rule from
 * `capabilityOfBlockId`'s (that one falls back to the defaults, i.e. to stone).
 * The two are consistent on the principle rather than on the mechanism: the
 * inert reading is the safe one. For a capability, inert means "an ordinary
 * cube that does nothing"; for a drop, an ordinary cube would mean MINTING AN
 * ITEM out of a byte this build cannot name — a corrupt chunk or a save from a
 * newer build would quietly print items into inventories. Nothing is the only
 * defensible answer.
 */
export const dropOfBlockId = (id: number, context: HarvestContext = BARE_HANDED): BlockDrop | undefined => {
  const resolved = resolvedBlockOfId(id)

  return resolved === undefined
    ? undefined
    : resolveDrop(resolved.properties.harvestTool, resolved.properties.drops, resolved.type, context)
}

/**
 * Keyed by a `Record` and not a `Map`, because the key set here IS
 * `BlockCapabilityFlag` — the loop below visits every flag, so every flag has a
 * bucket. Spelled as a `Map`, that totality was invisible to the type system
 * and `blockIdsWithCapability` had to end in `?? new Set()`, an arm no
 * well-typed caller could reach. A `Record` states the same fact where the
 * compiler can use it, and the empty bucket for a flag no block carries is
 * produced by the loop rather than conjured by a fallback.
 */
const buildIdsByCapability = (): Readonly<Record<BlockCapabilityFlag, ReadonlySet<number>>> => {
  const table: Partial<Record<BlockCapabilityFlag, ReadonlySet<number>>> = {}

  for (const flag of BLOCK_CAPABILITY_FLAGS) {
    const members = new Set<number>()
    for (const entry of BLOCK_REGISTRY) {
      if (capabilityOfBlockId(entry.id, flag)) {
        members.add(entry.id)
      }
    }
    table[flag] = members
  }

  return table as Readonly<Record<BlockCapabilityFlag, ReadonlySet<number>>>
}

const IDS_BY_CAPABILITY = buildIdsByCapability()

/**
 * The set of ids carrying a capability, as a NATIVE `Set<number>`.
 *
 * Native and not `HashSet` on purpose: the design contract records that mc-meshing's
 * `transparentBlockIds` membership test runs ~400k times per chunk and that
 * Effect's `HashSet` is too slow there because it compares structurally. This
 * is the sanctioned way for a hot path to get a membership test out of the
 * capability model without hard-coding ids.
 *
 * The returned set is shared and must not be mutated. It is typed
 * `ReadonlySet<number>` rather than `ReadonlySet<BlockId>` because the caller
 * holds raw buffer bytes, and forcing a brand at 400k calls per chunk would
 * mean either a cast or a validation on the hot path.
 */
export const blockIdsWithCapability = (flag: BlockCapabilityFlag): ReadonlySet<number> => IDS_BY_CAPABILITY[flag]

/**
 * Every bucket is SEEDED before the rows are walked, which is the difference
 * that matters and the reason this is not simply the shape above.
 *
 * Bucketing the registry rows alone gives a table whose keys are the opacities
 * some block happens to HAVE, not the opacities that exist. `BlockOpacity` has
 * three members and the roster is deliberately partial (`./block-type`), so an
 * opacity with no blocks in it is an ordinary state, not a corrupt one — and it
 * used to be served by a `?? new Set()` in the reader, i.e. by an arm that
 * could not run while all three were inhabited and would have started running
 * the day one was not. Seeding turns that into a guarantee: the empty bucket
 * exists because it was created, so `blockIdsWithOpacity` is total for reasons
 * a reader can see, and meshing cannot be handed an `undefined` where it
 * expects a set.
 */
const buildIdsByOpacity = (): Readonly<Record<BlockOpacity, ReadonlySet<number>>> => {
  const table = Object.fromEntries(BLOCK_OPACITIES.map((opacity) => [opacity, new Set<number>()])) as Record<
    BlockOpacity,
    Set<number>
  >

  for (const entry of BLOCK_REGISTRY) {
    table[propertyOfBlockId(entry.id, 'opacity')].add(entry.id)
  }

  return table
}

const IDS_BY_OPACITY = buildIdsByOpacity()

/**
 * The set of ids in one meshing bucket, as a native `Set<number>`.
 *
 * mc-meshing's `config.transparentBlockIds` is exactly
 * `blockIdsWithOpacity('transparentSolid')`, and its water set is
 * `blockIdsWithOpacity('fluid')`. the design contract keeps the injection point — the
 * config — so meshing still receives the sets rather than importing this
 * module on its hot path.
 */
export const blockIdsWithOpacity = (opacity: BlockOpacity): ReadonlySet<number> => IDS_BY_OPACITY[opacity]

// ---------------------------------------------------------------------------
// The light pair, named. Not new capabilities — named readings of two existing
// property columns.
// ---------------------------------------------------------------------------
//
// `opacity` and `lightEmission` have been real kernel properties since
// `./block-properties` was written (audit §4.4 settles both: three classes, and
// a 0..15 level rather than the `emissive: boolean` the design contract asked for).
// They were readable only through the GENERIC accessor, `propertyOfBlockId(id,
// 'opacity')`, and that is the whole of what was missing here.
//
// The generic accessor is the right shape for a caller that already knows the
// property model. It is the wrong shape for the one caller that cannot import
// the property model at all: mc-worldgen mirrors kernel rather than depending on
// it (the design contract Step 3 publishes bottom-up, and nothing is published yet), so
// its `domain/kernel-vocabulary.ts` must restate whatever it uses. Restating
// `propertyOfBlockId` means restating `BlockPropertyName`, `BlockProperties` and
// the generic index that ties them together — the entire property mechanism —
// in order to ask two questions. It reasonably declined, declared the two
// readings it needed as named functions, and thereby ran ahead of its source.
//
// Kernel grants the names, for kernel's own reason rather than as a courtesy:
// a mirror that runs ahead of its source typechecks locally, ships a table the
// source rejects, and breaks on the one day the mirror discipline promises will
// be uneventful. `./item-type`'s header records the same argument at length for
// the seven `ItemType` literals mc-sim needed, and the answer there was the same
// — grant them, each with a reason of its own.
//
// These three are deliberately the ONLY named property readings kernel exports.
// A named accessor per property would be thirteen functions restating the table
// they read, which is the double-management `./block-properties` exists to
// avoid. The light pair earns the exception because it has an off-repository
// consumer that cannot express the generic form.

/**
 * The meshing bucket and light-attenuation class of a chunk buffer byte.
 *
 * TOTAL, by delegation: an id this build cannot name reads as `'opaque'`,
 * because that is `BLOCK_PROPERTY_DEFAULTS.opacity` and audit §7 settles every
 * default at 「普通の不透明立方体」.
 */
export const opacityOfBlockId = (id: number): BlockOpacity =>
  isAddressableBlockId(id) ? PROPERTY_COLUMNS.opacity[id] ?? BLOCK_PROPERTY_DEFAULTS.opacity : BLOCK_PROPERTY_DEFAULTS.opacity

/**
 * The light a chunk buffer byte emits, 0..15.
 *
 * TOTAL, same rule: an unrecognised byte emits `LIGHT_LEVEL_MIN`. That is the
 * inert reading — an unknown block sitting in the dark, rather than an unknown
 * block lighting a cave it has no business lighting.
 */
export const lightEmissionOfBlockId = (id: number): LightLevel =>
  isAddressableBlockId(id)
    ? LightLevel(PROPERTY_COLUMNS.lightEmission[id] ?? BLOCK_PROPERTY_DEFAULTS.lightEmission)
    : BLOCK_PROPERTY_DEFAULTS.lightEmission

/**
 * May light cross this cell at all?
 *
 * DELIBERATELY BINARY, and the binary is a transcription rather than a
 * simplification. Vanilla attenuates sky light by more than one level through
 * water and through leaves; the REFERENCE does not. Audit §4.4 records that
 * `light.ts:14-17` builds its attenuation table from `properties.transparency`,
 * which is a BOOLEAN — so the reference's own attenuation is two-valued, and
 * `BlockOpacity` carries three CLASSES with no attenuation amount attached to
 * any of them.
 *
 * A per-class number invented here would therefore be content with no source,
 * which is the failure audit §4.9.1(c) names when it explains why
 * `validSpawnSurface` was transcribed rather than inferred: 「ここで推論すると、
 * それはコンテンツの捏造になる」. The same reasoning forbids deciding here that
 * water costs 3 and leaves cost 2.
 *
 * The additive fix is already identified on both sides. When the reference
 * yields a real per-class attenuation, it lands as a `lightAttenuation`
 * property — one line in `BlockProperties`, one in `BLOCK_PROPERTY_DEFAULTS` —
 * and this function becomes a lookup of it. mc-worldgen's
 * `historical design audit` DN-7 records the divergence and its visible
 * consequence from the consumer side: a canopy of oak leaves does not dim the
 * ground beneath it, so a hostile cannot spawn under a tree in daylight that
 * vanilla would allow. That is the BRIGHT direction, which is the conservative
 * one for the single rule reading that grid.
 *
 * Note what this is NOT: `!passable`, `!suffocates`, or any other solidity
 * flag. Audit §4.9 spends a section on the five "non-solid" concepts that
 * disagree row by row, and `opacity` disagrees with all of them — `glass` is
 * `transparentSolid` AND collides AND is not a spawn surface; `glowstone` is
 * `'opaque'` and emits 15. A capability that agreed with an existing flag on
 * every row would not be a capability.
 */
export const transmitsLight = (id: number): boolean =>
  (isAddressableBlockId(id) ? PROPERTY_COLUMNS.opacity[id] : BLOCK_PROPERTY_DEFAULTS.opacity) !== 'opaque'

// ---------------------------------------------------------------------------
// Support: one named property reading and the JOIN that reads two bytes
// ---------------------------------------------------------------------------
//
// `supportRuleOfBlockId` is a fourth named property reading, and the paragraph
// above says the light pair are deliberately the only ones — so this needs the
// same kind of reason rather than a shrug. It has one, and it is stronger than
// mc-worldgen's: the reading is not the point, `canBlockStaySupported` is, and
// that function needs the rule of ONE byte and a capability of ANOTHER. Naming
// the reading is what lets the join below be four lines that a reader can check
// against `block-support.ts:96-101` line for line.
//
// The other half is the caller's: a placement rule reads the cell BELOW only
// when the held block is support-sensitive, which is a store call it skips on
// the stone a player spends a session stacking. Deciding that needs the rule
// before the second read exists, so the join cannot answer it.

/**
 * The support rule of a chunk buffer byte.
 *
 * TOTAL, by delegation: an id this build cannot name requires nothing below,
 * because that is `BLOCK_PROPERTY_DEFAULTS.supportRule`. The inert reading
 * again — an unknown block sits where it was put rather than popping off.
 */
export const supportRuleOfBlockId = (id: number): SupportRule =>
  isAddressableBlockId(id)
    ? (PROPERTY_COLUMNS.supportRule[id] ?? BLOCK_PROPERTY_DEFAULTS.supportRule)
    : BLOCK_PROPERTY_DEFAULTS.supportRule

/**
 * Does this byte care what is under it?
 *
 * `SUPPORT_SENSITIVE_BLOCK_TYPES` (`block-support.ts:22-32`) as a question about
 * a byte. `false` for an unknown id, which is the permissive direction and is
 * chosen: the alternative refuses to place an unnameable block for a reason
 * nobody can state, and `capabilityOfBlockId` has already settled that an
 * unknown byte reads as an ordinary cube.
 */
export const isSupportSensitiveBlockId = (id: number): boolean =>
  isAddressableBlockId(id) && PROPERTY_COLUMNS.supportSensitive[id] === 1

/**
 * `canBlockStaySupported` (`block-support.ts:96-101`), on two chunk buffer
 * bytes: the block being held up, and the block under it.
 *
 * THE function this column exists for, and the shape is `dropOfBlockId`'s — a
 * JOIN of two columns that no single accessor can express, offered so that a
 * consumer does not reassemble it and get the precedence backwards. The
 * precedence is the part that goes wrong: the per-block list wins over the
 * negative set, and a caller that checks `canSupportAttachments` FIRST refuses
 * a lily pad on water before the rule that permits it ever runs.
 *
 * TOTAL in both arguments. Note that this answers PLACEMENT and would equally
 * answer a maintenance sweep ("should this block pop off now?"); kernel has no
 * opinion about which, because it holds no world.
 */
export const canBlockStaySupported = (id: number, supportBelow: number): boolean =>
  satisfiesSupportRule(
    supportRuleOfBlockId(id),
    blockTypeOfId(supportBelow),
    isAddressableBlockId(supportBelow)
      ? CAPABILITIES_BY_ID.canSupportAttachments[supportBelow] === 1
      : BLOCK_CAPABILITY_DEFAULTS.canSupportAttachments,
  )

/**
 * Block types in the vocabulary that the table does not yet cover.
 *
 * `BLOCK_TYPES` is deliberately incomplete (36 of the reference's 120, a figure
 * re-derived in `./block-type`), and the table is allowed to lag it — but
 * silently is not allowed. This constant makes the gap data a test can assert
 * on, in the same spirit as `PENDING_CAPABILITIES` in `./block-definition`.
 *
 * In practice it is always empty, because `test/block-registry.test.ts` asserts
 * exactly that: a literal added to the vocabulary without a row here fails the
 * suite. That is the mechanism which keeps "adding a block is one row" honest in
 * the direction that actually goes wrong — a name with no capabilities behind
 * it, which every consumer would then read as an ordinary opaque cube.
 */
export const UNREGISTERED_BLOCK_TYPES: ReadonlyArray<BlockType> = BLOCK_TYPES.filter(
  (type) => !Object.hasOwn(ID_BY_TYPE, type),
)
