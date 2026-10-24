import { Brand, Result } from "effect";
import {
  isItemStack,
  itemStack,
  maxStackCountForItem,
  maxStackCountForStack,
  type ItemStack,
} from "../item/item-stack.js";
import { isItemType, type ItemType } from "../item/item-type.js";
import { StackCount } from "../time/quantities.js";
import {
  craftingIngredient,
  isCraftingIngredient,
  RecipeId,
  RecipeGroup,
  RecipePriority,
  type CraftingIngredient,
  type CraftingIngredientInput,
  type RecipeCategory,
  type RecipeGroup as RecipeGroupValue,
  type RecipeId as RecipeIdValue,
  type RecipePriority as RecipePriorityValue,
} from "./recipe-data.js";
import {
  recipeRangeFailure,
  recipeItemFailure,
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

export const TRANSMUTE_MAX_MATERIAL_SLOTS = 8;

export type TransmuteMaterialSlotCount = number &
  Brand.Brand<"TransmuteMaterialSlotCount">;

export const TransmuteMaterialSlotCount: Brand.Constructor<TransmuteMaterialSlotCount> =
  Brand.make<TransmuteMaterialSlotCount>((value) =>
    Number.isSafeInteger(value) && value >= 1 && value <= TRANSMUTE_MAX_MATERIAL_SLOTS
      ? true
      : `TransmuteMaterialSlotCount must be an integer in [1, ${TRANSMUTE_MAX_MATERIAL_SLOTS}], received ${value}`,
  );

export type TransmuteMaterialCount = Readonly<{
  readonly min: TransmuteMaterialSlotCount;
  readonly max: TransmuteMaterialSlotCount;
}>;

export type TransmuteRecipeOptions = Readonly<{
  readonly addMaterialCountToResult?: boolean;
  readonly category?: RecipeCategory;
  readonly group?: RecipeGroupValue;
  readonly materialCount?: TransmuteMaterialCount;
  readonly priority?: RecipePriorityValue;
  readonly showNotification?: boolean;
}>;

export type TransmuteRecipe = {
  readonly _tag: "Transmute";
  readonly id: RecipeIdValue;
  readonly source: CraftingIngredient;
  readonly material: CraftingIngredient;
  readonly output: ItemStack;
  readonly materialCount: TransmuteMaterialCount;
  readonly addMaterialCountToResult: boolean;
  readonly category?: RecipeCategory;
  readonly group?: RecipeGroupValue;
  readonly priority: RecipePriorityValue;
  readonly showNotification?: boolean;
};

export type TransmuteRecipeTable = ReadonlyArray<TransmuteRecipe>;

type RecordValue = {
  readonly _tag?: unknown;
  readonly id?: unknown;
  readonly source?: unknown;
  readonly material?: unknown;
  readonly output?: unknown;
  readonly materialCount?: unknown;
  readonly min?: unknown;
  readonly max?: unknown;
  readonly addMaterialCountToResult?: unknown;
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

const isRecipeCategory = (value: unknown): value is RecipeCategory =>
  value === "building" ||
  value === "equipment" ||
  value === "misc" ||
  value === "redstone";

const assertRecipeId = (
  id: unknown,
): Result.Result<RecipeId, RecipeFailure> =>
  typeof id === "string"
    ? Result.mapError(
        RecipeId.result(id),
        () => recipeTypeFailureValue("Transmute recipe id must be a resource location"),
      )
    : recipeTypeFailure("Transmute recipe id must be a resource location");

export const isTransmuteMaterialCount = (
  value: unknown,
): value is TransmuteMaterialCount => {
  const snapshot = snapshotRecord(value, ["min", "max"]);
  if (snapshot === undefined) {
    return false;
  }
  const { min, max } = snapshot;
  if (
    typeof min !== "number" ||
    typeof max !== "number" ||
    !TransmuteMaterialSlotCount.is(min) ||
    !TransmuteMaterialSlotCount.is(max) ||
    min < 1 ||
    max > TRANSMUTE_MAX_MATERIAL_SLOTS ||
    min > max
  ) {
    return false;
  }
  return min === 1 ? max === 1 : min >= 2;
};

const assertMaterialCount = (
  value: unknown,
): Result.Result<TransmuteMaterialCount, RecipeFailure> => {
  const snapshot = snapshotRecord(value, ["min", "max"]);
  const min = snapshot?.min;
  const max = snapshot?.max;
  if (typeof min !== "number" || typeof max !== "number") {
    return recipeRangeFailure(
      `Transmute material count must be [1, 1] or a range in [2, ${TRANSMUTE_MAX_MATERIAL_SLOTS}]`,
    );
  }
  const checkedMin = TransmuteMaterialSlotCount.result(min);
  const checkedMax = TransmuteMaterialSlotCount.result(max);
  if (Result.isFailure(checkedMin) || Result.isFailure(checkedMax)) {
    return recipeRangeFailure(
      `Transmute material count must be [1, 1] or a range in [2, ${TRANSMUTE_MAX_MATERIAL_SLOTS}]`,
    );
  }
  if (
    checkedMin.success > checkedMax.success ||
    (checkedMin.success === 1
      ? checkedMax.success !== 1
      : checkedMin.success < 2)
  ) {
    return recipeRangeFailure(
      `Transmute material count must be [1, 1] or a range in [2, ${TRANSMUTE_MAX_MATERIAL_SLOTS}]`,
    );
  }
  return Result.succeed({ min: checkedMin.success, max: checkedMax.success });
};

const assertIngredient = (
  ingredient: unknown,
): Result.Result<CraftingIngredient, RecipeFailure> => {
  const normalized = craftingIngredient(ingredient);
  return Result.isFailure(normalized)
    ? recipeTypeFailure("Transmute ingredient has an invalid shape")
    : normalized;
};

const assertOutput = (
  output: unknown,
): Result.Result<ItemStack, RecipeFailure> =>
  isItemStack(output)
    ? Result.succeed(output)
    : recipeTypeFailure("Transmute output must be an ItemStack");

const assertCategory = (
  value: unknown,
): Result.Result<RecipeCategory | undefined, RecipeFailure> => {
  if (value !== undefined && !isRecipeCategory(value)) {
    return recipeTypeFailure("Transmute recipe category is invalid");
  }
  return Result.succeed(value);
};

const assertGroup = (
  value: unknown,
): Result.Result<RecipeGroupValue | undefined, RecipeFailure> => {
  if (value !== undefined && typeof value !== "string") {
    return recipeTypeFailure("Transmute recipe group must be a string");
  }
  return value === undefined
    ? Result.succeed(undefined)
    : Result.mapError(RecipeGroup.result(value), () =>
        recipeTypeFailureValue("Transmute recipe group must be a string"),
      );
};

const assertPriority = (
  value: unknown,
): Result.Result<RecipePriorityValue, RecipeFailure> => {
  const priority = value ?? 0;
  if (typeof priority !== "number") {
    return recipeRangeFailure(
      "Transmute recipe priority must be a non-negative safe integer",
    );
  }
  const message = `Transmute recipe priority must be a non-negative safe integer, received ${priority}`;
  return Result.mapError(
    RecipePriority.result(priority),
    () => recipeRangeFailureValue(message),
  );
};

const assertShowNotification = (
  value: unknown,
): Result.Result<boolean | undefined, RecipeFailure> => {
  if (value !== undefined && typeof value !== "boolean") {
    return recipeTypeFailure("Transmute recipe show notification must be a boolean");
  }
  return Result.succeed(value);
};

const assertResultCountFlag = (
  value: unknown,
): Result.Result<boolean, RecipeFailure> => {
  const flag = value ?? false;
  if (typeof flag !== "boolean") {
    return recipeTypeFailure("Transmute result count option must be a boolean");
  }
  return Result.succeed(flag);
};

const normalizeOptions = (
  options: unknown,
): Result.Result<
  Required<
    Pick<
      TransmuteRecipe,
      "addMaterialCountToResult" | "materialCount" | "priority"
    >
  > &
    Pick<TransmuteRecipe, "category" | "group" | "showNotification">,
  RecipeFailure
> =>
  Result.gen(function* () {
    const record =
      options === undefined
        ? undefined
        : snapshotRecord(options, [
            "category",
            "group",
            "priority",
            "showNotification",
            "addMaterialCountToResult",
            "materialCount",
          ]);
    if (options !== undefined && record === undefined) {
      return yield* recipeTypeFailure("Transmute recipe options must be an object");
    }
    const category = yield* assertCategory(record?.category);
    const group = yield* assertGroup(record?.group);
    const priority = yield* assertPriority(record?.priority);
    const showNotification = yield* assertShowNotification(record?.showNotification);
    const addMaterialCountToResult = yield* assertResultCountFlag(
      record?.addMaterialCountToResult,
    );
    const materialCount = yield* assertMaterialCount(
      record?.materialCount ?? { min: 1, max: 1 },
    );
    return {
      ...(category === undefined ? {} : { category }),
      ...(group === undefined ? {} : { group }),
      ...(showNotification === undefined ? {} : { showNotification }),
      addMaterialCountToResult,
      materialCount,
      priority,
    };
  });

export const transmuteRecipe = (
  id: RecipeId,
  source: CraftingIngredientInput,
  material: CraftingIngredientInput,
  output: ItemStack,
  options?: TransmuteRecipeOptions,
): Result.Result<TransmuteRecipe, RecipeFailure> =>
  Result.gen(function* () {
    const normalizedOptions = yield* normalizeOptions(options);
    const normalizedOutput = yield* assertOutput(output);
    if (
      normalizedOptions.addMaterialCountToResult &&
      normalizedOutput.count + normalizedOptions.materialCount.max >
        maxStackCountForStack(normalizedOutput)
    ) {
      return yield* recipeRangeFailure(
        "Transmute output cannot contain the configured material count",
      );
    }
    return {
      _tag: "Transmute",
      id: yield* assertRecipeId(id),
      source: yield* assertIngredient(source),
      material: yield* assertIngredient(material),
      output: normalizedOutput,
      ...normalizedOptions,
    };
  });

export const isTransmuteRecipe = (value: unknown): value is TransmuteRecipe => {
  const recipe = snapshotRecord(value, [
    "_tag",
    "id",
    "source",
    "material",
    "output",
    "materialCount",
    "addMaterialCountToResult",
    "category",
    "group",
    "priority",
    "showNotification",
  ]);
  if (recipe === undefined) {
    return false;
  }
  return (
    recipe._tag === "Transmute" &&
    typeof recipe.id === "string" &&
    RecipeId.is(recipe.id) &&
    isCraftingIngredient(recipe.source) &&
    isCraftingIngredient(recipe.material) &&
    isItemStack(recipe.output) &&
    isTransmuteMaterialCount(recipe.materialCount) &&
    typeof recipe.addMaterialCountToResult === "boolean" &&
    (recipe.category === undefined || isRecipeCategory(recipe.category)) &&
    (recipe.group === undefined ||
      (typeof recipe.group === "string" && RecipeGroup.is(recipe.group))) &&
    typeof recipe.priority === "number" &&
    RecipePriority.is(recipe.priority) &&
    (recipe.showNotification === undefined ||
      typeof recipe.showNotification === "boolean")
  );
};

export const transmuteRecipeForItem = (
  id: RecipeIdValue,
  source: CraftingIngredientInput,
  material: CraftingIngredientInput,
  output: ItemType,
  count: StackCount,
  options?: TransmuteRecipeOptions,
): Result.Result<TransmuteRecipe, RecipeFailure> =>
  Result.gen(function* () {
    if (!isItemType(output)) {
      return yield* recipeTypeFailure(`Unknown item type: ${String(output)}`);
    }
    if (count > maxStackCountForItem(output)) {
      return yield* recipeRangeFailure(
        `Item stack count for ${output} must be an integer in [1, ${maxStackCountForItem(output)}], received ${String(count)}`,
      );
    }
    const brandedCount = yield* Result.mapError(
      StackCount.result(count),
      () => recipeRangeFailureValue(
        `Item stack count for ${output} must be an integer in [1, ${maxStackCountForItem(output)}], received ${String(count)}`,
      ),
    );
    const outputStack = yield* Result.mapError(
      itemStack(output, brandedCount),
      recipeItemFailure,
    );
    return yield* transmuteRecipe(
      id,
      source,
      material,
      outputStack,
      options,
    );
  });
