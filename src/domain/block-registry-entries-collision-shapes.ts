/** Registry entries 33-35; the numeric order is the wire-level BlockId order. */
import { BlockId } from './block-registry-types.js'
import type { BlockRegistryEntry } from './block-registry-types.js'
import { NEEDS_ANY_SUPPORT } from './block-support-data.js'
import { NEEDS_SAND_OR_CACTUS, NEEDS_WOODEN_PICKAXE } from './block-registry-rules.js'

export const BLOCK_REGISTRY_COLLISION_SHAPES: ReadonlyArray<BlockRegistryEntry> = [
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
    // members, `PURPUR_SLAB` and `STONE_SLAB`. This fragment owns the stone
    // slab row; the End fragment owns `purpur_slab` at id 100, so both reference
    // rows carry `collisionShape: 'slab'`.
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
]
