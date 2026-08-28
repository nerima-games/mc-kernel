import {
  craftingIngredient,
  isRecipeItemTag,
  type CraftingIngredient,
  type CraftingIngredientInput,
  type IngredientInput,
  type RecipeId,
} from "./recipe-data.js";
import { isItemStack, itemStack, type ItemStack } from "./item-stack.js";
import { isItemType, type ItemType } from "./item-type.js";

export const STONECUTTING_STATION_TAG = "stonecutter";

export type StonecuttingRecipeOptions = {
  readonly priority?: number;
  readonly showNotification?: boolean;
};

export type StonecuttingRecipe = {
  readonly _tag: "Stonecutting";
  readonly id: RecipeId;
  readonly ingredient: CraftingIngredient;
  readonly output: ItemStack;
  readonly priority: number;
  readonly showNotification?: boolean;
};

export type StonecuttingRecipeTable = ReadonlyArray<StonecuttingRecipe>;

type RecordValue = {
  readonly _tag?: unknown;
  readonly item?: unknown;
  readonly tag?: unknown;
  readonly count?: unknown;
  readonly options?: unknown;
  readonly priority?: unknown;
  readonly showNotification?: unknown;
};

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const assertRecipeId = (id: unknown): RecipeId => {
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new TypeError("Stonecutting recipe id must be a non-empty string");
  }
  return id;
};

const assertPriority = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(
      `Stonecutting recipe priority must be a non-negative safe integer, received ${String(value)}`,
    );
  }
  return value;
};

const isUncheckedIngredientInput = (
  value: unknown,
): value is IngredientInput => {
  if (typeof value === "string") {
    return isItemType(value) || isRecipeItemTag(value);
  }
  if (!isRecord(value) || typeof value.count !== "number") {
    return false;
  }
  if (value._tag === "Exact") {
    return isItemType(value.item);
  }
  return value._tag === "ItemTag" && isRecipeItemTag(value.tag);
};

const isUncheckedCraftingIngredientInput = (
  value: unknown,
): value is CraftingIngredientInput => {
  if (Array.isArray(value)) {
    return value.length > 0 && value.every(isUncheckedIngredientInput);
  }
  if (
    isRecord(value) &&
    value._tag === "AnyOf" &&
    Array.isArray(value.options) &&
    typeof value.count === "number"
  ) {
    return (
      value.options.length > 0 &&
      value.options.every(isUncheckedIngredientInput)
    );
  }
  return isUncheckedIngredientInput(value);
};

const normalizeIngredient = (value: unknown): CraftingIngredient => {
  if (!isUncheckedCraftingIngredientInput(value)) {
    throw new TypeError("Stonecutting ingredient has an invalid shape");
  }
  return craftingIngredient(value);
};

const normalizeOptions = (
  options: unknown,
): Pick<StonecuttingRecipe, "priority" | "showNotification"> => {
  if (options === undefined) {
    return { priority: 0 };
  }
  if (!isRecord(options)) {
    throw new TypeError("Stonecutting recipe options must be an object");
  }
  const showNotification = options.showNotification;
  if (showNotification !== undefined && typeof showNotification !== "boolean") {
    throw new TypeError(
      "Stonecutting recipe show notification must be a boolean",
    );
  }
  return {
    priority: assertPriority(options.priority ?? 0),
    ...(showNotification === undefined ? {} : { showNotification }),
  };
};

export function stonecuttingRecipe(
  id: RecipeId,
  ingredient: CraftingIngredientInput,
  output: ItemStack,
  options?: StonecuttingRecipeOptions,
): StonecuttingRecipe;
export function stonecuttingRecipe(
  id: RecipeId,
  ingredient: CraftingIngredientInput,
  output: ItemStack,
  options?: StonecuttingRecipeOptions,
): StonecuttingRecipe {
  const normalizedOutput = output;
  if (!isItemStack(normalizedOutput)) {
    throw new TypeError("Stonecutting recipe output must be an ItemStack");
  }
  return {
    _tag: "Stonecutting",
    id: assertRecipeId(id),
    ingredient: normalizeIngredient(ingredient),
    output: normalizedOutput,
    ...normalizeOptions(options),
  };
}

const vanillaStonecuttingRecipe = (
  id: string,
  ingredient: ItemType,
  output: ItemType,
  count: number,
): StonecuttingRecipe =>
  stonecuttingRecipe(id, ingredient, itemStack(output, count));

export const VANILLA_STONECUTTING_RECIPES: StonecuttingRecipeTable = [
  vanillaStonecuttingRecipe(
    "minecraft:end_stone_bricks_from_end_stone",
    "end_stone",
    "end_stone_bricks",
    1,
  ),
  vanillaStonecuttingRecipe(
    "minecraft:purpur_pillar_from_purpur_block",
    "purpur_block",
    "purpur_pillar",
    1,
  ),
  vanillaStonecuttingRecipe(
    "minecraft:purpur_slab_from_purpur_block",
    "purpur_block",
    "purpur_slab",
    2,
  ),
  vanillaStonecuttingRecipe(
    "minecraft:purpur_stairs_from_purpur_block",
    "purpur_block",
    "purpur_stairs",
    1,
  ),
  vanillaStonecuttingRecipe(
    "minecraft:stone_slab_from_stone",
    "stone",
    "stone_slab",
    2,
  ),
];
