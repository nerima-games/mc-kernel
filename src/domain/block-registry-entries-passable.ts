/** Registry entries 18-32; the numeric order is the wire-level BlockId order. */
import { BlockId } from './block-registry-types.js'
import type { BlockRegistryEntry } from './block-registry-types.js'
import { DEFAULT_BLOCK_DROP } from './block-harvest-data.js'
import { NEEDS_ANY_SUPPORT } from './block-support-data.js'
import { SURFACE_PLANT_CAPABILITIES, PLANT_PROPERTIES, DROPS_NOTHING, NEEDS_PLANTABLE_GROUND, NEEDS_SUGAR_CANE_GROUND, NEEDS_WATER } from './block-registry-rules.js'

export const BLOCK_REGISTRY_PASSABLE: ReadonlyArray<BlockRegistryEntry> = [
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
    // `drops: DROPS_NOTHING` was the missing row. Every OTHER row in this
    // block falls through `PLANT_PROPERTIES` to the default "drops one of
    // itself" — correct for sapling/dandelion/poppy/mushrooms, where a bare
    // hand really does hand back the plant. Vanilla's tall grass and fern are
    // the exception: bare-hand breaking yields nothing (the small wheat-seed
    // chance lives downstream, in mx-gameplay's block-loot bonus-drop table,
    // not here). mx-gameplay's `block-vocabulary.ts:638` pinned exactly this
    // override before its deletion.
    id: BlockId(25),
    definition: {
      type: 'tall_grass',
      capabilities: SURFACE_PLANT_CAPABILITIES,
      properties: {
        ...PLANT_PROPERTIES,
        renderKind: 'cross',
        drops: DROPS_NOTHING,
        supportRule: NEEDS_PLANTABLE_GROUND, // block-support.ts:85-88 via SURFACE_PLANT_BLOCK_TYPES (:10)
      }, // plant-mesh.ts:23
    },
  },
  {
    // See the `tall_grass` row above — same rule, same reason.
    // mx-gameplay's `block-vocabulary.ts:639` pinned it for fern too.
    id: BlockId(26),
    definition: {
      type: 'fern',
      capabilities: SURFACE_PLANT_CAPABILITIES,
      properties: {
        ...PLANT_PROPERTIES,
        renderKind: 'cross',
        drops: DROPS_NOTHING,
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
]
