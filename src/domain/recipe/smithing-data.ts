import { isItemStack, itemStack } from "../item/item-stack.js";
import type { ItemStack, Slot } from "../item/item-stack.js";
import { StackCount } from "../time/quantities.js";
import { TagLocation } from "../text/identifiers.js";
import {
  craftingIngredient,
  exactly,
  isCraftingIngredientInput,
  RecipeId,
  RecipePriority,
  RecipeStationTag,
  tagged,
  type CraftingIngredient,
  type CraftingIngredientInput,
  type RecipeItemTag,
  type RecipePriority as RecipePriorityValue,
} from "./recipe-data.js";
import type { ItemType } from "../item/item-type.js";

export const SMITHING_STATION_TAG: RecipeStationTag =
  RecipeStationTag("smithing_table");
export const SMITHING_TRIM_TEMPLATE_TAG: RecipeItemTag =
  TagLocation("#minecraft:trim_templates");
export const SMITHING_TRIMMABLE_ARMOR_TAG: RecipeItemTag =
  TagLocation("#minecraft:trimmable_armor");
export const SMITHING_TRIM_MATERIAL_TAG: RecipeItemTag =
  TagLocation("#minecraft:trim_materials");

export type SmithingRecipeOptions = {
  readonly priority?: RecipePriorityValue;
  readonly showNotification?: boolean;
  readonly tags?: ReadonlyArray<RecipeStationTag>;
};

export type SmithingTransformRecipe = {
  readonly _tag: "SmithingTransform";
  readonly id: RecipeId;
  readonly template: CraftingIngredient;
  readonly base: CraftingIngredient;
  readonly addition: CraftingIngredient;
  readonly output: ItemStack;
  readonly priority: RecipePriorityValue;
  readonly showNotification?: boolean;
  readonly tags: ReadonlyArray<RecipeStationTag>;
};

export type SmithingTrimRecipe = {
  readonly _tag: "SmithingTrim";
  readonly id: RecipeId;
  readonly template: CraftingIngredient;
  readonly base: CraftingIngredient;
  readonly addition: CraftingIngredient;
  readonly priority: RecipePriorityValue;
  readonly showNotification?: boolean;
  readonly tags: ReadonlyArray<RecipeStationTag>;
};

export type SmithingRecipe = SmithingTransformRecipe | SmithingTrimRecipe;
export type SmithingRecipeTable = ReadonlyArray<SmithingRecipe>;

export type SmithingInput = {
  readonly template: Slot;
  readonly base: Slot;
  readonly addition: Slot;
};

export type SmithingInputInput = Partial<SmithingInput>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const assertStationTag = (tag: unknown): RecipeStationTag => {
  if (typeof tag !== "string" || !RecipeStationTag.is(tag)) {
    throw new TypeError("Smithing recipe station tags must be resource locations");
  }
  return RecipeStationTag(tag);
};

const normalizeOptions = (
  options: unknown,
): Pick<SmithingTransformRecipe, "priority" | "showNotification" | "tags"> => {
  if (options !== undefined && !isRecord(options)) {
    throw new TypeError("Smithing recipe options must be an object");
  }
  const record = options === undefined ? undefined : options;
  const priority = record?.["priority"] ?? 0;
  if (
    typeof priority !== "number" ||
    !Number.isSafeInteger(priority) ||
    priority < 0
  ) {
    throw new RangeError(
      `Smithing recipe priority must be a non-negative safe integer, received ${priority}`,
    );
  }
  const tags = record?.["tags"] ?? [];
  if (!Array.isArray(tags)) {
    throw new TypeError("Smithing recipe station tags must be an array");
  }
  const showNotification = record?.["showNotification"];
  if (showNotification !== undefined && typeof showNotification !== "boolean") {
    throw new TypeError("Smithing recipe show notification must be a boolean");
  }
  return {
    priority: RecipePriority(priority),
    ...(showNotification === undefined ? {} : { showNotification }),
    tags: tags.map(assertStationTag),
  };
};

const assertRecipeId = (id: unknown): RecipeId => {
  if (typeof id !== "string" || !RecipeId.is(id)) {
    throw new TypeError("Smithing recipe id must be a resource location");
  }
  return RecipeId(id);
};

const normalizeIngredient = (
  value: unknown,
  field: string,
): CraftingIngredient => {
  if (!isCraftingIngredientInput(value)) {
    throw new TypeError(`${field} has an invalid ingredient shape`);
  }
  return craftingIngredient(value);
};

export function smithingTransformRecipe(
  id: RecipeId,
  template: CraftingIngredientInput,
  base: CraftingIngredientInput,
  addition: CraftingIngredientInput,
  output: ItemStack,
  options?: SmithingRecipeOptions,
): SmithingTransformRecipe;
export function smithingTransformRecipe(
  id: RecipeId,
  template: CraftingIngredientInput,
  base: CraftingIngredientInput,
  addition: CraftingIngredientInput,
  output: ItemStack,
  options?: SmithingRecipeOptions,
): SmithingTransformRecipe {
  if (!isItemStack(output)) {
    throw new TypeError("Smithing transform output must be an ItemStack");
  }
  return {
    _tag: "SmithingTransform",
    id: assertRecipeId(id),
    template: normalizeIngredient(template, "Smithing template"),
    base: normalizeIngredient(base, "Smithing base"),
    addition: normalizeIngredient(addition, "Smithing addition"),
    output,
    ...normalizeOptions(options),
  };
}

export function smithingTrimRecipe(
  id: RecipeId,
  template: CraftingIngredientInput,
  base: CraftingIngredientInput,
  addition: CraftingIngredientInput,
  options?: SmithingRecipeOptions,
): SmithingTrimRecipe;
export function smithingTrimRecipe(
  id: RecipeId,
  template: CraftingIngredientInput,
  base: CraftingIngredientInput,
  addition: CraftingIngredientInput,
  options?: SmithingRecipeOptions,
): SmithingTrimRecipe {
  return {
    _tag: "SmithingTrim",
    id: assertRecipeId(id),
    template: normalizeIngredient(template, "Smithing template"),
    base: normalizeIngredient(base, "Smithing base"),
    addition: normalizeIngredient(addition, "Smithing addition"),
    ...normalizeOptions(options),
  };
}

const netheriteTransform = (
  base: ItemType,
  output: ItemType,
): SmithingTransformRecipe =>
  smithingTransformRecipe(
    RecipeId(`minecraft:netherite_${output}`),
    exactly("netherite_upgrade_smithing_template"),
    exactly(base),
    exactly("netherite_ingot"),
    itemStack(output, StackCount(1)),
    { tags: [SMITHING_STATION_TAG] },
  );

export const VANILLA_SMITHING_RECIPES: SmithingRecipeTable = [
  netheriteTransform("diamond_sword", "netherite_sword"),
  netheriteTransform("diamond_pickaxe", "netherite_pickaxe"),
  netheriteTransform("diamond_axe", "netherite_axe"),
  netheriteTransform("diamond_shovel", "netherite_shovel"),
  netheriteTransform("diamond_hoe", "netherite_hoe"),
  netheriteTransform("diamond_helmet", "netherite_helmet"),
  netheriteTransform("diamond_chestplate", "netherite_chestplate"),
  netheriteTransform("diamond_leggings", "netherite_leggings"),
  netheriteTransform("diamond_boots", "netherite_boots"),
  smithingTrimRecipe(
    RecipeId("minecraft:trim"),
    tagged(SMITHING_TRIM_TEMPLATE_TAG),
    tagged(SMITHING_TRIMMABLE_ARMOR_TAG),
    tagged(SMITHING_TRIM_MATERIAL_TAG),
    { tags: [SMITHING_STATION_TAG] },
  ),
];
