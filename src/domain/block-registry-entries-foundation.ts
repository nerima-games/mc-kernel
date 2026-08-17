/** Registry entries 0-17; the numeric order is the wire-level BlockId order. */
import { BlockId } from './block-registry-types.js'
import type { BlockRegistryEntry } from './block-registry-types.js'
import { StackCount } from './quantities.js'
import { DEFAULT_BLOCK_DROP } from './block-harvest.js'
import { NEEDS_ANY_SUPPORT } from './block-support.js'
import { DROPS_NOTHING, NEEDS_WOODEN_PICKAXE, FASTER_WITH_SHOVEL, FASTER_WITH_AXE, FASTER_WITH_SHEARS } from './block-registry-rules.js'

export const BLOCK_REGISTRY_FOUNDATION: ReadonlyArray<BlockRegistryEntry> = [
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
]
