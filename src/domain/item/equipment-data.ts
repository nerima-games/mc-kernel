import type { ItemType } from './item-type.js'

export const EQUIPMENT_SLOTS = [
  'mainhand',
  'head',
  'chest',
  'legs',
  'feet',
  'offhand',
] as const

export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number]

export type EquipmentDefinition = {
  readonly slots: ReadonlyArray<EquipmentSlot>
}

export type ItemDurabilityDefinition = {
  readonly maxDurability: number
}

const HAND_SLOTS = ['mainhand', 'offhand'] as const satisfies ReadonlyArray<EquipmentSlot>
const HEAD_SLOTS = ['head'] as const satisfies ReadonlyArray<EquipmentSlot>
const CHEST_SLOTS = ['chest'] as const satisfies ReadonlyArray<EquipmentSlot>
const LEGS_SLOTS = ['legs'] as const satisfies ReadonlyArray<EquipmentSlot>
const FEET_SLOTS = ['feet'] as const satisfies ReadonlyArray<EquipmentSlot>

export type EquippableItemType =
  | 'iron_helmet'
  | 'iron_chestplate'
  | 'iron_leggings'
  | 'iron_boots'
  | 'diamond_helmet'
  | 'diamond_chestplate'
  | 'diamond_leggings'
  | 'diamond_boots'
  | 'netherite_helmet'
  | 'netherite_chestplate'
  | 'netherite_leggings'
  | 'netherite_boots'
  | 'wooden_pickaxe'
  | 'stone_pickaxe'
  | 'iron_pickaxe'
  | 'gold_pickaxe'
  | 'diamond_pickaxe'
  | 'netherite_pickaxe'
  | 'wooden_shovel'
  | 'stone_shovel'
  | 'iron_shovel'
  | 'gold_shovel'
  | 'diamond_shovel'
  | 'netherite_shovel'
  | 'wooden_axe'
  | 'stone_axe'
  | 'iron_axe'
  | 'gold_axe'
  | 'diamond_axe'
  | 'netherite_axe'
  | 'wooden_hoe'
  | 'stone_hoe'
  | 'iron_hoe'
  | 'gold_hoe'
  | 'diamond_hoe'
  | 'netherite_hoe'
  | 'wooden_sword'
  | 'stone_sword'
  | 'iron_sword'
  | 'gold_sword'
  | 'diamond_sword'
  | 'netherite_sword'
  | 'bow'
  | 'fishing_rod'
  | 'flint_and_steel'
  | 'shears'

export const EQUIPMENT_CATALOG: Readonly<
  Record<EquippableItemType, EquipmentDefinition>
> = {
  iron_helmet: { slots: HEAD_SLOTS },
  iron_chestplate: { slots: CHEST_SLOTS },
  iron_leggings: { slots: LEGS_SLOTS },
  iron_boots: { slots: FEET_SLOTS },
  diamond_helmet: { slots: HEAD_SLOTS },
  diamond_chestplate: { slots: CHEST_SLOTS },
  diamond_leggings: { slots: LEGS_SLOTS },
  diamond_boots: { slots: FEET_SLOTS },
  netherite_helmet: { slots: HEAD_SLOTS },
  netherite_chestplate: { slots: CHEST_SLOTS },
  netherite_leggings: { slots: LEGS_SLOTS },
  netherite_boots: { slots: FEET_SLOTS },
  wooden_pickaxe: { slots: HAND_SLOTS },
  stone_pickaxe: { slots: HAND_SLOTS },
  iron_pickaxe: { slots: HAND_SLOTS },
  gold_pickaxe: { slots: HAND_SLOTS },
  diamond_pickaxe: { slots: HAND_SLOTS },
  netherite_pickaxe: { slots: HAND_SLOTS },
  wooden_shovel: { slots: HAND_SLOTS },
  stone_shovel: { slots: HAND_SLOTS },
  iron_shovel: { slots: HAND_SLOTS },
  gold_shovel: { slots: HAND_SLOTS },
  diamond_shovel: { slots: HAND_SLOTS },
  netherite_shovel: { slots: HAND_SLOTS },
  wooden_axe: { slots: HAND_SLOTS },
  stone_axe: { slots: HAND_SLOTS },
  iron_axe: { slots: HAND_SLOTS },
  gold_axe: { slots: HAND_SLOTS },
  diamond_axe: { slots: HAND_SLOTS },
  netherite_axe: { slots: HAND_SLOTS },
  wooden_hoe: { slots: HAND_SLOTS },
  stone_hoe: { slots: HAND_SLOTS },
  iron_hoe: { slots: HAND_SLOTS },
  gold_hoe: { slots: HAND_SLOTS },
  diamond_hoe: { slots: HAND_SLOTS },
  netherite_hoe: { slots: HAND_SLOTS },
  wooden_sword: { slots: HAND_SLOTS },
  stone_sword: { slots: HAND_SLOTS },
  iron_sword: { slots: HAND_SLOTS },
  gold_sword: { slots: HAND_SLOTS },
  diamond_sword: { slots: HAND_SLOTS },
  netherite_sword: { slots: HAND_SLOTS },
  bow: { slots: HAND_SLOTS },
  fishing_rod: { slots: HAND_SLOTS },
  flint_and_steel: { slots: HAND_SLOTS },
  shears: { slots: HAND_SLOTS },
} satisfies Partial<Record<ItemType, EquipmentDefinition>>

export type DamageableItemType = EquippableItemType

export const ITEM_DURABILITY_CATALOG: Readonly<
  Record<DamageableItemType, ItemDurabilityDefinition>
> = {
  iron_helmet: { maxDurability: 165 },
  iron_chestplate: { maxDurability: 240 },
  iron_leggings: { maxDurability: 225 },
  iron_boots: { maxDurability: 195 },
  diamond_helmet: { maxDurability: 363 },
  diamond_chestplate: { maxDurability: 528 },
  diamond_leggings: { maxDurability: 495 },
  diamond_boots: { maxDurability: 429 },
  netherite_helmet: { maxDurability: 407 },
  netherite_chestplate: { maxDurability: 592 },
  netherite_leggings: { maxDurability: 555 },
  netherite_boots: { maxDurability: 481 },
  wooden_pickaxe: { maxDurability: 59 },
  wooden_shovel: { maxDurability: 59 },
  wooden_axe: { maxDurability: 59 },
  wooden_hoe: { maxDurability: 59 },
  wooden_sword: { maxDurability: 59 },
  gold_pickaxe: { maxDurability: 32 },
  gold_shovel: { maxDurability: 32 },
  gold_axe: { maxDurability: 32 },
  gold_hoe: { maxDurability: 32 },
  gold_sword: { maxDurability: 32 },
  stone_pickaxe: { maxDurability: 131 },
  stone_shovel: { maxDurability: 131 },
  stone_axe: { maxDurability: 131 },
  stone_hoe: { maxDurability: 131 },
  stone_sword: { maxDurability: 131 },
  iron_pickaxe: { maxDurability: 250 },
  iron_shovel: { maxDurability: 250 },
  iron_axe: { maxDurability: 250 },
  iron_hoe: { maxDurability: 250 },
  iron_sword: { maxDurability: 250 },
  diamond_pickaxe: { maxDurability: 1561 },
  diamond_shovel: { maxDurability: 1561 },
  diamond_axe: { maxDurability: 1561 },
  diamond_hoe: { maxDurability: 1561 },
  diamond_sword: { maxDurability: 1561 },
  netherite_pickaxe: { maxDurability: 2031 },
  netherite_shovel: { maxDurability: 2031 },
  netherite_axe: { maxDurability: 2031 },
  netherite_hoe: { maxDurability: 2031 },
  netherite_sword: { maxDurability: 2031 },
  bow: { maxDurability: 384 },
  fishing_rod: { maxDurability: 64 },
  flint_and_steel: { maxDurability: 64 },
  shears: { maxDurability: 238 },
} satisfies Partial<Record<ItemType, ItemDurabilityDefinition>>
