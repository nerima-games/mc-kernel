import { Result } from "effect";
import { dataPackResourcePath } from "../world/data-pack-registry.js";
import type { DataPackRegistryFailure, DataPackResourcePath } from "../world/data-pack-registry.js";
import {
  cookingRecipe,
  type CookingRecipe,
  type CookingStation,
} from "./cooking-data.js";
import {
  FIREWORK_EXPLOSION_SHAPES,
  type FireworkExplosionShape,
} from "../item/item-component-values-data.js";
import {
  craftingBannerDuplicateRecipe,
  craftingBookCloningRecipe,
  craftingDecoratedPotRecipe,
  craftingDyeRecipe,
  craftingFireworkRocketRecipe,
  craftingFireworkStarFadeRecipe,
  craftingFireworkStarRecipe,
  craftingImbueRecipe,
  craftingMapExtendingRecipe,
  craftingShieldDecorationRecipe,
  type CraftingBannerDuplicateRecipe,
  type CraftingBookCloningRecipe,
  type CraftingDecoratedPotRecipe,
  type CraftingDyeRecipe,
  type CraftingFireworkRocketRecipe,
  type CraftingFireworkStarFadeRecipe,
  type CraftingFireworkStarRecipe,
  type CraftingImbueRecipe,
  type CraftingMapExtendingRecipe,
  type CraftingShieldDecorationRecipe,
} from "./crafting-special-data.js";
import { NamespacedResourceLocation, TagLocation } from "../text/identifiers.js";
import { isItemType, type ItemType } from "../item/item-type.js";
import { itemStackFromUnknown, type ItemStack } from "../item/item-stack.js";
import { BookGeneration } from "../item/item-primitives.js";
import { PositiveTickCount } from "../time/quantities.js";
import {
  decodeItemComponentPatch,
  type ItemComponentPatch,
} from "../item/item-component-patch.js";
import {
  anyOf,
  RecipeGroup,
  RecipeExperience,
  RecipeId,
  RecipePatternRow,
  RecipePatternSymbol,
  RecipeStationTag,
  shapelessRecipe,
  shapedRecipe,
  tagged,
  type CraftingIngredientInput,
  type Recipe,
  type RecipeCategory,
  type RecipeOptions,
  type RecipePatternKeyMap,
  type RecipeItemTag,
} from "./recipe-data.js";
import {
  SMITHING_STATION_TAG,
  smithingTransformRecipe,
  smithingTrimRecipe,
  type SmithingRecipe,
  type SmithingTransformRecipe,
  type SmithingTrimRecipe,
} from "./smithing-data.js";
import {
  stonecuttingRecipe,
  type StonecuttingRecipe,
} from "./stonecutting-data.js";
import {
  transmuteRecipe,
  TransmuteMaterialSlotCount,
  type TransmuteMaterialCount,
  type TransmuteRecipe,
} from "./transmute-data.js";
import {
  recipeItemFailure,
  recipeRangeFailure,
  recipeTypeFailure,
  type RecipeFailure,
} from "./recipe-error.js";

type UnknownRecord = Readonly<Record<string, unknown>>;
type RecipeResult<A> = Result.Result<A, RecipeFailure>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasOnlyKeys = (
  value: UnknownRecord,
  keys: ReadonlyArray<string>,
): boolean => Object.keys(value).every((key) => keys.includes(key));

const hasAllKeys = (
  value: UnknownRecord,
  keys: ReadonlyArray<string>,
): boolean => keys.every((key) => Object.hasOwn(value, key));

const minecraftItemOf = (
  value: unknown,
  allowAir: boolean,
): RecipeResult<ItemType> => {
  if (typeof value !== "string") {
    return recipeTypeFailure(
      `Recipe item must be a namespaced id, received ${String(value)}`,
    );
  }
  const namespacedId = NamespacedResourceLocation.result(value);
  if (Result.isFailure(namespacedId)) {
    return recipeTypeFailure(
      `Recipe item must be a namespaced id, received ${String(value)}`,
    );
  }
  const separator = namespacedId.success.indexOf(":");
  if (namespacedId.success.slice(0, separator) !== "minecraft") {
    return recipeTypeFailure(
      `Kernel recipe decoder only supports vanilla items, received ${namespacedId.success}`,
    );
  }
  const item = namespacedId.success.slice(separator + 1);
  if ((!allowAir && item === "air") || !isItemType(item)) {
    return recipeTypeFailure(`Unknown recipe item, received ${namespacedId.success}`);
  }
  return Result.succeed(item);
};

const itemTagOf = (
  value: string,
): RecipeResult<RecipeItemTag> => {
  const location = value.slice(1);
  const namespacedLocation = NamespacedResourceLocation.result(location);
  if (Result.isFailure(namespacedLocation)) {
    return recipeTypeFailure(
      `Recipe item tag must be namespaced, received ${value}`,
    );
  }
  return Result.succeed(TagLocation(`#${namespacedLocation.success}`));
};

const decodeIngredient = (
  value: unknown,
): RecipeResult<CraftingIngredientInput> =>
  Result.gen(function* () {
    if (typeof value === "string") {
      if (value.startsWith("#")) {
        return yield* tagged(yield* itemTagOf(value));
      }
      return yield* minecraftItemOf(value, false);
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return yield* recipeRangeFailure(
          "Recipe ingredient alternatives must not be empty",
        );
      }
      const items: Array<ItemType> = [];
      for (const alternative of value) {
        if (typeof alternative !== "string" || alternative.startsWith("#")) {
          return yield* recipeTypeFailure(
            "Recipe ingredient alternatives must contain item ids, not tags",
          );
        }
        items.push(yield* minecraftItemOf(alternative, false));
      }
      return yield* anyOf(items);
    }
    return yield* recipeTypeFailure(
      "Current recipe ingredients must be item/tag strings or item-id arrays",
    );
  });

const decodePattern = (
  value: unknown,
): RecipeResult<ReadonlyArray<RecipePatternRow>> => {
  if (!Array.isArray(value)) {
    return recipeTypeFailure("Shaped recipe pattern must be an array");
  }
  const pattern: Array<RecipePatternRow> = [];
  for (const row of value) {
    if (typeof row !== "string") {
      return recipeTypeFailure("Shaped recipe pattern rows must be strings");
    }
    const patternRow = RecipePatternRow.result(row);
    if (Result.isFailure(patternRow)) {
      return recipeRangeFailure(
        "Shaped recipe pattern rows must be strings no wider than 3 characters",
      );
    }
    pattern.push(patternRow.success);
  }
  return Result.succeed(pattern);
};

const decodeKey = (
  value: unknown,
): RecipeResult<RecipePatternKeyMap> =>
  Result.gen(function* () {
    if (!isRecord(value)) {
      return yield* recipeTypeFailure("Shaped recipe key must be an object");
    }
    const key: Record<RecipePatternSymbol, CraftingIngredientInput> = {};
    for (const [character, ingredient] of Object.entries(value)) {
      const symbol = RecipePatternSymbol.result(character);
      if (Result.isFailure(symbol)) {
        return yield* recipeTypeFailure(
          "Shaped recipe keys must use one non-space character",
        );
      }
      key[symbol.success] = yield* decodeIngredient(ingredient);
    }
    return key;
  });

const decodeIngredients = (
  value: unknown,
): RecipeResult<ReadonlyArray<CraftingIngredientInput>> => {
  if (!Array.isArray(value)) {
    return recipeTypeFailure("Shapeless recipe ingredients must be an array");
  }
  return Result.all(value.map(decodeIngredient));
};

const decodeResultItem = (value: string | UnknownRecord): RecipeResult<ItemType> => {
  if (typeof value === "string") {
    return minecraftItemOf(value, true);
  }
  return minecraftItemOf(value["id"], true);
};

const decodePatchedComponents = (
  value: unknown,
): RecipeResult<ItemComponentPatch> =>
  Result.mapError(decodeItemComponentPatch(value), recipeItemFailure);

const decodeResult = (value: unknown): RecipeResult<ItemStack> =>
  Result.gen(function* () {
    if (typeof value !== "string" && !isRecord(value)) {
      return yield* recipeTypeFailure(
        "Recipe result must be an item id or item stack object",
      );
    }
    if (
      isRecord(value) &&
      (!hasOnlyKeys(value, ["id", "count", "components"]) ||
        !hasAllKeys(value, ["id"]))
    ) {
      return yield* recipeTypeFailure("Recipe result object has an invalid shape");
    }
    const item = yield* decodeResultItem(value);
    const count =
      typeof value === "string" || !Object.hasOwn(value, "count")
        ? 1
        : value["count"];
    if (typeof count !== "number") {
      return yield* recipeTypeFailure("Recipe result count must be a number");
    }
    const componentPatch =
      typeof value === "string" || !Object.hasOwn(value, "components")
        ? undefined
        : yield* decodePatchedComponents(value["components"]);
    return yield* Result.mapError(
      itemStackFromUnknown(item, count, {
        ...(componentPatch === undefined ? {} : { componentPatch }),
      }),
      recipeItemFailure,
    );
  });

const decodeCategory = (value: unknown): RecipeResult<RecipeCategory> => {
  if (
    value !== "building" &&
    value !== "equipment" &&
    value !== "misc" &&
    value !== "redstone"
  ) {
    return recipeTypeFailure(
      `Recipe category is invalid, received ${String(value)}`,
    );
  }
  return Result.succeed(value);
};

type CommonRecipeOptions = Readonly<{
  readonly category?: RecipeCategory;
  readonly group?: RecipeGroup;
  readonly showNotification?: boolean;
}>;

const decodeRecipeGroup = (value: unknown): RecipeResult<RecipeGroup> => {
  if (typeof value !== "string") {
    return recipeTypeFailure("Recipe group must be a string");
  }
  return Result.succeed(RecipeGroup(value));
};

const decodeCommonOptions = (
  value: UnknownRecord,
): RecipeResult<CommonRecipeOptions> =>
  Result.gen(function* () {
    let category: RecipeCategory | undefined;
    let group: RecipeGroup | undefined;
    let showNotification: boolean | undefined;
    if (Object.hasOwn(value, "category")) {
      category = yield* decodeCategory(value["category"]);
    }
    if (Object.hasOwn(value, "group")) {
      group = yield* decodeRecipeGroup(value["group"]);
    }
    if (Object.hasOwn(value, "show_notification")) {
      if (typeof value["show_notification"] !== "boolean") {
        return yield* recipeTypeFailure(
          "Recipe show_notification must be a boolean",
        );
      }
      showNotification = value["show_notification"];
    }
    return {
      ...(category === undefined ? {} : { category }),
      ...(group === undefined ? {} : { group }),
      ...(showNotification === undefined ? {} : { showNotification }),
    };
  });

const decodeCraftingOptions = (
  value: UnknownRecord,
): RecipeResult<RecipeOptions> =>
  Result.gen(function* () {
    const options = yield* decodeCommonOptions(value);
    return { tags: [RecipeStationTag("crafting_table")], ...options };
  });

type NotificationRecipeOptions = Readonly<{
  readonly showNotification?: boolean;
}>;

const decodeNotificationOptions = (
  value: UnknownRecord,
): RecipeResult<NotificationRecipeOptions> =>
  Result.map(decodeCommonOptions(value), ({ showNotification }) =>
    showNotification === undefined ? {} : { showNotification },
  );

const cookingStationOf = (type: string): CookingStation | undefined => {
  switch (type) {
    case "minecraft:smelting":
      return "furnace";
    case "minecraft:blasting":
      return "blast_furnace";
    case "minecraft:smoking":
      return "smoker";
    case "minecraft:campfire_cooking":
      return "campfire";
    default:
      return undefined;
  }
};

const decodeCookingStation = (type: string): RecipeResult<CookingStation> => {
  const station = cookingStationOf(type);
  return station === undefined
    ? recipeTypeFailure(`Unsupported cooking recipe type: ${type}`)
    : Result.succeed(station);
};

const decodeNumber = (value: unknown, field: string): RecipeResult<number> =>
  typeof value === "number"
    ? Result.succeed(value)
    : recipeTypeFailure(`Recipe ${field} must be a number`);

const decodePositiveTickCount = (
  value: unknown,
): RecipeResult<PositiveTickCount> =>
  Result.flatMap(decodeNumber(value, "cookingtime"), (ticks) => {
    const checkedTicks = PositiveTickCount.result(ticks);
    return Result.isFailure(checkedTicks)
      ? recipeRangeFailure(
          `Cooking time must be a positive safe integer, received ${String(ticks)}`,
        )
      : Result.succeed(checkedTicks.success);
  });

const decodeRecipeExperience = (
  value: unknown,
): RecipeResult<RecipeExperience> =>
  Result.flatMap(decodeNumber(value, "experience"), (experience) => {
    const checkedExperience = RecipeExperience.result(experience);
    return Result.isFailure(checkedExperience)
      ? recipeRangeFailure(
          `Cooking experience must be a finite non-negative number, received ${String(experience)}`,
        )
      : Result.succeed(checkedExperience.success);
  });

const decodeMaterialCount = (
  value: unknown,
): RecipeResult<TransmuteMaterialCount> => {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["min", "max"]) ||
    !hasAllKeys(value, ["min", "max"])
  ) {
    return recipeTypeFailure(
      "Transmute material_count must be an object with min and max",
    );
  }
  const min = value["min"];
  const max = value["max"];
  if (
    typeof min !== "number" ||
    !Number.isSafeInteger(min) ||
    typeof max !== "number" ||
    !Number.isSafeInteger(max)
  ) {
    return recipeTypeFailure("Transmute material_count bounds must be integers");
  }
  return Result.gen(function* () {
    const checkedMin = TransmuteMaterialSlotCount.result(min);
    if (Result.isFailure(checkedMin)) {
      return yield* recipeRangeFailure(
        "Transmute material_count bounds must be between 1 and 8",
      );
    }
    const checkedMax = TransmuteMaterialSlotCount.result(max);
    if (Result.isFailure(checkedMax)) {
      return yield* recipeRangeFailure(
        "Transmute material_count bounds must be between 1 and 8",
      );
    }
    return { min: checkedMin.success, max: checkedMax.success };
  });
};

const decodeIntegerRange = (
  value: unknown,
  field: string,
  maximum: number,
): RecipeResult<readonly [number, number]> => {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["min", "max"]) ||
    !hasAllKeys(value, ["min", "max"])
  ) {
    return recipeTypeFailure(`${field} must be an object with min and max`);
  }
  const min = value["min"];
  const max = value["max"];
  if (
    typeof min !== "number" ||
    !Number.isSafeInteger(min) ||
    typeof max !== "number" ||
    !Number.isSafeInteger(max)
  ) {
    return recipeTypeFailure(
      `${field} must contain safe integer min and max values`,
    );
  }
  if (
    min < 0 ||
    max < 0 ||
    min > maximum ||
    max > maximum ||
    min > max
  ) {
    return recipeRangeFailure(
      `${field} must be an ordered integer range from 0 to ${maximum}`,
    );
  }
  return Result.succeed([min, max]);
};

const decodeAllowedGenerations = (
  value: unknown,
): RecipeResult<readonly [BookGeneration, BookGeneration]> =>
  Result.gen(function* () {
    const [min, max] = yield* decodeIntegerRange(
      value,
      "Book cloning allowed_generations",
      2,
    );
    return [BookGeneration(min), BookGeneration(max)] as const;
  });

const isFireworkExplosionShape = (
  value: string,
): value is FireworkExplosionShape =>
  FIREWORK_EXPLOSION_SHAPES.some((shape) => shape === value);

const decodeShapeIngredients = (
  value: unknown,
): RecipeResult<
  Readonly<Partial<Record<FireworkExplosionShape, CraftingIngredientInput>>>
> =>
  Result.gen(function* () {
    if (!isRecord(value)) {
      return yield* recipeTypeFailure("Firework star shapes must be an object");
    }
    const shapes: Partial<
      Record<FireworkExplosionShape, CraftingIngredientInput>
    > = {};
    for (const [shape, ingredient] of Object.entries(value)) {
      if (!isFireworkExplosionShape(shape)) {
        return yield* recipeTypeFailure(
          `Unsupported firework explosion shape: ${shape}`,
        );
      }
      shapes[shape] = yield* decodeIngredient(ingredient);
    }
    return shapes;
  });

const decodeRecipeId = (
  value: NamespacedResourceLocation,
): RecipeResult<RecipeId> => {
  if (typeof value !== "string") {
    return recipeTypeFailure(`Recipe id must be namespaced, received ${value}`);
  }
  const recipeId = RecipeId.result(value);
  if (Result.isFailure(recipeId)) {
    return recipeTypeFailure(`Recipe id must be namespaced, received ${value}`);
  }
  const namespaced = NamespacedResourceLocation.result(value);
  if (Result.isFailure(namespaced)) {
    return recipeTypeFailure(`Recipe id must be namespaced, received ${value}`);
  }
  return Result.succeed(recipeId.success);
};

const decodeRecordWithType = (
  value: unknown,
  label: string,
): RecipeResult<UnknownRecord & { readonly type: string }> => {
  if (!isRecord(value) || typeof value["type"] !== "string") {
    return recipeTypeFailure(`${label} must contain a string type`);
  }
  return Result.succeed({ ...value, type: value["type"] });
};

const decodeTypedDocument = (
  id: NamespacedResourceLocation,
  value: unknown,
  type: string,
  typeMessage: string,
  keys: ReadonlyArray<string>,
  required: ReadonlyArray<string>,
  shapeMessage: string,
): RecipeResult<{
  readonly id: RecipeId;
  readonly value: UnknownRecord;
}> =>
  Result.gen(function* () {
    const recipeId = yield* decodeRecipeId(id);
    if (!isRecord(value) || value["type"] !== type) {
      return yield* recipeTypeFailure(typeMessage);
    }
    if (!hasOnlyKeys(value, keys) || !hasAllKeys(value, required)) {
      return yield* recipeTypeFailure(shapeMessage);
    }
    return { id: recipeId, value };
  });

/** Decodes a current Java crafting recipe document at the JSON boundary. */
export const craftingRecipeFromUnknown = (
  id: NamespacedResourceLocation,
  value: unknown,
): RecipeResult<Recipe> =>
  Result.gen(function* () {
    const recipeId = yield* decodeRecipeId(id);
    const record = yield* decodeRecordWithType(value, "Crafting recipe");
    if (record["type"] === "minecraft:crafting_shaped") {
      if (
        !hasOnlyKeys(record, [
          "type",
          "category",
          "group",
          "show_notification",
          "pattern",
          "key",
          "result",
        ]) ||
        !hasAllKeys(record, ["type", "pattern", "key", "result"])
      ) {
        return yield* recipeTypeFailure(
          "Shaped crafting recipe has an invalid shape",
        );
      }
      return yield* shapedRecipe(
        recipeId,
        yield* decodePattern(record["pattern"]),
        yield* decodeKey(record["key"]),
        yield* decodeResult(record["result"]),
        yield* decodeCraftingOptions(record),
      );
    }
    if (record["type"] === "minecraft:crafting_shapeless") {
      if (
        !hasOnlyKeys(record, [
          "type",
          "category",
          "group",
          "show_notification",
          "ingredients",
          "result",
        ]) ||
        !hasAllKeys(record, ["type", "ingredients", "result"])
      ) {
        return yield* recipeTypeFailure(
          "Shapeless crafting recipe has an invalid shape",
        );
      }
      return yield* shapelessRecipe(
        recipeId,
        yield* decodeIngredients(record["ingredients"]),
        yield* decodeResult(record["result"]),
        yield* decodeCraftingOptions(record),
      );
    }
    return yield* recipeTypeFailure(
      `Unsupported crafting recipe type: ${record["type"]}`,
    );
  });

/** Decodes one of the current Java furnace-family recipe documents. */
export const cookingRecipeFromUnknown = (
  id: NamespacedResourceLocation,
  value: unknown,
): RecipeResult<CookingRecipe> =>
  Result.gen(function* () {
    const recipeId = yield* decodeRecipeId(id);
    const record = yield* decodeRecordWithType(value, "Cooking recipe");
    const station = yield* decodeCookingStation(record["type"]);
    if (
      !hasOnlyKeys(record, [
        "type",
        "category",
        "group",
        "show_notification",
        "ingredient",
        "result",
        "experience",
        "cookingtime",
      ]) ||
      !hasAllKeys(record, [
        "type",
        "ingredient",
        "result",
        "experience",
        "cookingtime",
      ])
    ) {
      return yield* recipeTypeFailure("Cooking recipe has an invalid shape");
    }
    return yield* cookingRecipe(
      recipeId,
      station,
      yield* decodeIngredient(record["ingredient"]),
      yield* decodeResult(record["result"]),
      yield* decodePositiveTickCount(record["cookingtime"]),
      yield* decodeRecipeExperience(record["experience"]),
      yield* decodeCommonOptions(record),
    );
  });

/** Decodes a current Java crafting transmute recipe document. */
export const transmuteRecipeFromUnknown = (
  id: NamespacedResourceLocation,
  value: unknown,
): RecipeResult<TransmuteRecipe> =>
  Result.gen(function* () {
    const recipeId = yield* decodeRecipeId(id);
    const record = yield* decodeRecordWithType(value, "Transmute recipe");
    if (record["type"] !== "minecraft:crafting_transmute") {
      return yield* recipeTypeFailure(
        `Unsupported transmute recipe type: ${record["type"]}`,
      );
    }
    if (
      !hasOnlyKeys(record, [
        "type",
        "category",
        "group",
        "show_notification",
        "source",
        "material",
        "result",
        "material_count",
        "add_material_count_to_result",
      ]) ||
      !hasAllKeys(record, ["type", "source", "material", "result"])
    ) {
      return yield* recipeTypeFailure("Transmute recipe has an invalid shape");
    }
    const options = yield* decodeCommonOptions(record);
    const materialCount = Object.hasOwn(record, "material_count")
      ? yield* decodeMaterialCount(record["material_count"])
      : undefined;
    const addMaterialCountToResult = record["add_material_count_to_result"];
    if (
      addMaterialCountToResult !== undefined &&
      typeof addMaterialCountToResult !== "boolean"
    ) {
      return yield* recipeTypeFailure(
        "Transmute add_material_count_to_result must be boolean",
      );
    }
    return yield* transmuteRecipe(
      recipeId,
      yield* decodeIngredient(record["source"]),
      yield* decodeIngredient(record["material"]),
      yield* decodeResult(record["result"]),
      {
        ...options,
        ...(materialCount === undefined ? {} : { materialCount }),
        ...(addMaterialCountToResult === undefined
          ? {}
          : { addMaterialCountToResult }),
      },
    );
  });

/** Decodes the current Java crafting dye recipe document. */
export const craftingDyeRecipeFromUnknown = (
  id: NamespacedResourceLocation,
  value: unknown,
): RecipeResult<CraftingDyeRecipe> =>
  Result.gen(function* () {
    const { id: recipeId, value: record } = yield* decodeTypedDocument(
      id,
      value,
      "minecraft:crafting_dye",
      "Crafting dye recipe must have type minecraft:crafting_dye",
      ["type", "category", "group", "show_notification", "target", "dye", "result"],
      ["type", "target", "dye", "result"],
      "Crafting dye recipe has an invalid shape",
    );
    const options = yield* decodeCommonOptions(record);
    return yield* craftingDyeRecipe(
      recipeId,
      yield* decodeIngredient(record["target"]),
      yield* decodeIngredient(record["dye"]),
      yield* decodeResult(record["result"]),
      {
        category: options.category ?? "misc",
        group: options.group ?? (yield* decodeRecipeGroup("")),
        showNotification: options.showNotification ?? true,
      },
    );
  });

/** Decodes the current Java crafting imbue recipe document. */
export const craftingImbueRecipeFromUnknown = (
  id: NamespacedResourceLocation,
  value: unknown,
): RecipeResult<CraftingImbueRecipe> =>
  Result.gen(function* () {
    const { id: recipeId, value: record } = yield* decodeTypedDocument(
      id,
      value,
      "minecraft:crafting_imbue",
      "Crafting imbue recipe must have type minecraft:crafting_imbue",
      ["type", "category", "group", "show_notification", "source", "material", "result"],
      ["type", "source", "material", "result"],
      "Crafting imbue recipe has an invalid shape",
    );
    const options = yield* decodeCommonOptions(record);
    return yield* craftingImbueRecipe(
      recipeId,
      yield* decodeIngredient(record["source"]),
      yield* decodeIngredient(record["material"]),
      yield* decodeResult(record["result"]),
      {
        category: options.category ?? "misc",
        group: options.group ?? (yield* decodeRecipeGroup("")),
        showNotification: options.showNotification ?? true,
      },
    );
  });

/** Decodes the current Java banner duplication recipe document. */
export const craftingBannerDuplicateRecipeFromUnknown = (
  id: NamespacedResourceLocation,
  value: unknown,
): RecipeResult<CraftingBannerDuplicateRecipe> =>
  Result.gen(function* () {
    const { id: recipeId, value: record } = yield* decodeTypedDocument(
      id,
      value,
      "minecraft:crafting_special_bannerduplicate",
      "Crafting banner duplicate recipe must have type minecraft:crafting_special_bannerduplicate",
      ["type", "banner", "result", "show_notification"],
      ["type", "banner", "result"],
      "Crafting banner duplicate recipe has an invalid shape",
    );
    return yield* craftingBannerDuplicateRecipe(
      recipeId,
      yield* decodeIngredient(record["banner"]),
      yield* decodeResult(record["result"]),
      yield* decodeNotificationOptions(record),
    );
  });

/** Decodes the current Java written-book cloning recipe document. */
export const craftingBookCloningRecipeFromUnknown = (
  id: NamespacedResourceLocation,
  value: unknown,
): RecipeResult<CraftingBookCloningRecipe> =>
  Result.gen(function* () {
    const { id: recipeId, value: record } = yield* decodeTypedDocument(
      id,
      value,
      "minecraft:crafting_special_bookcloning",
      "Crafting book cloning recipe must have type minecraft:crafting_special_bookcloning",
      ["type", "source", "material", "allowed_generations", "result", "show_notification"],
      ["type", "source", "material", "result"],
      "Crafting book cloning recipe has an invalid shape",
    );
    const allowedGenerations = Object.hasOwn(record, "allowed_generations")
      ? yield* decodeAllowedGenerations(record["allowed_generations"])
      : undefined;
    return yield* craftingBookCloningRecipe(
      recipeId,
      yield* decodeIngredient(record["source"]),
      yield* decodeIngredient(record["material"]),
      yield* decodeResult(record["result"]),
      allowedGenerations,
      yield* decodeNotificationOptions(record),
    );
  });

/** Decodes the current Java decorated-pot recipe document. */
export const craftingDecoratedPotRecipeFromUnknown = (
  id: NamespacedResourceLocation,
  value: unknown,
): RecipeResult<CraftingDecoratedPotRecipe> =>
  Result.gen(function* () {
    const { id: recipeId, value: record } = yield* decodeTypedDocument(
      id,
      value,
      "minecraft:crafting_decorated_pot",
      "Crafting decorated pot recipe must have type minecraft:crafting_decorated_pot",
      ["type", "back", "left", "right", "front", "result", "show_notification"],
      ["type", "back", "left", "right", "front", "result"],
      "Crafting decorated pot recipe has an invalid shape",
    );
    return yield* craftingDecoratedPotRecipe(
      recipeId,
      yield* decodeIngredient(record["back"]),
      yield* decodeIngredient(record["left"]),
      yield* decodeIngredient(record["right"]),
      yield* decodeIngredient(record["front"]),
      yield* decodeResult(record["result"]),
      yield* decodeNotificationOptions(record),
    );
  });

/** Decodes the current Java firework rocket recipe document. */
export const craftingFireworkRocketRecipeFromUnknown = (
  id: NamespacedResourceLocation,
  value: unknown,
): RecipeResult<CraftingFireworkRocketRecipe> =>
  Result.gen(function* () {
    const { id: recipeId, value: record } = yield* decodeTypedDocument(
      id,
      value,
      "minecraft:crafting_special_firework_rocket",
      "Crafting firework rocket recipe must have type minecraft:crafting_special_firework_rocket",
      ["type", "shell", "fuel", "star", "result", "show_notification"],
      ["type", "shell", "fuel", "star", "result"],
      "Crafting firework rocket recipe has an invalid shape",
    );
    return yield* craftingFireworkRocketRecipe(
      recipeId,
      yield* decodeIngredient(record["shell"]),
      yield* decodeIngredient(record["fuel"]),
      yield* decodeIngredient(record["star"]),
      yield* decodeResult(record["result"]),
      yield* decodeNotificationOptions(record),
    );
  });

/** Decodes the current Java firework star fade recipe document. */
export const craftingFireworkStarFadeRecipeFromUnknown = (
  id: NamespacedResourceLocation,
  value: unknown,
): RecipeResult<CraftingFireworkStarFadeRecipe> =>
  Result.gen(function* () {
    const { id: recipeId, value: record } = yield* decodeTypedDocument(
      id,
      value,
      "minecraft:crafting_special_firework_star_fade",
      "Crafting firework star fade recipe must have type minecraft:crafting_special_firework_star_fade",
      ["type", "target", "dye", "result", "show_notification"],
      ["type", "target", "dye", "result"],
      "Crafting firework star fade recipe has an invalid shape",
    );
    return yield* craftingFireworkStarFadeRecipe(
      recipeId,
      yield* decodeIngredient(record["target"]),
      yield* decodeIngredient(record["dye"]),
      yield* decodeResult(record["result"]),
      yield* decodeNotificationOptions(record),
    );
  });

/** Decodes the current Java firework star recipe document. */
export const craftingFireworkStarRecipeFromUnknown = (
  id: NamespacedResourceLocation,
  value: unknown,
): RecipeResult<CraftingFireworkStarRecipe> =>
  Result.gen(function* () {
    const { id: recipeId, value: record } = yield* decodeTypedDocument(
      id,
      value,
      "minecraft:crafting_special_firework_star",
      "Crafting firework star recipe must have type minecraft:crafting_special_firework_star",
      ["type", "trail", "twinkle", "fuel", "dye", "shapes", "result", "show_notification"],
      ["type", "trail", "twinkle", "fuel", "dye", "shapes", "result"],
      "Crafting firework star recipe has an invalid shape",
    );
    return yield* craftingFireworkStarRecipe(
      recipeId,
      yield* decodeIngredient(record["trail"]),
      yield* decodeIngredient(record["twinkle"]),
      yield* decodeIngredient(record["fuel"]),
      yield* decodeIngredient(record["dye"]),
      yield* decodeShapeIngredients(record["shapes"]),
      yield* decodeResult(record["result"]),
      yield* decodeNotificationOptions(record),
    );
  });

/** Decodes the current Java map-extending recipe document. */
export const craftingMapExtendingRecipeFromUnknown = (
  id: NamespacedResourceLocation,
  value: unknown,
): RecipeResult<CraftingMapExtendingRecipe> =>
  Result.gen(function* () {
    const { id: recipeId, value: record } = yield* decodeTypedDocument(
      id,
      value,
      "minecraft:crafting_special_mapextending",
      "Crafting map extending recipe must have type minecraft:crafting_special_mapextending",
      ["type", "map", "material", "result", "show_notification"],
      ["type", "map", "material", "result"],
      "Crafting map extending recipe has an invalid shape",
    );
    return yield* craftingMapExtendingRecipe(
      recipeId,
      yield* decodeIngredient(record["map"]),
      yield* decodeIngredient(record["material"]),
      yield* decodeResult(record["result"]),
      yield* decodeNotificationOptions(record),
    );
  });

/** Decodes the current Java shield-decoration recipe document. */
export const craftingShieldDecorationRecipeFromUnknown = (
  id: NamespacedResourceLocation,
  value: unknown,
): RecipeResult<CraftingShieldDecorationRecipe> =>
  Result.gen(function* () {
    const { id: recipeId, value: record } = yield* decodeTypedDocument(
      id,
      value,
      "minecraft:crafting_special_shielddecoration",
      "Crafting shield decoration recipe must have type minecraft:crafting_special_shielddecoration",
      ["type", "banner", "target", "result", "show_notification"],
      ["type", "banner", "target", "result"],
      "Crafting shield decoration recipe has an invalid shape",
    );
    return yield* craftingShieldDecorationRecipe(
      recipeId,
      yield* decodeIngredient(record["banner"]),
      yield* decodeIngredient(record["target"]),
      yield* decodeResult(record["result"]),
      yield* decodeNotificationOptions(record),
    );
  });

/** Decodes a current Java stonecutting recipe document. */
export const stonecuttingRecipeFromUnknown = (
  id: NamespacedResourceLocation,
  value: unknown,
): RecipeResult<StonecuttingRecipe> =>
  Result.gen(function* () {
    const { id: recipeId, value: record } = yield* decodeTypedDocument(
      id,
      value,
      "minecraft:stonecutting",
      "Stonecutting recipe must have type minecraft:stonecutting",
      ["type", "ingredient", "result", "show_notification"],
      ["type", "ingredient", "result"],
      "Stonecutting recipe has an invalid shape",
    );
    return yield* stonecuttingRecipe(
      recipeId,
      yield* decodeIngredient(record["ingredient"]),
      yield* decodeResult(record["result"]),
      yield* decodeNotificationOptions(record),
    );
  });

/** Decodes a current Java smithing transform recipe document. */
export const smithingTransformRecipeFromUnknown = (
  id: NamespacedResourceLocation,
  value: unknown,
): RecipeResult<SmithingTransformRecipe> =>
  Result.gen(function* () {
    const { id: recipeId, value: record } = yield* decodeTypedDocument(
      id,
      value,
      "minecraft:smithing_transform",
      "Smithing transform recipe must have type minecraft:smithing_transform",
      ["type", "template", "base", "addition", "result", "show_notification"],
      ["type", "template", "base", "addition", "result"],
      "Smithing transform recipe has an invalid shape",
    );
    return yield* smithingTransformRecipe(
      recipeId,
      yield* decodeIngredient(record["template"]),
      yield* decodeIngredient(record["base"]),
      yield* decodeIngredient(record["addition"]),
      yield* decodeResult(record["result"]),
      {
        tags: [SMITHING_STATION_TAG],
        ...(yield* decodeNotificationOptions(record)),
      },
    );
  });

/** Decodes a current Java smithing trim recipe document. */
export const smithingTrimRecipeFromUnknown = (
  id: NamespacedResourceLocation,
  value: unknown,
): RecipeResult<SmithingTrimRecipe> =>
  Result.gen(function* () {
    const { id: recipeId, value: record } = yield* decodeTypedDocument(
      id,
      value,
      "minecraft:smithing_trim",
      "Smithing trim recipe must have type minecraft:smithing_trim",
      ["type", "template", "base", "addition", "show_notification"],
      ["type", "template", "base", "addition"],
      "Smithing trim recipe has an invalid shape",
    );
    return yield* smithingTrimRecipe(
      recipeId,
      yield* decodeIngredient(record["template"]),
      yield* decodeIngredient(record["base"]),
      yield* decodeIngredient(record["addition"]),
      {
        tags: [SMITHING_STATION_TAG],
        ...(yield* decodeNotificationOptions(record)),
      },
    );
  });

/** Decodes either current Java smithing recipe document. */
export const smithingRecipeFromUnknown = (
  id: NamespacedResourceLocation,
  value: unknown,
): RecipeResult<SmithingRecipe> =>
  Result.gen(function* () {
    const record = yield* decodeRecordWithType(value, "Smithing recipe");
    if (record["type"] === "minecraft:smithing_transform") {
      return yield* smithingTransformRecipeFromUnknown(id, record);
    }
    if (record["type"] === "minecraft:smithing_trim") {
      return yield* smithingTrimRecipeFromUnknown(id, record);
    }
    return yield* recipeTypeFailure(
      `Unsupported smithing recipe type: ${record["type"]}`,
    );
  });

export type PortableRecipe =
  | Recipe
  | CookingRecipe
  | StonecuttingRecipe
  | SmithingRecipe
  | CraftingBannerDuplicateRecipe
  | CraftingBookCloningRecipe
  | CraftingDecoratedPotRecipe
  | CraftingDyeRecipe
  | CraftingFireworkRocketRecipe
  | CraftingFireworkStarFadeRecipe
  | CraftingFireworkStarRecipe
  | CraftingImbueRecipe
  | CraftingMapExtendingRecipe
  | CraftingShieldDecorationRecipe
  | TransmuteRecipe;

/** Decodes every portable Java recipe kind currently modeled by mc-kernel. */
export const portableRecipeFromUnknown = (
  id: NamespacedResourceLocation,
  value: unknown,
): RecipeResult<PortableRecipe> =>
  Result.gen(function* () {
    const record = yield* decodeRecordWithType(value, "Recipe");
    const type = record["type"];
    if (type === "minecraft:crafting_shaped" || type === "minecraft:crafting_shapeless") {
      return yield* craftingRecipeFromUnknown(id, record);
    }
    if (cookingStationOf(type) !== undefined) {
      return yield* cookingRecipeFromUnknown(id, record);
    }
    if (type === "minecraft:crafting_transmute") {
      return yield* transmuteRecipeFromUnknown(id, record);
    }
    if (type === "minecraft:crafting_special_bannerduplicate") {
      return yield* craftingBannerDuplicateRecipeFromUnknown(id, record);
    }
    if (type === "minecraft:crafting_special_bookcloning") {
      return yield* craftingBookCloningRecipeFromUnknown(id, record);
    }
    if (type === "minecraft:crafting_decorated_pot") {
      return yield* craftingDecoratedPotRecipeFromUnknown(id, record);
    }
    if (type === "minecraft:crafting_dye") {
      return yield* craftingDyeRecipeFromUnknown(id, record);
    }
    if (type === "minecraft:crafting_special_firework_rocket") {
      return yield* craftingFireworkRocketRecipeFromUnknown(id, record);
    }
    if (type === "minecraft:crafting_special_firework_star_fade") {
      return yield* craftingFireworkStarFadeRecipeFromUnknown(id, record);
    }
    if (type === "minecraft:crafting_special_firework_star") {
      return yield* craftingFireworkStarRecipeFromUnknown(id, record);
    }
    if (type === "minecraft:crafting_imbue") {
      return yield* craftingImbueRecipeFromUnknown(id, record);
    }
    if (type === "minecraft:crafting_special_mapextending") {
      return yield* craftingMapExtendingRecipeFromUnknown(id, record);
    }
    if (type === "minecraft:crafting_special_shielddecoration") {
      return yield* craftingShieldDecorationRecipeFromUnknown(id, record);
    }
    if (type === "minecraft:stonecutting") {
      return yield* stonecuttingRecipeFromUnknown(id, record);
    }
    if (type === "minecraft:smithing_transform" || type === "minecraft:smithing_trim") {
      return yield* smithingRecipeFromUnknown(id, record);
    }
    return yield* recipeTypeFailure(`Unsupported portable recipe type: ${type}`);
  });

export const recipeFromUnknown: typeof portableRecipeFromUnknown =
  portableRecipeFromUnknown;

/** Returns the canonical data-pack path for a namespaced recipe id. */
export const recipeDataPath = (
  id: NamespacedResourceLocation,
): Result.Result<DataPackResourcePath, RecipeFailure | DataPackRegistryFailure> =>
  Result.gen(function* () {
    const recipeId = yield* decodeRecipeId(id);
    return yield* dataPackResourcePath(
      NamespacedResourceLocation("minecraft:recipe"),
      NamespacedResourceLocation(recipeId),
    );
  });

export const craftingRecipeDataPath: typeof recipeDataPath = recipeDataPath;
