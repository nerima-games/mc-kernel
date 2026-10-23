import { Brand, Result } from "effect";
import {
  isItemStack,
  itemStack,
  type ItemStack,
  type Slot,
} from "../item/item-stack.js";
import { StackCount } from "../time/quantities.js";
import { isItemType, type ItemType } from "../item/item-type.js";
import {
  ResourceLocation,
  TagLocation,
  type ResourceLocation as ResourceLocationValue,
} from "../text/identifiers.js";
import { VANILLA_ITEM_TAG_MEMBERSHIPS } from "../world/tag-membership.js";
import {
  recipeRangeFailure,
  recipeItemFailure,
  recipeTypeFailure,
  type RecipeFailure,
} from "./recipe-error.js";

export const MAX_RECIPE_SIDE = 3;

const RECIPE_INGREDIENT_COUNT_MIN = 1;
const RECIPE_INGREDIENT_COUNT_MAX = 64;
const RECIPE_PRIORITY_MIN = 0;
const RECIPE_GRID_DIMENSION_MIN = 0;
const RECIPE_GRID_INDEX_MIN = 0;

export type RecipeIngredientCount = number &
  Brand.Brand<"RecipeIngredientCount">;

export const RecipeIngredientCount: Brand.Constructor<RecipeIngredientCount> =
  Brand.make<RecipeIngredientCount>((value) =>
    Number.isSafeInteger(value) &&
    value >= RECIPE_INGREDIENT_COUNT_MIN &&
    value <= RECIPE_INGREDIENT_COUNT_MAX
      ? true
      : `RecipeIngredientCount must be an integer in [${RECIPE_INGREDIENT_COUNT_MIN}, ${RECIPE_INGREDIENT_COUNT_MAX}], received ${value}`,
  );

export type RecipePriority = number & Brand.Brand<"RecipePriority">;

export const RecipePriority: Brand.Constructor<RecipePriority> =
  Brand.make<RecipePriority>((value) =>
    Number.isSafeInteger(value) && value >= RECIPE_PRIORITY_MIN
      ? true
      : `RecipePriority must be a non-negative safe integer, received ${value}`,
  );

export type RecipeGridDimension = number &
  Brand.Brand<"RecipeGridDimension">;

export const RecipeGridDimension: Brand.Constructor<RecipeGridDimension> =
  Brand.make<RecipeGridDimension>((value) =>
    Number.isSafeInteger(value) &&
    value >= RECIPE_GRID_DIMENSION_MIN &&
    value <= MAX_RECIPE_SIDE
      ? true
      : `RecipeGridDimension must be an integer in [${RECIPE_GRID_DIMENSION_MIN}, ${MAX_RECIPE_SIDE}], received ${value}`,
  );

export type RecipeGridIndex = number & Brand.Brand<"RecipeGridIndex">;

export const RecipeGridIndex: Brand.Constructor<RecipeGridIndex> =
  Brand.make<RecipeGridIndex>((value) =>
    Number.isSafeInteger(value) &&
    value >= RECIPE_GRID_INDEX_MIN &&
    value < MAX_RECIPE_SIDE
      ? true
      : `RecipeGridIndex must be an integer in [${RECIPE_GRID_INDEX_MIN}, ${MAX_RECIPE_SIDE - 1}], received ${value}`,
  );

export type RecipePatternRow = string & Brand.Brand<"RecipePatternRow">;

export const RecipePatternRow: Brand.Constructor<RecipePatternRow> =
  Brand.make<RecipePatternRow>((value) =>
    typeof value === "string" && value.length <= MAX_RECIPE_SIDE
      ? true
      : `RecipePatternRow must be a string no wider than ${MAX_RECIPE_SIDE} characters`,
  );

export type RecipePatternSymbol = string & Brand.Brand<"RecipePatternSymbol">;

export const RecipePatternSymbol: Brand.Constructor<RecipePatternSymbol> =
  Brand.make<RecipePatternSymbol>((value) =>
    typeof value === "string" && value.length === 1 && value !== " "
      ? true
      : "RecipePatternSymbol must be one non-space character",
  );

export type RecipeGroup = string & Brand.Brand<"RecipeGroup">;

export const RecipeGroup: Brand.Constructor<RecipeGroup> =
  Brand.make<RecipeGroup>((value) =>
    typeof value === "string"
      ? true
      : "RecipeGroup must be a string",
  );

export type RecipeExperience = number & Brand.Brand<"RecipeExperience">;

export const RecipeExperience: Brand.Constructor<RecipeExperience> =
  Brand.make<RecipeExperience>((value) =>
    Number.isFinite(value) && value >= 0
      ? true
      : `RecipeExperience must be a finite non-negative number, received ${value}`,
  );

export type RecipeCompletionCount = number &
  Brand.Brand<"RecipeCompletionCount">;

export const RecipeCompletionCount: Brand.Constructor<RecipeCompletionCount> =
  Brand.make<RecipeCompletionCount>((value) =>
    Number.isSafeInteger(value) && value >= 0
      ? true
      : `RecipeCompletionCount must be a non-negative safe integer, received ${value}`,
  );

export type RecipeId = ResourceLocationValue;
export const RecipeId: Brand.Constructor<RecipeId> = ResourceLocation;
export type RecipeItemTag = TagLocation;
export type RecipeStationTag = ResourceLocationValue;
export const RecipeStationTag: Brand.Constructor<RecipeStationTag> =
  ResourceLocation;

export type ExactIngredient = {
  readonly _tag: "Exact";
  readonly item: ItemType;
  readonly count: RecipeIngredientCount;
};

export type ItemTagIngredient = {
  readonly _tag: "ItemTag";
  readonly tag: RecipeItemTag;
  readonly count: RecipeIngredientCount;
};

export type Ingredient = ExactIngredient | ItemTagIngredient;
export type IngredientInput = ItemType | RecipeItemTag | Ingredient;
export type AnyOfIngredient = {
  readonly _tag: "AnyOf";
  readonly options: ReadonlyArray<Ingredient>;
  readonly count: RecipeIngredientCount;
};

export type CraftingIngredient = Ingredient | AnyOfIngredient;
export type CraftingIngredientInput =
  | IngredientInput
  | ReadonlyArray<IngredientInput>
  | AnyOfIngredient;
export type RecipePatternKeyMap = Readonly<
  Record<RecipePatternSymbol, CraftingIngredientInput>
>;
export type PatternCell = CraftingIngredient | undefined;

export type RecipePattern = {
  readonly width: RecipeGridDimension;
  readonly height: RecipeGridDimension;
  readonly cells: ReadonlyArray<PatternCell>;
};

export type RecipeOptions = {
  readonly assumeSymmetry?: boolean;
  readonly category?: RecipeCategory;
  readonly group?: RecipeGroup;
  readonly priority?: RecipePriority;
  readonly showNotification?: boolean;
  readonly tags?: ReadonlyArray<RecipeStationTag>;
};

export type RecipeCategory = "building" | "equipment" | "misc" | "redstone";

export type ShapedRecipe = {
  readonly _tag: "Shaped";
  readonly id: RecipeId;
  readonly pattern: RecipePattern;
  readonly output: ItemStack;
  readonly assumeSymmetry: boolean;
  readonly category?: RecipeCategory;
  readonly group?: RecipeGroup;
  readonly priority: RecipePriority;
  readonly showNotification?: boolean;
  readonly tags: ReadonlyArray<RecipeStationTag>;
};

export type ShapelessRecipe = {
  readonly _tag: "Shapeless";
  readonly id: RecipeId;
  readonly ingredients: ReadonlyArray<CraftingIngredient>;
  readonly output: ItemStack;
  readonly category?: RecipeCategory;
  readonly group?: RecipeGroup;
  readonly priority: RecipePriority;
  readonly showNotification?: boolean;
  readonly tags: ReadonlyArray<RecipeStationTag>;
};

export type Recipe = ShapedRecipe | ShapelessRecipe;
export type RecipeTable = ReadonlyArray<Recipe>;
export type ItemTagMemberships = ReadonlyMap<
  RecipeItemTag,
  ReadonlySet<ItemType>
>;

export type RecipeMatchContext = {
  readonly itemTags?: ItemTagMemberships;
  readonly station?: RecipeStationTag;
};

export type CraftGridInput = ItemType | ItemStack | undefined;

export type CraftGrid = {
  readonly width: RecipeGridDimension;
  readonly height: RecipeGridDimension;
  readonly cells: ReadonlyArray<Slot>;
};

type RecordValue = {
  readonly _tag?: unknown;
  readonly item?: unknown;
  readonly tag?: unknown;
  readonly count?: unknown;
  readonly category?: unknown;
  readonly group?: unknown;
  readonly assumeSymmetry?: unknown;
  readonly priority?: unknown;
  readonly showNotification?: unknown;
  readonly tags?: unknown;
  readonly options?: unknown;
};

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isIngredientCount = (
  count: unknown,
): count is RecipeIngredientCount =>
  typeof count === "number" && RecipeIngredientCount.is(count);

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

const assertRecipeId = (id: unknown): Result.Result<RecipeId, RecipeFailure> => {
  if (typeof id !== "string") {
    return recipeTypeFailure("Recipe id must be a resource location");
  }
  return Result.mapError(RecipeId.result(id), () =>
    recipeTypeFailureValue("Recipe id must be a resource location"),
  );
};

const assertPositiveCount = (
  count: unknown,
): Result.Result<RecipeIngredientCount, RecipeFailure> => {
  if (typeof count !== "number") {
    return recipeRangeFailure(
      `Ingredient count must be a safe integer in [1, 64], received ${count}`,
    );
  }
  return Result.mapError(RecipeIngredientCount.result(count), () =>
    recipeRangeFailureValue(
      `Ingredient count must be a safe integer in [1, 64], received ${count}`,
    ),
  );
};

export const isRecipeItemTag = (tag: unknown): tag is RecipeItemTag =>
  typeof tag === "string" && TagLocation.is(tag);

export const isIngredient = (value: unknown): value is Ingredient => {
  if (!isRecord(value) || !isIngredientCount(value.count)) {
    return false;
  }
  if (value._tag === "Exact") {
    return isItemType(value.item);
  }
  return value._tag === "ItemTag" && isRecipeItemTag(value.tag);
};

export const isIngredientInput = (value: unknown): value is IngredientInput =>
  typeof value === "string"
    ? isItemType(value) || isRecipeItemTag(value)
    : isIngredient(value);

export const isAnyOfIngredient = (value: unknown): value is AnyOfIngredient => {
  if (
    !isRecord(value) ||
    value._tag !== "AnyOf" ||
    !isIngredientCount(value.count) ||
    !Array.isArray(value.options)
  ) {
    return false;
  }
  return value.options.length > 0 && value.options.every(isIngredient);
};

export const isCraftingIngredient = (
  value: unknown,
): value is CraftingIngredient =>
  isIngredient(value) || isAnyOfIngredient(value);

export const isCraftingIngredientInput = (
  value: unknown,
): value is CraftingIngredientInput =>
  Array.isArray(value)
    ? value.length > 0 && value.every(isIngredientInput)
    : isAnyOfIngredient(value) || isIngredientInput(value);

const assertRecipeItemTag = (
  tag: unknown,
): Result.Result<RecipeItemTag, RecipeFailure> => {
  if (typeof tag !== "string") {
    return recipeTypeFailure(
      `Recipe item tag must start with # and contain a name, received ${String(tag)}`,
    );
  }
  return Result.mapError(TagLocation.result(tag), () =>
    recipeTypeFailureValue(
      `Recipe item tag must start with # and contain a name, received ${String(tag)}`,
    ),
  );
};

const assertStationTag = (
  tag: unknown,
): Result.Result<RecipeStationTag, RecipeFailure> => {
  if (typeof tag !== "string") {
    return recipeTypeFailure("Recipe station tags must be resource locations");
  }
  return Result.mapError(RecipeStationTag.result(tag), () =>
    recipeTypeFailureValue("Recipe station tags must be resource locations"),
  );
};

const exactlyFromUnknown = (
  item: unknown,
  count: unknown = 1,
): Result.Result<ExactIngredient, RecipeFailure> =>
  Result.gen(function* () {
    if (!isItemType(item)) {
      return yield* recipeTypeFailure(
        `Unknown exact ingredient item: ${String(item)}`,
      );
    }
    return { _tag: "Exact", count: yield* assertPositiveCount(count), item };
  });

export function exactly(
  item: ItemType,
  count?: RecipeIngredientCount,
): Result.Result<ExactIngredient, RecipeFailure>;
export function exactly(
  item: ItemType,
  count: RecipeIngredientCount = RecipeIngredientCount(1),
): Result.Result<ExactIngredient, RecipeFailure> {
  return exactlyFromUnknown(item, count);
}

const taggedFromUnknown = (
  tag: unknown,
  count: unknown = 1,
): Result.Result<ItemTagIngredient, RecipeFailure> =>
  Result.gen(function* () {
    return {
      _tag: "ItemTag",
      count: yield* assertPositiveCount(count),
      tag: yield* assertRecipeItemTag(tag),
    };
  });

export function tagged(
  tag: RecipeItemTag,
  count?: RecipeIngredientCount,
): Result.Result<ItemTagIngredient, RecipeFailure>;
export function tagged(
  tag: RecipeItemTag,
  count: RecipeIngredientCount = RecipeIngredientCount(1),
): Result.Result<ItemTagIngredient, RecipeFailure> {
  return taggedFromUnknown(tag, count);
}

const normalizeIngredient = (
  value: unknown,
): Result.Result<Ingredient, RecipeFailure> => {
  if (typeof value === "string") {
    if (isItemType(value)) {
      return exactlyFromUnknown(value);
    }
    return taggedFromUnknown(value);
  }

  if (!isRecord(value)) {
    return recipeTypeFailure(
      "Recipe ingredient must be an item type, item tag, or ingredient object",
    );
  }

  const candidate = value;
  if (
    candidate._tag === "Exact" &&
    isItemType(candidate.item) &&
    typeof candidate.count === "number"
  ) {
    return exactlyFromUnknown(candidate.item, candidate.count);
  }
  if (
    candidate._tag === "ItemTag" &&
    typeof candidate.tag === "string" &&
    typeof candidate.count === "number"
  ) {
    return Result.flatMap(assertRecipeItemTag(candidate.tag), (tag) =>
      taggedFromUnknown(tag, candidate.count),
    );
  }
  return recipeTypeFailure("Recipe ingredient object has an invalid shape");
};

const anyOfFromUnknown = (
  options: unknown,
  count: unknown = 1,
): Result.Result<AnyOfIngredient, RecipeFailure> => {
  if (!Array.isArray(options) || options.length === 0) {
    return recipeRangeFailure(
      "Alternative ingredient lists must contain at least one ingredient",
    );
  }
  return Result.gen(function* () {
    const normalizedCount = yield* assertPositiveCount(count);
    const normalizedOptions = yield* Result.all(options.map(normalizeIngredient));
    return { _tag: "AnyOf", count: normalizedCount, options: normalizedOptions };
  });
};

export function anyOf(
  options: ReadonlyArray<IngredientInput>,
  count?: RecipeIngredientCount,
): Result.Result<AnyOfIngredient, RecipeFailure>;
export function anyOf(
  options: ReadonlyArray<IngredientInput>,
  count: RecipeIngredientCount = RecipeIngredientCount(1),
): Result.Result<AnyOfIngredient, RecipeFailure> {
  return anyOfFromUnknown(options, count);
}

const normalizeCraftingIngredient = (
  value: unknown,
): Result.Result<CraftingIngredient, RecipeFailure> => {
  if (Array.isArray(value)) {
    return anyOfFromUnknown(value);
  }
  if (
    isRecord(value) &&
    value._tag === "AnyOf" &&
    Array.isArray(value.options) &&
    typeof value.count === "number"
  ) {
    return anyOfFromUnknown(value.options, value.count);
  }
  return normalizeIngredient(value);
};

export const craftingIngredient = (
  value: unknown,
): Result.Result<CraftingIngredient, RecipeFailure> => {
  return normalizeCraftingIngredient(value);
};

const normalizeOptionsRecord = (
  options: unknown,
): Result.Result<RecordValue | undefined, RecipeFailure> => {
  if (options === undefined) {
    return Result.succeed(undefined);
  }
  if (!isRecord(options)) {
    return recipeTypeFailure("Recipe options must be an object");
  }
  return Result.succeed(options);
};

const normalizeCategory = (
  category: unknown,
): Result.Result<RecipeCategory | undefined, RecipeFailure> => {
  if (
    category !== undefined &&
    category !== "building" &&
    category !== "equipment" &&
    category !== "misc" &&
    category !== "redstone"
  ) {
    return recipeTypeFailure(
      `Recipe category is invalid, received ${String(category)}`,
    );
  }
  return Result.succeed(category);
};

const normalizeGroup = (
  group: unknown,
): Result.Result<RecipeGroup | undefined, RecipeFailure> => {
  if (group === undefined) {
    return Result.succeed(undefined);
  }
  if (typeof group !== "string") {
    return recipeTypeFailure("Recipe group must be a string");
  }
  return Result.mapError(RecipeGroup.result(group), () =>
    recipeTypeFailureValue("Recipe group must be a string"),
  );
};

const normalizeShowNotification = (
  showNotification: unknown,
): Result.Result<boolean | undefined, RecipeFailure> => {
  if (showNotification !== undefined && typeof showNotification !== "boolean") {
    return recipeTypeFailure("Recipe show notification must be a boolean");
  }
  return Result.succeed(showNotification);
};

const normalizeOptions = (
  options: unknown,
): Result.Result<
  Pick<
    ShapedRecipe,
    | "assumeSymmetry"
    | "category"
    | "group"
    | "priority"
    | "showNotification"
    | "tags"
  >,
  RecipeFailure
> =>
  Result.gen(function* () {
    const record = yield* normalizeOptionsRecord(options);
    const assumeSymmetry = record?.assumeSymmetry ?? false;
    if (typeof assumeSymmetry !== "boolean") {
      return yield* recipeTypeFailure("Recipe symmetry must be a boolean");
    }
    const priority = record?.priority ?? 0;
    if (typeof priority !== "number") {
      return yield* recipeRangeFailure(
        `Recipe priority must be a non-negative safe integer, received ${priority}`,
      );
    }
    const normalizedPriority = yield* Result.mapError(
      RecipePriority.result(priority),
      () =>
        recipeRangeFailureValue(
          `Recipe priority must be a non-negative safe integer, received ${priority}`,
        ),
    );
    const rawTags = record?.tags ?? [];
    if (!Array.isArray(rawTags)) {
      return yield* recipeTypeFailure("Recipe station tags must be an array");
    }
    const tags = yield* Result.all(rawTags.map(assertStationTag));
    const category = yield* normalizeCategory(record?.category);
    const group = yield* normalizeGroup(record?.group);
    const showNotification = yield* normalizeShowNotification(
      record?.showNotification,
    );
    return {
      assumeSymmetry,
      ...(category === undefined ? {} : { category }),
      ...(group === undefined ? {} : { group }),
      priority: normalizedPriority,
      ...(showNotification === undefined ? {} : { showNotification }),
      tags,
    };
  });

const normalizePatternRows = (
  rows: unknown,
  key: unknown,
): Result.Result<RecipePattern, RecipeFailure> =>
  Result.gen(function* () {
    if (
      !Array.isArray(rows) ||
      rows.length < 1 ||
      rows.length > MAX_RECIPE_SIDE
    ) {
      return yield* recipeRangeFailure(
        `Shaped recipe rows must contain 1 to ${MAX_RECIPE_SIDE} rows`,
      );
    }
    if (!isRecord(key)) {
      return yield* recipeTypeFailure("Shaped recipe key must be an object");
    }
    const typedRows = yield* Result.all(
      rows.map((row: unknown) =>
        typeof row !== "string"
          ? recipeRangeFailure(
              `Shaped recipe rows must be strings no wider than ${MAX_RECIPE_SIDE} characters`,
            )
          : Result.mapError(RecipePatternRow.result(row), () =>
              recipeRangeFailureValue(
                `Shaped recipe rows must be strings no wider than ${MAX_RECIPE_SIDE} characters`,
              ),
            ),
      ),
    );

    const ingredients = new Map<RecipePatternSymbol, CraftingIngredient>();
    for (const [character, ingredient] of Object.entries(key)) {
      if (character.length !== 1 || character === " ") {
        return yield* recipeTypeFailure(
          "Shaped recipe keys must use one non-space character",
        );
      }
      const symbol = yield* Result.mapError(
        RecipePatternSymbol.result(character),
        () =>
          recipeTypeFailureValue(
            "Shaped recipe keys must use one non-space character",
          ),
      );
      ingredients.set(
        symbol,
        yield* normalizeCraftingIngredient(ingredient),
      );
    }

    const rawWidth = Math.max(...typedRows.map((row) => row.length));
    const rawCells: Array<PatternCell> = [];
    for (const row of typedRows) {
      for (let x = 0; x < rawWidth; x += 1) {
        const character = row[x];
        if (character === undefined || character === " ") {
          rawCells.push(undefined);
          continue;
        }
        const symbol = yield* Result.mapError(
          RecipePatternSymbol.result(character),
          () =>
            recipeTypeFailureValue(
              `Shaped recipe pattern references unknown key: ${character}`,
            ),
        );
        const ingredient = ingredients.get(symbol);
        if (ingredient === undefined) {
          return yield* recipeTypeFailure(
            `Shaped recipe pattern references unknown key: ${character}`,
          );
        }
        rawCells.push(ingredient);
      }
    }

    const occupiedCoordinates = rawCells.flatMap((cell, index) =>
      cell === undefined
        ? []
        : [{ x: index % rawWidth, y: Math.floor(index / rawWidth) }],
    );
    if (occupiedCoordinates.length === 0) {
      return yield* recipeRangeFailure(
        "Shaped recipe pattern must contain at least one ingredient",
      );
    }

    const minX = Math.min(...occupiedCoordinates.map(({ x }) => x));
    const maxX = Math.max(...occupiedCoordinates.map(({ x }) => x));
    const minY = Math.min(...occupiedCoordinates.map(({ y }) => y));
    const maxY = Math.max(...occupiedCoordinates.map(({ y }) => y));
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const cells = Array.from({ length: width * height }, (_, index) => {
      const x = minX + (index % width);
      const y = minY + Math.floor(index / width);
      return rawCells[y * rawWidth + x];
    });

    const patternWidth = yield* Result.mapError(
      RecipeGridDimension.result(width),
      () => recipeRangeFailureValue(`Recipe pattern width is invalid: ${width}`),
    );
    const patternHeight = yield* Result.mapError(
      RecipeGridDimension.result(height),
      () => recipeRangeFailureValue(`Recipe pattern height is invalid: ${height}`),
    );
    return { width: patternWidth, height: patternHeight, cells };
  });

export const ingredientMatches = (
  ingredient: CraftingIngredient,
  item: ItemType,
  itemTags: ItemTagMemberships = VANILLA_ITEM_TAG_MEMBERSHIPS,
): Result.Result<boolean, RecipeFailure> =>
  Result.map(normalizeCraftingIngredient(ingredient), (normalized) => {
    const matches = (candidate: CraftingIngredient): boolean => {
      if (candidate._tag === "AnyOf") {
        return candidate.options.some(matches);
      }
      if (candidate._tag === "Exact") {
        return candidate.item === item;
      }
      return itemTags.get(candidate.tag)?.has(item) ?? false;
    };
    return matches(normalized);
  });

export function shapedRecipe(
  id: RecipeId,
  rows: ReadonlyArray<RecipePatternRow>,
  key: RecipePatternKeyMap,
  output: ItemStack,
  options?: RecipeOptions,
): Result.Result<ShapedRecipe, RecipeFailure>;
export function shapedRecipe(
  id: RecipeId,
  rows: ReadonlyArray<RecipePatternRow>,
  key: RecipePatternKeyMap,
  output: ItemStack,
  options?: RecipeOptions,
): Result.Result<ShapedRecipe, RecipeFailure> {
  return Result.gen(function* () {
    const recipeId = yield* assertRecipeId(id);
    if (!isItemStack(output)) {
      return yield* recipeTypeFailure(
        "Recipe output must be a valid non-empty item stack",
      );
    }
    const pattern = yield* normalizePatternRows(rows, key);
    const normalizedOptions = yield* normalizeOptions(options);
    return {
      _tag: "Shaped",
      id: recipeId,
      output,
      pattern,
      ...normalizedOptions,
    };
  });
}

export function shapelessRecipe(
  id: RecipeId,
  ingredients: ReadonlyArray<CraftingIngredientInput>,
  output: ItemStack,
  options?: RecipeOptions,
): Result.Result<ShapelessRecipe, RecipeFailure>;
export function shapelessRecipe(
  id: RecipeId,
  ingredients: ReadonlyArray<CraftingIngredientInput>,
  output: ItemStack,
  options?: RecipeOptions,
): Result.Result<ShapelessRecipe, RecipeFailure> {
  return Result.gen(function* () {
    const recipeId = yield* assertRecipeId(id);
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return yield* recipeRangeFailure(
        "Shapeless recipes must contain at least one ingredient",
      );
    }
    if (!isItemStack(output)) {
      return yield* recipeTypeFailure(
        "Recipe output must be a valid non-empty item stack",
      );
    }
    const normalizedIngredients = yield* Result.all(
      ingredients.map(normalizeCraftingIngredient),
    );
    const normalizedOptions = yield* normalizeOptions(options);
    return {
      _tag: "Shapeless",
      id: recipeId,
      ingredients: normalizedIngredients,
      output,
      ...normalizedOptions,
    };
  });
}

const normalizeGridItem = (
  value: unknown,
): Result.Result<Slot, RecipeFailure> => {
  if (value === undefined) {
    return Result.succeed(undefined);
  }
  if (isItemStack(value)) {
    return Result.succeed(value);
  }
  if (isItemType(value)) {
    return Result.mapError(itemStack(value, 1), recipeItemFailure);
  }
  return recipeTypeFailure(
    "Craft grid cells must be item types, valid item stacks, or undefined",
  );
};

export const craftGrid = (
  width: RecipeGridDimension,
  height: RecipeGridDimension,
  items: ReadonlyArray<CraftGridInput>,
): Result.Result<CraftGrid, RecipeFailure> =>
  Result.gen(function* () {
    if (!Array.isArray(items)) {
      return yield* recipeRangeFailure(
        "Craft grid contains more cells than its dimensions allow",
      );
    }
    const validatedWidth = yield* Result.mapError(
      RecipeGridDimension.result(width),
      () =>
        recipeRangeFailureValue(
          `Craft grid dimensions must be safe integers in [0, ${MAX_RECIPE_SIDE}]`,
        ),
    );
    const validatedHeight = yield* Result.mapError(
      RecipeGridDimension.result(height),
      () =>
        recipeRangeFailureValue(
          `Craft grid dimensions must be safe integers in [0, ${MAX_RECIPE_SIDE}]`,
        ),
    );
    if (items.length > validatedWidth * validatedHeight) {
      return yield* recipeRangeFailure(
        "Craft grid contains more cells than its dimensions allow",
      );
    }
    const inputItems: ReadonlyArray<unknown> = items;
    const cells = yield* Result.all(
      Array.from({ length: validatedWidth * validatedHeight }, (_, index) =>
        normalizeGridItem(inputItems[index]),
      ),
    );
    return { width: validatedWidth, height: validatedHeight, cells };
  });

const staticIngredient = (value: IngredientInput): Ingredient => {
  if (typeof value !== "string") {
    return value;
  }
  return isRecipeItemTag(value)
    ? { _tag: "ItemTag", tag: value, count: RecipeIngredientCount(1) }
    : { _tag: "Exact", item: value, count: RecipeIngredientCount(1) };
};

const staticCraftingIngredient = (
  value: CraftingIngredientInput,
): CraftingIngredient => {
  if (Array.isArray(value)) {
    return {
      _tag: "AnyOf",
      options: value.map(staticIngredient),
      count: RecipeIngredientCount(1),
    };
  }
  if (isAnyOfIngredient(value)) {
    return value;
  }
  return staticIngredient(value);
};

const staticOptions = (options: RecipeOptions | undefined) => ({
  assumeSymmetry: options?.assumeSymmetry ?? false,
  ...(options?.category === undefined ? {} : { category: options.category }),
  ...(options?.group === undefined ? {} : { group: options.group }),
  priority: options?.priority ?? RecipePriority(0),
  ...(options?.showNotification === undefined
    ? {}
    : { showNotification: options.showNotification }),
  tags: options?.tags ?? [],
});

export const staticShapedRecipe = (
  id: string,
  rows: ReadonlyArray<string>,
  key: Readonly<Record<string, CraftingIngredientInput>>,
  output: ItemStack,
  options?: RecipeOptions,
): ShapedRecipe => {
  const keyBySymbol = new Map(Object.entries(key));
  const rawWidth = Math.max(...rows.map((row) => row.length));
  const rawCells: Array<PatternCell> = [];
  for (const row of rows) {
    for (let x = 0; x < rawWidth; x += 1) {
      const character = row[x];
      const ingredient = character === undefined || character === " "
        ? undefined
        : keyBySymbol.get(character);
      rawCells.push(
        ingredient === undefined ? undefined : staticCraftingIngredient(ingredient),
      );
    }
  }
  const occupied = rawCells.flatMap((cell, index) =>
    cell === undefined
      ? []
      : [{ x: index % rawWidth, y: Math.floor(index / rawWidth) }],
  );
  const minX = Math.min(...occupied.map(({ x }) => x));
  const maxX = Math.max(...occupied.map(({ x }) => x));
  const minY = Math.min(...occupied.map(({ y }) => y));
  const maxY = Math.max(...occupied.map(({ y }) => y));
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const cells = Array.from({ length: width * height }, (_, index) => {
    const x = minX + (index % width);
    const y = minY + Math.floor(index / width);
    return rawCells[y * rawWidth + x];
  });
  return {
    _tag: "Shaped",
    id: RecipeId(id),
    pattern: {
      width: RecipeGridDimension(width),
      height: RecipeGridDimension(height),
      cells,
    },
    output,
    ...staticOptions(options),
  };
};

export const staticShapelessRecipe = (
  id: string,
  ingredients: ReadonlyArray<CraftingIngredientInput>,
  output: ItemStack,
  options?: RecipeOptions,
): ShapelessRecipe => ({
  _tag: "Shapeless",
  id: RecipeId(id),
  ingredients: ingredients.map(staticCraftingIngredient),
  output,
  ...staticOptions(options),
});

export const cellAt = (
  grid: CraftGrid,
  x: RecipeGridIndex,
  y: RecipeGridIndex,
): Slot => {
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    y < 0 ||
    x >= grid.width ||
    y >= grid.height
  ) {
    return undefined;
  }
  return grid.cells[y * grid.width + x];
};
