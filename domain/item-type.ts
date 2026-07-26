/**
 * Item identity — the missing half of plan.md §3.1's
 * 「`BlockType` / `ItemType`(リテラル型)」.
 *
 * The block half shipped (`./block-type`, `./block-registry`); this half never
 * did, so every repository that needed an item name invented `type ItemId =
 * string` with a comment promising to repoint when kernel published it
 * (`mc-sim/domain/inventory.ts`, `mc-playground-kit/domain/launch-options.ts`,
 * `mx-ui/domain/inventory-view-model.ts`). Three provisional aliases of the same
 * missing type is the same failure the block registry's header argues against,
 * one namespace over.
 *
 * ---------------------------------------------------------------------------
 * Why a literal union and not a branded string
 * ---------------------------------------------------------------------------
 *
 * `./block-type` is a literal union because plan.md §3.1's whole argument for
 * the block vocabulary is that behaviour must key off capability flags rather
 * than off name comparisons — and the only thing that makes "did you handle
 * every case?" a question the compiler can answer is a closed set of literals.
 * A branded string closes the set to *outsiders* but not to *typos*: `ItemId('
 * stik')` type-checks. An item namespace spelled `string` reopens exactly the
 * hole audit §2 measured on the reference implementation (335 raw block-name
 * literal sites across 80 files).
 *
 * So this file is `./block-type` with a different roster, deliberately down to
 * the shape of the guard. Reviewers should be able to diff the two.
 *
 * ---------------------------------------------------------------------------
 * `ItemType` is NOT a subset of `BlockType`, in either direction
 * ---------------------------------------------------------------------------
 *
 * A stick is not a block. A pickaxe is not a block. Equally, `air` is not an
 * item — audit §6-6 records that `AIR` is a sentinel meaning "no block here"
 * and not a thing — and neither are `water`, `lava`, `bedrock` or `snow` in
 * this build.
 *
 * The two rosters therefore OVERLAP rather than nest, and the overlap is
 * itself a useful type: audit §6-8 looked at the reference's hand-written
 * `BLOCK_ITEMS` list ("blocks you can hold in your hand",
 * `first-person-held-item.ts:58-76`, already missing KELP / SEAGRASS /
 * AMETHYST_* / RAIL) and concluded 「これは `ItemType ∩ BlockType` の導出であり、
 * フラグではなく型レベルで解決すべき」. `./block-item` does exactly that, by
 * derivation, so the list cannot go stale.
 *
 * ---------------------------------------------------------------------------
 * The roster is small on purpose
 * ---------------------------------------------------------------------------
 *
 * Sixteen entries, chosen so that every shape of drop rule has a real case
 * behind it rather than a placeholder: an item identical to its block
 * (`dirt`), an item a *different* block yields (`cobblestone` from `stone`,
 * `dirt` from `grass_block`), an item that is not a block at all
 * (`glowstone_dust`, `stick`, `wooden_pickaxe`), and blocks that yield nothing
 * (`oak_leaves`, `bedrock`).
 *
 * Filling it out is additive, exactly as it is for `BLOCK_TYPES`: consumers
 * read behaviour from the registry rather than from the name, so a new literal
 * changes nobody's code. `docs/versioning.md` §6 classifies it MINOR.
 *
 * Spelling is `lower_snake_case`, matching `BLOCK_TYPES`. Note that mc-sim's
 * provisional strings are UPPER_SNAKE (`'OAK_PLANKS'`, `'STICK'`): repointing
 * is a re-casing as well as a re-typing, and the compiler will find every site
 * once `ItemId` is this union.
 */

export const ITEM_TYPES = [
  // Items that are also blocks. Spelled identically to their `BlockType`, which
  // is what makes `./block-item`'s bridge a derivation instead of a table.
  'stone',
  'cobblestone',
  'dirt',
  'grass_block',
  'sand',
  'gravel',
  'oak_log',
  'oak_planks',
  'oak_leaves',
  'glass',
  'torch',
  'glowstone',
  'piston',

  // Items that are not blocks, and never will be. These are the entries that
  // make `ItemType` un-assignable to `BlockType`; without at least one of them
  // the two unions would be structurally interchangeable and the distinction
  // this file exists to draw would be decorative.
  //
  // `stick` and `wooden_pickaxe` are names the organisation already uses:
  // mc-sim's `STARTER_RECIPES` produces `'STICK'` and `'WOODEN_PICKAXE'`
  // (`mc-sim/domain/recipe.ts:602,640`).
  'stick',
  'glowstone_dust',
  'wooden_pickaxe',
] as const

export type ItemType = (typeof ITEM_TYPES)[number]

const ITEM_TYPE_LOOKUP: ReadonlySet<string> = new Set<string>(ITEM_TYPES)

/**
 * Narrowing guard for values arriving from outside the type system (save
 * files, network frames, developer consoles).
 *
 * Same shape as `isBlockType`, and deliberately so — a save file that stores an
 * inventory stores item names, and the two are read on the same path.
 */
export const isItemType = (value: string): value is ItemType => ITEM_TYPE_LOOKUP.has(value)
