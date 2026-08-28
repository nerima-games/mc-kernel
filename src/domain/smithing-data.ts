import { isItemStack, itemStack } from "./item-stack.js";
import type { ItemStack, Slot } from "./item-stack.js";
import {
  craftingIngredient,
  exactly,
  isCraftingIngredientInput,
  tagged,
  type CraftingIngredient,
  type CraftingIngredientInput,
  type RecipeItemTag,
  type RecipeStationTag,
} from "./recipe-data.js";
import type { ItemType } from "./item-type.js";

export const SMITHING_STATION_TAG: RecipeStationTag = "smithing_table";
export const SMITHING_TRIM_TEMPLATE_TAG: RecipeItemTag =
  "#minecraft:trim_templates";
export const SMITHING_TRIMMABLE_ARMOR_TAG: RecipeItemTag =
  "#minecraft:trimmable_armor";
export const SMITHING_TRIM_MATERIAL_TAG: RecipeItemTag =
  "#minecraft:trim_materials";

export type SmithingRecipeOptions = {
  readonly priority?: number;
  readonly showNotification?: boolean;
  readonly tags?: ReadonlyArray<RecipeStationTag>;
};

export type SmithingTransformRecipe = {
  readonly _tag: "SmithingTransform";
  readonly id: string;
  readonly template: CraftingIngredient;
  readonly base: CraftingIngredient;
  readonly addition: CraftingIngredient;
  readonly output: ItemStack;
  readonly priority: number;
  readonly showNotification?: boolean;
  readonly tags: ReadonlyArray<RecipeStationTag>;
};

export type SmithingTrimRecipe = {
  readonly _tag: "SmithingTrim";
  readonly id: string;
  readonly template: CraftingIngredient;
  readonly base: CraftingIngredient;
  readonly addition: CraftingIngredient;
  readonly priority: number;
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
  if (typeof tag !== "string" || tag.trim().length === 0) {
    throw new TypeError(
      "Smithing recipe station tags must be non-empty strings",
    );
  }
  return tag;
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
    priority,
    ...(showNotification === undefined ? {} : { showNotification }),
    tags: tags.map(assertStationTag),
  };
};

const assertRecipeId = (id: unknown): string => {
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new TypeError("Smithing recipe id must be a non-empty string");
  }
  return id;
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
  id: string,
  template: CraftingIngredientInput,
  base: CraftingIngredientInput,
  addition: CraftingIngredientInput,
  output: ItemStack,
  options?: SmithingRecipeOptions,
): SmithingTransformRecipe;
export function smithingTransformRecipe(
  id: string,
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
  id: string,
  template: CraftingIngredientInput,
  base: CraftingIngredientInput,
  addition: CraftingIngredientInput,
  options?: SmithingRecipeOptions,
): SmithingTrimRecipe;
export function smithingTrimRecipe(
  id: string,
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
    `minecraft:netherite_${output}`,
    exactly("netherite_upgrade_smithing_template"),
    exactly(base),
    exactly("netherite_ingot"),
    itemStack(output, 1),
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
    "minecraft:trim",
    tagged(SMITHING_TRIM_TEMPLATE_TAG),
    tagged(SMITHING_TRIMMABLE_ARMOR_TAG),
    tagged(SMITHING_TRIM_MATERIAL_TAG),
    { tags: [SMITHING_STATION_TAG] },
  ),
];
