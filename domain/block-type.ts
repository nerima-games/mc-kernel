/**
 * Block identity.
 *
 * PROVISIONAL AND INCOMPLETE — 36 of the reference implementation's 120.
 *
 * ---------------------------------------------------------------------------
 * The 120 is re-derived, not inherited
 * ---------------------------------------------------------------------------
 *
 * `docs/capability-flag-audit.md` §2 asserts **120 literals** in the reference's
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
 * Both counts exclude comment lines (the schema interleaves eight). plan.md's
 * "~119" is an approximation of the same number and is the looser statement.
 *
 * So the target in `docs/testing.md` §5 row 4 is correct as written. It is
 * recorded here because the number is the kind of thing that gets re-quoted
 * without being re-checked, and this repository's most-repeated defect is a
 * figure justified by the wrong measurement.
 *
 * ---------------------------------------------------------------------------
 * Why these 36 and not an arbitrary 36
 * ---------------------------------------------------------------------------
 *
 * The roster grows by CLOSED REFERENCE TABLES rather than by count. The
 * original eighteen were the blocks audit §4.9 needs to prove "non-solid" is
 * five independent concepts (`glass`, `oak_leaves`, `snow`) plus the vertical
 * slice's own. The eighteen added since complete two more such tables:
 * `PASSABLE_BLOCK_IDS` (all 19 members now exist) and the three non-`full`
 * members of `COLLISION_SHAPES`.
 *
 * The rule is worth stating because the alternative is worse: importing HALF a
 * membership set produces a set that disagrees with its source, and audit §4.9's
 * central finding is that the reference already has five such disagreements. A
 * roster grown to hit a number would manufacture more of them.
 *
 * Kernel ships no block TABLE beyond `./block-registry`, and completing the
 * roster to 120 is additive: no consumer's code changes when a literal is
 * added, because behaviour is read from capabilities rather than from the name.
 * What is NOT free is the registry row each literal obliges
 * (`test/block-registry.test.ts` asserts `UNREGISTERED_BLOCK_TYPES` is empty),
 * and that row must carry real flags — which is what limits the rate.
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
] as const

export type BlockType = (typeof BLOCK_TYPES)[number]

const BLOCK_TYPE_LOOKUP: ReadonlySet<string> = new Set<string>(BLOCK_TYPES)

/**
 * Narrowing guard for values arriving from outside the type system (save
 * files, network frames, developer consoles).
 */
export const isBlockType = (value: string): value is BlockType => BLOCK_TYPE_LOOKUP.has(value)
