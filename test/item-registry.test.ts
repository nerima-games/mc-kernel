/* eslint-disable max-statements, no-magic-numbers -- Permanent ids and encoded bytes are the contract under test. */
/* eslint-disable sort-imports -- Keep the registry imports together above test runtime imports. */
import { describe, expect, it } from 'vitest'
import {
  ITEM_IDS,
  ITEM_REGISTRY,
  ItemId,
  ItemIdBytes,
  decodeItemId,
  encodeItemId,
  isKnownItemId,
  itemDefinitionOf,
  itemIdOf,
  itemTypeOfId,
  maxStackCountOfItem,
} from '../src/domain/item-registry'
import { ITEM_TYPES, type ItemType } from '../src/domain/item-type'
import { Effect } from 'effect'
import { expectTypeOf } from 'vitest'

const BREWING_ITEM_IDS = {
  awkward_potion: 128,
  ghast_tear: 134,
  potion_of_poison: 130,
  potion_of_regeneration: 131,
  potion_of_swiftness: 129,
  spider_eye: 133,
  sugar: 132,
  water_bottle: 127,
} as const satisfies Readonly<Partial<Record<ItemType, number>>>

const EYE_OF_ENDER_ITEM_ID = 135
const ENCHANTED_BOOK_ITEM_ID = 136
const FLUID_AND_VEHICLE_ITEM_IDS = {
  bucket: 137,
  lava_bucket: 139,
  minecart: 141,
  oak_boat: 140,
  water_bucket: 138,
} as const satisfies Readonly<Partial<Record<ItemType, number>>>
const FISHING_ITEM_IDS = {
  bone: 149,
  bowl: 147,
  cod: 143,
  fishing_rod: 142,
  leather: 148,
  name_tag: 150,
  pufferfish: 146,
  saddle: 151,
  salmon: 144,
  tropical_fish: 145,
} as const satisfies Readonly<Partial<Record<ItemType, number>>>
const BREAK_SPEED_ITEM_IDS = {
  diamond_axe: 182,
  diamond_shovel: 177,
  gold_axe: 183,
  gold_hoe: 184,
  gold_pickaxe: 173,
  gold_shovel: 178,
  gold_sword: 185,
  iron_axe: 181,
  iron_shovel: 176,
  netherite_axe: 188,
  netherite_hoe: 189,
  netherite_pickaxe: 186,
  netherite_shovel: 187,
  netherite_sword: 190,
  stone_axe: 180,
  stone_shovel: 175,
  wooden_axe: 179,
  wooden_shovel: 174,
} as const satisfies Readonly<Partial<Record<ItemType, number>>>
const SMITHING_ITEM_IDS = {
  diamond_boots: 198,
  diamond_chestplate: 196,
  diamond_helmet: 195,
  diamond_leggings: 197,
  gold_ingot: 191,
  netherite_boots: 202,
  netherite_chestplate: 200,
  netherite_helmet: 199,
  netherite_ingot: 193,
  netherite_leggings: 201,
  netherite_scrap: 192,
  netherite_upgrade_smithing_template: 194,
} as const satisfies Readonly<Partial<Record<ItemType, number>>>

const FOOD_COMPONENT_ITEM_IDS = {
  apple: 205,
  baked_potato: 206,
  beef: 207,
  beetroot: 208,
  beetroot_soup: 209,
  bread: 210,
  carrot: 211,
  chicken: 212,
  chorus_fruit: 213,
  cooked_beef: 214,
  cooked_chicken: 215,
  cooked_cod: 216,
  cooked_mutton: 217,
  cooked_porkchop: 218,
  cooked_rabbit: 219,
  cooked_salmon: 220,
  cookie: 221,
  dried_kelp: 222,
  enchanted_golden_apple: 223,
  glass_bottle: 224,
  glow_berries: 225,
  golden_apple: 226,
  golden_carrot: 227,
  honey_bottle: 228,
  melon_slice: 229,
  mushroom_stew: 230,
  mutton: 231,
  poisonous_potato: 232,
  porkchop: 233,
  pumpkin_pie: 234,
  rabbit: 235,
  rabbit_stew: 236,
  sweet_berries: 237,
} as const satisfies Readonly<Partial<Record<ItemType, number>>>

const EXPECTED_ITEM_TYPES: ReadonlyArray<ItemType> = [
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
  'ladder',
  'kelp',
  'seagrass',
  'rail',
  'powered_rail',
  'pressure_plate',
  'stone_slab',
  'string',
  'snowball',
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
  'soul_soil',
  'wither_skeleton_skull',
  'nether_star',
  'bone_meal',
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
  'shears',
  'wool',
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
]

/**
 * Same invariant on every group below: a batch of items appended at once
 * round-trips through `itemIdOf` / `itemTypeOfId` / `itemDefinitionOf` at its
 * pinned id. Each `it` still names its own batch and its own "did not disturb
 * what came before" check; only this shared three-way agreement is factored
 * out.
 */
const expectAppendedItemIds = (ids: Readonly<Partial<Record<ItemType, number>>>) => {
  for (const type of ITEM_TYPES) {
    const id = ids[type]
    if (id === undefined) continue
    expect(itemIdOf(type), type).toBe(id)
    expect(itemTypeOfId(id), type).toBe(type)
    expect(itemDefinitionOf(type).id, type).toBe(id)
  }
}

const EXPECTED_ENCODED_ITEM_ID_BYTES: ReadonlyArray<readonly [ItemType, number]> = [
  ['water_bottle', 127],
  ['ghast_tear', 134],
  ['eye_of_ender', EYE_OF_ENDER_ITEM_ID],
  ['enchanted_book', ENCHANTED_BOOK_ITEM_ID],
  ['bucket', 137],
  ['water_bucket', 138],
  ['lava_bucket', 139],
  ['oak_boat', 140],
  ['minecart', 141],
  ['fishing_rod', 142],
  ['saddle', 151],
  ['soul_soil', 152],
  ['wither_skeleton_skull', 153],
  ['nether_star', 154],
  ['bone_meal', 155],
  ['shears', 170],
  ['wool', 171],
  ['dropper', 172],
  ['gold_pickaxe', 173],
  ['wooden_shovel', 174],
  ['stone_shovel', 175],
  ['iron_shovel', 176],
  ['diamond_shovel', 177],
  ['gold_shovel', 178],
  ['wooden_axe', 179],
  ['stone_axe', 180],
  ['iron_axe', 181],
  ['diamond_axe', 182],
  ['gold_axe', 183],
  ['gold_hoe', 184],
  ['gold_sword', 185],
  ['netherite_pickaxe', 186],
  ['netherite_shovel', 187],
  ['netherite_axe', 188],
  ['netherite_hoe', 189],
  ['netherite_sword', 190],
  ['gold_ingot', 191],
  ['netherite_scrap', 192],
  ['netherite_ingot', 193],
  ['netherite_upgrade_smithing_template', 194],
  ['diamond_helmet', 195],
  ['diamond_chestplate', 196],
  ['diamond_leggings', 197],
  ['diamond_boots', 198],
  ['netherite_helmet', 199],
  ['netherite_chestplate', 200],
  ['netherite_leggings', 201],
  ['netherite_boots', 202],
  ['book', 203],
  ['paper', 204],
  ['apple', 205],
  ['baked_potato', 206],
  ['beef', 207],
  ['beetroot', 208],
  ['beetroot_soup', 209],
  ['bread', 210],
  ['carrot', 211],
  ['chicken', 212],
  ['chorus_fruit', 213],
  ['cooked_beef', 214],
  ['cooked_chicken', 215],
  ['cooked_cod', 216],
  ['cooked_mutton', 217],
  ['cooked_porkchop', 218],
  ['cooked_rabbit', 219],
  ['cooked_salmon', 220],
  ['cookie', 221],
  ['dried_kelp', 222],
  ['enchanted_golden_apple', 223],
  ['glass_bottle', 224],
  ['glow_berries', 225],
  ['golden_apple', 226],
  ['golden_carrot', 227],
  ['honey_bottle', 228],
  ['melon_slice', 229],
  ['mushroom_stew', 230],
  ['mutton', 231],
  ['poisonous_potato', 232],
  ['porkchop', 233],
  ['pumpkin_pie', 234],
  ['rabbit', 235],
  ['rabbit_stew', 236],
  ['sweet_berries', 237],
]

describe('item registry', () => {
  it('covers the ItemType roster exactly once with dense permanent ids', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(ITEM_TYPES).toStrictEqual(EXPECTED_ITEM_TYPES)
      expect(ITEM_REGISTRY.map(({ type }) => type)).toStrictEqual(EXPECTED_ITEM_TYPES)
      expect(ITEM_IDS).toStrictEqual(EXPECTED_ITEM_TYPES.map((_type, id) => id))
      expect(new Set(ITEM_REGISTRY.map(({ type }) => type)).size).toBe(EXPECTED_ITEM_TYPES.length)
      expect(itemIdOf(ITEM_TYPES[0])).toBe(0)
      expect(itemIdOf('stick')).toBe(13)
      expect(itemIdOf('lily_pad')).toBe(126)
      expect(itemTypeOfId(126)).toBe('lily_pad')
      expect(itemTypeOfId(ItemId(126))).toBe('lily_pad')
    })),
  )

  it('appends each brewing item after every pre-existing item', () =>
    Effect.runPromise(Effect.sync(() => {
      expectAppendedItemIds(BREWING_ITEM_IDS)
    })),
  )

  it('appends the Eye of Ender without changing any existing permanent id', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(itemIdOf('ghast_tear')).toBe(134)
      expect(itemIdOf('eye_of_ender')).toBe(EYE_OF_ENDER_ITEM_ID)
      expect(itemTypeOfId(EYE_OF_ENDER_ITEM_ID)).toBe('eye_of_ender')
      expect(itemDefinitionOf('eye_of_ender').id).toBe(EYE_OF_ENDER_ITEM_ID)
    })),
  )

  it('rejects an ItemType value absent from the registry', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(() => Reflect.apply(itemDefinitionOf, undefined, ['unobtainium'])).toThrow('Item registry is missing a row')
    })),
  )

  it('appends the enchanted book after every pre-existing permanent id', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(itemIdOf('eye_of_ender')).toBe(EYE_OF_ENDER_ITEM_ID)
      expect(itemIdOf('enchanted_book')).toBe(ENCHANTED_BOOK_ITEM_ID)
      expect(itemTypeOfId(ENCHANTED_BOOK_ITEM_ID)).toBe('enchanted_book')
      expect(itemDefinitionOf('enchanted_book').id).toBe(ENCHANTED_BOOK_ITEM_ID)
    })),
  )

  it('appends the plain book and paper after the enchanted book without changing permanent ids', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(itemIdOf('enchanted_book')).toBe(ENCHANTED_BOOK_ITEM_ID)
      expectAppendedItemIds({ book: 203, paper: 204 })
    })),
  )

  it('appends food component items after paper without changing permanent ids', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(itemIdOf('paper')).toBe(204)
      expectAppendedItemIds(FOOD_COMPONENT_ITEM_IDS)
    })),
  )

  it('appends fluid and vehicle items without changing existing permanent ids', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(itemIdOf('enchanted_book')).toBe(ENCHANTED_BOOK_ITEM_ID)
      expectAppendedItemIds(FLUID_AND_VEHICLE_ITEM_IDS)
    })),
  )

  it('appends fishing items without changing existing permanent ids', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(itemIdOf('minecart')).toBe(FLUID_AND_VEHICLE_ITEM_IDS.minecart)
      expectAppendedItemIds(FISHING_ITEM_IDS)
    })),
  )

  it('appends animal-interaction items without changing existing permanent ids', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(itemIdOf('deepslate_emerald_ore')).toBe(169)
      expect(itemIdOf('shears')).toBe(170)
      expect(itemIdOf('wool')).toBe(171)
      expect(itemIdOf('dropper')).toBe(172)
      expect(itemTypeOfId(170)).toBe('shears')
      expect(itemTypeOfId(171)).toBe('wool')
      expect(itemTypeOfId(172)).toBe('dropper')
      expect(maxStackCountOfItem('shears')).toBe(1)
      expect(maxStackCountOfItem('wool')).toBe(64)
    })),
  )

  it('appends the remaining mining-tool vocabulary without changing existing permanent ids', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(itemIdOf('dropper')).toBe(172)
      expectAppendedItemIds(BREAK_SPEED_ITEM_IDS)
    })),
  )

  it('appends smithing materials and armour without changing existing permanent ids', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(itemIdOf('netherite_sword')).toBe(190)
      expectAppendedItemIds(SMITHING_ITEM_IDS)
    })),
  )

  it('round-trips every registered item through its two-byte save and wire field', () =>
    Effect.runPromise(Effect.sync(() => {
      for (const type of ITEM_TYPES) {
        const bytes = encodeItemId(type)
        expect(ItemIdBytes(bytes)).toStrictEqual(bytes)
        expect(ItemIdBytes(bytes)).not.toBe(bytes)
        expect(decodeItemId(bytes)).toBe(type)
      }
      for (const [type, id] of EXPECTED_ENCODED_ITEM_ID_BYTES) {
        expect([...encodeItemId(type)], type).toStrictEqual([0, id])
      }
    })),
  )

  it('accepts only complete bytes for registered item ids', () =>
    Effect.runPromise(Effect.sync(() => {
      const padded = Uint8Array.from([0xff, 0, 127, 0xff])
      expect(ItemIdBytes(padded.subarray(1, 3))).toStrictEqual(new Uint8Array([0, 127]))
      expect(ItemIdBytes(new Uint8Array([0, 127]))).toStrictEqual(new Uint8Array([0, 127]))
      expect(ItemIdBytes(new Uint8Array([0, EYE_OF_ENDER_ITEM_ID]))).toStrictEqual(
        new Uint8Array([0, EYE_OF_ENDER_ITEM_ID]),
      )
      expect(() => ItemIdBytes(new Uint8Array())).toThrow(/exactly 2 bytes/u)
      expect(() => ItemIdBytes(new Uint8Array([0]))).toThrow(/exactly 2 bytes/u)
      expect(() => ItemIdBytes(new Uint8Array([0, 127, 0]))).toThrow(/exactly 2 bytes/u)
      expect(() => ItemIdBytes(new Uint8Array([1, 24]))).toThrow(/registered item id/u)
      expect(() => ItemIdBytes(new Uint8Array([0xff, 0xff]))).toThrow(/registered item id/u)
    })),
  )

  it('owns validated byte inputs', () =>
    Effect.runPromise(Effect.sync(() => {
      const input = Uint8Array.from([0, itemIdOf('stone')])
      const bytes = ItemIdBytes(input)

      input[1] = itemIdOf('dirt')

      expect(decodeItemId(bytes)).toBe('stone')
    })),
  )

  it('recognises known and unknown uint16 item ids', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(() => ItemId(-1)).toThrow()
      expect(() => ItemId(0x10000)).toThrow()
      expect(isKnownItemId(134)).toBe(true)
      expect(isKnownItemId(EYE_OF_ENDER_ITEM_ID)).toBe(true)
      expect(isKnownItemId(ENCHANTED_BOOK_ITEM_ID)).toBe(true)
      expect(isKnownItemId(141)).toBe(true)
      expect(isKnownItemId(151)).toBe(true)
      expect(isKnownItemId(154)).toBe(true)
      expect(isKnownItemId(155)).toBe(true)
      expect(isKnownItemId(169)).toBe(true)
      expect(isKnownItemId(170)).toBe(true)
      expect(isKnownItemId(171)).toBe(true)
      expect(isKnownItemId(172)).toBe(true)
      expect(isKnownItemId(185)).toBe(true)
      expect(isKnownItemId(190)).toBe(true)
      expect(isKnownItemId(191)).toBe(true)
      expect(isKnownItemId(194)).toBe(true)
      expect(isKnownItemId(202)).toBe(true)
      expect(isKnownItemId(203)).toBe(true)
      expect(isKnownItemId(204)).toBe(true)
      expect(isKnownItemId(205)).toBe(true)
      expect(isKnownItemId(224)).toBe(true)
      expect(isKnownItemId(279)).toBe(true)
      expect(isKnownItemId(280)).toBe(false)
      expect(isKnownItemId(-1)).toBe(false)
      expect(isKnownItemId(1.5)).toBe(false)
    })),
  )

  it('narrows numbers to ItemId when known', () =>
    Effect.runPromise(Effect.sync(() => {
      const id: number = 134
      if (!isKnownItemId(id)) {
        throw new Error('expected known item id in type-narrowing test')
      }
      expectTypeOf(id).toEqualTypeOf<ItemId>()
    })),
  )

  it('assigns the canonical 1, 16, and 64 stack limits', () =>
    Effect.runPromise(Effect.sync(() => {
      for (const type of [
        'water_bottle',
        'awkward_potion',
        'potion_of_swiftness',
        'potion_of_poison',
        'potion_of_regeneration',
        'enchanted_book',
        'water_bucket',
        'lava_bucket',
        'oak_boat',
        'minecart',
        'fishing_rod',
        'saddle',
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
        'diamond_helmet',
        'diamond_chestplate',
        'diamond_leggings',
        'diamond_boots',
        'netherite_helmet',
        'netherite_chestplate',
        'netherite_leggings',
        'netherite_boots',
        'beetroot_soup',
        'mushroom_stew',
        'rabbit_stew',
      ] as const) {
        expect(maxStackCountOfItem(type)).toBe(1)
      }
      expect(maxStackCountOfItem('ender_pearl')).toBe(16)
      expect(maxStackCountOfItem('snowball')).toBe(16)
      expect(maxStackCountOfItem('bucket')).toBe(16)
      expect(maxStackCountOfItem('honey_bottle')).toBe(16)
      for (const type of [
        'sugar',
        'spider_eye',
        'ghast_tear',
        'nether_wart',
        'blaze_powder',
        'eye_of_ender',
        'cod',
        'salmon',
        'tropical_fish',
        'pufferfish',
        'bowl',
        'leather',
        'bone',
        'name_tag',
        'soul_soil',
        'wither_skeleton_skull',
        'nether_star',
        'gold_ingot',
        'netherite_scrap',
        'netherite_ingot',
        'book',
        'paper',
        'apple',
        'baked_potato',
        'beef',
        'beetroot',
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
        'melon_slice',
        'mutton',
        'poisonous_potato',
        'porkchop',
        'pumpkin_pie',
        'sweet_berries',
      ] as const) {
        expect(maxStackCountOfItem(type)).toBe(64)
      }
    })),
  )
})
