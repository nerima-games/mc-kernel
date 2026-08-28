/** Portable item-component identifiers, rarities, and default stack metadata. */
import type { ItemType } from './item-type.js'
import { MAX_STACK_COUNT } from './quantities.js'

export const ITEM_COMPONENT_IDS = [
  'minecraft:damage',
  'minecraft:enchantment_glint_override',
  'minecraft:tooltip_display',
  'minecraft:custom_name',
  'minecraft:item_name',
  'minecraft:lore',
  'minecraft:item_model',
  'minecraft:custom_data',
  'minecraft:entity_data',
  'minecraft:bucket_entity_data',
  'minecraft:profile',
  'minecraft:block_entity_data',
  'minecraft:charged_projectiles',
  'minecraft:bundle_contents',
  'minecraft:container',
  'minecraft:bees',
  'minecraft:potion_contents',
  'minecraft:dyed_color',
  'minecraft:custom_model_data',
  'minecraft:map_id',
  'minecraft:map_color',
  'minecraft:map_decorations',
  'minecraft:writable_book_content',
  'minecraft:written_book_content',
  'minecraft:trim',
  'minecraft:suspicious_stew',
  'minecraft:hide_additional_tooltip',
  'minecraft:can_break',
  'minecraft:can_place_on',
  'minecraft:block_state',
  'minecraft:instrument',
  'minecraft:note_block_sound',
  'minecraft:recipes',
  'minecraft:lock',
  'minecraft:tooltip_style',
  'minecraft:base_color',
  'minecraft:equippable',
  'minecraft:glider',
  'minecraft:death_protection',
  'minecraft:repairable',
  'minecraft:enchantable',
  'minecraft:jukebox_playable',
  'minecraft:ominous_bottle_amplifier',
  'minecraft:painting/variant',
  'minecraft:lodestone_tracker',
  'minecraft:firework_explosion',
  'minecraft:fireworks',
  'minecraft:banner_patterns',
  'minecraft:pot_decorations',
  'minecraft:container_loot',
  'minecraft:debug_stick_state',
  'minecraft:max_damage',
  'minecraft:max_stack_size',
  'minecraft:rarity',
  'minecraft:repair_cost',
  'minecraft:unbreakable',
  'minecraft:food',
  'minecraft:consumable',
  'minecraft:use_remainder',
  'minecraft:use_cooldown',
  'minecraft:use_effects',
  'minecraft:tool',
  'minecraft:weapon',
  'minecraft:kinetic_weapon',
  'minecraft:piercing_weapon',
  'minecraft:attribute_modifiers',
  'minecraft:enchantments',
  'minecraft:stored_enchantments',
  'minecraft:blocks_attacks',
  'minecraft:damage_resistant',
  'minecraft:minimum_attack_charge',
  'minecraft:damage_type',
  'minecraft:swing_animation',
  'minecraft:attack_range',
  'minecraft:potion_duration_scale',
  'minecraft:break_sound',
  'minecraft:provides_banner_patterns',
  'minecraft:provides_trim_material',
  'minecraft:dye',
  'minecraft:additional_trade_cost',
  'minecraft:sulfur_cube_content',
] as const

export type ItemComponentId = (typeof ITEM_COMPONENT_IDS)[number]

export const ITEM_RARITIES = ['common', 'uncommon', 'rare', 'epic'] as const

export type ItemRarity = (typeof ITEM_RARITIES)[number]

const SINGLE_STACK_LIMIT = 1
const SIXTEEN_STACK_LIMIT = 16

export type ItemStackLimit = typeof MAX_STACK_COUNT | typeof SINGLE_STACK_LIMIT | typeof SIXTEEN_STACK_LIMIT

export const ITEMS_WITH_SINGLE_STACK_LIMIT: ReadonlyArray<ItemType> = [
  'bow',
  'wooden_pickaxe',
  'stone_pickaxe',
  'iron_pickaxe',
  'diamond_pickaxe',
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
  'wooden_hoe',
  'stone_hoe',
  'iron_hoe',
  'diamond_hoe',
  'gold_hoe',
  'wooden_sword',
  'stone_sword',
  'iron_sword',
  'diamond_sword',
  'gold_sword',
  'netherite_pickaxe',
  'netherite_shovel',
  'netherite_axe',
  'netherite_hoe',
  'netherite_sword',
  'shears',
  'flint_and_steel',
  'iron_helmet',
  'iron_chestplate',
  'iron_leggings',
  'iron_boots',
  'diamond_helmet',
  'diamond_chestplate',
  'diamond_leggings',
  'diamond_boots',
  'netherite_helmet',
  'netherite_chestplate',
  'netherite_leggings',
  'netherite_boots',
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
  'beetroot_soup',
  'mushroom_stew',
  'rabbit_stew',
]

export const ITEMS_WITH_SIXTEEN_STACK_LIMIT: ReadonlyArray<ItemType> = [
  'ender_pearl',
  'snowball',
  'bucket',
  'honey_bottle',
]

const SINGLE_STACK_ITEMS: ReadonlySet<ItemType> = new Set(ITEMS_WITH_SINGLE_STACK_LIMIT)
const SIXTEEN_STACK_ITEMS: ReadonlySet<ItemType> = new Set(ITEMS_WITH_SIXTEEN_STACK_LIMIT)

export const itemComponentStackLimitOf = (type: ItemType): ItemStackLimit => {
  if (SINGLE_STACK_ITEMS.has(type)) {
    return SINGLE_STACK_LIMIT
  }
  if (SIXTEEN_STACK_ITEMS.has(type)) {
    return SIXTEEN_STACK_LIMIT
  }
  return MAX_STACK_COUNT
}
