/** Item and block vocabulary contracts that are independent of drop resolution. */
import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  NON_PLACEABLE_ITEM_TYPES,
  PLACEABLE_ITEM_TYPES,
  UNITEMISED_BLOCK_TYPES,
  blockOfPlaceableItem,
  isPlaceableItem,
  itemOfBlock
} from '../src/domain/block-item'
import { BLOCK_TYPES, type BlockType } from '../src/domain/block-type'
import { ITEM_TYPES, type ItemType, isItemType } from '../src/domain/item-type'

const IRON_ARMOUR_ITEM_TYPES = [
  'iron_helmet',
  'iron_chestplate',
  'iron_leggings',
  'iron_boots',
] as const satisfies ReadonlyArray<ItemType>

const DIAMOND_ARMOUR_ITEM_TYPES = [
  'diamond_helmet',
  'diamond_chestplate',
  'diamond_leggings',
  'diamond_boots',
] as const satisfies ReadonlyArray<ItemType>

const NETHERITE_ARMOUR_ITEM_TYPES = [
  'netherite_helmet',
  'netherite_chestplate',
  'netherite_leggings',
  'netherite_boots',
] as const satisfies ReadonlyArray<ItemType>

const HOE_ITEM_TYPES = ['wooden_hoe', 'stone_hoe', 'iron_hoe', 'diamond_hoe'] as const satisfies ReadonlyArray<ItemType>

const SWORD_ITEM_TYPES = [
  'wooden_sword',
  'stone_sword',
  'iron_sword',
  'diamond_sword',
] as const satisfies ReadonlyArray<ItemType>

const NETHERITE_TOOL_TYPES = [
  'netherite_pickaxe',
  'netherite_shovel',
  'netherite_axe',
  'netherite_hoe',
  'netherite_sword',
] as const satisfies ReadonlyArray<ItemType>

const SUPPORT_SENSITIVE_PLANT_ITEM_TYPES = [
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
] as const satisfies ReadonlyArray<ItemType>

const KNOWN_ITEM_TYPES = [
  'stick',
  'bow',
  'arrow',
  'cobblestone',
  'stone_pickaxe',
  'iron_pickaxe',
  'diamond_pickaxe',
  'eye_of_ender',
] as const satisfies ReadonlyArray<ItemType>

const UNITEMISED_EXAMPLE_BLOCK_TYPES = ['air', 'water', 'bedrock'] as const satisfies ReadonlyArray<BlockType>
const NON_PLACEABLE_EXAMPLE_ITEM_TYPES = ['stick', 'bow', 'arrow', 'glowstone_dust'] as const satisfies ReadonlyArray<ItemType>
const FIRST_ITEM_TYPE_INDEX = 0

const VALIDATED_ITEM_TYPES = [
  ...KNOWN_ITEM_TYPES,
  ...HOE_ITEM_TYPES,
  ...SWORD_ITEM_TYPES,
  ...NETHERITE_TOOL_TYPES,
  ...SUPPORT_SENSITIVE_PLANT_ITEM_TYPES,
  ...IRON_ARMOUR_ITEM_TYPES,
  ...DIAMOND_ARMOUR_ITEM_TYPES,
  ...NETHERITE_ARMOUR_ITEM_TYPES,
]

const PLACEABLE_ITEM_BLOCK_TYPES = ['dirt', 'cobblestone', ...SUPPORT_SENSITIVE_PLANT_ITEM_TYPES, 'torch'] as const satisfies ReadonlyArray<BlockType>
const SPECIAL_PLACEABLE_ITEM_TYPES = ['redstone_dust'] as const satisfies ReadonlyArray<ItemType>

describe('ItemType is a closed literal union, exactly as BlockType is', () => {
  it('narrows a string that names a known item', () =>
    Effect.runPromise(Effect.sync(() => {
      for (const item of VALIDATED_ITEM_TYPES) {
        expect(isItemType(item)).toBe(true)
      }
      expect(isItemType(ITEM_TYPES[FIRST_ITEM_TYPE_INDEX])).toBe(true)
      expect(isItemType('diamond_helmet')).toBe(true)
    })),
  )

  it('rejects a string that does not, so a save file cannot smuggle one in', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(isItemType('unobtainium')).toBe(false)
      expect(isItemType('')).toBe(false)
      // Mc-sim's provisional roster is UPPER_SNAKE. Repointing it is a
      // Re-casing as well as a re-typing, and this is the assertion that says
      // The compiler will find every site rather than accepting both spellings.
      expect(isItemType('STICK')).toBe(false)
      // `air` is a sentinel, not a thing (audit §6-6).
      expect(isItemType('air')).toBe(false)
    })),
  )

  it('has no duplicate literal', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(new Set(ITEM_TYPES).size).toBe(ITEM_TYPES.length)
    })),
  )
})

describe('ItemType and BlockType are distinct types that do not interconvert', () => {
  // The bracket form `[T] extends [U]` is deliberate: it suppresses the
  // Distribution a bare conditional would apply, so these are assertions about
  // The UNIONS rather than about their members one at a time.
  it('neither union is assignable to the other', () =>
    Effect.runPromise(Effect.sync(() => {
      const itemIsNotABlock: [ItemType] extends [BlockType] ? false : true = true
      const blockIsNotAnItem: [BlockType] extends [ItemType] ? false : true = true

      expect(itemIsNotABlock).toBe(true)
      expect(blockIsNotAnItem).toBe(true)
    })),
  )

  it('each union keeps at least one member the other cannot express', () =>
    Effect.runPromise(Effect.sync(() => {
      // If either of these went empty, the assertion above would start holding
      // For the wrong reason (one roster having swallowed the other), and the
      // Distinction would become decorative without any test failing.
      type ItemsThatAreNotBlocks = Exclude<ItemType, BlockType>
      type BlocksThatAreNotItems = Exclude<BlockType, ItemType>

      const itemsRemain: [ItemsThatAreNotBlocks] extends [never] ? false : true = true
      const blocksRemain: [BlocksThatAreNotItems] extends [never] ? false : true = true

      expect(itemsRemain).toBe(true)
      expect(blocksRemain).toBe(true)

      // ...and the same fact as data, so the reason is legible in a failure.
      //
      // Pinned as a literal list rather than a count so every non-placeable
      // Vocabulary addition remains visible in review.
      expect([...NON_PLACEABLE_ITEM_TYPES]).toStrictEqual([
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
        'coal',
        'iron_ingot',
        'flint',
        'gunpowder',
        'blaze_powder',
        'rotten_flesh',
        'ender_pearl',
        'flint_and_steel',
        'fire_charge',
        'iron_helmet',
        'iron_chestplate',
        'iron_leggings',
        'iron_boots',
        'raw_iron',
        'raw_gold',
        'diamond',
        'emerald',
        'lapis_lazuli',
        'amethyst_shard',
        'wheat_seeds',
        'wheat',
        'potato',
        'nether_wart',
        'string',
        'snowball',
        'water_bottle',
        'awkward_potion',
        'potion_of_swiftness',
        'potion_of_poison',
        'potion_of_regeneration',
        'sugar',
        'spider_eye',
        'ghast_tear',
        'eye_of_ender',
        'enchanted_book',
        'bucket',
        'water_bucket',
        'lava_bucket',
        'oak_boat',
        'minecart',
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
        'nether_star',
        'bone_meal',
        'shears',
        'wool',
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
        'netherite_pickaxe',
        'netherite_shovel',
        'netherite_axe',
        'netherite_hoe',
        'netherite_sword',
        'gold_ingot',
        'netherite_scrap',
        'netherite_ingot',
        'netherite_upgrade_smithing_template',
        'diamond_helmet',
        'diamond_chestplate',
        'diamond_leggings',
        'diamond_boots',
        'netherite_helmet',
        'netherite_chestplate',
        'netherite_leggings',
        'netherite_boots',
        'book',
        'paper',
        'apple',
        'baked_potato',
        'beef',
        'beetroot',
        'beetroot_soup',
        'bread',
        'carrot',
        'chicken',
        'chorus_fruit',
        'cooked_beef',
        'cooked_chicken',
        'cooked_cod',
        'cooked_mutton',
        'cooked_porkchop',
        'cooked_rabbit',
        'cooked_salmon',
        'cookie',
        'dried_kelp',
        'enchanted_golden_apple',
        'glass_bottle',
        'glow_berries',
        'golden_apple',
        'golden_carrot',
        'honey_bottle',
        'melon_slice',
        'mushroom_stew',
        'mutton',
        'poisonous_potato',
        'porkchop',
        'pumpkin_pie',
        'rabbit',
        'rabbit_stew',
        'sweet_berries',
        'written_book',
        'writable_book',
        'filled_map',
        'firework_star',
        'firework_rocket',
        'decorated_pot',
        'shield',
        'brick',
        'feather',
        'gold_nugget',
        'black_dye',
        'blue_dye',
        'brown_dye',
        'cyan_dye',
        'gray_dye',
        'green_dye',
        'light_blue_dye',
        'light_gray_dye',
        'lime_dye',
        'magenta_dye',
        'orange_dye',
        'pink_dye',
        'purple_dye',
        'red_dye',
        'white_dye',
        'yellow_dye',
        'black_banner',
        'blue_banner',
        'brown_banner',
        'cyan_banner',
        'gray_banner',
        'green_banner',
        'light_blue_banner',
        'light_gray_banner',
        'lime_banner',
        'magenta_banner',
        'orange_banner',
        'pink_banner',
        'purple_banner',
        'red_banner',
        'white_banner',
        'yellow_banner',
      ])

      // The block half of the same ledger: 23 entries over 36 blocks before, 35
      // entries now. The block registry has 123 rows; the drop ledger is a
      // separate, smaller set. It grew far more slowly than the roster did, and its
      // Composition changed completely — seven of the old entries turned out to
      // Be untranscribed drops rather than gaps (a block whose row says "yields
      // Itself" while its name is missing from `ITEM_TYPES` yields nothing,
      // Silently, and eighteen rows were in that state).
      //
      // What is left divides into three kinds, and none is an oversight:
      //
      //   BLOCKS WHOSE DROP IS AN OVERRIDE, which need no item of their own.
      //   Every ore (yields its mineral), `farmland` (dirt), `door_open` (door),
      //   `water_cauldron` (cauldron), `redstone_wire` (redstone dust),
      //   `redstone_lamp_lit` (the unlit lamp), `amethyst_cluster` (shards),
      //   `cobweb` (string), `snow` (snowballs) and the three crops. This is the
      //   "Only if" half of the rule in `domain/item-type.ts` doing its work.
      //
      //   BLOCKS THAT ARE WORLD STATE, which no player carries: `air`, `water`,
      //   `Lava` and `bedrock` as before, plus `fire`, `nether_portal`,
      //   `End_portal`, `end_gateway` and `piston_head`. Each of those five has
      //   `Count: 0` written in its row as well, so the "nothing" is a decision
      //   In two places rather than a consequence of this list.
      //
      //   ...and `ice`, which belongs to none of them: it has an item-shaped
      //   Drop rule that `NO_BASE_DROP_BLOCK_TYPES` refuses by name.
      expect([...UNITEMISED_BLOCK_TYPES]).toStrictEqual([
        'air',
        'water',
        'lava',
        'bedrock',
        'snow',
        'cobweb',
        'amethyst_cluster',
        'ice',
        'farmland',
        'wheat_crop',
        'potato_crop',
        'nether_wart_crop',
        'redstone_lamp_lit',
        'piston_head',
        'end_portal',
        'end_gateway',
        'door_open',
        'water_cauldron',
        'nether_portal',
        'fire',
      ])
    })),
  )

  it('the mapping is one-directional: block -> item is partial, item -> block needs a proof', () =>
    Effect.runPromise(Effect.sync(() => {
      for (const item of PLACEABLE_ITEM_BLOCK_TYPES) {
        expect(itemOfBlock(item)).toBe(item)
        expect(isPlaceableItem(item)).toBe(true)
        if (isPlaceableItem(item)) {
          expect(blockOfPlaceableItem(item)).toBe(item)
        }
      }

      for (const item of SPECIAL_PLACEABLE_ITEM_TYPES) {
        expect(isPlaceableItem(item)).toBe(true)
        expect(blockOfPlaceableItem(item)).toBe('redstone_wire')
      }
      expect(itemOfBlock('redstone_wire')).toBe('redstone_dust')

      // No item form. Not a failure — a real answer.
      for (const block of UNITEMISED_EXAMPLE_BLOCK_TYPES) {
        expect(itemOfBlock(block)).toBeUndefined()
      }

      // The other direction only exists once placeability is proven, and there
      // Is deliberately no `blockOfItem(item: ItemType)` to ask about a stick.
      for (const item of NON_PLACEABLE_EXAMPLE_ITEM_TYPES) {
        expect(isPlaceableItem(item)).toBe(false)
      }
      expect(isPlaceableItem('torch')).toBe(true)
      const torch = 'torch'
      if (isPlaceableItem(torch)) {
        expect(itemOfBlock(torch)).toBe('torch')
        expect(blockOfPlaceableItem(torch)).toBe('torch')
      }
    })),
  )

  it('the audit §6-8 intersection plus named exceptions is derived, so it cannot go stale', () =>
    Effect.runPromise(Effect.sync(() => {
      // The reference's hand-written `BLOCK_ITEMS` was already missing entries
      // when the audit read it. The identity case is recomputed from both
      // rosters here, with the one differently named placement pair spelled out
      // as the independent exception.
      const blockNames = new Set<string>(BLOCK_TYPES)
      expect([...PLACEABLE_ITEM_TYPES]).toStrictEqual(
        ITEM_TYPES.filter((item) => blockNames.has(item) || item === 'redstone_dust'),
      )

      const itemNames = new Set<string>(ITEM_TYPES)
      expect([...UNITEMISED_BLOCK_TYPES]).toStrictEqual(
        BLOCK_TYPES.filter((block) => !itemNames.has(block) && block !== 'redstone_wire'),
      )

      expect(PLACEABLE_ITEM_TYPES.length + NON_PLACEABLE_ITEM_TYPES.length).toBe(ITEM_TYPES.length)
    })),
  )
})
