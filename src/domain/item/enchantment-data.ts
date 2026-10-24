import { Brand } from 'effect'
import type { ItemType } from './item-type.js'
import { VANILLA_26_3_ENCHANTMENT_IDS, VANILLA_26_3_ENCHANTMENT_MAX_LEVELS } from '../world/vanilla-26-3-generated.js'
import { EnchantmentLevel } from '../time/quantities.js'

type AnvilRuleMaterialCost = number & Brand.Brand<'AnvilRuleMaterialCost'>

const AnvilRuleMaterialCost: Brand.Constructor<AnvilRuleMaterialCost> = Brand.make<AnvilRuleMaterialCost>(
  (value) =>
    Number.isSafeInteger(value) && value >= 0 && value <= 99
      ? true
      : `AnvilRuleMaterialCost must be an integer in [0, 99], received ${String(value)}`,
)

export const SUPPORTED_VANILLA_ENCHANTMENT_IDS: typeof VANILLA_26_3_ENCHANTMENT_IDS = VANILLA_26_3_ENCHANTMENT_IDS
/*
  'aqua_affinity',
  'bane_of_arthropods',
  'binding_curse',
  'blast_protection',
  'depth_strider',
  'efficiency',
  'feather_falling',
  'fire_aspect',
  'fire_protection',
  'flame',
  'fortune',
  'frost_walker',
  'infinity',
  'knockback',
  'looting',
  'luck_of_the_sea',
  'lure',
  'mending',
  'power',
  'projectile_protection',
  'protection',
  'punch',
  'respiration',
  'sharpness',
  'silk_touch',
  'smite',
  'soul_speed',
  'sweeping_edge',
  'swift_sneak',
  'thorns',
  'unbreaking',
  'vanishing_curse',
] as const */

export type SupportedVanillaEnchantmentId = (typeof SUPPORTED_VANILLA_ENCHANTMENT_IDS)[number]

type VanillaEnchantmentRule = Readonly<{
  readonly id: SupportedVanillaEnchantmentId
  readonly maxLevel: EnchantmentLevel
  readonly applicableItems: ReadonlyArray<ItemType>
  readonly incompatibleWith: ReadonlyArray<SupportedVanillaEnchantmentId>
  readonly costPerLevel: AnvilRuleMaterialCost
}>

export type VanillaAnvilCost = Readonly<{
  readonly item: AnvilRuleMaterialCost
  readonly book: AnvilRuleMaterialCost
}>

const anvilCost = (item: number, book: number): VanillaAnvilCost => ({
  item: AnvilRuleMaterialCost(item),
  book: AnvilRuleMaterialCost(book),
})

export const VANILLA_ENCHANTMENT_COSTS: Readonly<
  Record<SupportedVanillaEnchantmentId, VanillaAnvilCost>
> = {
  aqua_affinity: anvilCost(4, 2),
  bane_of_arthropods: anvilCost(2, 1),
  binding_curse: anvilCost(8, 4),
  blast_protection: anvilCost(4, 2),
  depth_strider: anvilCost(4, 2),
  efficiency: anvilCost(1, 1),
  feather_falling: anvilCost(2, 1),
  fire_aspect: anvilCost(4, 2),
  fire_protection: anvilCost(2, 1),
  flame: anvilCost(4, 2),
  fortune: anvilCost(4, 2),
  frost_walker: anvilCost(4, 2),
  infinity: anvilCost(8, 4),
  knockback: anvilCost(2, 1),
  looting: anvilCost(4, 2),
  luck_of_the_sea: anvilCost(4, 2),
  lure: anvilCost(4, 2),
  mending: anvilCost(4, 2),
  power: anvilCost(1, 1),
  projectile_protection: anvilCost(2, 1),
  protection: anvilCost(1, 1),
  punch: anvilCost(4, 2),
  respiration: anvilCost(4, 2),
  sharpness: anvilCost(1, 1),
  silk_touch: anvilCost(8, 4),
  smite: anvilCost(2, 1),
  soul_speed: anvilCost(8, 4),
  sweeping_edge: anvilCost(4, 2),
  swift_sneak: anvilCost(8, 4),
  thorns: anvilCost(8, 4),
  unbreaking: anvilCost(2, 1),
  vanishing_curse: anvilCost(8, 4),
  breach: anvilCost(4, 2),
  channeling: anvilCost(8, 4),
  density: anvilCost(2, 1),
  impaling: anvilCost(4, 2),
  loyalty: anvilCost(2, 1),
  lunge: anvilCost(2, 1),
  multishot: anvilCost(4, 2),
  piercing: anvilCost(1, 1),
  quick_charge: anvilCost(2, 1),
  riptide: anvilCost(4, 2),
  wind_burst: anvilCost(4, 2),
} as const satisfies Record<SupportedVanillaEnchantmentId, VanillaAnvilCost>

const ARMOR_ITEMS = [
  'iron_helmet',
  'iron_chestplate',
  'iron_leggings',
  'iron_boots',
] as const satisfies ReadonlyArray<ItemType>

const HELMET_ITEMS = ['iron_helmet'] as const satisfies ReadonlyArray<ItemType>
const BOOTS_ITEMS = ['iron_boots'] as const satisfies ReadonlyArray<ItemType>
const LEGGINGS_ITEMS = ['iron_leggings'] as const satisfies ReadonlyArray<ItemType>

const SWORD_ITEMS = [
  'wooden_sword',
  'stone_sword',
  'iron_sword',
  'diamond_sword',
] as const satisfies ReadonlyArray<ItemType>

const MINING_ITEMS = [
  'wooden_pickaxe',
  'stone_pickaxe',
  'iron_pickaxe',
  'diamond_pickaxe',
  'wooden_hoe',
  'stone_hoe',
  'iron_hoe',
  'diamond_hoe',
  'shears',
] as const satisfies ReadonlyArray<ItemType>

const BOW_ITEMS = ['bow'] as const satisfies ReadonlyArray<ItemType>
const FISHING_ROD_ITEMS = ['fishing_rod'] as const satisfies ReadonlyArray<ItemType>

const DAMAGEABLE_ITEMS = [
  ...ARMOR_ITEMS,
  'flint_and_steel',
  ...MINING_ITEMS,
  ...SWORD_ITEMS,
  ...BOW_ITEMS,
  ...FISHING_ROD_ITEMS,
] as const satisfies ReadonlyArray<ItemType>

type VanillaEnchantmentRuleDefinition = Readonly<{
  readonly id: SupportedVanillaEnchantmentId
  readonly maxLevel: EnchantmentLevel
  readonly applicableItems: ReadonlyArray<ItemType>
  readonly incompatibleWith: ReadonlyArray<SupportedVanillaEnchantmentId>
}>

const defineRule = (
  id: SupportedVanillaEnchantmentId,
  maxLevel: number,
  applicableItems: ReadonlyArray<ItemType>,
  incompatibleWith: ReadonlyArray<SupportedVanillaEnchantmentId> = [],
): VanillaEnchantmentRuleDefinition => ({
  id,
  maxLevel: EnchantmentLevel(maxLevel),
  applicableItems,
  incompatibleWith,
})

const VANILLA_ENCHANTMENT_RULE_DEFINITIONS = [
  defineRule('aqua_affinity', 1, HELMET_ITEMS),
  defineRule('bane_of_arthropods', 5, SWORD_ITEMS, ['sharpness', 'smite']),
  defineRule('binding_curse', 1, ARMOR_ITEMS),
  defineRule('blast_protection', 4, ARMOR_ITEMS, ['protection', 'fire_protection', 'projectile_protection']),
  defineRule('depth_strider', 3, BOOTS_ITEMS, ['frost_walker']),
  defineRule('efficiency', 5, MINING_ITEMS),
  defineRule('feather_falling', 4, BOOTS_ITEMS),
  defineRule('fire_aspect', 2, SWORD_ITEMS),
  defineRule('fire_protection', 4, ARMOR_ITEMS, ['protection', 'blast_protection', 'projectile_protection']),
  defineRule('flame', 1, BOW_ITEMS),
  defineRule('fortune', 3, MINING_ITEMS, ['silk_touch']),
  defineRule('frost_walker', 2, BOOTS_ITEMS, ['depth_strider']),
  defineRule('infinity', 1, BOW_ITEMS, ['mending']),
  defineRule('knockback', 2, SWORD_ITEMS),
  defineRule('looting', 3, SWORD_ITEMS),
  defineRule('luck_of_the_sea', 3, FISHING_ROD_ITEMS),
  defineRule('lure', 3, FISHING_ROD_ITEMS),
  defineRule('mending', 1, DAMAGEABLE_ITEMS, ['infinity']),
  defineRule('power', 5, BOW_ITEMS),
  defineRule('projectile_protection', 4, ARMOR_ITEMS, ['protection', 'fire_protection', 'blast_protection']),
  defineRule('protection', 4, ARMOR_ITEMS, ['fire_protection', 'blast_protection', 'projectile_protection']),
  defineRule('punch', 2, BOW_ITEMS),
  defineRule('respiration', 3, HELMET_ITEMS),
  defineRule('sharpness', 5, SWORD_ITEMS, ['smite', 'bane_of_arthropods']),
  defineRule('silk_touch', 1, MINING_ITEMS, ['fortune']),
  defineRule('smite', 5, SWORD_ITEMS, ['sharpness', 'bane_of_arthropods']),
  defineRule('soul_speed', 3, BOOTS_ITEMS),
  defineRule('sweeping_edge', 3, SWORD_ITEMS),
  defineRule('swift_sneak', 3, LEGGINGS_ITEMS),
  defineRule('thorns', 3, ARMOR_ITEMS),
  defineRule('unbreaking', 3, DAMAGEABLE_ITEMS),
  defineRule('vanishing_curse', 1, DAMAGEABLE_ITEMS),
  defineRule('breach', VANILLA_26_3_ENCHANTMENT_MAX_LEVELS.breach, []),
  defineRule('channeling', VANILLA_26_3_ENCHANTMENT_MAX_LEVELS.channeling, []),
  defineRule('density', VANILLA_26_3_ENCHANTMENT_MAX_LEVELS.density, []),
  defineRule('impaling', VANILLA_26_3_ENCHANTMENT_MAX_LEVELS.impaling, []),
  defineRule('loyalty', VANILLA_26_3_ENCHANTMENT_MAX_LEVELS.loyalty, []),
  defineRule('lunge', VANILLA_26_3_ENCHANTMENT_MAX_LEVELS.lunge, []),
  defineRule('multishot', VANILLA_26_3_ENCHANTMENT_MAX_LEVELS.multishot, []),
  defineRule('piercing', VANILLA_26_3_ENCHANTMENT_MAX_LEVELS.piercing, []),
  defineRule('quick_charge', VANILLA_26_3_ENCHANTMENT_MAX_LEVELS.quick_charge, []),
  defineRule('riptide', VANILLA_26_3_ENCHANTMENT_MAX_LEVELS.riptide, []),
  defineRule('wind_burst', VANILLA_26_3_ENCHANTMENT_MAX_LEVELS.wind_burst, []),
] as const

type VanillaAnvilCostSource = keyof VanillaAnvilCost

const rulesForCostSource = (
  costSource: VanillaAnvilCostSource,
): ReadonlyArray<VanillaEnchantmentRule> =>
  VANILLA_ENCHANTMENT_RULE_DEFINITIONS.map(({ id, maxLevel, applicableItems, incompatibleWith }) => ({
    id,
    maxLevel,
    applicableItems,
    incompatibleWith,
    costPerLevel: VANILLA_ENCHANTMENT_COSTS[id][costSource],
  }))

export const SUPPORTED_VANILLA_BOOK_ENCHANTMENT_RULES: ReadonlyArray<VanillaEnchantmentRule> =
  rulesForCostSource('book')
export const SUPPORTED_VANILLA_ITEM_ENCHANTMENT_RULES: ReadonlyArray<VanillaEnchantmentRule> =
  rulesForCostSource('item')
export const SUPPORTED_VANILLA_ENCHANTMENT_RULES: ReadonlyArray<VanillaEnchantmentRule> =
  SUPPORTED_VANILLA_BOOK_ENCHANTMENT_RULES
