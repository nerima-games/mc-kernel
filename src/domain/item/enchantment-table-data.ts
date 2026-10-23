import type { ItemType } from './item-type.js'
import { EnchantmentLevel } from '../time/quantities.js'
import {
  EnchantmentTableLevelCost,
  EnchantmentWeight,
  ItemEnchantability,
} from './item-primitives.js'

import {
  SUPPORTED_VANILLA_ENCHANTMENT_IDS,
  type SupportedVanillaEnchantmentId,
} from './enchantment-data.js'

export const ENCHANTMENT_TABLE_BOOK = 'book'
export const ENCHANTMENT_TABLE_MAX_BOOKSHELVES = 15
export const ENCHANTMENT_TABLE_SLOT_COUNT = 3

export type EnchantmentTableItem = ItemType | typeof ENCHANTMENT_TABLE_BOOK

export type EnchantmentTableCost = Readonly<{
  readonly base: EnchantmentTableLevelCost
  readonly perLevelAboveFirst: EnchantmentTableLevelCost
}>

export type VanillaEnchantmentTableRule = Readonly<{
  readonly maxLevel: EnchantmentLevel
  readonly weight: EnchantmentWeight
  readonly minCost: EnchantmentTableCost
  readonly maxCost: EnchantmentTableCost
  readonly treasureOnly: boolean
}>

export const VANILLA_ENCHANTMENT_TABLE_RULES: Readonly<
  Record<SupportedVanillaEnchantmentId, VanillaEnchantmentTableRule>
> = {
  aqua_affinity: {
    maxLevel: EnchantmentLevel(1),
    weight: EnchantmentWeight(2),
    minCost: { base: EnchantmentTableLevelCost(1), perLevelAboveFirst: EnchantmentTableLevelCost(0) },
    maxCost: { base: EnchantmentTableLevelCost(41), perLevelAboveFirst: EnchantmentTableLevelCost(0) },
    treasureOnly: false,
  },
  bane_of_arthropods: {
    maxLevel: EnchantmentLevel(5),
    weight: EnchantmentWeight(5),
    minCost: { base: EnchantmentTableLevelCost(5), perLevelAboveFirst: EnchantmentTableLevelCost(8) },
    maxCost: { base: EnchantmentTableLevelCost(25), perLevelAboveFirst: EnchantmentTableLevelCost(8) },
    treasureOnly: false,
  },
  binding_curse: {
    maxLevel: EnchantmentLevel(1),
    weight: EnchantmentWeight(1),
    minCost: { base: EnchantmentTableLevelCost(25), perLevelAboveFirst: EnchantmentTableLevelCost(0) },
    maxCost: { base: EnchantmentTableLevelCost(50), perLevelAboveFirst: EnchantmentTableLevelCost(0) },
    treasureOnly: true,
  },
  blast_protection: {
    maxLevel: EnchantmentLevel(4),
    weight: EnchantmentWeight(2),
    minCost: { base: EnchantmentTableLevelCost(5), perLevelAboveFirst: EnchantmentTableLevelCost(8) },
    maxCost: { base: EnchantmentTableLevelCost(13), perLevelAboveFirst: EnchantmentTableLevelCost(8) },
    treasureOnly: false,
  },
  depth_strider: {
    maxLevel: EnchantmentLevel(3),
    weight: EnchantmentWeight(2),
    minCost: { base: EnchantmentTableLevelCost(10), perLevelAboveFirst: EnchantmentTableLevelCost(10) },
    maxCost: { base: EnchantmentTableLevelCost(25), perLevelAboveFirst: EnchantmentTableLevelCost(10) },
    treasureOnly: false,
  },
  efficiency: {
    maxLevel: EnchantmentLevel(5),
    weight: EnchantmentWeight(10),
    minCost: { base: EnchantmentTableLevelCost(1), perLevelAboveFirst: EnchantmentTableLevelCost(10) },
    maxCost: { base: EnchantmentTableLevelCost(51), perLevelAboveFirst: EnchantmentTableLevelCost(10) },
    treasureOnly: false,
  },
  feather_falling: {
    maxLevel: EnchantmentLevel(4),
    weight: EnchantmentWeight(5),
    minCost: { base: EnchantmentTableLevelCost(5), perLevelAboveFirst: EnchantmentTableLevelCost(6) },
    maxCost: { base: EnchantmentTableLevelCost(11), perLevelAboveFirst: EnchantmentTableLevelCost(6) },
    treasureOnly: false,
  },
  fire_aspect: {
    maxLevel: EnchantmentLevel(2),
    weight: EnchantmentWeight(2),
    minCost: { base: EnchantmentTableLevelCost(10), perLevelAboveFirst: EnchantmentTableLevelCost(20) },
    maxCost: { base: EnchantmentTableLevelCost(60), perLevelAboveFirst: EnchantmentTableLevelCost(20) },
    treasureOnly: false,
  },
  fire_protection: {
    maxLevel: EnchantmentLevel(4),
    weight: EnchantmentWeight(5),
    minCost: { base: EnchantmentTableLevelCost(10), perLevelAboveFirst: EnchantmentTableLevelCost(8) },
    maxCost: { base: EnchantmentTableLevelCost(18), perLevelAboveFirst: EnchantmentTableLevelCost(8) },
    treasureOnly: false,
  },
  flame: {
    maxLevel: EnchantmentLevel(1),
    weight: EnchantmentWeight(2),
    minCost: { base: EnchantmentTableLevelCost(20), perLevelAboveFirst: EnchantmentTableLevelCost(0) },
    maxCost: { base: EnchantmentTableLevelCost(50), perLevelAboveFirst: EnchantmentTableLevelCost(0) },
    treasureOnly: false,
  },
  fortune: {
    maxLevel: EnchantmentLevel(3),
    weight: EnchantmentWeight(2),
    minCost: { base: EnchantmentTableLevelCost(15), perLevelAboveFirst: EnchantmentTableLevelCost(9) },
    maxCost: { base: EnchantmentTableLevelCost(65), perLevelAboveFirst: EnchantmentTableLevelCost(9) },
    treasureOnly: false,
  },
  frost_walker: {
    maxLevel: EnchantmentLevel(2),
    weight: EnchantmentWeight(2),
    minCost: { base: EnchantmentTableLevelCost(10), perLevelAboveFirst: EnchantmentTableLevelCost(10) },
    maxCost: { base: EnchantmentTableLevelCost(25), perLevelAboveFirst: EnchantmentTableLevelCost(10) },
    treasureOnly: true,
  },
  infinity: {
    maxLevel: EnchantmentLevel(1),
    weight: EnchantmentWeight(1),
    minCost: { base: EnchantmentTableLevelCost(20), perLevelAboveFirst: EnchantmentTableLevelCost(0) },
    maxCost: { base: EnchantmentTableLevelCost(50), perLevelAboveFirst: EnchantmentTableLevelCost(0) },
    treasureOnly: false,
  },
  knockback: {
    maxLevel: EnchantmentLevel(2),
    weight: EnchantmentWeight(5),
    minCost: { base: EnchantmentTableLevelCost(5), perLevelAboveFirst: EnchantmentTableLevelCost(20) },
    maxCost: { base: EnchantmentTableLevelCost(55), perLevelAboveFirst: EnchantmentTableLevelCost(20) },
    treasureOnly: false,
  },
  looting: {
    maxLevel: EnchantmentLevel(3),
    weight: EnchantmentWeight(2),
    minCost: { base: EnchantmentTableLevelCost(15), perLevelAboveFirst: EnchantmentTableLevelCost(9) },
    maxCost: { base: EnchantmentTableLevelCost(65), perLevelAboveFirst: EnchantmentTableLevelCost(9) },
    treasureOnly: false,
  },
  luck_of_the_sea: {
    maxLevel: EnchantmentLevel(3),
    weight: EnchantmentWeight(2),
    minCost: { base: EnchantmentTableLevelCost(15), perLevelAboveFirst: EnchantmentTableLevelCost(9) },
    maxCost: { base: EnchantmentTableLevelCost(65), perLevelAboveFirst: EnchantmentTableLevelCost(9) },
    treasureOnly: false,
  },
  lure: {
    maxLevel: EnchantmentLevel(3),
    weight: EnchantmentWeight(2),
    minCost: { base: EnchantmentTableLevelCost(15), perLevelAboveFirst: EnchantmentTableLevelCost(9) },
    maxCost: { base: EnchantmentTableLevelCost(65), perLevelAboveFirst: EnchantmentTableLevelCost(9) },
    treasureOnly: false,
  },
  mending: {
    maxLevel: EnchantmentLevel(1),
    weight: EnchantmentWeight(2),
    minCost: { base: EnchantmentTableLevelCost(25), perLevelAboveFirst: EnchantmentTableLevelCost(25) },
    maxCost: { base: EnchantmentTableLevelCost(75), perLevelAboveFirst: EnchantmentTableLevelCost(25) },
    treasureOnly: true,
  },
  power: {
    maxLevel: EnchantmentLevel(5),
    weight: EnchantmentWeight(10),
    minCost: { base: EnchantmentTableLevelCost(1), perLevelAboveFirst: EnchantmentTableLevelCost(10) },
    maxCost: { base: EnchantmentTableLevelCost(16), perLevelAboveFirst: EnchantmentTableLevelCost(10) },
    treasureOnly: false,
  },
  projectile_protection: {
    maxLevel: EnchantmentLevel(4),
    weight: EnchantmentWeight(5),
    minCost: { base: EnchantmentTableLevelCost(3), perLevelAboveFirst: EnchantmentTableLevelCost(6) },
    maxCost: { base: EnchantmentTableLevelCost(9), perLevelAboveFirst: EnchantmentTableLevelCost(6) },
    treasureOnly: false,
  },
  protection: {
    maxLevel: EnchantmentLevel(4),
    weight: EnchantmentWeight(10),
    minCost: { base: EnchantmentTableLevelCost(1), perLevelAboveFirst: EnchantmentTableLevelCost(11) },
    maxCost: { base: EnchantmentTableLevelCost(12), perLevelAboveFirst: EnchantmentTableLevelCost(11) },
    treasureOnly: false,
  },
  punch: {
    maxLevel: EnchantmentLevel(2),
    weight: EnchantmentWeight(2),
    minCost: { base: EnchantmentTableLevelCost(12), perLevelAboveFirst: EnchantmentTableLevelCost(20) },
    maxCost: { base: EnchantmentTableLevelCost(37), perLevelAboveFirst: EnchantmentTableLevelCost(20) },
    treasureOnly: false,
  },
  respiration: {
    maxLevel: EnchantmentLevel(3),
    weight: EnchantmentWeight(2),
    minCost: { base: EnchantmentTableLevelCost(10), perLevelAboveFirst: EnchantmentTableLevelCost(10) },
    maxCost: { base: EnchantmentTableLevelCost(40), perLevelAboveFirst: EnchantmentTableLevelCost(10) },
    treasureOnly: false,
  },
  sharpness: {
    maxLevel: EnchantmentLevel(5),
    weight: EnchantmentWeight(10),
    minCost: { base: EnchantmentTableLevelCost(1), perLevelAboveFirst: EnchantmentTableLevelCost(11) },
    maxCost: { base: EnchantmentTableLevelCost(21), perLevelAboveFirst: EnchantmentTableLevelCost(11) },
    treasureOnly: false,
  },
  silk_touch: {
    maxLevel: EnchantmentLevel(1),
    weight: EnchantmentWeight(1),
    minCost: { base: EnchantmentTableLevelCost(15), perLevelAboveFirst: EnchantmentTableLevelCost(0) },
    maxCost: { base: EnchantmentTableLevelCost(65), perLevelAboveFirst: EnchantmentTableLevelCost(0) },
    treasureOnly: false,
  },
  smite: {
    maxLevel: EnchantmentLevel(5),
    weight: EnchantmentWeight(5),
    minCost: { base: EnchantmentTableLevelCost(5), perLevelAboveFirst: EnchantmentTableLevelCost(8) },
    maxCost: { base: EnchantmentTableLevelCost(25), perLevelAboveFirst: EnchantmentTableLevelCost(8) },
    treasureOnly: false,
  },
  soul_speed: {
    maxLevel: EnchantmentLevel(3),
    weight: EnchantmentWeight(1),
    minCost: { base: EnchantmentTableLevelCost(10), perLevelAboveFirst: EnchantmentTableLevelCost(10) },
    maxCost: { base: EnchantmentTableLevelCost(25), perLevelAboveFirst: EnchantmentTableLevelCost(10) },
    treasureOnly: true,
  },
  sweeping_edge: {
    maxLevel: EnchantmentLevel(3),
    weight: EnchantmentWeight(2),
    minCost: { base: EnchantmentTableLevelCost(5), perLevelAboveFirst: EnchantmentTableLevelCost(9) },
    maxCost: { base: EnchantmentTableLevelCost(20), perLevelAboveFirst: EnchantmentTableLevelCost(9) },
    treasureOnly: false,
  },
  swift_sneak: {
    maxLevel: EnchantmentLevel(3),
    weight: EnchantmentWeight(1),
    minCost: { base: EnchantmentTableLevelCost(25), perLevelAboveFirst: EnchantmentTableLevelCost(25) },
    maxCost: { base: EnchantmentTableLevelCost(75), perLevelAboveFirst: EnchantmentTableLevelCost(25) },
    treasureOnly: true,
  },
  thorns: {
    maxLevel: EnchantmentLevel(3),
    weight: EnchantmentWeight(1),
    minCost: { base: EnchantmentTableLevelCost(10), perLevelAboveFirst: EnchantmentTableLevelCost(20) },
    maxCost: { base: EnchantmentTableLevelCost(60), perLevelAboveFirst: EnchantmentTableLevelCost(20) },
    treasureOnly: false,
  },
  unbreaking: {
    maxLevel: EnchantmentLevel(3),
    weight: EnchantmentWeight(5),
    minCost: { base: EnchantmentTableLevelCost(5), perLevelAboveFirst: EnchantmentTableLevelCost(8) },
    maxCost: { base: EnchantmentTableLevelCost(55), perLevelAboveFirst: EnchantmentTableLevelCost(8) },
    treasureOnly: false,
  },
  vanishing_curse: {
    maxLevel: EnchantmentLevel(1),
    weight: EnchantmentWeight(1),
    minCost: { base: EnchantmentTableLevelCost(25), perLevelAboveFirst: EnchantmentTableLevelCost(0) },
    maxCost: { base: EnchantmentTableLevelCost(50), perLevelAboveFirst: EnchantmentTableLevelCost(0) },
    treasureOnly: true,
  },
  breach: { maxLevel: EnchantmentLevel(4), weight: EnchantmentWeight(1), minCost: { base: EnchantmentTableLevelCost(1), perLevelAboveFirst: EnchantmentTableLevelCost(9) }, maxCost: { base: EnchantmentTableLevelCost(65), perLevelAboveFirst: EnchantmentTableLevelCost(9) }, treasureOnly: false },
  channeling: { maxLevel: EnchantmentLevel(1), weight: EnchantmentWeight(1), minCost: { base: EnchantmentTableLevelCost(1), perLevelAboveFirst: EnchantmentTableLevelCost(0) }, maxCost: { base: EnchantmentTableLevelCost(50), perLevelAboveFirst: EnchantmentTableLevelCost(0) }, treasureOnly: false },
  density: { maxLevel: EnchantmentLevel(5), weight: EnchantmentWeight(1), minCost: { base: EnchantmentTableLevelCost(1), perLevelAboveFirst: EnchantmentTableLevelCost(8) }, maxCost: { base: EnchantmentTableLevelCost(25), perLevelAboveFirst: EnchantmentTableLevelCost(8) }, treasureOnly: false },
  impaling: { maxLevel: EnchantmentLevel(5), weight: EnchantmentWeight(1), minCost: { base: EnchantmentTableLevelCost(1), perLevelAboveFirst: EnchantmentTableLevelCost(8) }, maxCost: { base: EnchantmentTableLevelCost(21), perLevelAboveFirst: EnchantmentTableLevelCost(8) }, treasureOnly: false },
  loyalty: { maxLevel: EnchantmentLevel(3), weight: EnchantmentWeight(1), minCost: { base: EnchantmentTableLevelCost(12), perLevelAboveFirst: EnchantmentTableLevelCost(7) }, maxCost: { base: EnchantmentTableLevelCost(50), perLevelAboveFirst: EnchantmentTableLevelCost(0) }, treasureOnly: false },
  lunge: { maxLevel: EnchantmentLevel(3), weight: EnchantmentWeight(1), minCost: { base: EnchantmentTableLevelCost(1), perLevelAboveFirst: EnchantmentTableLevelCost(7) }, maxCost: { base: EnchantmentTableLevelCost(50), perLevelAboveFirst: EnchantmentTableLevelCost(0) }, treasureOnly: false },
  multishot: { maxLevel: EnchantmentLevel(1), weight: EnchantmentWeight(1), minCost: { base: EnchantmentTableLevelCost(20), perLevelAboveFirst: EnchantmentTableLevelCost(0) }, maxCost: { base: EnchantmentTableLevelCost(50), perLevelAboveFirst: EnchantmentTableLevelCost(0) }, treasureOnly: false },
  piercing: { maxLevel: EnchantmentLevel(4), weight: EnchantmentWeight(1), minCost: { base: EnchantmentTableLevelCost(1), perLevelAboveFirst: EnchantmentTableLevelCost(10) }, maxCost: { base: EnchantmentTableLevelCost(50), perLevelAboveFirst: EnchantmentTableLevelCost(0) }, treasureOnly: false },
  quick_charge: { maxLevel: EnchantmentLevel(3), weight: EnchantmentWeight(1), minCost: { base: EnchantmentTableLevelCost(12), perLevelAboveFirst: EnchantmentTableLevelCost(20) }, maxCost: { base: EnchantmentTableLevelCost(50), perLevelAboveFirst: EnchantmentTableLevelCost(0) }, treasureOnly: false },
  riptide: { maxLevel: EnchantmentLevel(3), weight: EnchantmentWeight(1), minCost: { base: EnchantmentTableLevelCost(17), perLevelAboveFirst: EnchantmentTableLevelCost(7) }, maxCost: { base: EnchantmentTableLevelCost(50), perLevelAboveFirst: EnchantmentTableLevelCost(0) }, treasureOnly: false },
  wind_burst: { maxLevel: EnchantmentLevel(3), weight: EnchantmentWeight(1), minCost: { base: EnchantmentTableLevelCost(1), perLevelAboveFirst: EnchantmentTableLevelCost(0) }, maxCost: { base: EnchantmentTableLevelCost(50), perLevelAboveFirst: EnchantmentTableLevelCost(0) }, treasureOnly: false },
} as const satisfies Readonly<Record<SupportedVanillaEnchantmentId, VanillaEnchantmentTableRule>>

export const ENCHANTMENT_TABLE_ITEM_ENMERCHANTABILITY: Readonly<
  Partial<Record<EnchantmentTableItem, ItemEnchantability>>
> = {
  [ENCHANTMENT_TABLE_BOOK]: ItemEnchantability(1),
  bow: ItemEnchantability(1),
  diamond_hoe: ItemEnchantability(10),
  diamond_pickaxe: ItemEnchantability(10),
  diamond_sword: ItemEnchantability(10),
  fishing_rod: ItemEnchantability(1),
  flint_and_steel: ItemEnchantability(10),
  iron_boots: ItemEnchantability(9),
  iron_chestplate: ItemEnchantability(9),
  iron_helmet: ItemEnchantability(9),
  iron_leggings: ItemEnchantability(9),
  iron_hoe: ItemEnchantability(14),
  iron_pickaxe: ItemEnchantability(14),
  iron_sword: ItemEnchantability(14),
  shears: ItemEnchantability(15),
  stone_hoe: ItemEnchantability(5),
  stone_pickaxe: ItemEnchantability(5),
  stone_sword: ItemEnchantability(5),
  wooden_hoe: ItemEnchantability(15),
  wooden_pickaxe: ItemEnchantability(15),
  wooden_sword: ItemEnchantability(15),
}

export type EnchantmentTableRuleId = keyof typeof VANILLA_ENCHANTMENT_TABLE_RULES

const ENCHANTMENT_TABLE_RULE_IDS: ReadonlySet<string> = new Set(SUPPORTED_VANILLA_ENCHANTMENT_IDS)

export const isEnchantmentTableRuleId = (
  value: unknown,
): value is EnchantmentTableRuleId =>
  typeof value === 'string' && ENCHANTMENT_TABLE_RULE_IDS.has(value)

export const enchantmentTableRuleFor = (
  id: EnchantmentTableRuleId,
): VanillaEnchantmentTableRule => VANILLA_ENCHANTMENT_TABLE_RULES[id]

export const itemEnchantabilityOf = (item: EnchantmentTableItem): ItemEnchantability =>
  ENCHANTMENT_TABLE_ITEM_ENMERCHANTABILITY[item] ?? ItemEnchantability(0)
