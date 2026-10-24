import { Result } from "effect";
import {
  isItemStack,
  itemStack,
  maxStackCountForItem,
  type ItemStack,
  type Slot,
} from "../item/item-stack.js";
import { PositiveTickCount, StackCount } from "../time/quantities.js";
import { isItemType, type ItemType } from "../item/item-type.js";
import {
  craftingIngredient,
  isCraftingIngredient,
  RecipeId,
  RecipeGroup,
  RecipeExperience,
  RecipePriority,
  type CraftingIngredient,
  type CraftingIngredientInput,
  type RecipeCategory,
  type RecipeGroup as RecipeGroupValue,
  type RecipeExperience as RecipeExperienceValue,
  type RecipePriority as RecipePriorityValue,
} from "./recipe-data.js";
import {
  recipeRangeFailure,
  recipeItemFailure,
  recipeTypeFailure,
  type RecipeFailure,
} from "./recipe-error.js";

export const COOKING_STATIONS = [
  "furnace",
  "blast_furnace",
  "smoker",
  "campfire",
] as const;

export type CookingStation = (typeof COOKING_STATIONS)[number];

export type CookingRecipeOptions = {
  readonly category?: RecipeCategory;
  readonly group?: RecipeGroupValue;
  readonly priority?: RecipePriorityValue;
  readonly showNotification?: boolean;
};

export type CookingRecipe = {
  readonly _tag: "Cooking";
  readonly id: RecipeId;
  readonly station: CookingStation;
  readonly ingredient: CraftingIngredient;
  readonly output: ItemStack;
  readonly cookTimeTicks: PositiveTickCount;
  readonly experience: RecipeExperienceValue;
  readonly category?: RecipeCategory;
  readonly group?: RecipeGroupValue;
  readonly priority: RecipePriorityValue;
  readonly showNotification?: boolean;
};

export type CookingRecipeTable = ReadonlyArray<CookingRecipe>;

type RecordValue = {
  readonly _tag?: unknown;
  readonly id?: unknown;
  readonly station?: unknown;
  readonly ingredient?: unknown;
  readonly output?: unknown;
  readonly cookTimeTicks?: unknown;
  readonly experience?: unknown;
  readonly category?: unknown;
  readonly group?: unknown;
  readonly priority?: unknown;
  readonly showNotification?: unknown;
};

const isRecord = (value: unknown): value is RecordValue =>
  (() => {
    try {
      return typeof value === "object" && value !== null && !Array.isArray(value);
    } catch {
      return false;
    }
  })();

const snapshotRecord = (
  value: unknown,
  fields: ReadonlyArray<keyof RecordValue>,
): RecordValue | undefined => {
  try {
    if (!isRecord(value)) {
      return undefined;
    }
    const snapshot: Record<string, unknown> = {};
    for (const field of fields) {
      snapshot[field] = Reflect.get(value, field);
    }
    return snapshot;
  } catch {
    return undefined;
  }
};

const isCookingStation = (value: unknown): value is CookingStation =>
  COOKING_STATIONS.some((station) => station === value);

const isRecipeCategory = (value: unknown): value is RecipeCategory =>
  value === "building" ||
  value === "equipment" ||
  value === "misc" ||
  value === "redstone";

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

const assertRecipeId = (
  value: unknown,
): Result.Result<RecipeId, RecipeFailure> => {
  if (typeof value !== "string") {
    return recipeTypeFailure("Cooking recipe id must be a resource location");
  }
  return Result.mapError(RecipeId.result(value), () =>
    recipeTypeFailureValue("Cooking recipe id must be a resource location"),
  );
}

const assertStation = (
  value: unknown,
): Result.Result<CookingStation, RecipeFailure> =>
  isCookingStation(value)
    ? Result.succeed(value)
    : recipeTypeFailure(
        typeof value === "string" ? `Unknown cooking station: ${value}` : "Unknown cooking station",
      );

const assertIngredient = (
  value: unknown,
): Result.Result<CraftingIngredient, RecipeFailure> => {
  const normalized = craftingIngredient(value);
  return Result.isFailure(normalized)
    ? recipeTypeFailure("Cooking recipe ingredient has an invalid shape")
    : normalized;
};

const assertOutput = (
  value: unknown,
): Result.Result<ItemStack, RecipeFailure> =>
  isItemStack(value)
    ? Result.succeed(value)
    : recipeTypeFailure("Cooking recipe output must be an ItemStack");

const assertCookTimeTicks = (
  value: unknown,
): Result.Result<PositiveTickCount, RecipeFailure> => {
  if (typeof value !== "number") {
    return recipeRangeFailure(
      `Cooking time must be a positive safe integer, received ${String(value)}`,
    );
  }
  return Result.mapError(
    PositiveTickCount.result(value),
    () =>
      recipeRangeFailureValue(
        `Cooking time must be a positive safe integer, received ${String(value)}`,
      ),
  );
}

const assertExperience = (
  value: unknown,
): Result.Result<RecipeExperienceValue, RecipeFailure> => {
  if (typeof value !== "number") {
    return recipeRangeFailure(
      `Cooking experience must be a finite non-negative number, received ${String(value)}`,
    );
  }
  return Result.mapError(
    RecipeExperience.result(value),
    () =>
      recipeRangeFailureValue(
        `Cooking experience must be a finite non-negative number, received ${String(value)}`,
      ),
  );
}

const normalizeOptions = (
  options: unknown,
): Result.Result<
  Pick<CookingRecipe, "category" | "group" | "priority" | "showNotification">,
  RecipeFailure
> =>
  Result.gen(function* () {
    if (options === undefined) {
      return { priority: RecipePriority(0) };
    }
    const record = snapshotRecord(options, [
      "category",
      "group",
      "priority",
      "showNotification",
    ]);
    if (record === undefined) {
      return yield* recipeTypeFailure("Cooking recipe options must be an object");
    }
    const category = record.category;
    if (category !== undefined && !isRecipeCategory(category)) {
      return yield* recipeTypeFailure(
        typeof category === "string"
          ? `Cooking recipe category is invalid: ${category}`
          : "Cooking recipe category is invalid",
      );
    }
    const group = record.group;
    if (group !== undefined && typeof group !== "string") {
      return yield* recipeTypeFailure("Cooking recipe group must be a string");
    }
    const normalizedGroup =
      group === undefined
        ? undefined
        : yield* Result.mapError(
            RecipeGroup.result(group),
            () => recipeTypeFailureValue("Cooking recipe group must be a string"),
          );
    const priorityValue = record.priority ?? 0;
    if (typeof priorityValue !== "number") {
      return yield* recipeRangeFailure(
        typeof priorityValue === "string"
          ? `Cooking recipe priority must be a non-negative safe integer, received ${priorityValue}`
          : "Cooking recipe priority must be a non-negative safe integer",
      );
    }
    const priorityMessage =
      `Cooking recipe priority must be a non-negative safe integer, received ${priorityValue}`;
    if (!Number.isSafeInteger(priorityValue) || priorityValue < 0) {
      return yield* recipeRangeFailure(priorityMessage);
    }
    const priority = yield* Result.mapError(
      RecipePriority.result(priorityValue),
      () => recipeRangeFailureValue(priorityMessage),
    );
    const showNotification = record.showNotification;
    if (showNotification !== undefined && typeof showNotification !== "boolean") {
      return yield* recipeTypeFailure(
        "Cooking recipe show notification must be a boolean",
      );
    }
    return {
      ...(category === undefined ? {} : { category }),
      ...(normalizedGroup === undefined ? {} : { group: normalizedGroup }),
      priority,
      ...(showNotification === undefined ? {} : { showNotification }),
    };
  });

export const cookingRecipe = (
  id: RecipeId,
  station: CookingStation,
  ingredient: CraftingIngredientInput,
  output: ItemStack,
  cookTimeTicks: PositiveTickCount,
  experience: RecipeExperienceValue,
  options?: CookingRecipeOptions,
): Result.Result<CookingRecipe, RecipeFailure> =>
  Result.gen(function* () {
    return {
      _tag: "Cooking",
      id: yield* assertRecipeId(id),
      station: yield* assertStation(station),
      ingredient: yield* assertIngredient(ingredient),
      output: yield* assertOutput(output),
      cookTimeTicks: yield* assertCookTimeTicks(cookTimeTicks),
      experience: yield* assertExperience(experience),
      ...(yield* normalizeOptions(options)),
    };
  });

const hasCookingIdentity = (value: RecordValue): boolean =>
  value._tag === "Cooking" &&
  typeof value.id === "string" &&
  RecipeId.is(value.id) &&
  isCookingStation(value.station) &&
  isCraftingIngredient(value.ingredient) &&
  isItemStack(value.output);

const hasCookingQuantities = (value: RecordValue): boolean =>
  typeof value.cookTimeTicks === "number" &&
  PositiveTickCount.is(value.cookTimeTicks) &&
  typeof value.experience === "number" &&
  RecipeExperience.is(value.experience) &&
  typeof value.priority === "number" &&
  RecipePriority.is(value.priority);

const hasCookingMetadata = (value: RecordValue): boolean =>
  (value.category === undefined || isRecipeCategory(value.category)) &&
  (value.group === undefined ||
    (typeof value.group === "string" && RecipeGroup.is(value.group))) &&
  (value.showNotification === undefined ||
    typeof value.showNotification === "boolean");

export const isCookingRecipe = (value: unknown): value is CookingRecipe =>
  (() => {
    const snapshot = snapshotRecord(value, [
      "_tag",
      "id",
      "station",
      "ingredient",
      "output",
      "cookTimeTicks",
      "experience",
      "category",
      "group",
      "priority",
      "showNotification",
    ]);
    return (
      snapshot !== undefined &&
      hasCookingIdentity(snapshot) &&
      hasCookingQuantities(snapshot) &&
      hasCookingMetadata(snapshot)
    );
  })();

export const cookingRecipeForItem = (
  id: RecipeId,
  station: CookingStation,
  ingredient: CraftingIngredientInput,
  output: ItemType,
  count: StackCount,
  cookTimeTicks: PositiveTickCount,
  experience: RecipeExperienceValue,
  options?: CookingRecipeOptions,
): Result.Result<CookingRecipe, RecipeFailure> =>
  Result.gen(function* () {
    if (!isItemType(output)) {
      return yield* recipeTypeFailure(`Unknown item type: ${String(output)}`);
    }
    if (
      !Number.isSafeInteger(count) ||
      count < 1 ||
      count > maxStackCountForItem(output)
    ) {
      return yield* recipeRangeFailure(
        `Item stack count for ${output} must be an integer in [1, ${maxStackCountForItem(output)}], received ${String(count)}`,
      );
    }
    const outputStack = yield* Result.mapError(
      itemStack(output, count),
      recipeItemFailure,
    );
    return yield* cookingRecipe(
      id,
      station,
      ingredient,
      outputStack,
      cookTimeTicks,
      experience,
      options,
    );
  });

export type CookingInput = Slot;
