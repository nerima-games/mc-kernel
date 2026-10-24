import { Result } from "effect";
import { isItemStack } from "../item/item-stack.js";
import { itemStackForCanonicalItem } from "../item/item-stack-canonical.js";
import type { ItemStack, Slot } from "../item/item-stack.js";
import type { ItemType } from "../item/item-type.js";
import { StackCount } from "../time/quantities.js";
import { TagLocation } from "../text/identifiers.js";
import {
  craftingIngredient,
  isCraftingIngredientInput,
  RecipeId,
  RecipeIngredientCount,
  RecipePriority,
  RecipeStationTag,
  type CraftingIngredient,
  type CraftingIngredientInput,
  type RecipeItemTag,
  type RecipePriority as RecipePriorityValue,
} from "./recipe-data.js";
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

const assertStationTag = (
  tag: unknown,
): Result.Result<RecipeStationTag, RecipeFailure> =>
  typeof tag === "string"
    ? Result.mapError(
        RecipeStationTag.result(tag),
        () => recipeTypeFailureValue("Smithing recipe station tags must be resource locations"),
      )
    : recipeTypeFailure("Smithing recipe station tags must be resource locations");

const normalizeOptions = (
  options: unknown,
): Result.Result<
  Pick<SmithingTransformRecipe, "priority" | "showNotification" | "tags">,
  RecipeFailure
> =>
  Result.gen(function* () {
    if (options !== undefined && !isRecord(options)) {
      return yield* recipeTypeFailure("Smithing recipe options must be an object");
    }
    const record = options === undefined ? undefined : options;
    const priority = record?.["priority"] ?? 0;
    if (
      typeof priority !== "number" ||
      !Number.isSafeInteger(priority) ||
      priority < 0
    ) {
      return yield* recipeRangeFailure(
        `Smithing recipe priority must be a non-negative safe integer, received ${String(priority)}`,
      );
    }
    const tags = record?.["tags"] ?? [];
    if (!Array.isArray(tags)) {
      return yield* recipeTypeFailure("Smithing recipe station tags must be an array");
    }
    const showNotification = record?.["showNotification"];
    if (showNotification !== undefined && typeof showNotification !== "boolean") {
      return yield* recipeTypeFailure(
        "Smithing recipe show notification must be a boolean",
      );
    }
    const brandedPriority = RecipePriority(priority);
    return {
      priority: brandedPriority,
      ...(showNotification === undefined ? {} : { showNotification }),
      tags: yield* Result.all(tags.map(assertStationTag)),
    };
  });

const assertRecipeId = (
  id: unknown,
): Result.Result<RecipeId, RecipeFailure> =>
  typeof id === "string"
    ? Result.mapError(
        RecipeId.result(id),
        () => recipeTypeFailureValue("Smithing recipe id must be a resource location"),
      )
    : recipeTypeFailure("Smithing recipe id must be a resource location");

const normalizeIngredient = (
  value: unknown,
  field: string,
): Result.Result<CraftingIngredient, RecipeFailure> => {
  if (!isCraftingIngredientInput(value)) {
    return recipeTypeFailure(`${field} has an invalid ingredient shape`);
  }
  return craftingIngredient(value);
};

export const smithingTransformRecipe = (
  id: RecipeId,
  template: CraftingIngredientInput,
  base: CraftingIngredientInput,
  addition: CraftingIngredientInput,
  output: ItemStack,
  options?: SmithingRecipeOptions,
): Result.Result<SmithingTransformRecipe, RecipeFailure> =>
  Result.gen(function* () {
    if (!isItemStack(output)) {
      return yield* recipeTypeFailure("Smithing transform output must be an ItemStack");
    }
    return {
      _tag: "SmithingTransform",
      id: yield* assertRecipeId(id),
      template: yield* normalizeIngredient(template, "Smithing template"),
      base: yield* normalizeIngredient(base, "Smithing base"),
      addition: yield* normalizeIngredient(addition, "Smithing addition"),
      output,
      ...(yield* normalizeOptions(options)),
    };
  });

export const smithingTrimRecipe = (
  id: RecipeId,
  template: CraftingIngredientInput,
  base: CraftingIngredientInput,
  addition: CraftingIngredientInput,
  options?: SmithingRecipeOptions,
): Result.Result<SmithingTrimRecipe, RecipeFailure> =>
  Result.gen(function* () {
    return {
      _tag: "SmithingTrim",
      id: yield* assertRecipeId(id),
      template: yield* normalizeIngredient(template, "Smithing template"),
      base: yield* normalizeIngredient(base, "Smithing base"),
      addition: yield* normalizeIngredient(addition, "Smithing addition"),
      ...(yield* normalizeOptions(options)),
    };
  });

const netheriteTransform = (
  base: ItemType,
  output: ItemType,
): SmithingTransformRecipe => ({
  _tag: "SmithingTransform",
  id: RecipeId(`minecraft:netherite_${output}`),
  template: { _tag: "Exact", item: "netherite_upgrade_smithing_template", count: RecipeIngredientCount(1) },
  base: { _tag: "Exact", item: base, count: RecipeIngredientCount(1) },
  addition: { _tag: "Exact", item: "netherite_ingot", count: RecipeIngredientCount(1) },
  output: itemStackForCanonicalItem(output, StackCount(1)),
  priority: RecipePriority(0),
  tags: [SMITHING_STATION_TAG],
});

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
  {
    _tag: "SmithingTrim",
    id: RecipeId("minecraft:trim"),
    template: { _tag: "ItemTag", tag: SMITHING_TRIM_TEMPLATE_TAG, count: RecipeIngredientCount(1) },
    base: { _tag: "ItemTag", tag: SMITHING_TRIMMABLE_ARMOR_TAG, count: RecipeIngredientCount(1) },
    addition: { _tag: "ItemTag", tag: SMITHING_TRIM_MATERIAL_TAG, count: RecipeIngredientCount(1) },
    priority: RecipePriority(0),
    tags: [SMITHING_STATION_TAG],
  },
];
