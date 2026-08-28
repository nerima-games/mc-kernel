import type { ItemType } from './item-type.js'

export const DEFAULT_MINING_SPEED = 1

export const TOOL_BREAK_SPEED: Readonly<Partial<Record<ItemType, number>>> = {
  diamond_axe: 8,
  diamond_pickaxe: 8,
  diamond_shovel: 8,
  gold_axe: 12,
  gold_pickaxe: 12,
  gold_shovel: 12,
  iron_axe: 6,
  iron_pickaxe: 6,
  iron_shovel: 6,
  netherite_axe: 9,
  netherite_pickaxe: 9,
  netherite_shovel: 9,
  stone_axe: 4,
  stone_pickaxe: 4,
  stone_shovel: 4,
  wooden_axe: 2,
  wooden_pickaxe: 2,
  wooden_shovel: 2,
}
