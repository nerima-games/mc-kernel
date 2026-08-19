/**
 * Canonical item vocabulary. Keep this module data-only so consumers can
 * inspect the registry without loading validation logic.
 */

export const ITEM_TYPES = [
  // Items that are also blocks. Spelled identically to their `BlockType`, which
  // Is what makes `./block-item`'s bridge a derivation instead of a table.
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
  // Make `ItemType` un-assignable to `BlockType`; without at least one of them
  // The two unions would be structurally interchangeable and the distinction
  // This file exists to draw would be decorative.
  //
  // `stick`, `bow`, `arrow`, the pickaxes, hoes, and swords are names the organisation uses:
  // The mc-sim's `STARTER_RECIPES`
  // Produces `'STICK'` and `'WOODEN_PICKAXE'` (`mc-sim/domain/recipe.ts:602,640`),
  // While mx-gameplay's mining progression consumes `stone_pickaxe`,
  // `iron_pickaxe`, and `diamond_pickaxe` as successive craftable tool tiers.
  'stick',
  'bow',
  'arrow',
  'glowstone_dust',
  'wooden_pickaxe',
  'stone_pickaxe',
  'iron_pickaxe',
  'diamond_pickaxe',
  'wooden_hoe',
  'stone_hoe',
  'iron_hoe',
  'diamond_hoe',
  'wooden_sword',
  'stone_sword',
  'iron_sword',
  'diamond_sword',

  // Requested by mc-sim, with the cost written down, after its recipe table was
  // Repointed onto this union and seven rows had nothing to name. The request
  // Was accepted rather than the rows being restored locally, because a mirror
  // That runs ahead of this file typechecks locally, ships a table this union
  // Rejects, and breaks on the one day the mirror is deleted — which is the day
  // The whole mirror discipline promises will be uneventful.
  //
  // These are NOT here on the strength of a recipe table alone. Growing tier-1
  // Vocabulary from tier-2 evidence is the guessed-roster failure, one direction
  // Over. Each has a kernel-side reason that arrives with it:
  //
  //   `coal` / `iron_ingot` / `flint`   what ore blocks and gravel drop, so they
  //                                     Belong in `BlockDropRule.item` before any
  //                                     Recipe names them
  //   `gunpowder` / `blaze_powder`      mob drops (the design contract gives the rules
  //                                     To mx-gameplay; the vocabulary is kernel's)
  //   `flint_and_steel` / `fire_charge` the two ignition items §3.11 names for the
  //                                     Flammable capability this registry already
  //                                     Carries
  //
  // `crafting_table` was requested and is deliberately ABSENT: its recipe row was
  // Replaced by a vanilla one of identical shape, so nothing needs the literal
  // And adding it would be vocabulary with no reason of its own.
  'coal',
  'iron_ingot',
  'flint',
  'gunpowder',
  'blaze_powder',
  'rotten_flesh',
  'ender_pearl',
  'flint_and_steel',
  'fire_charge',

  // Equipment vocabulary is item identity, so kernel owns the names even
  // Though slot rules and equip behaviour live above this package.
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
  // Block earns it an item.
  //
  // The rule is not a convention picked to keep the diff tidy — it is forced by
  // `resolveDropItem` (`./block-harvest`). A row that says `item: 'self'` looks
  // Up `itemOfBlock`, which answers `undefined` when the name is absent from
  // This roster. So a block whose drop is `'self'` and whose name is NOT here
  // Does not drop nothing LOUDLY; it drops nothing SILENTLY, and the registry
  // Row that promised a drop is a row the type system agrees with and the
  // Player never sees. Adding the literal is what makes the row true.
  //
  // The converse is why the rule has an "only if" as well. A block whose drop is
  // An OVERRIDE needs no item of its own: `farmland` yields `dirt`, every ore
  // Yields its mineral, `door_open` yields `door`. Adding `farmland` as an item
  // Because it happens to be a block would be the guessed roster this file
  // Already refused once, and `getInventoryDropForBlock`
  // (`block-service.config.ts:189-190`) is the reference's own statement that a
  // Block's drop is its own name only WHEN NOT OVERRIDDEN.
  //
  // Note that the reference cannot make this distinction and does not try:
  // `InventoryItemSchema = Schema.Union(BlockTypeSchema, ItemTypeSchema)`
  // (`inventory-item.ts:7`) makes EVERY block an inventory item, including
  // `AIR`, `FIRE` and `END_PORTAL`. That union is exactly what this file's
  // Header rejects, and the six blocks it would have handed an item form to
  // With nothing behind it are listed in `UNITEMISED_BLOCK_TYPES` instead.

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
  // Because a block in THIS registry drops it, not because a recipe mentions it.
  //
  // `raw_iron` and `raw_gold` rather than `iron_ingot` and `gold_ingot` is the
  // Reference's answer and not a slip — `IRON_ORE` maps to `RAW_IRON`, and that
  // Is also why `ORE_XP_TABLE` gives iron and gold zero experience: the ore
  // Yields raw material and the furnace pays the XP. `iron_ingot` was already
  // Here for mc-sim's recipes and is a different item from `raw_iron`.
  'raw_iron',
  'raw_gold',
  'diamond',
  'emerald',
  'lapis_lazuli',
  'redstone_dust',
  'amethyst_shard',
  'wheat_seeds',
  'wheat',
  'potato',
  'nether_wart',

  // ---------------------------------------------------------------------------
  // Seventeen older rows that had been promising a drop they could not make
  // ---------------------------------------------------------------------------
  //
  // These were NOT part of completing the block roster. They were found by the
  // Test that the roster work made necessary — `every row whose drop is 'self'
  // Has an item form` in `test/item-drops.test.ts` — which reported 21 rows in
  // Breach, and eighteen of them predated this change.
  //
  // Each of the seventeen below is a block already in the registry whose row
  // Carries the DEFAULT drop rule, meaning "yields itself, one of them". None of
  // Them had an item form, so `resolveDropItem` hit the `'self'` sentinel,
  // Found nothing, and returned `undefined`. Breaking a ladder gave you nothing.
  //
  // The previous decision was to leave them, on the grounds that growing the
  // Item vocabulary from block-side evidence is the guessed-roster failure this
  // File argues against. That reasoning was right about `string` and `snowball`
  // — names that appear nowhere else — and wrong about these, because the item
  // A block drops WHEN NOT OVERRIDDEN is its own name, stated by
  // `getInventoryDropForBlock` (`block-service.config.ts:189-190`) and confirmed
  // Block by block: none of the eighteen appears in `INVENTORY_DROP_OVERRIDES`.
  // There is no guess here; there was a missing transcription.
  //
  // All seventeen are now represented: the seven older rows below and the ten
  // Support-sensitive plants at the end of this roster.
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
  // Other override target here rests on. They were held back while they were the
  // Only two of their kind; they are not any more, and holding them back was
  // Costing two more rows that silently dropped nothing (`cobweb`) or that
  // Recorded a gap where the reference had an answer (`snow`).
  'string',
  'snowball',

  // `supportRule` now owns the placement constraints for these plants, so their
  // Item forms can follow the same evidence as every other default self-drop.
  'sapling',
  'dandelion',
  'poppy',
  'brown_mushroom',
  'red_mushroom',
  'tall_grass',
  'fern',
  'sugar_cane',
  'cactus',
  'lily_pad',

  // Brewing ingredients and the first potion states. Appended because the
  // Item registry assigns permanent wire ids from this roster's order.
  'water_bottle',
  'awkward_potion',
  'potion_of_swiftness',
  'potion_of_poison',
  'potion_of_regeneration',
  'sugar',
  'spider_eye',
  'ghast_tear',

  // End progression vocabulary. Recipe ownership remains above kernel; this
  // Package owns the stable item identity consumed by that recipe.
  'eye_of_ender',

  // Anvil input vocabulary. The payload stays generic in kernel so gameplay's
  // Enchantment registry can evolve without creating an upward dependency.
  'enchanted_book',

  // Fluid transport and the first rideable vehicle identities. Their runtime
  // Rules live in gameplay; kernel owns the stable inventory/save vocabulary.
  // These remain non-block items: using a bucket or vehicle is an action, not
  // Ordinary block placement, and none of them is furnace fuel.
  'bucket',
  'water_bucket',
  'lava_bucket',
  'oak_boat',
  'minecart',

  // Fishing inventory vocabulary. Timing, loot selection, and durability live
  // Above kernel; these stable identities let every reward enter inventory and
  // Save data without a gameplay-owned string namespace.
  'fishing_rod',
  'cod',
  'salmon',
  'tropical_fish',
  'pufferfish',
  'bowl',
  'leather',
  'bone',
  'name_tag',
  'saddle',

  // Wither summoning and its ordinary-play reward. Appended because item ids
  // Are permanent and derived from this roster's order.
  'soul_soil',
  'wither_skeleton_skull',
  'nether_star',
  'bone_meal',

  // Silk Touch block forms. Appended to preserve every existing item id.
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

  // Animal interaction vocabulary. Wool is an inventory drop rather than a
  // Placeable block in this kernel build; shears are single-stack equipment.
  // Both are appended because item ids are permanent wire identities.
  'shears',
  'wool',

  // Appended because item ids are permanent wire identities.
  'dropper',
  'gold_pickaxe',
  'wooden_shovel',
  'stone_shovel',
  'iron_shovel',
  'diamond_shovel',
  'gold_shovel',
  'wooden_axe',
  'stone_axe',
  'iron_axe',
  'diamond_axe',
  'gold_axe',
  'gold_hoe',
  'gold_sword',
] as const
