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
 * The roster grew with the block roster, and only as far as it had to
 * ---------------------------------------------------------------------------
 *
 * It began at sixteen entries, chosen so that every shape of drop rule had a
 * real case behind it rather than a placeholder: an item identical to its block
 * (`dirt`), an item a *different* block yields (`cobblestone` from `stone`,
 * `dirt` from `grass_block`), an item that is not a block at all
 * (`glowstone_dust`, `stick`, `wooden_pickaxe`), and blocks that yield nothing
 * (`oak_leaves`, `bedrock`).
 *
 * It reached 23 when mc-sim's recipe table was repointed, and it is 101 now.
 * The jump is not enthusiasm: `BLOCK_TYPES` reached the reference's full 120,
 * and 55 of those new rows would otherwise have been LIES — a row stating that
 * a block drops itself, with no item of that name for it to drop. See the rule
 * stated above the additions, which is the whole of the reasoning.
 *
 * The roster is still not a catalogue of everything nameable: only the four
 * iron armour pieces required by the equipment boundary exist; there is no food
 * and no tool beyond `wooden_pickaxe`. Ten literals that the block-drop rule
 * WOULD admit are also deliberately absent; that argument is at the end of the
 * list, and it is the only place that rule is knowingly not applied.
 *
 * Filling it out further is additive, exactly as it is for `BLOCK_TYPES`:
 * consumers read behaviour from the registry rather than from the name, so a
 * new literal changes nobody's code. `docs/versioning.md` §6 classifies it MINOR.
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

  // Requested by mc-sim, with the cost written down, after its recipe table was
  // repointed onto this union and seven rows had nothing to name. The request
  // was accepted rather than the rows being restored locally, because a mirror
  // that runs ahead of this file typechecks locally, ships a table this union
  // rejects, and breaks on the one day the mirror is deleted — which is the day
  // the whole mirror discipline promises will be uneventful.
  //
  // These are NOT here on the strength of a recipe table alone. Growing tier-1
  // vocabulary from tier-2 evidence is the guessed-roster failure, one direction
  // over. Each has a kernel-side reason that arrives with it:
  //
  //   `coal` / `iron_ingot` / `flint`   what ore blocks and gravel drop, so they
  //                                     belong in `BlockDropRule.item` before any
  //                                     recipe names them
  //   `gunpowder` / `blaze_powder`      mob drops (plan.md §3.11 gives the rules
  //                                     to mx-gameplay; the vocabulary is kernel's)
  //   `flint_and_steel` / `fire_charge` the two ignition items §3.11 names for the
  //                                     flammable capability this registry already
  //                                     carries
  //
  // `crafting_table` was requested and is deliberately ABSENT: its recipe row was
  // replaced by a vanilla one of identical shape, so nothing needs the literal
  // and adding it would be vocabulary with no reason of its own.
  'coal',
  'iron_ingot',
  'flint',
  'gunpowder',
  'blaze_powder',
  'flint_and_steel',
  'fire_charge',

  // Equipment vocabulary is item identity, so kernel owns the names even
  // though slot rules and equip behaviour live above this package.
  'iron_helmet',
  'iron_chestplate',
  'iron_leggings',
  'iron_boots',

  // ---------------------------------------------------------------------------
  // Grown with `BLOCK_TYPES`, under ONE rule stated before it was applied.
  // ---------------------------------------------------------------------------
  //
  // THE RULE: a block gets an item form here if and only if its registry row's
  // `drops` rule resolves to ITSELF and yields something. Nothing else about a
  // block earns it an item.
  //
  // The rule is not a convention picked to keep the diff tidy — it is forced by
  // `resolveDropItem` (`./block-harvest`). A row that says `item: 'self'` looks
  // up `itemOfBlock`, which answers `undefined` when the name is absent from
  // this roster. So a block whose drop is `'self'` and whose name is NOT here
  // does not drop nothing LOUDLY; it drops nothing SILENTLY, and the registry
  // row that promised a drop is a row the type system agrees with and the
  // player never sees. Adding the literal is what makes the row true.
  //
  // The converse is why the rule has an "only if" as well. A block whose drop is
  // an OVERRIDE needs no item of its own: `farmland` yields `dirt`, every ore
  // yields its mineral, `door_open` yields `door`. Adding `farmland` as an item
  // because it happens to be a block would be the guessed roster this file
  // already refused once, and `getInventoryDropForBlock`
  // (`block-service.config.ts:189-190`) is the reference's own statement that a
  // block's drop is its own name only WHEN NOT OVERRIDDEN.
  //
  // Note that the reference cannot make this distinction and does not try:
  // `InventoryItemSchema = Schema.Union(BlockTypeSchema, ItemTypeSchema)`
  // (`inventory-item.ts:7`) makes EVERY block an inventory item, including
  // `AIR`, `FIRE` and `END_PORTAL`. That union is exactly what this file's
  // header rejects, and the six blocks it would have handed an item form to
  // with nothing behind it are listed in `UNITEMISED_BLOCK_TYPES` instead.

  // ---------------------------------------------------------------------------
  // Items that are also blocks (55). Same name as their `BlockType`.
  // ---------------------------------------------------------------------------
  'granite',
  'diorite',
  'andesite',
  'deepslate',
  'obsidian',
  'smooth_basalt',
  'calcite',
  'amethyst_block',
  'sandstone',
  'prismarine',
  'soul_sand',
  'coal_block',
  'iron_block',
  'gold_block',
  'diamond_block',
  'redstone_block',
  'lapis_block',
  'emerald_block',
  'redstone_torch',
  'lever',
  'stone_button',
  'repeater',
  'redstone_lamp',
  'observer',
  'comparator',
  'dispenser',
  'hopper',
  'end_stone',
  'end_portal_frame',
  'end_portal_frame_filled',
  'chorus_flower',
  'chorus_plant',
  'dragon_egg',
  'end_crystal',
  'end_rod',
  'end_stone_bricks',
  'ender_chest',
  'purpur_block',
  'purpur_pillar',
  'purpur_slab',
  'purpur_stairs',
  'shulker_box',
  'crafting_table',
  'furnace',
  'chest',
  'door',
  'oak_stairs',
  'anvil',
  'cauldron',
  'bed',
  'enchanting_table',
  'brewing_stand',
  'tnt',
  'nether_brick',
  'netherrack',

  // ---------------------------------------------------------------------------
  // Items that are NOT blocks (10), each named by `INVENTORY_DROP_OVERRIDES`
  // ---------------------------------------------------------------------------
  //
  // Every one of these is the right-hand side of a row in
  // `block-service.config.ts:151-187`, which is the same standard the earlier
  // `coal` / `iron_ingot` / `flint` entries were held to: the item exists
  // because a block in THIS registry drops it, not because a recipe mentions it.
  //
  // `raw_iron` and `raw_gold` rather than `iron_ingot` and `gold_ingot` is the
  // reference's answer and not a slip — `IRON_ORE` maps to `RAW_IRON`, and that
  // is also why `ORE_XP_TABLE` gives iron and gold zero experience: the ore
  // yields raw material and the furnace pays the XP. `iron_ingot` was already
  // here for mc-sim's recipes and is a different item from `raw_iron`.
  'raw_iron',
  'raw_gold',
  'diamond',
  'emerald',
  'lapis_lazuli',
  'redstone_dust',
  'amethyst_shard',
  'wheat_seeds',
  'potato',
  'nether_wart',

  // ---------------------------------------------------------------------------
  // Seventeen older rows that had been promising a drop they could not make
  // ---------------------------------------------------------------------------
  //
  // These were NOT part of completing the block roster. They were found by the
  // test that the roster work made necessary — `every row whose drop is 'self'
  // has an item form` in `test/item-drops.test.ts` — which reported 21 rows in
  // breach, and eighteen of them predated this change.
  //
  // Each of the seventeen below is a block already in the registry whose row
  // carries the DEFAULT drop rule, meaning "yields itself, one of them". None of
  // them had an item form, so `resolveDropItem` hit the `'self'` sentinel,
  // found nothing, and returned `undefined`. Breaking a ladder gave you nothing.
  //
  // The previous decision was to leave them, on the grounds that growing the
  // item vocabulary from block-side evidence is the guessed-roster failure this
  // file argues against. That reasoning was right about `string` and `snowball`
  // — names that appear nowhere else — and wrong about these, because the item
  // a block drops WHEN NOT OVERRIDDEN is its own name, stated by
  // `getInventoryDropForBlock` (`block-service.config.ts:189-190`) and confirmed
  // block by block: none of the eighteen appears in `INVENTORY_DROP_OVERRIDES`.
  // There is no guess here; there was a missing transcription.
  //
  // SEVEN OF THE EIGHTEEN ARE HERE. The other ten are held back on purpose and
  // the reason is in the block comment directly below, which is worth reading
  // before "finishing the job".
  'ladder',
  'kelp',
  'seagrass',
  'rail',
  'powered_rail',
  'pressure_plate',
  'stone_slab',

  // ---------------------------------------------------------------------------
  // The two the earlier decision was right about, added now with their citation
  // ---------------------------------------------------------------------------
  //
  // `cobweb` -> STRING and `snow` -> SNOWBALL are rows of
  // `INVENTORY_DROP_OVERRIDES` (:170, :183), which is the same evidence every
  // other override target here rests on. They were held back while they were the
  // only two of their kind; they are not any more, and holding them back was
  // costing two more rows that silently dropped nothing (`cobweb`) or that
  // recorded a gap where the reference had an answer (`snow`).
  'string',
  'snowball',

  // ---------------------------------------------------------------------------
  // TEN DELIBERATELY ABSENT: the support-sensitive plants.
  // ---------------------------------------------------------------------------
  //
  // `sapling`, `dandelion`, `poppy`, `brown_mushroom`, `red_mushroom`,
  // `tall_grass`, `fern`, `sugar_cane`, `cactus` and `lily_pad` all satisfy the
  // rule above — the reference drops each of them as itself — and are still NOT
  // in this roster. This is the one place the rule is knowingly not applied, so
  // it is the one that needs the argument.
  //
  // THE BLOCKER IS GONE AND THIS HOLD IS NOW THE LAST STEP, NOT A WAIT.
  // `supportRule` landed (`./block-support`, `./block-registry`), mx-gameplay
  // reads it instead of the fallback, and F7 is closed — so the code path these
  // ten would activate is no longer known-wrong. What survives is only the
  // mechanical work of itemising them: ten literals here, ten registry rows
  // whose `DROPS_NOTHING` becomes the default rule, and the drop tests on both
  // sides. That is its own change for the reason every roster change is
  // (`./block-definition`: a literal moves `api-lock.md` and restarts the
  // four-week window), and it is now unblocked in the ordinary sense rather
  // than blocked on a decision.
  //
  // The paragraphs below are kept as the RECORD of why they were held, because
  // the argument is what makes the hold legible rather than arbitrary.
  //
  // GIVING THEM AN ITEM FORM WOULD ACTIVATE A KNOWN-WRONG CODE PATH IN ANOTHER
  // REPOSITORY. `PlaceableItemType` is `ItemType & BlockType` (`./block-item`),
  // so an item form is not merely a name — it is what makes a block reachable by
  // `placeBlock`. mx-gameplay's `test/place-block.test.ts` carries a finding it
  // calls F7: `block-support.ts:75-91` gives exactly these ten a PER-BLOCK
  // `SUPPORT_RULES` entry (lily pad -> water, cactus -> sand|self, sugar cane ->
  // dirt|grass|sand|self, the seven surface plants -> dirt|grass|farmland), and
  // mx-gameplay answers all ten with the fallback arm instead — kernel's
  // `canSupportAttachments`. Water is non-supporting, and water is the only
  // thing a lily pad may sit on, so under that rule A LILY PAD IS REFUSED ON THE
  // ONE CELL IT BELONGS ON AND ALLOWED ON STONE.
  //
  // That finding is dormant TODAY for exactly one reason: none of the ten is a
  // `PlaceableItemType`, so no call can reach the wrong answer. Its own text
  // predicts how it will stop being dormant — 「the roster row that wakes it will
  // be added by somebody who is not reading this file」. Adding these ten here
  // would have been that row.
  //
  // THE FIX WAS `supportRule`, AND IT HAS LANDED. `PENDING_CAPABILITIES`
  // (`./block-definition`) held it back because the rule needs to name blocks
  // and the roster did not exist; the roster arrived, `farmland` included, and
  // the column was written. These ten literals are now the same one-line-each
  // addition `snow` had.
  //
  // Until they are added their registry rows say `DROPS_NOTHING` explicitly
  // rather than inheriting "yields itself" and silently producing nothing — so
  // the cost of the remaining gap is a stated divergence from the reference in
  // one column, not a lie in two.
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
