import { Result } from "effect";
import {
  craftingIngredient,
  isRecipeItemTag,
  RecipeIngredientCount,
  RecipeId,
  RecipePriority,
  RecipeStationTag,
  type CraftingIngredient,
  type CraftingIngredientInput,
  type IngredientInput,
  type RecipePriority as RecipePriorityValue,
  type RecipeStationTag as RecipeStationTagValue,
} from "./recipe-data.js";
import { isItemStack, type ItemStack } from "../item/item-stack.js";
import { itemStackForCanonicalItem } from "../item/item-stack-canonical.js";
import { isItemType, type ItemType } from "../item/item-type.js";
import { StackCount } from "../time/quantities.js";
import {
  recipeRangeFailure,
  recipeTypeFailure,
  type RecipeFailure,
} from "./recipe-error.js";

const recipeTypeFailureValue = (message: string): RecipeFailure => ({
  _tag: "RecipeTypeFailure",
  name: "TypeError",
  message,
});

const recipeRangeFailureValue = (message: string): RecipeFailure => ({
  _tag: "RecipeRangeFailure",
  name: "RangeError",
  message,
});

export const STONECUTTING_STATION_TAG: RecipeStationTagValue =
  RecipeStationTag("stonecutter");

export type StonecuttingRecipeOptions = {
  readonly priority?: RecipePriorityValue;
  readonly showNotification?: boolean;
};

export type StonecuttingRecipe = {
  readonly _tag: "Stonecutting";
  readonly id: RecipeId;
  readonly ingredient: CraftingIngredient;
  readonly output: ItemStack;
  readonly priority: RecipePriorityValue;
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

const assertRecipeId = (
  id: unknown,
): Result.Result<RecipeId, RecipeFailure> =>
  typeof id === "string"
    ? Result.mapError(
        RecipeId.result(id),
        () => recipeTypeFailureValue("Stonecutting recipe id must be a resource location"),
      )
    : recipeTypeFailure("Stonecutting recipe id must be a resource location");

const assertPriority = (
  value: unknown,
): Result.Result<RecipePriorityValue, RecipeFailure> => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    return recipeRangeFailure(
      `Stonecutting recipe priority must be a non-negative safe integer, received ${String(value)}`,
    );
  }
  return Result.mapError(
    RecipePriority.result(value),
    () => recipeRangeFailureValue(
      `Stonecutting recipe priority must be a non-negative safe integer, received ${String(value)}`,
    ),
  );
};

const isUncheckedIngredientInput = (
  value: unknown,
): value is IngredientInput => {
  if (typeof value === "string") {
    return isItemType(value) || isRecipeItemTag(value);
  }
  if (
    !isRecord(value) ||
    typeof value.count !== "number" ||
    !RecipeIngredientCount.is(value.count)
  ) {
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
    typeof value.count === "number" &&
    RecipeIngredientCount.is(value.count)
  ) {
    return (
      value.options.length > 0 &&
      value.options.every(isUncheckedIngredientInput)
    );
  }
  return isUncheckedIngredientInput(value);
};

const normalizeIngredient = (
  value: unknown,
): Result.Result<CraftingIngredient, RecipeFailure> => {
  if (!isUncheckedCraftingIngredientInput(value)) {
    return recipeTypeFailure("Stonecutting ingredient has an invalid shape");
  }
  return craftingIngredient(value);
};

const normalizeOptions = (
  options: unknown,
): Result.Result<
  Pick<StonecuttingRecipe, "priority" | "showNotification">,
  RecipeFailure
> =>
  Result.gen(function* () {
    if (options === undefined) {
      return {
        priority: yield* Result.mapError(
          RecipePriority.result(0),
          () => recipeRangeFailureValue(
            "Stonecutting recipe priority must be a non-negative safe integer, received 0",
          ),
        ),
      };
    }
    if (!isRecord(options)) {
      return yield* recipeTypeFailure("Stonecutting recipe options must be an object");
    }
    const showNotification = options.showNotification;
    if (showNotification !== undefined && typeof showNotification !== "boolean") {
      return yield* recipeTypeFailure(
        "Stonecutting recipe show notification must be a boolean",
      );
    }
    return {
      priority: yield* assertPriority(options.priority ?? 0),
      ...(showNotification === undefined ? {} : { showNotification }),
    };
  });

export const stonecuttingRecipe = (
  id: RecipeId,
  ingredient: CraftingIngredientInput,
  output: ItemStack,
  options?: StonecuttingRecipeOptions,
): Result.Result<StonecuttingRecipe, RecipeFailure> =>
  Result.gen(function* () {
    if (!isItemStack(output)) {
      return yield* recipeTypeFailure("Stonecutting recipe output must be an ItemStack");
    }
    return {
      _tag: "Stonecutting",
      id: yield* assertRecipeId(id),
      ingredient: yield* normalizeIngredient(ingredient),
      output,
      ...(yield* normalizeOptions(options)),
    };
  });

const vanillaStonecuttingRecipe = (
  id: string,
  ingredient: ItemType,
  output: ItemType,
  count: number,
): StonecuttingRecipe => ({
  _tag: "Stonecutting",
  id: RecipeId(id),
  ingredient: { _tag: "Exact", item: ingredient, count: RecipeIngredientCount(1) },
  output: itemStackForCanonicalItem(output, StackCount(count)),
  priority: RecipePriority(0),
});

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
