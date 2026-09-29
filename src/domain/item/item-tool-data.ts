/** Evidence-backed Java item tool defaults shared by item stacks and mining logic. */
import type { ItemType } from './item-type.js'
import type { ToolComponent } from './tool-component.js'

type ToolMiningTag =
  | '#minecraft:mineable/axe'
  | '#minecraft:mineable/pickaxe'
  | '#minecraft:mineable/shovel'

const toolComponentFor = (blocks: ToolMiningTag, speed: number): ToolComponent =>
  Object.freeze({
    rules: Object.freeze([{ blocks, speed, correctForDrops: true }]),
    damagePerBlock: 1,
  })

/**
 * The current portable catalog covers the axe, pickaxe, and shovel defaults
 * represented by the kernel's existing Java mining-speed data.
 */
export const ITEM_TOOL_COMPONENTS: Readonly<Partial<Record<ItemType, ToolComponent>>> = Object.freeze({
  diamond_axe: toolComponentFor('#minecraft:mineable/axe', 8),
  diamond_pickaxe: toolComponentFor('#minecraft:mineable/pickaxe', 8),
  diamond_shovel: toolComponentFor('#minecraft:mineable/shovel', 8),
  gold_axe: toolComponentFor('#minecraft:mineable/axe', 12),
  gold_pickaxe: toolComponentFor('#minecraft:mineable/pickaxe', 12),
  gold_shovel: toolComponentFor('#minecraft:mineable/shovel', 12),
  iron_axe: toolComponentFor('#minecraft:mineable/axe', 6),
  iron_pickaxe: toolComponentFor('#minecraft:mineable/pickaxe', 6),
  iron_shovel: toolComponentFor('#minecraft:mineable/shovel', 6),
  netherite_axe: toolComponentFor('#minecraft:mineable/axe', 9),
  netherite_pickaxe: toolComponentFor('#minecraft:mineable/pickaxe', 9),
  netherite_shovel: toolComponentFor('#minecraft:mineable/shovel', 9),
  stone_axe: toolComponentFor('#minecraft:mineable/axe', 4),
  stone_pickaxe: toolComponentFor('#minecraft:mineable/pickaxe', 4),
  stone_shovel: toolComponentFor('#minecraft:mineable/shovel', 4),
  wooden_axe: toolComponentFor('#minecraft:mineable/axe', 2),
  wooden_pickaxe: toolComponentFor('#minecraft:mineable/pickaxe', 2),
  wooden_shovel: toolComponentFor('#minecraft:mineable/shovel', 2),
})
