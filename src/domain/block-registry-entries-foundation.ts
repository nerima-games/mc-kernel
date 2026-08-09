/** Registry entries 0-35; the numeric order is the wire-level BlockId order. */
import { BlockId } from './block-registry-types.js'
import type { BlockRegistryEntry } from './block-registry-types.js'
import { StackCount } from './quantities.js'
import { DEFAULT_BLOCK_DROP } from './block-harvest.js'
import { NEEDS_ANY_SUPPORT } from './block-support.js'
import { DROPS_NOTHING, NEEDS_WOODEN_PICKAXE, FASTER_WITH_SHOVEL, FASTER_WITH_AXE, FASTER_WITH_SHEARS, SURFACE_PLANT_CAPABILITIES, PLANT_PROPERTIES, NEEDS_PLANTABLE_GROUND, NEEDS_SUGAR_CANE_GROUND, NEEDS_SAND_OR_CACTUS, NEEDS_WATER } from './block-registry-rules.js'

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
]
