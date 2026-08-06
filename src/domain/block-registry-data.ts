/**
 * Stable block ID registry and O(1) metadata lookups for chunk buffers.
 *
 * IDs are wire-format values: entries stay explicit, are never reused, and
 * unknown values resolve to inert defaults so chunk reads remain total.
 */
import { BARE_HANDED, type BlockDrop, DEFAULT_BLOCK_DROP, DEFAULT_HARVEST_TOOL, type HarvestContext, resolveDrop } from './block-harvest.js';
import { BLOCK_CAPABILITY_DEFAULTS, BLOCK_CAPABILITY_FLAGS, type BlockCapabilities, type BlockCapabilityFlag } from './block-capabilities.js';
import { BLOCK_ID_MAX, type BlockId, type BlockRegistryEntry, BlockId as createBlockId } from './block-registry-types.js';
import { BLOCK_OPACITIES, BLOCK_PROPERTY_DEFAULTS, type BlockOpacity, type BlockProperties, type BlockPropertyName } from './block-properties.js';
import { BLOCK_TYPES, type BlockType } from './block-type.js';
import { NEEDS_ANY_SUPPORT, type SupportRule, isSupportSensitive, needsOneOf, satisfiesSupportRule } from './block-support.js';
import { type ResolvedBlock, resolveBlock } from './block-definition.js';
/**
 * Drops nothing, to anyone, ever.
 *
 * Spelled as a spread of the default rather than as a four-member literal,
 * which is the rule `docs/versioning.md` §5-3 states for consumers and which
 * the table below follows for itself: a hand-written full record gains a
 * required key every time `BlockDropRule` grows, and that is the breakage this
 * whole design exists to avoid.
 */
const DROPS_NOTHING = { ...DEFAULT_BLOCK_DROP, ...{ count: 0 } as const } as const;
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
const NEEDS_WOODEN_PICKAXE = { ...DEFAULT_HARVEST_TOOL, ...{ category: 'pickaxe' } as const, ...{ minTier: 'wooden' } as const } as const;
const NEEDS_STONE_PICKAXE = { ...DEFAULT_HARVEST_TOOL, ...{ category: 'pickaxe' } as const, ...{ minTier: 'stone' } as const } as const;
const NEEDS_IRON_PICKAXE = { ...DEFAULT_HARVEST_TOOL, ...{ category: 'pickaxe' } as const, ...{ minTier: 'iron' } as const } as const;
const NEEDS_DIAMOND_PICKAXE = { ...DEFAULT_HARVEST_TOOL, ...{ category: 'pickaxe' } as const, ...{ minTier: 'diamond' } as const } as const;
/**
 * Category-only requirements: faster with the named tool, but NOT gated.
 *
 * `satisfiesHarvestTier` never reads `category`, so these rows change break
 * SPEED and nothing else. They are in the table precisely because forgetting
 * that the two axes are independent is the bug `./block-harvest` is shaped to
 * prevent, and a table with no category-only row would never exercise it.
 */
const FASTER_WITH_SHOVEL = { ...DEFAULT_HARVEST_TOOL, ...{ category: 'shovel' } as const } as const;
const FASTER_WITH_AXE = { ...DEFAULT_HARVEST_TOOL, ...{ category: 'axe' } as const } as const;
const FASTER_WITH_SHEARS = { ...DEFAULT_HARVEST_TOOL, ...{ category: 'shears' } as const } as const;
// ---------------------------------------------------------------------------
// Shared plant rows, because the REFERENCE shares them
// ---------------------------------------------------------------------------
//
// These two constants are not a shortcut for typing the same override five
// Times. They exist because `block-support.ts:4-12` defines exactly one set,
// `SURFACE_PLANT_BLOCK_TYPES`, and then feeds that one set into
// `SUPPORT_SENSITIVE_BLOCK_TYPES` (:22), `WATER_BREAKABLE_BLOCK_TYPES` (:34)
// And `NON_SUPPORTING_BLOCK_TYPES` (:47) — while `environment-hazard.config.ts`
// And `spawn-selection-search.ts` list the same seven names individually and
// Happen to agree. Writing the seven rows out separately would be a claim that
// They were decided separately, which is not what the source says.
//
// The membership was checked name-by-name across all five tables rather than
// Assumed from the grouping; see the block comment on the plant rows below.
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
    ...{ passable: true } as const,
    ...{ brokenByWaterFlow: true } as const,
    ...{ canSupportAttachments: false } as const,
    ...{ suffocates: false } as const,
    ...{ validSpawnSurface: false } as const
} as const;
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
    ...{ opacity: 'transparentSolid' } as const,
    ...{ collisionShape: 'none' } as const,
    ...{ hardness: 0 } as const,
    ...{ friction: 0 } as const
} as const;
// ---------------------------------------------------------------------------
// SupportRule: the five per-block lists, and the fallback (audit §4.6)
// ---------------------------------------------------------------------------
//
// `SUPPORT_RULE_ENTRIES` (`block-support.ts:75-89`) has exactly five distinct
// Values across thirteen blocks, and they are named here rather than repeated
// Per row so that the seven surface plants demonstrably share ONE rule instead
// Of seven rules that happen to agree — the same argument
// `SURFACE_PLANT_CAPABILITIES` above makes about capabilities.
//
// `supportRule` is NOT part of `PLANT_PROPERTIES`, and that is the whole shape
// Of this column: `PLANT_PROPERTIES` is shared by fourteen rows that take FOUR
// Different support rules (surface plants, sugar cane, cactus, lily pad) and by
// `kelp` / `seagrass`, which take none at all. A support rule folded into the
// Shared plant block would have given a kelp the floor requirements of a fern.
//
// SIX BLOCKS FALL THROUGH TO THE FALLBACK, and they are named where they sit:
// `torch`, `redstone_torch`, `redstone_wire`, `pressure_plate`, `rail` and
// `powered_rail`. The reference gives them no `SUPPORT_RULES` entry — an
// ABSENCE, so their rows cite `block-support.ts:23-28` (their membership of the
// Sensitive set) and the absence of a line between :75 and :89. They get
// `NEEDS_ANY_SUPPORT`, which is that absence written down.
/** Wheat and potatoes grow only on farmland. */
const NEEDS_FARMLAND: SupportRule = needsOneOf('farmland');
/** Nether wart grows only on soul sand. */
const NEEDS_SOUL_SAND: SupportRule = needsOneOf('soul_sand');
/**
 * `SURFACE_PLANT_SUPPORT_BLOCK_TYPES` (`block-support.ts:63-67`), for the seven
 * members of `SURFACE_PLANT_BLOCK_TYPES` (:4-12).
 *
 * The reference's `GRASS` is the grass BLOCK and is `grass_block` here; its
 * `TALL_GRASS` is a different literal and is one of the seven plants this rule
 * applies TO, not one of the three it names.
 */
const NEEDS_PLANTABLE_GROUND: SupportRule = needsOneOf('dirt', 'grass_block', 'farmland');
/** `SUGAR_CANE_SUPPORT_BLOCK_TYPES` (`block-support.ts:68`). Stacks on itself. */
const NEEDS_SUGAR_CANE_GROUND: SupportRule = needsOneOf('dirt', 'grass_block', 'sand', 'sugar_cane');
/** `CACTUS_SUPPORT_BLOCK_TYPES` (`block-support.ts:69`). Stacks on itself. */
const NEEDS_SAND_OR_CACTUS: SupportRule = needsOneOf('sand', 'cactus');
/**
 * `block-support.ts:84`. THE row that makes this column worth having.
 *
 * `water` is in `NON_SUPPORTING_BLOCK_TYPES` (:49), so the fallback arm refuses
 * a lily pad on water and allows it on stone — wrong in both directions at once,
 * on the only cell a lily pad belongs on. mx-gameplay's F7 measured exactly that
 * and could not fix it without this column.
 */
const NEEDS_WATER: SupportRule = needsOneOf('water');
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
const FIRST_REGISTERED_BLOCK_ID = 0;

const nextRegisteredBlockId = (() => {
    let nextId = FIRST_REGISTERED_BLOCK_ID;
    return (): BlockId => createBlockId(nextId++);
})();

export const BLOCK_REGISTRY: ReadonlyArray<BlockRegistryEntry> = [
    {
        ...{
            // Not a block so much as the absence of one. Everything about it is an
            // Override, which is what you would expect of the one entry that is not a
            // Cube at all.
            id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'air' } as const,
                ...{ capabilities: {
                        ...{ passable: true } as const,
                        ...{ replaceable: true } as const,
                        ...{ suffocates: false } as const,
                        ...{ canSupportAttachments: false } as const,
                        ...{ validSpawnSurface: false } as const
                    } } as const,
                ...{ properties: {
                        ...{
                            // NOTE: `BLOCK_OPACITIES` has no 'invisible' member, so air is filed
                            // Under the nearest non-attenuating class. Consumers branch on
                            // `id === AIR_BLOCK_ID` before consulting opacity (mc-meshing already
                            // Does), so nothing reads this today. Recorded rather than fixed,
                            // Because adding an opacity member is an audit change and audit §4.4
                            // Enumerates exactly three.
                            opacity: 'transparentSolid' } as const,
                        ...{ collisionShape: 'none' } as const,
                        ...{ renderKind: 'cube' } as const,
                        ...{ hardness: 0 } as const,
                        ...{
                            // `blocks.config.terrain.ts` `block:air`. Nothing stands on air, so this
                            // Is transcription for the column's sake rather than a value with a
                            // Consequence — but a column that is right except where nobody looks is
                            // A column nobody can check.
                            friction: 0 } as const,
                        ...{
                            // Swinging at empty space must not manufacture an item. mx-gameplay's
                            // `breakBlock` already refuses to reach here (`Unchanged` ->
                            // `NothingThere`), but the table must not depend on the caller getting
                            // That right: `air` is a sentinel, not a thing (audit §6-6).
                            drops: DROPS_NOTHING } as const
                    } } as const
            } } as const
    },
    {
        ...{
            // The design contract: the piston-immovable set is a kernel capability rather than
            // The reference's local constant.
            id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'bedrock' } as const,
                ...{ capabilities: { ...{ pistonImmovable: true } as const } } as const,
                ...{ properties: { ...{ hardness: 100 } as const, ...{ friction: 0.8 } as const, ...{ drops: DROPS_NOTHING } as const } } as const
            } } as const
    },
    {
        ...{
            // THE tool-gated row, and the reason `harvestTool` and `drops` are one
            // Decision rather than two: stone mined bare-handed yields nothing, and
            // Stone mined with a pickaxe yields something that is not stone.
            id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'stone' } as const,
                ...{ properties: {
                        ...{
                            // CORRECTED, with the whole `hardness` column — see the block comment
                            // Above `BLOCK_REGISTRY`. This row said nothing and so resolved to the
                            // Default 8, which claimed stone is exactly as hard as dirt.
                            hardness: 25 } as const,
                        ...{ friction: 0.8 } as const,
                        ...{ footstepMaterial: 'stone' } as const,
                        ...{ harvestTool: NEEDS_WOODEN_PICKAXE } as const,
                        ...{ drops: { ...DEFAULT_BLOCK_DROP, ...{ item: 'cobblestone' } as const, ...{ silkTouchItem: 'stone' } as const } } as const
                    } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'dirt' } as const,
                ...{ capabilities: { ...{ tillable: true } as const } } as const,
                ...{ properties: { ...{ harvestTool: FASTER_WITH_SHOVEL } as const, ...{ footstepMaterial: 'grass' } as const } } as const
            } } as const
    },
    {
        ...{
            // Different-drop with NO tool gate — the row that keeps the two axes
            // Visibly separate. Grass yields dirt to bare hands.
            id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'grass_block' } as const,
                ...{ capabilities: { ...{ tillable: true } as const } } as const,
                ...{ properties: {
                        ...{ hardness: 10 } as const,
                        ...{ harvestTool: FASTER_WITH_SHOVEL } as const,
                        ...{ footstepMaterial: 'grass' } as const,
                        ...{ drops: { ...DEFAULT_BLOCK_DROP, ...{ item: 'dirt' } as const, ...{ silkTouchItem: 'grass_block' } as const } } as const
                    } } as const
            } } as const
    },
    {
        ...{
            // The block the vertical slice is about. `fallsWhenUnsupported` here is what
            // Lets mx-gameplay's falling-block rule read a chunk buffer byte and decide,
            // Instead of testing `blockType === 'SAND'` (the design contract).
            id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'sand' } as const,
                ...{ capabilities: { ...{ fallsWhenUnsupported: true } as const } } as const,
                ...{ properties: { ...{ hardness: 8 } as const, ...{ friction: 0.5 } as const, ...{ harvestTool: FASTER_WITH_SHOVEL } as const, ...{ footstepMaterial: 'stone' } as const } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'water' } as const,
                ...{ capabilities: {
                        ...{ passable: true } as const,
                        ...{ replaceable: true } as const,
                        ...{ suffocates: false } as const,
                        ...{ canSupportAttachments: false } as const,
                        ...{ validSpawnSurface: false } as const
                    } } as const,
                ...{ properties: {
                        ...{ opacity: 'fluid' } as const,
                        ...{ fluid: 'water' } as const,
                        ...{ collisionShape: 'none' } as const,
                        ...{ renderKind: 'fluid' } as const,
                        ...{ hardness: 0 } as const,
                        ...{ friction: 0 } as const,
                        ...{ drops: DROPS_NOTHING } as const
                    } } as const
            } } as const
    },
    {
        ...{
            // Audit §4.9: SNOW is non-supporting but NOT passable. It is the row that
            // Proves `passable` and `canSupportAttachments` are two capabilities.
            id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'snow' } as const,
                ...{ capabilities: { ...{ canSupportAttachments: false } as const } } as const,
                ...{
                    // THE DAY ARRIVED, AND THIS IS THE ONE-LINE CHANGE. This row used to say
                    // `DROPS_NOTHING` with a note that vanilla yields snowballs, that
                    // `snowball` was not in `ITEM_TYPES`, and that inventing it would be the
                    // Guessed-roster failure. The item now exists on the same evidence every
                    // Other drop target rests on — `INVENTORY_DROP_OVERRIDES` maps
                    // SNOW -> SNOWBALL (`block-service.config.ts:183`) — so the gap is closed
                    // By transcription rather than by invention.
                    //
                    // `count: 4` is `BLOCK_BASE_DROP_COUNT` (:204-215), which lists SNOW with
                    // The ores. A shovelled snow layer yields four snowballs.
                    properties: {
                        ...{ hardness: 2 } as const,
                        ...{ friction: 0.3 } as const,
                        ...{ harvestTool: FASTER_WITH_SHOVEL } as const,
                        ...{ drops: { ...DEFAULT_BLOCK_DROP, ...{ item: 'snowball' } as const, ...{ count: 4 } as const } } as const
                    } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'gravel' } as const,
                ...{ capabilities: { ...{ fallsWhenUnsupported: true } as const } } as const,
                ...{
                    // Vanilla's 10% flint is a RANDOM drop, and audit §6-9 places random drop
                    // Rules in mx-gameplay ("`drops` では表現できない"). The deterministic
                    // Half — gravel yields gravel — is what belongs here.
                    properties: { ...{ hardness: 10 } as const, ...{ friction: 0.5 } as const, ...{ harvestTool: FASTER_WITH_SHOVEL } as const, ...{ footstepMaterial: 'stone' } as const } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'oak_log' } as const,
                ...{ capabilities: {
                        ...{ flammable: true } as const,
                        ...{ // Fire-lifecycle.ts:20 (`WOOD`)
                            // CORRECTED. This row said nothing about `validSpawnSurface` and so
                            // Resolved to the default `true`, but the reference lists `WOOD` in
                            // `NON_SPAWN_SURFACE_BLOCK_IDS` (`spawn-selection-search.ts:45`,
                            // Commented "log — semi-solid / tree") and again in
                            // `VILLAGE_NON_GROUND_IDS` (`village-placement-surface.ts:11`). Both
                            // Near-duplicate lists agree, which is rare enough in this family of
                            // Tables to be worth noting — the disagreement audit §4.9 measures is
                            // Between the lists, and here there is none to hide behind.
                            //
                            // The default was doing the damage silently: mobs and village placement
                            // Would treat the top of a tree trunk as ground. `mx-gameplay`'s
                            // Transcription (`chunk-store-port.ts`, `NON_SPAWN_SURFACE_IDS`) had the
                            // Same hole, and `pnpm check:mirrors` could not see it because
                            // `validSpawnSurface` had no probe in `MIRROR_SPECS`. It has one now.
                            validSpawnSurface: false } as const
                    } } as const,
                ...{
                    // CORRECTED. hardness was 2 — vanilla's float — which put a tree trunk
                    // BELOW the default 8 and so made a log softer than dirt. The reference
                    // Has 35, above cobblestone. The direction of the error is the reason the
                    // Whole column was re-derived rather than spot-fixed.
                    properties: { ...{ hardness: 35 } as const, ...{ harvestTool: FASTER_WITH_AXE } as const, ...{ footstepMaterial: 'wood' } as const } } as const
            } } as const
    },
    {
        ...{
            // Audit §4.9: LEAVES is not a spawn surface and does not suffocate, but IS
            // Solid for collision — `block-collision-predicates.ts:18-21` records the
            // Canopy fall-through bug that listing it as passable caused.
            id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'oak_leaves' } as const,
                ...{ capabilities: { ...{ flammable: true } as const, ...{ suffocates: false } as const, ...{ validSpawnSurface: false } as const } } as const,
                ...{
                    // THE no-drop row, and the one with an argument behind it rather than a
                    // Shrug. Vanilla leaves yield saplings and apples at a probability that
                    // Depends on fortune; audit §6-9 records that shape as inexpressible in
                    // `drops` and assigns it to mx-gameplay. Writing `item: 'oak_leaves'`
                    // Here to avoid an empty cell would be a WRONG answer rather than an
                    // Absent one, so the cell says nothing drops and the rule that owns the
                    // RNG adds the saplings.
                    properties: {
                        ...{ opacity: 'transparentSolid' } as const,
                        ...{ hardness: 3 } as const,
                        ...{ footstepMaterial: 'wood' } as const,
                        ...{
                            // DECLARED DIVERGENCE, kept. `shears` is not a category the reference's
                            // `isEffectiveTool` (`block-utils.ts:32-63`) knows — it has only
                            // Axe/shovel/pickaxe sets, and LEAVES is in none of them. The category
                            // Is kernel's, is speed-only (`satisfiesHarvestTier` never reads it, so
                            // It gates nothing), and exists so the table has a row exercising a
                            // Category with no tier. Recorded here because a value with no citation
                            // Must say that it has none.
                            harvestTool: FASTER_WITH_SHEARS } as const,
                        ...{ drops: DROPS_NOTHING } as const
                    } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'lava' } as const,
                ...{ capabilities: {
                        ...{ passable: true } as const,
                        ...{ replaceable: true } as const,
                        ...{ fireSource: true } as const,
                        ...{ suffocates: false } as const,
                        ...{ canSupportAttachments: false } as const,
                        ...{ validSpawnSurface: false } as const
                    } } as const,
                ...{ properties: {
                        ...{ opacity: 'fluid' } as const,
                        ...{ fluid: 'lava' } as const,
                        ...{ collisionShape: 'none' } as const,
                        ...{ renderKind: 'fluid' } as const,
                        ...{ lightEmission: 15 } as const,
                        ...{ contactDamage: 4 } as const,
                        ...{ hardness: 0 } as const,
                        ...{ friction: 0 } as const,
                        ...{ drops: DROPS_NOTHING } as const
                    } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'oak_planks' } as const,
                ...{ capabilities: { ...{ flammable: true } as const } } as const,
                ...{
                    // `PLANKS` is 35 in the reference with the comment "Vanilla planks 2.0 =
                    // Wood (35 on this scale), not stone-soft" — the reference wrote down the
                    // Exact mistake this row used to make.
                    properties: { ...{ hardness: 35 } as const, ...{ harvestTool: FASTER_WITH_AXE } as const, ...{ footstepMaterial: 'wood' } as const } } as const
            } } as const
    },
    {
        ...{
            // Audit §4.9: GLASS is non-suffocating and not a spawn surface but IS solid
            // For collision.
            id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'glass' } as const,
                ...{ capabilities: { ...{ suffocates: false } as const, ...{ validSpawnSurface: false } as const } } as const,
                ...{
                    // Glass remains a Silk Touch gate; block substitutions such as stone and
                    // Ores are modelled separately by `silkTouchItem` in block-harvest.
                    properties: {
                        ...{ opacity: 'transparentSolid' } as const,
                        ...{ hardness: 4 } as const,
                        ...{ drops: { ...DEFAULT_BLOCK_DROP, ...{ requiresSilkTouch: true } as const } } as const
                    } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'torch' } as const,
                ...{ capabilities: {
                        ...{ passable: true } as const,
                        ...{ brokenByWaterFlow: true } as const,
                        ...{ canSupportAttachments: false } as const,
                        ...{ validSpawnSurface: false } as const,
                        ...{ suffocates: false } as const
                    } } as const,
                ...{ properties: {
                        ...{ opacity: 'transparentSolid' } as const,
                        ...{ collisionShape: 'none' } as const,
                        ...{
                            // DECLARED DIVERGENCE, kept. `TORCH` is absent from `CROSS_PLANT_IDS`
                            // And from `plantMeshLookup` (`plant-mesh.ts:19-44`), so the reference
                            // Meshes it as a cube. `'cross'` is kernel's reading of what a torch
                            // Looks like, is not transcribed from anywhere, and says so here.
                            renderKind: 'cross' } as const,
                        ...{
                            // `light.ts:24-46` `EMISSIVE_LEVEL_OVERRIDES`: TORCH is 14, not 15. The
                            // One-level gap from glowstone is the reason `lightEmission` is a number
                            // And not the `emissive: boolean` the design contract asked for.
                            lightEmission: 14 } as const,
                        ...{ hardness: 1 } as const,
                        ...{ friction: 0.1 } as const,
                        ...{
                            // `block-support.ts:23` puts TORCH in the sensitive set and :75-89 gives
                            // It NO entry, so the reference answers it with the negative list. The
                            // Fallback arm is that absence, written down.
                            supportRule: NEEDS_ANY_SUPPORT } as const
                    } } as const
            } } as const
    },
    {
        ...{
            // The row that forced `ItemType` to exist. `glowstone_dust` is not a block
            // And never will be, so `drops.item: BlockType | 'self'` could not write
            // This line at all — it could express "a different block", never "not a
            // Block". It is also the fortune row: audit §4.5 cites `FORTUNE_ORE_BLOCKS`
            // (`block-service.config.ts:270-276`), and the multiplication itself stays
            // In mx-gameplay because it is random (see `./block-harvest`).
            id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'glowstone' } as const,
                ...{ properties: {
                        ...{ lightEmission: 15 } as const,
                        ...{ hardness: 4 } as const,
                        ...{
                            // NOTE: `count: 2` is kernel's and diverges from the reference's
                            // `BLOCK_BASE_DROP_COUNT` (`block-service.config.ts:204-215`), which
                            // Gives `GLOWSTONE` 4. Left as it is rather than corrected in passing:
                            // It is a content value, not a transcription error, and changing a drop
                            // Count is a gameplay change that should be reviewed on its own.
                            drops: { ...DEFAULT_BLOCK_DROP, ...{ item: 'glowstone_dust' } as const, ...{ count: 2 } as const, ...{ affectedByFortune: true } as const } } as const
                    } } as const
            } } as const
    },
    {
        ...{
            // THIS ROW WAS BARE, AND BEING BARE IS WHAT MADE IT WRONG. It used to be
            // The file's worked example of "an empty row is not an omission, it is the
            // Statement that the block IS an ordinary opaque solid cube". The statement
            // Was false in two columns at once, and both were found by re-deriving the
            // Whole table from the reference rather than by reading this row.
            //
            //   `validSpawnSurface` — `PISTON` is listed in `NON_SPAWN_SURFACE_BLOCK_IDS`
            //   (`spawn-selection-search.ts:68`, under "Redstone / interactive"). The
            //   Default is `true`, so silence here meant mobs and village placement
            //   Treated the top of a piston as ground. This is the SECOND time this
            //   Exact defect has been found in this file — `oak_log` had it, and the
            //   Note on that row already says the damage is done silently because the
            //   Flag defaults the wrong way for anything that is not a plain cube.
            //
            //   `hardness` — 55 in the reference, not the default 8. A piston is
            //   Furnace-tier, and 8 made it as soft as dirt.
            //
            // The lesson recorded rather than the fix: a row that states nothing is
            // Only honest when the block really is a plain cube, and "I did not check"
            // And "I checked and there was nothing to say" are written identically.
            // Every one of the 84 rows below states its values explicitly for that
            // Reason, including where they equal the default.
            id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'piston' } as const,
                ...{ capabilities: { ...{ validSpawnSurface: false } as const } } as const,
                ...{ properties: { ...{ hardness: 55 } as const } } as const
            } } as const
    },
    {
        ...{
            // Appended, not inserted: ids 0-16 were already assigned when this block was
            // Added, and an id is a wire format. This row is also the worked example of
            // The additive-safety property `test/item-drops.test.ts` asserts — it was
            // Added without touching any row above it, and no answer above it moved.
            id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'cobblestone' } as const,
                ...{
                    // DECLARED DIVERGENCE on the tool gate, kept and now written down.
                    // `COBBLESTONE` is NOT in `WOODEN_PICKAXE_HARVESTABLE_BLOCKS`
                    // (`harvestable-blocks.ts:16-29`), so the reference lets you collect
                    // Cobblestone bare-handed while requiring a pickaxe for the `stone` it
                    // Came from. That is almost certainly a hole in the reference's set
                    // Rather than a design; kernel keeps the gate, because the alternative is
                    // An infinite bare-handed cobblestone supply from any stone wall. Flagged
                    // Rather than silently matched, since it is the one row in this file
                    // Where kernel is deliberately STRICTER than its source.
                    properties: { ...{ hardness: 35 } as const, ...{ friction: 0.8 } as const, ...{ harvestTool: NEEDS_WOODEN_PICKAXE } as const, ...{ footstepMaterial: 'stone' } as const } } as const
            } } as const
    },
    // -------------------------------------------------------------------------
    // Ids 18-32: the rest of `PASSABLE_BLOCK_IDS`
    // -------------------------------------------------------------------------
    //
    // READ THIS BEFORE ADDING A ROW BELOW. Two of the reference's five "non-solid"
    // Tables (audit §4.9) turn out to omit members the other three contain, and
    // The omissions are load-bearing for these rows specifically:
    //
    //   - `NON_SUFFOCATING_BLOCKS` (`environment-hazard.config.ts:39-85`) does NOT
    //     Contain `SUGAR_CANE`, `LILY_PAD`, `KELP`, `SEAGRASS`, `RAIL` or
    //     `POWERED_RAIL`, although `PASSABLE_BLOCK_IDS` does. Read literally, the
    //     Reference suffocates a player standing inside a rail.
    //   - `NON_SPAWN_SURFACE_BLOCK_IDS` (`spawn-selection-search.ts:41-84`) does
    //     NOT contain `RAIL`, `POWERED_RAIL`, `KELP`, `SEAGRASS` or `STONE_SLAB`.
    //
    // These are SIX and FIVE new instances of the disagreement audit §4.9 found
    // Three of, and they are handled differently from each other on purpose:
    //
    //   `suffocates` IS inferred to `false` for the six, because audit §4.7 states
    //   The one-way implication — 「`passable=true` なら常に false を導出する方が
    //   安全」 — and a passable block that suffocates is incoherent rather than
    //   Merely unlisted. Each such row says so at the row.
    //
    //   `validSpawnSurface` is NOT inferred. No implication licenses it: audit
    //   §4.9's whole finding is that these five concepts are independent, and it
    //   Cites `snow` (non-supporting, not passable) and `glass` (solid, not a
    //   Spawn surface) as proof that "passable" predicts neither. Those rows
    //   Therefore transcribe the reference's silence and default to `true`, with
    //   The omission recorded. Guessing here would be inventing content.
    {
        ...{
            // Exercises `climbable`, which no row could reach before — kernel had the
            // Flag from audit §4.1 and nothing to hang it on.
            //
            // Also the counter-example to "passable implies non-supporting": `ladder` is
            // In `PASSABLE_BLOCK_IDS` (:29) yet is absent from
            // `NON_SUPPORTING_BLOCK_TYPES` (`block-support.ts:47-60`), so a torch may be
            // Attached to it. That is the reference's answer, not a default falling
            // Through, and it is why `canSupportAttachments` is left unsaid here.
            id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'ladder' } as const,
                ...{ capabilities: {
                        ...{ passable: true } as const,
                        ...{ // Block-collision-predicates.ts:29
                            climbable: true } as const,
                        ...{ // Block-collision-predicates.ts:177-182 (`isInLadder`)
                            flammable: true } as const,
                        ...{ // Fire-lifecycle.ts:26 (`FLAMMABLE_BLOCK_TYPES`)
                            suffocates: false } as const,
                        ...{ // Environment-hazard.config.ts:63 (`NON_SUFFOCATING_BLOCKS`)
                            validSpawnSurface: false } as const
                    } } as const,
                ...{
                    // Hardness 4 / friction 0.6: blocks.config.crafted.ts (`block:ladder`).
                    properties: { ...{ opacity: 'transparentSolid' } as const, ...{ collisionShape: 'none' } as const, ...{ hardness: 4 } as const, ...{ footstepMaterial: 'wood' } as const } } as const
            } } as const
    },
    {
        ...{
            // Exercises `movementDrag`, the other flag that had no inhabitant.
            //
            // INFERRED VALUE, and the inference is lossy. The reference slows an entity
            // In a cobweb with TWO multipliers — `COBWEB_HORIZONTAL_MULTIPLIER = 0.25`
            // And `COBWEB_VERTICAL_MULTIPLIER = 0.05` (`player-physics.ts:19-20`,
            // Applied at :123-125) — and `movementDrag` is one number. 0.75 is the
            // Horizontal figure expressed as drag (`1 - 0.25`), chosen because kernel's
            // Default is 0 = "no slowdown", so the field must count drag and not
            // Survival.
            //
            // The vertical component is LOST. Recorded rather than silently dropped: a
            // Second field (`verticalMovementDrag`) is the additive fix if mc-physics
            // Ever needs the fall-through-a-cobweb behaviour, and until then this row
            // Is the only place that says the model is lossy here.
            id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'cobweb' } as const,
                ...{ capabilities: {
                        ...{ passable: true } as const,
                        ...{ // Block-collision-predicates.ts:30
                            suffocates: false } as const,
                        ...{ // Environment-hazard.config.ts:64
                            validSpawnSurface: false } as const
                    } } as const,
                ...{ properties: {
                        ...{ opacity: 'transparentSolid' } as const,
                        ...{ collisionShape: 'none' } as const,
                        ...{ movementDrag: 0.75 } as const,
                        ...{
                            // Hardness 4 / friction 0.2: blocks.config.crafted.ts (`block:cobweb`).
                            hardness: 4 } as const,
                        ...{ friction: 0.2 } as const,
                        ...{
                            // `INVENTORY_DROP_OVERRIDES` maps COBWEB -> STRING
                            // (`block-service.config.ts:170`). This row previously carried the
                            // DEFAULT rule — "yields itself" — while `cobweb` had no item form, so
                            // It resolved to nothing through the `'self'` sentinel and looked like a
                            // Deliberate no-drop. It was neither: it was an untranscribed override.
                            drops: { ...DEFAULT_BLOCK_DROP, ...{ item: 'string' } as const } } as const
                    } } as const
            } } as const
    },
    {
        ...{
            // The one surface plant that is NOT a cross-mesh plant. `CROSS_PLANT_IDS`
            // (`plant-mesh.ts:18-28`) lists the other six and omits `SAPLING`, so
            // `isPlantMeshBlockId` (:45) sends a sapling down the greedy-meshing path
            // And it meshes as a cube.
            //
            // Transcribed rather than corrected. It looks like a reference defect — a
            // Sapling is a cross-quad in every version of the game — but "looks like a
            // Bug" is not a citation, and kernel's job here is to state what the
            // Reference does. The row is flagged so that whoever ports the mesher
            // Decides it deliberately instead of discovering it.
            id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'sapling' } as const,
                ...{ capabilities: SURFACE_PLANT_CAPABILITIES } as const,
                ...{ properties: {
                        ...PLANT_PROPERTIES,
                        ...{ footstepMaterial: 'wood' } as const,
                        ...{ supportRule: NEEDS_PLANTABLE_GROUND } as const
                    } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'dandelion' } as const,
                ...{ capabilities: SURFACE_PLANT_CAPABILITIES } as const,
                ...{ properties: {
                        ...PLANT_PROPERTIES,
                        ...{ renderKind: 'cross' } as const,
                        ...{ supportRule: NEEDS_PLANTABLE_GROUND } as const
                    } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'poppy' } as const,
                ...{ capabilities: SURFACE_PLANT_CAPABILITIES } as const,
                ...{ properties: {
                        ...PLANT_PROPERTIES,
                        ...{ renderKind: 'cross' } as const,
                        ...{ supportRule: NEEDS_PLANTABLE_GROUND } as const
                    } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'brown_mushroom' } as const,
                ...{ capabilities: SURFACE_PLANT_CAPABILITIES } as const,
                ...{ properties: {
                        ...PLANT_PROPERTIES,
                        ...{ renderKind: 'cross' } as const,
                        ...{ supportRule: NEEDS_PLANTABLE_GROUND } as const
                    } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'red_mushroom' } as const,
                ...{ capabilities: SURFACE_PLANT_CAPABILITIES } as const,
                ...{ properties: {
                        ...PLANT_PROPERTIES,
                        ...{ renderKind: 'cross' } as const,
                        ...{ supportRule: NEEDS_PLANTABLE_GROUND } as const
                    } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'tall_grass' } as const,
                ...{ capabilities: SURFACE_PLANT_CAPABILITIES } as const,
                ...{ properties: {
                        ...PLANT_PROPERTIES,
                        ...{ renderKind: 'cross' } as const,
                        ...{ supportRule: NEEDS_PLANTABLE_GROUND } as const
                    } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'fern' } as const,
                ...{ capabilities: SURFACE_PLANT_CAPABILITIES } as const,
                ...{ properties: {
                        ...PLANT_PROPERTIES,
                        ...{ renderKind: 'cross' } as const,
                        ...{ supportRule: NEEDS_PLANTABLE_GROUND } as const
                    } } as const
            } } as const
    },
    {
        ...{
            // A WATERSIDE plant, not a surface plant: `block-support.ts:14-18` puts it
            // In a different set with a different support rule (DIRT | GRASS | SAND |
            // Itself, :81) — so it does NOT get `SURFACE_PLANT_CAPABILITIES` even
            // Though the resolved flags come out close.
            //
            // `suffocates: false` is INFERRED (audit §4.7): `SUGAR_CANE` is passable
            // (`block-collision-predicates.ts:36`) but absent from
            // `NON_SUFFOCATING_BLOCKS`.
            id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'sugar_cane' } as const,
                ...{ capabilities: {
                        ...{ passable: true } as const,
                        ...{ brokenByWaterFlow: true } as const,
                        ...{ // Block-support.ts:43 (named individually, not via the plant set)
                            canSupportAttachments: false } as const,
                        ...{ // Block-support.ts:47-60 (via WATERSIDE_PLANT_BLOCK_TYPES)
                            suffocates: false } as const,
                        ...{ // INFERRED — audit §4.7
                            validSpawnSurface: false } as const
                    } } as const,
                ...{ properties: {
                        ...PLANT_PROPERTIES,
                        ...{ renderKind: 'cross' } as const,
                        ...{ supportRule: NEEDS_SUGAR_CANE_GROUND } as const
                    } } as const
            } } as const
    },
    {
        ...{
            // `brokenByWaterFlow` is deliberately ABSENT, and this is the row where that
            // Absence is a statement. `WATER_BREAKABLE_BLOCK_TYPES` (`block-support.ts:
            // 34-44`) names `SUGAR_CANE` and `CACTUS` individually right next to the
            // Plant set, and does NOT name `LILY_PAD` — which is correct, since a lily
            // Pad's support rule IS water (:83). A blanket "plants break in water" would
            // Have deleted every lily pad on contact with the thing it floats on.
            id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'lily_pad' } as const,
                ...{ capabilities: {
                        ...{ passable: true } as const,
                        ...{ // Block-collision-predicates.ts:37
                            canSupportAttachments: false } as const,
                        ...{ // Block-support.ts:47-60
                            suffocates: false } as const,
                        ...{ // INFERRED — audit §4.7
                            validSpawnSurface: false } as const
                    } } as const,
                ...{ properties: {
                        ...PLANT_PROPERTIES,
                        ...{ renderKind: 'lilyPad' } as const,
                        ...{ supportRule: NEEDS_WATER } as const
                    } } as const
            } } as const
    },
    {
        ...{
            // `kelp` and `seagrass` are the reference's newest block types — the
            // Append-only tail of `INDEX_TO_BLOCK_TYPE` (`block-codec.ts:74-82`) — and
            // They are missing from THREE of the five membership tables:
            // `NON_SUFFOCATING_BLOCKS`, `NON_SPAWN_SURFACE_BLOCK_IDS` and
            // `NON_SUPPORTING_BLOCK_TYPES`. Audit §6-8 already caught the same pair
            // Missing from `BLOCK_ITEMS`.
            //
            // That is what a hand-maintained membership set does when the roster grows,
            // And it is the argument for this registry existing at all: here the roster
            // And the capabilities are the same table, so a new literal cannot be added
            // To one and forgotten in the other (`test/block-registry.test.ts` asserts
            // `UNREGISTERED_BLOCK_TYPES` is empty).
            //
            // Only `suffocates` is inferred. `validSpawnSurface` and
            // `canSupportAttachments` transcribe the silence — see the block comment
            // Above on why the two are treated differently.
            id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'kelp' } as const,
                ...{ capabilities: {
                        ...{ passable: true } as const,
                        ...{ // Block-collision-predicates.ts:38
                            suffocates: false } as const
                    } } as const,
                ...{ properties: { ...PLANT_PROPERTIES, ...{ renderKind: 'cross' } as const } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'seagrass' } as const,
                ...{ capabilities: {
                        ...{ passable: true } as const,
                        ...{ // Block-collision-predicates.ts:39
                            suffocates: false } as const
                    } } as const,
                ...{ properties: { ...PLANT_PROPERTIES, ...{ renderKind: 'cross' } as const } } as const
            } } as const
    },
    {
        ...{
            // Exercises `railKind`, the third flag audit §4.1 defined with no inhabitant.
            id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'rail' } as const,
                ...{ capabilities: {
                        ...{ passable: true } as const,
                        ...{ // Block-collision-predicates.ts:40
                            brokenByWaterFlow: true } as const,
                        ...{ // Block-support.ts:38
                            canSupportAttachments: false } as const,
                        ...{ // Block-support.ts:53
                            suffocates: false } as const
                    } } as const,
                ...{ properties: {
                        ...{ opacity: 'transparentSolid' } as const,
                        ...{ collisionShape: 'none' } as const,
                        ...{ renderKind: 'rail' } as const,
                        ...{ // Plant-mesh.ts:32
                            railKind: 'normal' } as const,
                        ...{ // Block-collision-predicates.ts:184-195 (`isOnRail`)
                            // Hardness 7 / friction 0.6: blocks.config.crafted.ts (`block:rail`).
                            hardness: 7 } as const,
                        ...{ supportRule: NEEDS_ANY_SUPPORT } as const
                    } } as const
            } } as const
    },
    {
        ...{
            // The `railKind` distinction is not decorative: `isOnPoweredRail`
            // (`block-collision-predicates.ts:197-201`) is a SEPARATE predicate from
            // `isOnRail` (:184), and `minecart-mount.ts:45` names both. A boolean
            // `isRail` would collapse the speed tier.
            id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'powered_rail' } as const,
                ...{ capabilities: {
                        ...{ passable: true } as const,
                        ...{ // Block-collision-predicates.ts:41
                            brokenByWaterFlow: true } as const,
                        ...{ // Block-support.ts:39
                            canSupportAttachments: false } as const,
                        ...{ // Block-support.ts:54
                            suffocates: false } as const
                    } } as const,
                ...{ properties: {
                        ...{ opacity: 'transparentSolid' } as const,
                        ...{ collisionShape: 'none' } as const,
                        ...{ renderKind: 'rail' } as const,
                        ...{ // Plant-mesh.ts:33
                            railKind: 'powered' } as const,
                        ...{ // Block-collision-predicates.ts:197-201
                            hardness: 7 } as const,
                        ...{ supportRule: NEEDS_ANY_SUPPORT } as const
                    } } as const
            } } as const
    },
    // -------------------------------------------------------------------------
    // Ids 33-35: the three non-`full` collision shapes
    // -------------------------------------------------------------------------
    {
        ...{
            // THE row that most repays audit §4.9, and the reason it is worth having.
            // `cactus` disagrees with itself four ways in a single row:
            //
            //   Passable              false  — absent from `PASSABLE_BLOCK_IDS`; it collides
            //   Suffocates            false  — `NON_SUFFOCATING_BLOCKS` (:65)
            //   CanSupportAttachments false  — `NON_SUPPORTING_BLOCK_TYPES` (:47-60)
            //   ValidSpawnSurface     false  — `NON_SPAWN_SURFACE_BLOCK_IDS` (:56)
            //
            // A single `solid` boolean would have to be true (you cannot walk through a
            // Cactus) and false (it neither suffocates you nor holds a torch nor spawns
            // A mob) at the same time. `glass` and `oak_leaves` make that argument with
            // Two disagreements each; this row makes it with three, and adds contact
            // Damage on top.
            id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'cactus' } as const,
                ...{ capabilities: {
                        ...{ suffocates: false } as const,
                        ...{ canSupportAttachments: false } as const,
                        ...{ validSpawnSurface: false } as const,
                        ...{ brokenByWaterFlow: true } as const
                    } } as const,
                ...{ properties: {
                        ...{
                            // `cactusBlockProperties` (`blocks.config.flora.ts:9-15`): solid AND
                            // Transparent, hardness 8, friction 0.6 — the only block in the flora
                            // Config that is not `plantBlockProperties`.
                            opacity: 'transparentSolid' } as const,
                        ...{ collisionShape: 'cactus' } as const,
                        ...{ // Block-collision-predicates.ts:136
                            renderKind: 'cactus' } as const,
                        ...{ // Plant-mesh.ts:30
                            contactDamage: 1 } as const,
                        ...{ // Environment-hazard.config.ts:26 (`CACTUS_DAMAGE`)
                            supportRule: NEEDS_SAND_OR_CACTUS } as const
                    } } as const
            } } as const
    },
    {
        ...{
            // Not passable — `PRESSURE_PLATE` is absent from `PASSABLE_BLOCK_IDS`, and
            // `getBlockCollisionShapeAt` (:137) returns a shape for it rather than
            // `null`. The plate is a very short box you stand ON, which is exactly the
            // Distinction `collisionShape` exists to carry and `passable` cannot.
            id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'pressure_plate' } as const,
                ...{ capabilities: {
                        ...{ brokenByWaterFlow: true } as const,
                        ...{ // Block-support.ts:37
                            canSupportAttachments: false } as const,
                        ...{ // Block-support.ts:52
                            suffocates: false } as const,
                        ...{ // Environment-hazard.config.ts:55
                            validSpawnSurface: false } as const
                    } } as const,
                ...{ properties: {
                        ...{ opacity: 'transparentSolid' } as const,
                        ...{ collisionShape: 'pressurePlate' } as const,
                        ...{ // Block-collision-predicates.ts:137
                            // Harvestable-blocks.ts:16-17 lists PRESSURE_PLATE in
                            // WOODEN_PICKAXE_HARVESTABLE_BLOCKS — a tier GATE, so bare hands yield
                            // Nothing. hardness 5: blocks.config.crafted.ts.
                            harvestTool: NEEDS_WOODEN_PICKAXE } as const,
                        ...{ hardness: 5 } as const,
                        ...{ supportRule: NEEDS_ANY_SUPPORT } as const
                    } } as const
            } } as const
    },
    {
        ...{
            // `SLAB_BLOCK_IDS` (`block-collision-predicates.ts:56-59`) holds two
            // Members, `PURPUR_SLAB` and `STONE_SLAB`; only the second is in this
            // Roster, so `collisionShape: 'slab'` is inhabited but its reference table
            // Is not yet complete. Recorded so the next roster pass knows the shape is
            // Already exercised and `purpur_slab` is about the End dimension, not about
            // Collision.
            //
            // `validSpawnSurface` is left at the default `true`: `STONE_SLAB` is one of
            // The five blocks `NON_SPAWN_SURFACE_BLOCK_IDS` omits (see the block comment
            // On ids 18-32). A mob standing on a slab is at least physically coherent,
            // Unlike one standing on a rail, but the reason it is `true` here is that
            // The reference does not say otherwise — not that it seems reasonable.
            id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'stone_slab' } as const,
                ...{ capabilities: {
                        ...{
                            // `NON_SUFFOCATING_BLOCKS` (:56) contains STONE_SLAB, and audit §4.7
                            // Names it as one of the three entries (with GLASS and OAK_STAIRS) that
                            // Make `suffocates` underivable from `passable && opacity`. This row is
                            // That argument's evidence: not passable, and still does not suffocate.
                            suffocates: false } as const
                    } } as const,
                ...{ properties: {
                        ...{ opacity: 'transparentSolid' } as const,
                        ...{ // Transparency: true in blocks.config.crafted.ts
                            collisionShape: 'slab' } as const,
                        ...{ // Block-collision-predicates.ts:56-59, applied at :138
                            harvestTool: NEEDS_WOODEN_PICKAXE } as const,
                        ...{ // Harvestable-blocks.ts:18
                            hardness: 25 } as const
                    } } as const
            } } as const
    },
    // ---------------------------------------------------------------------------
    // Ids 36-49: terrain and mineral stone (`blocks.config.terrain.ts`)
    // ---------------------------------------------------------------------------
    //
    // The plainest group in the table, and useful precisely for that: fourteen
    // Rows whose only overrides are `hardness` and `friction`, which is what a
    // Table of differences looks like when a block really is an ordinary opaque
    // Solid cube that happens to be hard. None of them appears in ANY of the six
    // Membership tables (`PASSABLE_BLOCK_IDS`, `NON_SUFFOCATING_BLOCKS`,
    // `NON_SUPPORTING_BLOCK_TYPES`, `NON_SPAWN_SURFACE_BLOCK_IDS`,
    // `FLAMMABLE_BLOCK_TYPES`, `WATER_BREAKABLE_BLOCK_TYPES`), so every capability
    // Resolves to its default and that ABSENCE is the citation.
    //
    // Three rows do have something to say:
    //
    //   `obsidian` is the sole member of the diamond tier (`harvestable-blocks.ts:53-56`).
    //   `ice` drops nothing: `NO_BASE_DROP_BLOCK_TYPES` (`block-service.config.ts:199`)
    //     Contains ICE and nothing else, which is what `blockDropsBaseItem` reads.
    //     It is therefore the only block in the roster whose drop is refused by
    //     Name rather than by a tool gate or a silk-touch gate.
    //   `farmland` yields `dirt`, not itself, so it gets NO item form — see the
    //     Rule at the top of the `ITEM_TYPES` additions.
    { ...{ id: createBlockId(nextRegisteredBlockId()) } as const, ...{ definition: { ...{ type: 'granite' } as const, ...{ properties: { ...{ hardness: 25 } as const, ...{ friction: 0.8 } as const } } as const } } as const },
    { ...{ id: createBlockId(nextRegisteredBlockId()) } as const, ...{ definition: { ...{ type: 'diorite' } as const, ...{ properties: { ...{ hardness: 25 } as const, ...{ friction: 0.8 } as const } } as const } } as const },
    { ...{ id: createBlockId(nextRegisteredBlockId()) } as const, ...{ definition: { ...{ type: 'andesite' } as const, ...{ properties: { ...{ hardness: 25 } as const, ...{ friction: 0.8 } as const } } as const } } as const },
    { ...{ id: createBlockId(nextRegisteredBlockId()) } as const, ...{ definition: { ...{ type: 'deepslate' } as const, ...{ properties: { ...{ hardness: 50 } as const, ...{ friction: 0.8 } as const } } as const } } as const },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'obsidian' } as const,
                ...{ properties: { ...{ hardness: 90 } as const, ...{ friction: 0.8 } as const, ...{ harvestTool: NEEDS_DIAMOND_PICKAXE } as const } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'smooth_basalt' } as const,
                ...{ properties: { ...{ hardness: 30 } as const, ...{ friction: 0.8 } as const, ...{ harvestTool: NEEDS_WOODEN_PICKAXE } as const } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'calcite' } as const,
                ...{ properties: { ...{ hardness: 20 } as const, ...{ friction: 0.8 } as const, ...{ harvestTool: NEEDS_WOODEN_PICKAXE } as const } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'amethyst_block' } as const,
                ...{ properties: { ...{ hardness: 30 } as const, ...{ friction: 0.8 } as const, ...{ harvestTool: NEEDS_WOODEN_PICKAXE } as const } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'amethyst_cluster' } as const,
                ...{ properties: {
                        ...{ lightEmission: 15 } as const,
                        ...{ hardness: 15 } as const,
                        ...{ friction: 0.8 } as const,
                        ...{ harvestTool: NEEDS_WOODEN_PICKAXE } as const,
                        ...{ drops: { ...DEFAULT_BLOCK_DROP, ...{ item: 'amethyst_shard' } as const, ...{ count: 4 } as const } } as const
                    } } as const
            } } as const
    },
    { ...{ id: createBlockId(nextRegisteredBlockId()) } as const, ...{ definition: { ...{ type: 'sandstone' } as const, ...{ properties: { ...{ hardness: 10 } as const } } as const } } as const },
    { ...{ id: createBlockId(nextRegisteredBlockId()) } as const, ...{ definition: { ...{ type: 'prismarine' } as const, ...{ properties: { ...{ hardness: 25 } as const, ...{ friction: 0.8 } as const } } as const } } as const },
    { ...{ id: createBlockId(nextRegisteredBlockId()) } as const, ...{ definition: { ...{ type: 'soul_sand' } as const, ...{ properties: { ...{ friction: 0.5 } as const } } as const } } as const },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'ice' } as const,
                ...{ properties: { ...{ opacity: 'transparentSolid' } as const, ...{ hardness: 3 } as const, ...{ friction: 0.98 } as const, ...{ drops: DROPS_NOTHING } as const } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'farmland' } as const,
                ...{ capabilities: { ...{ suffocates: false } as const } } as const,
                ...{ properties: {
                        ...{ harvestTool: FASTER_WITH_SHOVEL } as const,
                        ...{ drops: { ...DEFAULT_BLOCK_DROP, ...{ item: 'dirt' } as const } } as const,
                        ...{ footstepMaterial: 'grass' } as const
                    } } as const
            } } as const
    },
    // ---------------------------------------------------------------------------
    // Ids 50-63: ores (`blocks.config.ores.ts`, `harvestable-blocks.ts`)
    // ---------------------------------------------------------------------------
    //
    // Fourteen rows in seven stone/deepslate pairs, and the group that finally
    // Makes four separate capabilities carry different information at once.
    //
    //   `harvestTool.minTier`  the reference's four-stage union ladder. Coal is
    //     Wooden; iron and lapis are stone; gold, redstone, diamond and emerald
    //     Are iron. Deepslate variants sit at the SAME tier as their stone twins —
    //     The ladder pairs them explicitly — so deepslate is harder (60 vs 50) but
    //     Not gated higher. Two axes, one of which moves and one of which does not.
    //
    //   `drops.item`   `INVENTORY_DROP_OVERRIDES`. Not one ore drops itself, and
    //     Iron and gold drop RAW ore rather than an ingot.
    //
    //   `xpOnBreak`    `ORE_XP_TABLE` (`blocks.config.ores.ts:29-37`). Coal 5,
    //     Lapis 5, redstone 5, diamond 7, emerald 7 — and IRON AND GOLD ZERO,
    //     With the reference's reason written at :8-10: they drop raw ore and the
    //     Experience is paid at the furnace. A row here that quietly gave iron ore
    //     5 would be indistinguishable from a typo and would pay the player twice.
    //
    //   `drops.count`  `BLOCK_BASE_DROP_COUNT` (:204-215) gives redstone and lapis
    //     4 and everything else 1. The reference's note explains the choice: vanilla
    //     Rolls 4-5 and 4-9, and it takes the deterministic MINIMUM so that breaking
    //     A block stays replayable. Kernel needs that property even more than the
    //     Reference does — `StageRegistration.run` has no source of randomness.
    //
    //   `affectedByFortune`  `FORTUNE_ORE_BLOCKS` (:270-276), which holds ten of
    //     The fourteen. IRON AND GOLD ORE ARE ABSENT, and that is not the same set
    //     As "the ores with zero XP" even though it happens to contain the same
    //     Four. Transcribed as two independent facts, because they are two lists.
    //
    // `redstone_ore` and `deepslate_redstone_ore` also emit light: 9, from
    // `EMISSIVE_LEVEL_OVERRIDES` (`light.ts:24-35`). Nine, not fifteen — an ore
    // That glows dimly is exactly the case a boolean `emissive` could not express.
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'coal_ore' } as const,
                ...{ properties: {
                        ...{ hardness: 50 } as const,
                        ...{ friction: 0.8 } as const,
                        ...{ xpOnBreak: 5 } as const,
                        ...{ harvestTool: NEEDS_WOODEN_PICKAXE } as const,
                        ...{ drops: { ...DEFAULT_BLOCK_DROP, ...{ item: 'coal' } as const, ...{ silkTouchItem: 'coal_ore' } as const, ...{ affectedByFortune: true } as const } } as const
                    } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'iron_ore' } as const,
                ...{ properties: {
                        ...{ hardness: 50 } as const,
                        ...{ friction: 0.8 } as const,
                        ...{ harvestTool: NEEDS_STONE_PICKAXE } as const,
                        ...{ drops: { ...DEFAULT_BLOCK_DROP, ...{ item: 'raw_iron' } as const, ...{ silkTouchItem: 'iron_ore' } as const } } as const
                    } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'gold_ore' } as const,
                ...{ properties: {
                        ...{ hardness: 50 } as const,
                        ...{ friction: 0.8 } as const,
                        ...{ harvestTool: NEEDS_IRON_PICKAXE } as const,
                        ...{ drops: { ...DEFAULT_BLOCK_DROP, ...{ item: 'raw_gold' } as const, ...{ silkTouchItem: 'gold_ore' } as const } } as const
                    } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'diamond_ore' } as const,
                ...{ properties: {
                        ...{ hardness: 50 } as const,
                        ...{ friction: 0.8 } as const,
                        ...{ xpOnBreak: 7 } as const,
                        ...{ harvestTool: NEEDS_IRON_PICKAXE } as const,
                        ...{ drops: { ...DEFAULT_BLOCK_DROP, ...{ item: 'diamond' } as const, ...{ silkTouchItem: 'diamond_ore' } as const, ...{ affectedByFortune: true } as const } } as const
                    } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'redstone_ore' } as const,
                ...{ properties: {
                        ...{ lightEmission: 9 } as const,
                        ...{ hardness: 50 } as const,
                        ...{ friction: 0.8 } as const,
                        ...{ xpOnBreak: 5 } as const,
                        ...{ harvestTool: NEEDS_IRON_PICKAXE } as const,
                        ...{ drops: {
                                ...DEFAULT_BLOCK_DROP,
                                ...{ item: 'redstone_dust' } as const,
                                ...{ silkTouchItem: 'redstone_ore' } as const,
                                ...{ count: 4 } as const,
                                ...{ affectedByFortune: true } as const
                            } } as const
                    } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'lapis_ore' } as const,
                ...{ properties: {
                        ...{ hardness: 50 } as const,
                        ...{ friction: 0.8 } as const,
                        ...{ xpOnBreak: 5 } as const,
                        ...{ harvestTool: NEEDS_STONE_PICKAXE } as const,
                        ...{ drops: {
                                ...DEFAULT_BLOCK_DROP,
                                ...{ item: 'lapis_lazuli' } as const,
                                ...{ silkTouchItem: 'lapis_ore' } as const,
                                ...{ count: 4 } as const,
                                ...{ affectedByFortune: true } as const
                            } } as const
                    } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'emerald_ore' } as const,
                ...{ properties: {
                        ...{ hardness: 50 } as const,
                        ...{ friction: 0.8 } as const,
                        ...{ xpOnBreak: 7 } as const,
                        ...{ harvestTool: NEEDS_IRON_PICKAXE } as const,
                        ...{ drops: { ...DEFAULT_BLOCK_DROP, ...{ item: 'emerald' } as const, ...{ silkTouchItem: 'emerald_ore' } as const, ...{ affectedByFortune: true } as const } } as const
                    } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'deepslate_coal_ore' } as const,
                ...{ properties: {
                        ...{ hardness: 60 } as const,
                        ...{ friction: 0.8 } as const,
                        ...{ xpOnBreak: 5 } as const,
                        ...{ harvestTool: NEEDS_WOODEN_PICKAXE } as const,
                        ...{ drops: { ...DEFAULT_BLOCK_DROP, ...{ item: 'coal' } as const, ...{ silkTouchItem: 'deepslate_coal_ore' } as const, ...{ affectedByFortune: true } as const } } as const
                    } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'deepslate_iron_ore' } as const,
                ...{ properties: {
                        ...{ hardness: 60 } as const,
                        ...{ friction: 0.8 } as const,
                        ...{ harvestTool: NEEDS_STONE_PICKAXE } as const,
                        ...{ drops: { ...DEFAULT_BLOCK_DROP, ...{ item: 'raw_iron' } as const, ...{ silkTouchItem: 'deepslate_iron_ore' } as const } } as const
                    } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'deepslate_gold_ore' } as const,
                ...{ properties: {
                        ...{ hardness: 60 } as const,
                        ...{ friction: 0.8 } as const,
                        ...{ harvestTool: NEEDS_IRON_PICKAXE } as const,
                        ...{ drops: { ...DEFAULT_BLOCK_DROP, ...{ item: 'raw_gold' } as const, ...{ silkTouchItem: 'deepslate_gold_ore' } as const } } as const
                    } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'deepslate_diamond_ore' } as const,
                ...{ properties: {
                        ...{ hardness: 60 } as const,
                        ...{ friction: 0.8 } as const,
                        ...{ xpOnBreak: 7 } as const,
                        ...{ harvestTool: NEEDS_IRON_PICKAXE } as const,
                        ...{ drops: {
                                ...DEFAULT_BLOCK_DROP,
                                ...{ item: 'diamond' } as const,
                                ...{ silkTouchItem: 'deepslate_diamond_ore' } as const,
                                ...{ affectedByFortune: true } as const
                            } } as const
                    } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'deepslate_redstone_ore' } as const,
                ...{ properties: {
                        ...{ lightEmission: 9 } as const,
                        ...{ hardness: 60 } as const,
                        ...{ friction: 0.8 } as const,
                        ...{ xpOnBreak: 5 } as const,
                        ...{ harvestTool: NEEDS_IRON_PICKAXE } as const,
                        ...{ drops: {
                                ...DEFAULT_BLOCK_DROP,
                                ...{ item: 'redstone_dust' } as const,
                                ...{ silkTouchItem: 'deepslate_redstone_ore' } as const,
                                ...{ count: 4 } as const,
                                ...{ affectedByFortune: true } as const
                            } } as const
                    } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'deepslate_lapis_ore' } as const,
                ...{ properties: {
                        ...{ hardness: 60 } as const,
                        ...{ friction: 0.8 } as const,
                        ...{ xpOnBreak: 5 } as const,
                        ...{ harvestTool: NEEDS_STONE_PICKAXE } as const,
                        ...{ drops: {
                                ...DEFAULT_BLOCK_DROP,
                                ...{ item: 'lapis_lazuli' } as const,
                                ...{ silkTouchItem: 'deepslate_lapis_ore' } as const,
                                ...{ count: 4 } as const,
                                ...{ affectedByFortune: true } as const
                            } } as const
                    } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'deepslate_emerald_ore' } as const,
                ...{ properties: {
                        ...{ hardness: 60 } as const,
                        ...{ friction: 0.8 } as const,
                        ...{ xpOnBreak: 7 } as const,
                        ...{ harvestTool: NEEDS_IRON_PICKAXE } as const,
                        ...{ drops: {
                                ...DEFAULT_BLOCK_DROP,
                                ...{ item: 'emerald' } as const,
                                ...{ silkTouchItem: 'deepslate_emerald_ore' } as const,
                                ...{ affectedByFortune: true } as const
                            } } as const
                    } } as const
            } } as const
    },
    // ---------------------------------------------------------------------------
    // Ids 64-70: the mineral blocks (`blocks.config.ores.ts`)
    // ---------------------------------------------------------------------------
    //
    // Storage blocks, and — unlike the ores they are crafted from — NOT tool-gated
    // Anywhere in `harvestable-blocks.ts`. That reads oddly beside `stone`
    // Requiring a pickaxe, and it is transcribed rather than repaired: the sets in
    // That file are the only statement the reference makes about tier gating, and
    // Inventing a gate for seven blocks would be inventing content.
    //
    // `redstone_block` emits light 15 (`EMISSIVE_LEVEL_OVERRIDES`, `light.ts:27`),
    // Which makes it the third distinct emission level in the roster after
    // `torch` 14 and `redstone_ore` 9.
    { ...{ id: createBlockId(nextRegisteredBlockId()) } as const, ...{ definition: { ...{ type: 'coal_block' } as const, ...{ properties: { ...{ hardness: 65 } as const, ...{ friction: 0.8 } as const } } as const } } as const },
    { ...{ id: createBlockId(nextRegisteredBlockId()) } as const, ...{ definition: { ...{ type: 'iron_block' } as const, ...{ properties: { ...{ hardness: 65 } as const, ...{ friction: 0.8 } as const } } as const } } as const },
    { ...{ id: createBlockId(nextRegisteredBlockId()) } as const, ...{ definition: { ...{ type: 'gold_block' } as const, ...{ properties: { ...{ hardness: 50 } as const, ...{ friction: 0.8 } as const } } as const } } as const },
    { ...{ id: createBlockId(nextRegisteredBlockId()) } as const, ...{ definition: { ...{ type: 'diamond_block' } as const, ...{ properties: { ...{ hardness: 65 } as const, ...{ friction: 0.8 } as const } } as const } } as const },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'redstone_block' } as const,
                ...{ properties: { ...{ lightEmission: 15 } as const, ...{ hardness: 65 } as const, ...{ friction: 0.8 } as const } } as const
            } } as const
    },
    { ...{ id: createBlockId(nextRegisteredBlockId()) } as const, ...{ definition: { ...{ type: 'lapis_block' } as const, ...{ properties: { ...{ hardness: 50 } as const, ...{ friction: 0.8 } as const } } as const } } as const },
    { ...{ id: createBlockId(nextRegisteredBlockId()) } as const, ...{ definition: { ...{ type: 'emerald_block' } as const, ...{ properties: { ...{ hardness: 65 } as const, ...{ friction: 0.8 } as const } } as const } } as const },
    // ---------------------------------------------------------------------------
    // Ids 71-73: crops (`CROP_BLOCK_TYPES`, `block-support.ts:20`)
    // ---------------------------------------------------------------------------
    //
    // READ THE `suffocates` COLUMN BEFORE COPYING THESE ROWS. The three crops are
    // ONE set everywhere in `block-support.ts` and are treated identically by every
    // Rule there — and `NON_SUFFOCATING_BLOCKS` splits them:
    //
    //   WHEAT_CROP        listed (`environment-hazard.config.ts:48`)
    //   NETHER_WART_CROP  listed (:49)
    //   POTATO_CROP       *** NOT LISTED ***
    //
    // So the reference suffocates a player standing inside a potato and not inside
    // Wheat. This row TRANSCRIBES that, and does not infer the missing entry, for
    // The reason the `PASSABLE_BLOCK_IDS` group above already gives: audit §4.7
    // Licenses inferring `suffocates: false` from `passable: true`, and CROPS ARE
    // NOT PASSABLE — none of the three is in `PASSABLE_BLOCK_IDS`, so a crop is a
    // Solid full cube for collision and the implication does not apply. There is
    // No rule that lets kernel fill this in, only a hunch, and a hunch that
    // Silently makes three rows agree is how a table stops being a transcription.
    //
    // This is a NEW instance of the disagreement audit §4.9 measured, and it is
    // The sharpest one yet: the other cases disagree between tables about blocks
    // That differ, whereas this splits a set the source itself defines as a set.
    //
    // `supportRule` is what these rows actually wanted, and they have it. Wheat
    // And potatoes require farmland; nether wart requires soul sand.
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'wheat_crop' } as const,
                ...{ capabilities: {
                        ...{ brokenByWaterFlow: true } as const,
                        ...{ suffocates: false } as const,
                        ...{ canSupportAttachments: false } as const,
                        ...{ validSpawnSurface: false } as const
                    } } as const,
                ...{ properties: {
                        ...{ opacity: 'transparentSolid' } as const,
                        ...{ hardness: 0 } as const,
                        ...{ friction: 0 } as const,
                        ...{ drops: { ...DEFAULT_BLOCK_DROP, ...{ item: 'wheat_seeds' } as const } } as const,
                        ...{ supportRule: NEEDS_FARMLAND } as const
                    } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'potato_crop' } as const,
                ...{ capabilities: { ...{ brokenByWaterFlow: true } as const, ...{ canSupportAttachments: false } as const, ...{ validSpawnSurface: false } as const } } as const,
                ...{ properties: {
                        ...{ opacity: 'transparentSolid' } as const,
                        ...{ hardness: 0 } as const,
                        ...{ friction: 0 } as const,
                        ...{ drops: { ...DEFAULT_BLOCK_DROP, ...{ item: 'potato' } as const } } as const,
                        ...{ supportRule: NEEDS_FARMLAND } as const
                    } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'nether_wart_crop' } as const,
                ...{ capabilities: {
                        ...{ brokenByWaterFlow: true } as const,
                        ...{ suffocates: false } as const,
                        ...{ canSupportAttachments: false } as const,
                        ...{ validSpawnSurface: false } as const
                    } } as const,
                ...{ properties: {
                        ...{ opacity: 'transparentSolid' } as const,
                        ...{ hardness: 0 } as const,
                        ...{ friction: 0 } as const,
                        ...{ drops: { ...DEFAULT_BLOCK_DROP, ...{ item: 'nether_wart' } as const } } as const,
                        ...{ supportRule: NEEDS_SOUL_SAND } as const
                    } } as const
            } } as const
    },
    // ---------------------------------------------------------------------------
    // Ids 74-85: redstone components (`blocks.config.crafted.ts`)
    // ---------------------------------------------------------------------------
    //
    // VOCABULARY AND ORDINARY CAPABILITIES ONLY. Audit §6-7 assigns
    // `REDSTONE_CLEANUP_BLOCK_TYPES` and every propagation rule to mx-redstone,
    // And nothing here encodes power, signal strength or scheduling. The line is
    // Easy to state and worth stating: a block's LIGHT is a property of the block
    // (`redstone_lamp_lit` emits 15), whereas what makes a lamp become lit is a
    // Rule, and rules are not in this file.
    //
    // Four of these are in `SUPPORT_SENSITIVE_BLOCK_TYPES` / `WATER_BREAKABLE`
    // (`block-support.ts:22-45`): `redstone_wire`, `redstone_torch`, and — already
    // In the table — `torch`, `pressure_plate`, `rail`, `powered_rail`. The rest
    // Are ordinary blocks that happen to be redstone-flavoured.
    //
    // `piston_head` is the extended arm, is in `NEVER_DROPPED_BLOCK_TYPES`
    // (`interaction-break-handler.shared.ts:9`, with AIR / WATER / LAVA), and is
    // The only NON-fluid member of that set. It gets no item form.
    //
    // NOTE the `collisionShape` of this group. `redstone_wire`, `lever`,
    // `stone_button` and `repeater` are `solid: false` in `blocks.config.crafted.ts`
    // And yet are NOT in `PASSABLE_BLOCK_IDS`, so `getBlockCollisionShapeAt`
    // (`block-collision-predicates.ts:135-141`) returns a FULL block hull for all
    // Four. `full` is therefore transcribed. Audit §7 already established that
    // `properties.solid` is read nowhere in the reference (`rg '\.solid\b'` -> 0
    // Production hits) and kernel rejected the field for that reason; this group is
    // Where that decision pays, because believing `solid: false` here would have
    // Let the player walk through a wall of repeaters.
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'redstone_wire' } as const,
                ...{ capabilities: {
                        ...{ brokenByWaterFlow: true } as const,
                        ...{ suffocates: false } as const,
                        ...{ canSupportAttachments: false } as const,
                        ...{ validSpawnSurface: false } as const
                    } } as const,
                ...{ properties: {
                        ...{ opacity: 'transparentSolid' } as const,
                        ...{ hardness: 0 } as const,
                        ...{ friction: 0 } as const,
                        ...{ drops: { ...DEFAULT_BLOCK_DROP, ...{ item: 'redstone_dust' } as const } } as const,
                        ...{ supportRule: NEEDS_ANY_SUPPORT } as const
                    } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'redstone_torch' } as const,
                ...{ capabilities: {
                        ...{ brokenByWaterFlow: true } as const,
                        ...{ suffocates: false } as const,
                        ...{ canSupportAttachments: false } as const,
                        ...{ validSpawnSurface: false } as const
                    } } as const,
                ...{ properties: {
                        ...{ opacity: 'transparentSolid' } as const,
                        ...{ lightEmission: 7 } as const,
                        ...{ hardness: 1 } as const,
                        ...{ friction: 0.1 } as const,
                        ...{ supportRule: NEEDS_ANY_SUPPORT } as const
                    } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'lever' } as const,
                ...{ capabilities: { ...{ suffocates: false } as const, ...{ validSpawnSurface: false } as const } } as const,
                ...{ properties: { ...{ opacity: 'transparentSolid' } as const, ...{ hardness: 5 } as const } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'stone_button' } as const,
                ...{ capabilities: { ...{ suffocates: false } as const, ...{ validSpawnSurface: false } as const } } as const,
                ...{ properties: { ...{ opacity: 'transparentSolid' } as const, ...{ hardness: 5 } as const } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'repeater' } as const,
                ...{ capabilities: { ...{ suffocates: false } as const, ...{ validSpawnSurface: false } as const } } as const,
                ...{ properties: { ...{ opacity: 'transparentSolid' } as const, ...{ hardness: 35 } as const } } as const
            } } as const
    },
    { ...{ id: createBlockId(nextRegisteredBlockId()) } as const, ...{ definition: { ...{ type: 'redstone_lamp' } as const, ...{ properties: { ...{ hardness: 10 } as const } } as const } } as const },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'redstone_lamp_lit' } as const,
                ...{ properties: { ...{ lightEmission: 15 } as const, ...{ hardness: 10 } as const, ...{ drops: { ...DEFAULT_BLOCK_DROP, ...{ item: 'redstone_lamp' } as const } } as const } } as const
            } } as const
    },
    { ...{ id: createBlockId(nextRegisteredBlockId()) } as const, ...{ definition: { ...{ type: 'observer' } as const, ...{ properties: { ...{ hardness: 55 } as const } } as const } } as const },
    { ...{ id: createBlockId(nextRegisteredBlockId()) } as const, ...{ definition: { ...{ type: 'comparator' } as const, ...{ properties: { ...{ hardness: 5 } as const } } as const } } as const },
    { ...{ id: createBlockId(nextRegisteredBlockId()) } as const, ...{ definition: { ...{ type: 'dispenser' } as const, ...{ properties: { ...{ hardness: 60 } as const } } as const } } as const },
    { ...{ id: createBlockId(nextRegisteredBlockId()) } as const, ...{ definition: { ...{ type: 'hopper' } as const, ...{ properties: { ...{ hardness: 55 } as const } } as const } } as const },
    { ...{ id: createBlockId(nextRegisteredBlockId()) } as const, ...{ definition: { ...{ type: 'piston_head' } as const, ...{ properties: { ...{ hardness: 1 } as const, ...{ drops: DROPS_NOTHING } as const } } as const } } as const },
    // ---------------------------------------------------------------------------
    // Ids 86-102: The End (`blocks.config.end.ts`)
    // ---------------------------------------------------------------------------
    //
    // THE HARDNESS VALUES IN THIS GROUP ARE ON A DIFFERENT SCALE FROM EVERY OTHER
    // GROUP, AND THAT IS THE REFERENCE'S DOING. `blocks.config.end.ts` builds its
    // Rows through one helper and passes vanilla floats to it — `PURPUR_BLOCK` 1.5,
    // `SHULKER_BOX` 2, `DRAGON_EGG` 3, `ENDER_CHEST` 22.5, `CHORUS_FLOWER` 0.4 —
    // While `END_STONE_BRICKS` in the same array is 45, which is the 0-100 scale.
    // Twelve of thirteen on one scale, one on the other, in one file.
    //
    // Transcribed, not converted. The reference's own float-to-scale mapping is a
    // Hand-made ordering (0.5->8, 1.5->25, 2.0->35, 3.0->50, 50->90), not a
    // Formula, so "converting" would mean choosing numbers — content invented to
    // Make a column look tidy. The visible consequence: purpur reads as SOFTER
    // Than dirt. That is what the source says, it is recorded in audit §4.5.2, and
    // It is the reason `historical design audit` says this column may not be
    // Compared across group boundaries.
    //
    // TWO VALUES ARE OUTSIDE THE DOCUMENTED 0-100 RANGE, in opposite directions:
    //
    //   `end_portal_frame` / `_filled` are 9000. The reference's spelling of
    //     "unbreakable", above `bedrock`'s 100. Kept verbatim: it is monotone with
    //     The rest of the column (bigger is harder), so it is comparable even
    //     Though it is off the end of the stated range.
    //
    //   `end_gateway` is -1 in the reference, and that one is NOT kept. A negative
    //     Hardness is not "very hard": `computeBreakTicks` (`break-speed.ts:29-31`)
    //     Returns 0 for `hardness <= 0`, so -1 means INSTANT, which is the exact
    //     Opposite of the intent and is a bug in the reference. This row says 0,
    //     Which is behaviourally identical to -1 under that function and is inside
    //     The range the column claims. The bug is recorded rather than inherited,
    //     And `end_gateway` drops nothing anyway (`endBlockDrops` maps it to AIR).
    //
    // `purpur_slab` is the second member of `SLAB_BLOCK_IDS`
    // (`block-collision-predicates.ts:56-59`). `collisionShape: 'slab'` now has
    // The complete two-member set behind it that the reference has.
    //
    // Ten of the seventeen are in `NON_SUFFOCATING_BLOCKS` and seven of those are
    // Also in `NON_SPAWN_SURFACE_BLOCK_IDS`, but the two sets are NOT nested here:
    // `dragon_egg`, `ender_chest`, `purpur_slab`, `purpur_stairs` and `shulker_box`
    // Are non-suffocating and ARE valid spawn surfaces. Another five rows where
    // Collapsing the two flags into one would change behaviour.
    { ...{ id: createBlockId(nextRegisteredBlockId()) } as const, ...{ definition: { ...{ type: 'end_stone' } as const, ...{ properties: { ...{ hardness: 45 } as const } } as const } } as const },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'end_portal_frame' } as const,
                ...{ capabilities: { ...{ suffocates: false } as const } } as const,
                ...{ properties: { ...{ lightEmission: 1 } as const, ...{ hardness: 9000 } as const } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'end_portal_frame_filled' } as const,
                ...{ capabilities: { ...{ suffocates: false } as const } } as const,
                ...{ properties: { ...{ lightEmission: 3 } as const, ...{ hardness: 9000 } as const } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'end_portal' } as const,
                ...{ capabilities: { ...{ suffocates: false } as const, ...{ validSpawnSurface: false } as const } } as const,
                ...{ properties: {
                        ...{ opacity: 'transparentSolid' } as const,
                        ...{ lightEmission: 15 } as const,
                        ...{ hardness: 0 } as const,
                        ...{ friction: 0 } as const,
                        ...{
                            // See `nether_portal`: world state, never carried, and the "nothing" is
                            // Written down rather than arrived at by having no item form.
                            drops: DROPS_NOTHING } as const
                    } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'chorus_flower' } as const,
                ...{ capabilities: { ...{ suffocates: false } as const, ...{ validSpawnSurface: false } as const } } as const,
                ...{ properties: { ...{ opacity: 'transparentSolid' } as const, ...{ hardness: 0.4 } as const, ...{ friction: 0 } as const } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'chorus_plant' } as const,
                ...{ capabilities: { ...{ suffocates: false } as const, ...{ validSpawnSurface: false } as const } } as const,
                ...{ properties: { ...{ opacity: 'transparentSolid' } as const, ...{ hardness: 0.4 } as const, ...{ friction: 0 } as const } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'dragon_egg' } as const,
                ...{ capabilities: { ...{ suffocates: false } as const } } as const,
                ...{ properties: { ...{ opacity: 'transparentSolid' } as const, ...{ hardness: 3 } as const } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'end_crystal' } as const,
                ...{ capabilities: { ...{ suffocates: false } as const, ...{ validSpawnSurface: false } as const } } as const,
                ...{ properties: { ...{ opacity: 'transparentSolid' } as const, ...{ hardness: 0 } as const, ...{ friction: 0 } as const } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'end_gateway' } as const,
                ...{ capabilities: { ...{ suffocates: false } as const, ...{ validSpawnSurface: false } as const } } as const,
                ...{ properties: { ...{ opacity: 'transparentSolid' } as const, ...{ lightEmission: 15 } as const, ...{ hardness: 0 } as const, ...{ friction: 0 } as const, ...{ drops: DROPS_NOTHING } as const } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'end_rod' } as const,
                ...{ capabilities: { ...{ suffocates: false } as const, ...{ validSpawnSurface: false } as const } } as const,
                ...{ properties: { ...{ opacity: 'transparentSolid' } as const, ...{ lightEmission: 15 } as const, ...{ hardness: 0 } as const, ...{ friction: 0 } as const } } as const
            } } as const
    },
    { ...{ id: createBlockId(nextRegisteredBlockId()) } as const, ...{ definition: { ...{ type: 'end_stone_bricks' } as const, ...{ properties: { ...{ hardness: 45 } as const, ...{ footstepMaterial: 'stone' } as const } } as const } } as const },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'ender_chest' } as const,
                ...{ capabilities: { ...{ suffocates: false } as const } } as const,
                ...{ properties: { ...{ lightEmission: 15 } as const, ...{ hardness: 22.5 } as const } } as const
            } } as const
    },
    { ...{ id: createBlockId(nextRegisteredBlockId()) } as const, ...{ definition: { ...{ type: 'purpur_block' } as const, ...{ properties: { ...{ hardness: 1.5 } as const } } as const } } as const },
    { ...{ id: createBlockId(nextRegisteredBlockId()) } as const, ...{ definition: { ...{ type: 'purpur_pillar' } as const, ...{ properties: { ...{ hardness: 1.5 } as const } } as const } } as const },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'purpur_slab' } as const,
                ...{ capabilities: { ...{ suffocates: false } as const } } as const,
                ...{ properties: { ...{ opacity: 'transparentSolid' } as const, ...{ collisionShape: 'slab' } as const, ...{ hardness: 1.5 } as const } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'purpur_stairs' } as const,
                ...{ capabilities: { ...{ suffocates: false } as const } } as const,
                ...{ properties: { ...{ opacity: 'transparentSolid' } as const, ...{ hardness: 1.5 } as const } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'shulker_box' } as const,
                ...{ capabilities: { ...{ suffocates: false } as const } } as const,
                ...{ properties: { ...{ hardness: 2 } as const } } as const
            } } as const
    },
    // ---------------------------------------------------------------------------
    // Ids 103-119: crafted blocks, furniture, and the Nether
    // ---------------------------------------------------------------------------
    //
    // The remainder, and the group with the most `flammable` in it:
    // `FLAMMABLE_BLOCK_TYPES` (`fire-lifecycle.ts:19-30`) has eleven members and
    // Seven of them land here — `crafting_table`, `chest`, `door`, `door_open`,
    // `oak_stairs`, `bed`, `tnt` — completing that closed table (the other four,
    // `oak_log`, `oak_leaves`, `oak_planks` and `ladder`, were already in place).
    //
    // `netherrack` is a `fireSource`, which until now only `lava` was.
    // `isFireSourceIndex` (`fire-lifecycle.ts:80-81`) is exactly those two, so the
    // Capability finally has the pair that shows it is not a synonym for
    // `flammable`: netherrack sustains a fire without itself burning away.
    //
    // THREE ROWS GET NO ITEM FORM, and the reason is kernel's own judgement rather
    // Than a transcription — say so plainly. `fire`, `nether_portal` and (in the
    // End group) `end_portal` are world STATE: created by a rule, never carried,
    // Never placed from a hotbar. The reference cannot express that, because its
    // `InventoryItem` is the UNION of block and item names, so it hands an item
    // Form to `AIR` as well. Kernel already rejected that union for `air`
    // (audit §6-6) and for the fluids; these three are the same argument applied
    // To the same kind of thing. They surface in `UNITEMISED_BLOCK_TYPES`, where a
    // Reviewer can disagree with the decision, rather than in silence.
    //
    // `door`/`door_open` and `cauldron`/`water_cauldron` are the two state pairs.
    // `INVENTORY_DROP_OVERRIDES` maps the second of each to the first, so both
    // Pairs drop the item you can actually hold, and neither `door_open` nor
    // `water_cauldron` has an item of its own.
    //
    // `fire` is worth one more line. It is not in `FLAMMABLE_BLOCK_TYPES` — fire
    // Does not catch fire — and not in `isFireSourceIndex` either, which is the
    // Reference distinguishing "the thing that burns" from "the thing that keeps
    // Burning" from "the burning itself". Three concepts, three answers, one row
    // That says `false` to two flags it looks like it should say `true` to.
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'crafting_table' } as const,
                ...{ capabilities: { ...{ flammable: true } as const } } as const,
                ...{ properties: { ...{ hardness: 40 } as const, ...{ harvestTool: FASTER_WITH_AXE } as const } } as const
            } } as const
    },
    { ...{ id: createBlockId(nextRegisteredBlockId()) } as const, ...{ definition: { ...{ type: 'furnace' } as const, ...{ properties: { ...{ hardness: 55 } as const, ...{ friction: 0.8 } as const } } as const } } as const },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'chest' } as const,
                ...{ capabilities: { ...{ flammable: true } as const } } as const,
                ...{ properties: { ...{ hardness: 35 } as const, ...{ footstepMaterial: 'wood' } as const } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'door' } as const,
                ...{ capabilities: { ...{ flammable: true } as const, ...{ suffocates: false } as const, ...{ validSpawnSurface: false } as const } } as const,
                ...{ properties: { ...{ opacity: 'transparentSolid' } as const, ...{ hardness: 15 } as const, ...{ footstepMaterial: 'wood' } as const } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'door_open' } as const,
                ...{ capabilities: { ...{ flammable: true } as const, ...{ suffocates: false } as const, ...{ validSpawnSurface: false } as const } } as const,
                ...{ properties: { ...{ opacity: 'transparentSolid' } as const, ...{ hardness: 15 } as const, ...{ drops: { ...DEFAULT_BLOCK_DROP, ...{ item: 'door' } as const } } as const } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'oak_stairs' } as const,
                ...{ capabilities: { ...{ flammable: true } as const, ...{ suffocates: false } as const } } as const,
                ...{ properties: { ...{ opacity: 'transparentSolid' } as const, ...{ hardness: 35 } as const } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'anvil' } as const,
                ...{ properties: { ...{ hardness: 75 } as const, ...{ harvestTool: NEEDS_WOODEN_PICKAXE } as const } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'cauldron' } as const,
                ...{ properties: { ...{ hardness: 35 } as const, ...{ harvestTool: NEEDS_WOODEN_PICKAXE } as const } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'water_cauldron' } as const,
                ...{ properties: {
                        ...{ hardness: 35 } as const,
                        ...{ harvestTool: NEEDS_WOODEN_PICKAXE } as const,
                        ...{ drops: { ...DEFAULT_BLOCK_DROP, ...{ item: 'cauldron' } as const } } as const
                    } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'bed' } as const,
                ...{ capabilities: { ...{ flammable: true } as const, ...{ suffocates: false } as const, ...{ validSpawnSurface: false } as const } } as const,
                ...{ properties: { ...{ opacity: 'transparentSolid' } as const, ...{ hardness: 10 } as const } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'enchanting_table' } as const,
                ...{ capabilities: { ...{ suffocates: false } as const } } as const,
                ...{ properties: { ...{ hardness: 30 } as const } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'brewing_stand' } as const,
                ...{ properties: { ...{ opacity: 'transparentSolid' } as const, ...{ hardness: 15 } as const } } as const
            } } as const
    },
    { ...{ id: createBlockId(nextRegisteredBlockId()) } as const, ...{ definition: { ...{ type: 'tnt' } as const, ...{ capabilities: { ...{ flammable: true } as const } } as const, ...{ properties: { ...{ hardness: 0 } as const } } as const } } as const },
    { ...{ id: createBlockId(nextRegisteredBlockId()) } as const, ...{ definition: { ...{ type: 'nether_brick' } as const, ...{ properties: { ...{ hardness: 40 } as const } } as const } } as const },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'netherrack' } as const,
                ...{ capabilities: { ...{ fireSource: true } as const } } as const,
                ...{ properties: { ...{ hardness: 5 } as const } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'nether_portal' } as const,
                ...{ capabilities: { ...{ suffocates: false } as const, ...{ validSpawnSurface: false } as const } } as const,
                ...{ properties: {
                        ...{ opacity: 'transparentSolid' } as const,
                        ...{ lightEmission: 11 } as const,
                        ...{ hardness: 0 } as const,
                        ...{ friction: 0 } as const,
                        ...{
                            // STATED, not left to the missing item form. Without this the row would
                            // Carry the default "yields itself", resolve to nothing because
                            // `nether_portal` has no item, and be indistinguishable from an
                            // Oversight — which is the failure `test/item-drops.test.ts` now
                            // Forbids. A portal is lit by a rule and is never carried.
                            drops: DROPS_NOTHING } as const
                    } } as const
            } } as const
    },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'fire' } as const,
                ...{ properties: {
                        ...{ opacity: 'transparentSolid' } as const,
                        ...{ lightEmission: 15 } as const,
                        ...{ hardness: 0 } as const,
                        ...{ friction: 0 } as const,
                        ...{
                            // Fire is the third of the three world-state rows. It is also the row
                            // That says `flammable: false` and `fireSource: false` by saying nothing
                            // — fire neither catches fire (`FLAMMABLE_BLOCK_TYPES` omits it) nor
                            // Sustains one (`isFireSourceIndex` is NETHERRACK and LAVA only).
                            drops: DROPS_NOTHING } as const
                    } } as const
            } } as const
    },
    { ...{ id: createBlockId(nextRegisteredBlockId()) } as const, ...{ definition: { ...{ type: 'soul_soil' } as const, ...{ properties: { ...{ hardness: 5 } as const } } as const } } as const },
    {
        ...{ id: createBlockId(nextRegisteredBlockId()) } as const,
        ...{ definition: {
                ...{ type: 'wither_skeleton_skull' } as const,
                ...{ capabilities: {
                        ...{ suffocates: false } as const,
                        ...{ validSpawnSurface: false } as const,
                        ...{ canSupportAttachments: false } as const
                    } } as const,
                ...{ properties: {
                        ...{ opacity: 'transparentSolid' } as const,
                        ...{ collisionShape: 'none' } as const,
                        ...{ supportRule: NEEDS_ANY_SUPPORT } as const
                    } } as const
            } } as const
    },
    { ...{ id: createBlockId(nextRegisteredBlockId()) } as const, ...{ definition: { ...{ type: 'dropper' } as const, ...{ properties: { ...{ hardness: 60 } as const } } as const } } as const },
];
// ---------------------------------------------------------------------------
// Derived lookups. Everything below is computed from BLOCK_REGISTRY once, at
// Module load, so that no consumer is tempted to build its own index.
// ---------------------------------------------------------------------------
const UNDEFINED: undefined = globalThis.undefined;
const BYTE_DISABLED = 0;
const BYTE_ENABLED = 1;
const BLOCK_ID_TABLE_LENGTH = BLOCK_ID_MAX + BYTE_ENABLED;
const booleanToByte = (value: boolean): number => {
    if (value) {
        return BYTE_ENABLED;
    }
    return BYTE_DISABLED;
};
const buildResolvedById = (): ReadonlyArray<ResolvedBlock | undefined> => {
    const table: Array<ResolvedBlock | undefined> = Array.from({ ...{ length: BLOCK_ID_TABLE_LENGTH } as const }, () => UNDEFINED);
    for (const entry of BLOCK_REGISTRY) {
        table[entry.id] = resolveBlock(entry.definition);
    }
    return table;
};
/** Dense, id-indexed. A plain array read, because this is on the meshing path. */
const RESOLVED_BY_ID = buildResolvedById();
const isAddressableBlockId = (id: number): boolean => Number.isInteger(id) && id >= FIRST_REGISTERED_BLOCK_ID && id <= BLOCK_ID_MAX;
const assignCapabilities = (columns: Record<BlockCapabilityFlag, Uint8Array>, entry: BlockRegistryEntry): void => {
    const resolved = RESOLVED_BY_ID[entry.id];
    if (typeof resolved !== 'undefined') {
        for (const flag of BLOCK_CAPABILITY_FLAGS) {
            columns[flag][entry.id] = booleanToByte(resolved.capabilities[flag]);
        }
    }
};
const buildCapabilitiesById = (): Readonly<Record<BlockCapabilityFlag, Uint8Array>> => {
    const columns = {} as Record<BlockCapabilityFlag, Uint8Array>;
    for (const flag of BLOCK_CAPABILITY_FLAGS) {
        const column = new Uint8Array(BLOCK_ID_TABLE_LENGTH);
        column.fill(booleanToByte(BLOCK_CAPABILITY_DEFAULTS[flag]));
        columns[flag] = column;
    }
    for (const entry of BLOCK_REGISTRY) {
        assignCapabilities(columns, entry);
    }
    return columns;
};
const CAPABILITIES_BY_ID = buildCapabilitiesById();
type MutablePropertyColumns = {
    lightEmission: Uint8Array;
    opacity: BlockOpacity[];
    supportRule: SupportRule[];
    supportSensitive: Uint8Array;
};
const assignPropertyColumns = (columns: MutablePropertyColumns, entry: BlockRegistryEntry): void => {
    const resolved = RESOLVED_BY_ID[entry.id];
    if (typeof resolved !== 'undefined') {
        const { properties } = resolved;
        columns.opacity[entry.id] = properties.opacity;
        columns.lightEmission[entry.id] = properties.lightEmission;
        columns.supportRule[entry.id] = properties.supportRule;
        columns.supportSensitive[entry.id] = booleanToByte(isSupportSensitive(properties.supportRule));
    }
};
const buildPropertyColumns = (): {
    readonly opacity: ReadonlyArray<BlockOpacity>;
    readonly lightEmission: Uint8Array;
    readonly supportRule: ReadonlyArray<SupportRule>;
    readonly supportSensitive: Uint8Array;
} => {
    const opacity: BlockOpacity[] = Array.from({ ...{ length: BLOCK_ID_TABLE_LENGTH } as const }, () => BLOCK_PROPERTY_DEFAULTS.opacity);
    const lightEmission = new Uint8Array(BLOCK_ID_TABLE_LENGTH);
    const supportRule: SupportRule[] = Array.from({ ...{ length: BLOCK_ID_TABLE_LENGTH } as const }, () => BLOCK_PROPERTY_DEFAULTS.supportRule);
    const supportSensitive = new Uint8Array(BLOCK_ID_TABLE_LENGTH);
    lightEmission.fill(BLOCK_PROPERTY_DEFAULTS.lightEmission);
    const columns = { lightEmission, opacity, supportRule, supportSensitive };
    for (const entry of BLOCK_REGISTRY) {
        assignPropertyColumns(columns, entry);
    }
    return columns;
};
const PROPERTY_COLUMNS = buildPropertyColumns();
const seededRecord = <Key extends string, Value>(
    keys: ReadonlyArray<Key>,
    build: (key: Key) => Value,
): Record<Key, Value> =>
    Object.fromEntries(keys.map((key) => [key, build(key)])) as Record<Key, Value>;

const buildIdByType = (): Readonly<Record<BlockType, BlockId>> => {
    const idsByType = new Map<BlockType, BlockId>();
    for (const entry of BLOCK_REGISTRY) {
        idsByType.set(entry.definition.type, entry.id);
    }
    return seededRecord(BLOCK_TYPES, (type) => {
        const id = idsByType.get(type);
        if (typeof id === 'undefined') {
            throw new Error(`Block registry is missing a row for ${type}`);
        }
        return id;
    });
};
const ID_BY_TYPE = buildIdByType();
/**
 * Every id currently assigned, ascending. Holes left by a removed block are
 * absent from this array but still consume their number forever.
 */
export const BLOCK_IDS: ReadonlyArray<BlockId> = BLOCK_REGISTRY.map((entry) => entry.id);
/**
 * `BlockType` -> id. Registry completeness is validated at initialization;
 * unknown values that bypass the type guard fail loudly at lookup time.
 */
export const blockIdOf = (type: BlockType): BlockId => {
  const id = ID_BY_TYPE[type] as BlockId | typeof UNDEFINED
  if (id === UNDEFINED) {
    throw new Error(`Block registry is missing a row for ${type}`)
  }
  return id
}

/** Id -> `BlockType`. `undefined` for a byte this build does not recognise. */
export const blockTypeOfId = (id: number): BlockType | undefined => {
  if (isAddressableBlockId(id)) {
    return RESOLVED_BY_ID[id]?.type
  }
  return UNDEFINED
}

/** Id -> the fully resolved row. `undefined` for an unrecognised byte. */
export const resolvedBlockOfId = (id: number): ResolvedBlock | undefined => {
  if (isAddressableBlockId(id)) {
    return RESOLVED_BY_ID[id]
  }
  return UNDEFINED
}
/** Does this number name a block this build knows about? */
export const isKnownBlockId = (id: number): boolean => typeof resolvedBlockOfId(id) !== 'undefined';
/**
 * Read one capability straight off a chunk buffer byte. TOTAL — see the module
 * header on why an unknown id resolves to an ordinary opaque cube.
 *
 * This is THE function the vertical slice was missing: `fallsWhenUnsupported`
 * for the byte that came out of a `Uint8Array`, with no block name anywhere in
 * the caller.
 */
export const capabilityOfBlockId = (id: number, flag: BlockCapabilityFlag): boolean => {
    if (isAddressableBlockId(id)) {
        return CAPABILITIES_BY_ID[flag][id] === BYTE_ENABLED;
    }
    return BLOCK_CAPABILITY_DEFAULTS[flag];
};
/** Read one property straight off a chunk buffer byte. TOTAL, same rule. */
export const propertyOfBlockId = <PropertyName extends BlockPropertyName>(id: number, name: PropertyName): BlockProperties[PropertyName] => resolvedBlockOfId(id)?.properties[name] ?? BLOCK_PROPERTY_DEFAULTS[name];
/** Both halves at once, for a caller that needs several answers about one byte. */
export const capabilitiesOfBlockId = (id: number): BlockCapabilities => resolvedBlockOfId(id)?.capabilities ?? BLOCK_CAPABILITY_DEFAULTS;
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
    const resolved = resolvedBlockOfId(id);
    if (typeof resolved === 'undefined') {
        return UNDEFINED;
    }
    return resolveDrop(resolved.properties.harvestTool, resolved.properties.drops, resolved.type, context);
};
/**
 * Keyed by a `Record` and not a `Map`, because the key set here IS
 * `BlockCapabilityFlag` — the loop below visits every flag, so every flag has a
 * bucket. Spelled as a `Map`, that totality was invisible to the type system
 * and `blockIdsWithCapability` had to end in `?? new Set()`, an arm no
 * well-typed caller could reach. A `Record` states the same fact where the
 * compiler can use it, and the empty bucket for a flag no block carries is
 * produced by the loop rather than conjured by a fallback.
 */
const buildIdsByCapability = (): Readonly<Record<BlockCapabilityFlag, ReadonlySet<number>>> =>
    seededRecord(BLOCK_CAPABILITY_FLAGS, (flag) => {
        const members = new Set<number>();
        for (const entry of BLOCK_REGISTRY) {
            if (capabilityOfBlockId(entry.id, flag)) {
                members.add(entry.id);
            }
        }
        return members;
    });
const IDS_BY_CAPABILITY = buildIdsByCapability();
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
export const blockIdsWithCapability = (flag: BlockCapabilityFlag): ReadonlySet<number> => IDS_BY_CAPABILITY[flag];
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
    const table = seededRecord(BLOCK_OPACITIES, () => new Set<number>());
    for (const entry of BLOCK_REGISTRY) {
        table[propertyOfBlockId(entry.id, 'opacity')].add(entry.id);
    }
    return table;
};
const IDS_BY_OPACITY = buildIdsByOpacity();
/**
 * The set of ids in one meshing bucket, as a native `Set<number>`.
 *
 * mc-meshing's `config.transparentBlockIds` is exactly
 * `blockIdsWithOpacity('transparentSolid')`, and its water set is
 * `blockIdsWithOpacity('fluid')`. the design contract keeps the injection point — the
 * config — so meshing still receives the sets rather than importing this
 * module on its hot path.
 */
export const blockIdsWithOpacity = (opacity: BlockOpacity): ReadonlySet<number> => IDS_BY_OPACITY[opacity];
// ---------------------------------------------------------------------------
// The light pair, named. Not new capabilities — named readings of two existing
// Property columns.
// ---------------------------------------------------------------------------
//
// `opacity` and `lightEmission` have been real kernel properties since
// `./block-properties` was written (audit §4.4 settles both: three classes, and
// A 0..15 level rather than the `emissive: boolean` the design contract asked for).
// They were readable only through the GENERIC accessor, `propertyOfBlockId(id,
// 'opacity')`, and that is the whole of what was missing here.
//
// The generic accessor is the right shape for a caller that already knows the
// Property model. It is the wrong shape for the one caller that cannot import
// The property model at all: mc-worldgen mirrors kernel rather than depending on
// It (the design contract Step 3 publishes bottom-up, and nothing is published yet), so
// Its `domain/kernel-vocabulary.ts` must restate whatever it uses. Restating
// `propertyOfBlockId` means restating `BlockPropertyName`, `BlockProperties` and
// The generic index that ties them together — the entire property mechanism —
// In order to ask two questions. It reasonably declined, declared the two
// Readings it needed as named functions, and thereby ran ahead of its source.
//
// Kernel grants the names, for kernel's own reason rather than as a courtesy:
// A mirror that runs ahead of its source typechecks locally, ships a table the
// Source rejects, and breaks on the one day the mirror discipline promises will
// Be uneventful. `./item-type`'s header records the same argument at length for
// The seven `ItemType` literals mc-sim needed, and the answer there was the same
// — grant them, each with a reason of its own.
//
// These three are deliberately the ONLY named property readings kernel exports.
// A named accessor per property would be thirteen functions restating the table
// They read, which is the double-management `./block-properties` exists to
// Avoid. The light pair earns the exception because it has an off-repository
// Consumer that cannot express the generic form.
/**
 * The meshing bucket and light-attenuation class of a chunk buffer byte.
 *
 * TOTAL, by delegation: an id this build cannot name reads as `'opaque'`,
 * because that is `BLOCK_PROPERTY_DEFAULTS.opacity` and audit §7 settles every
 * default at 「普通の不透明立方体」.
 */
export const opacityOfBlockId = (id: number): BlockOpacity => {
    if (isAddressableBlockId(id)) {
        return PROPERTY_COLUMNS.opacity[id] ?? BLOCK_PROPERTY_DEFAULTS.opacity;
    }
    return BLOCK_PROPERTY_DEFAULTS.opacity;
};
/**
 * The light a chunk buffer byte emits, 0..15.
 *
 * TOTAL, same rule: an unrecognised byte emits `LIGHT_LEVEL_MIN`. That is the
 * inert reading — an unknown block sitting in the dark, rather than an unknown
 * block lighting a cave it has no business lighting.
 */
export const lightEmissionOfBlockId = (id: number): number => {
    if (isAddressableBlockId(id)) {
        return PROPERTY_COLUMNS.lightEmission[id] ?? BLOCK_PROPERTY_DEFAULTS.lightEmission;
    }
    return BLOCK_PROPERTY_DEFAULTS.lightEmission;
};
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
export const transmitsLight = (id: number): boolean => {
    if (isAddressableBlockId(id)) {
        return PROPERTY_COLUMNS.opacity[id] !== 'opaque';
    }
    return BLOCK_PROPERTY_DEFAULTS.opacity !== 'opaque';
};
// ---------------------------------------------------------------------------
// Support: one named property reading and the JOIN that reads two bytes
// ---------------------------------------------------------------------------
//
// `supportRuleOfBlockId` is a fourth named property reading, and the paragraph
// Above says the light pair are deliberately the only ones — so this needs the
// Same kind of reason rather than a shrug. It has one, and it is stronger than
// Mc-worldgen's: the reading is not the point, `canBlockStaySupported` is, and
// That function needs the rule of ONE byte and a capability of ANOTHER. Naming
// The reading is what lets the join below be four lines that a reader can check
// Against `block-support.ts:96-101` line for line.
//
// The other half is the caller's: a placement rule reads the cell BELOW only
// When the held block is support-sensitive, which is a store call it skips on
// The stone a player spends a session stacking. Deciding that needs the rule
// Before the second read exists, so the join cannot answer it.
/**
 * The support rule of a chunk buffer byte.
 *
 * TOTAL, by delegation: an id this build cannot name requires nothing below,
 * because that is `BLOCK_PROPERTY_DEFAULTS.supportRule`. The inert reading
 * again — an unknown block sits where it was put rather than popping off.
 */
export const supportRuleOfBlockId = (id: number): SupportRule => {
    if (isAddressableBlockId(id)) {
        return PROPERTY_COLUMNS.supportRule[id] ?? BLOCK_PROPERTY_DEFAULTS.supportRule;
    }
    return BLOCK_PROPERTY_DEFAULTS.supportRule;
};
/**
 * Does this byte care what is under it?
 *
 * `SUPPORT_SENSITIVE_BLOCK_TYPES` (`block-support.ts:22-32`) as a question about
 * a byte. `false` for an unknown id, which is the permissive direction and is
 * chosen: the alternative refuses to place an unnameable block for a reason
 * nobody can state, and `capabilityOfBlockId` has already settled that an
 * unknown byte reads as an ordinary cube.
 */
export const isSupportSensitiveBlockId = (id: number): boolean => isAddressableBlockId(id) && PROPERTY_COLUMNS.supportSensitive[id] === BYTE_ENABLED;
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
const canSupportAttachmentsOfBlockId = (id: number): boolean => {
    if (isAddressableBlockId(id)) {
        return CAPABILITIES_BY_ID.canSupportAttachments[id] === BYTE_ENABLED;
    }
    return BLOCK_CAPABILITY_DEFAULTS.canSupportAttachments;
};
export const canBlockStaySupported = (id: number, supportBelow: number): boolean => satisfiesSupportRule(
    supportRuleOfBlockId(id),
    blockTypeOfId(supportBelow),
    canSupportAttachmentsOfBlockId(supportBelow),
);
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
export const UNREGISTERED_BLOCK_TYPES: ReadonlyArray<BlockType> = BLOCK_TYPES.filter((type) => !Object.hasOwn(ID_BY_TYPE, type));
