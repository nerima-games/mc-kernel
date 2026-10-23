import { itemStackForCanonicalItem } from '../item/item-stack-canonical.js'
import { FixedDurationSecs, StackCount } from '../time/quantities.js'
import type { ItemStack, Slot } from '../item/item-stack.js'
import type { ItemType } from '../item/item-type.js'
import type { FixedDurationSecs as FixedDurationSecsValue } from '../time/quantities.js'
import {
  RecipeExperience,
  RecipeId,
} from './recipe-data.js'
import type {
  RecipeCompletionCount as RecipeCompletionCountValue,
  RecipeExperience as RecipeExperienceValue,
  RecipeId as RecipeIdValue,
} from './recipe-data.js'

export const COOKING_STATIONS = ['furnace', 'blast_furnace', 'smoker'] as const
export type CookingStation = (typeof COOKING_STATIONS)[number]

export type SmeltingRecipe = {
  readonly _tag: 'Smelting'
  readonly id: RecipeIdValue
  readonly input: ItemType
  readonly output: ItemStack
  readonly cookTimeSecs: FixedDurationSecsValue
  readonly experience: RecipeExperienceValue
  readonly stations: ReadonlyArray<CookingStation>
}

export type SmeltingRecipeTable = ReadonlyArray<SmeltingRecipe>

export type FuelRule = {
  readonly fuel: ItemType
  readonly burnTimeSecs: FixedDurationSecsValue
}

export type FuelRuleTable = ReadonlyArray<FuelRule>

export type FurnaceState = {
  readonly station: CookingStation
  readonly input: Slot
  readonly fuel: Slot
  readonly output: Slot
  readonly fuelTimeRemainingSecs: FixedDurationSecsValue
  readonly fuelTimeTotalSecs: FixedDurationSecsValue
  readonly cookProgressSecs: FixedDurationSecsValue
}

export type FurnaceStateInput = {
  readonly station?: CookingStation
  readonly input?: Slot
  readonly fuel?: Slot
  readonly output?: Slot
  readonly fuelTimeRemainingSecs?: FixedDurationSecsValue
  readonly fuelTimeTotalSecs?: FixedDurationSecsValue
  readonly cookProgressSecs?: FixedDurationSecsValue
}

export type FurnaceAdvanceResult = {
  readonly state: FurnaceState
  readonly smeltedCount: RecipeCompletionCountValue
  readonly experienceGained: RecipeExperienceValue
}

const furnaceRecipe = (
  id: string,
  input: ItemType,
  output: ItemType,
  experience: number,
  stations: ReadonlyArray<CookingStation> = ['furnace'],
): SmeltingRecipe => ({
  _tag: 'Smelting',
  cookTimeSecs: FixedDurationSecs(10),
  experience: RecipeExperience(experience),
  id: RecipeId(id),
  input,
  output: itemStackForCanonicalItem(output, StackCount(1)),
  stations,
})

export const VANILLA_SMELTING_RECIPES: SmeltingRecipeTable = [
  furnaceRecipe('minecraft:iron_ingot_from_raw_iron', 'raw_iron', 'iron_ingot', 0.7, ['furnace', 'blast_furnace']),
  furnaceRecipe('minecraft:iron_ingot_from_iron_ore', 'iron_ore', 'iron_ingot', 0.7, ['furnace', 'blast_furnace']),
  furnaceRecipe('minecraft:gold_ingot_from_raw_gold', 'raw_gold', 'gold_ingot', 1, ['furnace', 'blast_furnace']),
  furnaceRecipe('minecraft:gold_ingot_from_gold_ore', 'gold_ore', 'gold_ingot', 1, ['furnace', 'blast_furnace']),
  furnaceRecipe('minecraft:gold_ingot_from_deepslate_gold_ore', 'deepslate_gold_ore', 'gold_ingot', 1, ['furnace', 'blast_furnace']),
  furnaceRecipe('minecraft:stone', 'cobblestone', 'stone', 0.1),
  furnaceRecipe('minecraft:glass', 'sand', 'glass', 0.1),
  furnaceRecipe('minecraft:nether_brick', 'netherrack', 'nether_brick', 0.1),
  furnaceRecipe('minecraft:coal_from_coal_ore', 'coal_ore', 'coal', 0.1, ['furnace', 'blast_furnace']),
  furnaceRecipe('minecraft:diamond_from_diamond_ore', 'diamond_ore', 'diamond', 1, ['furnace', 'blast_furnace']),
  furnaceRecipe('minecraft:emerald_from_emerald_ore', 'emerald_ore', 'emerald', 1, ['furnace', 'blast_furnace']),
  furnaceRecipe('minecraft:lapis_lazuli_from_lapis_ore', 'lapis_ore', 'lapis_lazuli', 0.2, ['furnace', 'blast_furnace']),
  furnaceRecipe('minecraft:redstone_from_redstone_ore', 'redstone_ore', 'redstone_dust', 0.7, ['furnace', 'blast_furnace']),
  furnaceRecipe('minecraft:amethyst_shard_from_amethyst_block', 'amethyst_block', 'amethyst_shard', 0.2),
  furnaceRecipe('minecraft:iron_ingot_from_deepslate_iron_ore', 'deepslate_iron_ore', 'iron_ingot', 0.7, ['furnace', 'blast_furnace']),
  furnaceRecipe('minecraft:coal_from_deepslate_coal_ore', 'deepslate_coal_ore', 'coal', 0.1, ['furnace', 'blast_furnace']),
  furnaceRecipe('minecraft:diamond_from_deepslate_diamond_ore', 'deepslate_diamond_ore', 'diamond', 1, ['furnace', 'blast_furnace']),
  furnaceRecipe('minecraft:emerald_from_deepslate_emerald_ore', 'deepslate_emerald_ore', 'emerald', 1, ['furnace', 'blast_furnace']),
  furnaceRecipe('minecraft:lapis_lazuli_from_deepslate_lapis_ore', 'deepslate_lapis_ore', 'lapis_lazuli', 0.2, ['furnace', 'blast_furnace']),
  furnaceRecipe('minecraft:redstone_from_deepslate_redstone_ore', 'deepslate_redstone_ore', 'redstone_dust', 0.7, ['furnace', 'blast_furnace']),
]

export const VANILLA_FUEL_RULES: FuelRuleTable = [
  { burnTimeSecs: FixedDurationSecs(80), fuel: 'coal' },
  { burnTimeSecs: FixedDurationSecs(800), fuel: 'coal_block' },
  { burnTimeSecs: FixedDurationSecs(15), fuel: 'oak_log' },
  { burnTimeSecs: FixedDurationSecs(15), fuel: 'oak_planks' },
  { burnTimeSecs: FixedDurationSecs(5), fuel: 'stick' },
  { burnTimeSecs: FixedDurationSecs(15), fuel: 'oak_stairs' },
  { burnTimeSecs: FixedDurationSecs(15), fuel: 'crafting_table' },
  { burnTimeSecs: FixedDurationSecs(15), fuel: 'chest' },
  { burnTimeSecs: FixedDurationSecs(15), fuel: 'bow' },
  { burnTimeSecs: FixedDurationSecs(15), fuel: 'fishing_rod' },
  { burnTimeSecs: FixedDurationSecs(60), fuel: 'oak_boat' },
  { burnTimeSecs: FixedDurationSecs(15), fuel: 'ladder' },
  { burnTimeSecs: FixedDurationSecs(5), fuel: 'sapling' },
  { burnTimeSecs: FixedDurationSecs(10), fuel: 'wooden_pickaxe' },
  { burnTimeSecs: FixedDurationSecs(10), fuel: 'wooden_hoe' },
  { burnTimeSecs: FixedDurationSecs(10), fuel: 'wooden_sword' },
  { burnTimeSecs: FixedDurationSecs(5), fuel: 'bowl' },
  { burnTimeSecs: FixedDurationSecs(5), fuel: 'wool' },
  { burnTimeSecs: FixedDurationSecs(10), fuel: 'door' },
]
