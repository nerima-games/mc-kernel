import {
  isItemStack,
  itemStack,
  type ItemStack,
  type Slot,
} from "./item-stack.js";
import { isItemType, type ItemType } from "./item-type.js";
import { VANILLA_ITEM_TAG_MEMBERSHIPS } from "./tag-membership.js";

export const MAX_RECIPE_SIDE = 3;

export type RecipeId = string;
export type RecipeItemTag = `#${string}`;
export type RecipeStationTag = string;

export type ExactIngredient = {
  readonly _tag: "Exact";
  readonly item: ItemType;
  readonly count: number;
};

export type ItemTagIngredient = {
  readonly _tag: "ItemTag";
  readonly tag: RecipeItemTag;
  readonly count: number;
};

export type Ingredient = ExactIngredient | ItemTagIngredient;
export type IngredientInput = ItemType | RecipeItemTag | Ingredient;
export type AnyOfIngredient = {
  readonly _tag: "AnyOf";
  readonly options: ReadonlyArray<Ingredient>;
  readonly count: number;
};

export type CraftingIngredient = Ingredient | AnyOfIngredient;
export type CraftingIngredientInput =
  | IngredientInput
  | ReadonlyArray<IngredientInput>
  | AnyOfIngredient;
export type PatternCell = CraftingIngredient | undefined;

export type RecipePattern = {
  readonly width: number;
  readonly height: number;
  readonly cells: ReadonlyArray<PatternCell>;
};

export type RecipeOptions = {
  readonly assumeSymmetry?: boolean;
  readonly category?: RecipeCategory;
  readonly group?: string;
  readonly priority?: number;
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
  readonly group?: string;
  readonly priority: number;
  readonly showNotification?: boolean;
  readonly tags: ReadonlyArray<RecipeStationTag>;
};

export type ShapelessRecipe = {
  readonly _tag: "Shapeless";
  readonly id: RecipeId;
  readonly ingredients: ReadonlyArray<CraftingIngredient>;
  readonly output: ItemStack;
  readonly category?: RecipeCategory;
  readonly group?: string;
  readonly priority: number;
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
  readonly width: number;
  readonly height: number;
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

const isIngredientCount = (count: unknown): count is number =>
  typeof count === "number" &&
  Number.isSafeInteger(count) &&
  count >= 1 &&
  count <= 64;

const assertRecipeId = (id: unknown): RecipeId => {
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new TypeError("Recipe id must be a non-empty string");
  }
  return id;
};

const assertPositiveCount = (count: unknown): number => {
  if (!isIngredientCount(count)) {
    throw new RangeError(
      `Ingredient count must be a safe integer in [1, 64], received ${count}`,
    );
  }
  return count;
};

export const isRecipeItemTag = (tag: unknown): tag is RecipeItemTag =>
  typeof tag === "string" && /^#[^\s#]+$/.test(tag);

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

const assertRecipeItemTag = (tag: unknown): RecipeItemTag => {
  if (!isRecipeItemTag(tag)) {
    throw new TypeError(
      `Recipe item tag must start with # and contain a name, received ${String(tag)}`,
    );
  }
  return tag;
};

const assertStationTag = (tag: unknown): RecipeStationTag => {
  if (typeof tag !== "string" || tag.trim().length === 0) {
    throw new TypeError("Recipe station tags must be non-empty strings");
  }
  return tag;
};

export function exactly(item: ItemType, count?: number): ExactIngredient;
export function exactly(item: ItemType, count: number = 1): ExactIngredient {
  if (!isItemType(item)) {
    throw new TypeError(`Unknown exact ingredient item: ${String(item)}`);
  }
  return { _tag: "Exact", count: assertPositiveCount(count), item };
}

export function tagged(tag: RecipeItemTag, count?: number): ItemTagIngredient;
export function tagged(
  tag: RecipeItemTag,
  count: number = 1,
): ItemTagIngredient {
  return {
    _tag: "ItemTag",
    count: assertPositiveCount(count),
    tag: assertRecipeItemTag(tag),
  };
}

const normalizeIngredient = (value: unknown): Ingredient => {
  if (typeof value === "string") {
    if (isItemType(value)) {
      return exactly(value);
    }
    return tagged(assertRecipeItemTag(value));
  }

  if (!isRecord(value)) {
    throw new TypeError(
      "Recipe ingredient must be an item type, item tag, or ingredient object",
    );
  }

  const candidate = value;
  if (
    candidate._tag === "Exact" &&
    isItemType(candidate.item) &&
    typeof candidate.count === "number"
  ) {
    return exactly(candidate.item, candidate.count);
  }
  if (
    candidate._tag === "ItemTag" &&
    typeof candidate.tag === "string" &&
    typeof candidate.count === "number"
  ) {
    return tagged(assertRecipeItemTag(candidate.tag), candidate.count);
  }
  throw new TypeError("Recipe ingredient object has an invalid shape");
};

export function anyOf(
  options: ReadonlyArray<IngredientInput>,
  count?: number,
): AnyOfIngredient;
export function anyOf(
  options: ReadonlyArray<IngredientInput>,
  count: number = 1,
): AnyOfIngredient {
  if (!Array.isArray(options) || options.length === 0) {
    throw new RangeError(
      "Alternative ingredient lists must contain at least one ingredient",
    );
  }
  return {
    _tag: "AnyOf",
    count: assertPositiveCount(count),
    options: options.map(normalizeIngredient),
  };
}

const normalizeCraftingIngredient = (value: unknown): CraftingIngredient => {
  if (Array.isArray(value)) {
    return anyOf(value);
  }
  if (
    isRecord(value) &&
    value._tag === "AnyOf" &&
    Array.isArray(value.options) &&
    typeof value.count === "number"
  ) {
    return anyOf(value.options, value.count);
  }
  return normalizeIngredient(value);
};

export function craftingIngredient(
  value: CraftingIngredientInput,
): CraftingIngredient;
export function craftingIngredient(value: CraftingIngredientInput): CraftingIngredient {
  return normalizeCraftingIngredient(value);
}

const normalizeOptionsRecord = (options: unknown): RecordValue | undefined => {
  if (options === undefined) {
    return undefined;
  }
  if (!isRecord(options)) {
    throw new TypeError("Recipe options must be an object");
  }
  return options;
};

const normalizeCategory = (category: unknown): RecipeCategory | undefined => {
  if (
    category !== undefined &&
    category !== "building" &&
    category !== "equipment" &&
    category !== "misc" &&
    category !== "redstone"
  ) {
    throw new TypeError(
      `Recipe category is invalid, received ${String(category)}`,
    );
  }
  return category;
};

const normalizeGroup = (group: unknown): string | undefined => {
  if (group !== undefined && typeof group !== "string") {
    throw new TypeError("Recipe group must be a string");
  }
  return group;
};

const normalizeShowNotification = (
  showNotification: unknown,
): boolean | undefined => {
  if (showNotification !== undefined && typeof showNotification !== "boolean") {
    throw new TypeError("Recipe show notification must be a boolean");
  }
  return showNotification;
};

const normalizeOptions = (
  options: unknown,
): Pick<
  ShapedRecipe,
  | "assumeSymmetry"
  | "category"
  | "group"
  | "priority"
  | "showNotification"
  | "tags"
> => {
  const record = normalizeOptionsRecord(options);
  const assumeSymmetry = record?.assumeSymmetry ?? false;
  if (typeof assumeSymmetry !== "boolean") {
    throw new TypeError("Recipe symmetry must be a boolean");
  }
  const priority = record?.priority ?? 0;
  if (
    typeof priority !== "number" ||
    !Number.isSafeInteger(priority) ||
    priority < 0
  ) {
    throw new RangeError(
      `Recipe priority must be a non-negative safe integer, received ${priority}`,
    );
  }
  const rawTags = record?.tags ?? [];
  if (!Array.isArray(rawTags)) {
    throw new TypeError("Recipe station tags must be an array");
  }
  const tags = rawTags.map(assertStationTag);
  const category = normalizeCategory(record?.category);
  const group = normalizeGroup(record?.group);
  const showNotification = normalizeShowNotification(record?.showNotification);
  return {
    assumeSymmetry,
    ...(category === undefined ? {} : { category }),
    ...(group === undefined ? {} : { group }),
    priority,
    ...(showNotification === undefined ? {} : { showNotification }),
    tags,
  };
};

const normalizePatternRows = (rows: unknown, key: unknown): RecipePattern => {
  if (
    !Array.isArray(rows) ||
    rows.length < 1 ||
    rows.length > MAX_RECIPE_SIDE
  ) {
    throw new RangeError(
      `Shaped recipe rows must contain 1 to ${MAX_RECIPE_SIDE} rows`,
    );
  }
  if (!isRecord(key)) {
    throw new TypeError("Shaped recipe key must be an object");
  }
  const typedRows = rows.map((row: unknown) => {
    if (typeof row !== "string" || row.length > MAX_RECIPE_SIDE) {
      throw new RangeError(
        `Shaped recipe rows must be strings no wider than ${MAX_RECIPE_SIDE} characters`,
      );
    }
    return row;
  });

  const ingredients = new Map<string, CraftingIngredient>();
  for (const [character, ingredient] of Object.entries(key)) {
    if (character.length !== 1 || character === " ") {
      throw new TypeError(
        "Shaped recipe keys must use one non-space character",
      );
    }
    ingredients.set(character, normalizeCraftingIngredient(ingredient));
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
      const ingredient = ingredients.get(character);
      if (ingredient === undefined) {
        throw new TypeError(
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
    throw new RangeError(
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

  return { width, height, cells };
};

export function ingredientMatches(
  ingredient: CraftingIngredient,
  item: ItemType,
  itemTags?: ItemTagMemberships,
): boolean;
export function ingredientMatches(
  ingredient: CraftingIngredient,
  item: ItemType,
  itemTags: ItemTagMemberships = VANILLA_ITEM_TAG_MEMBERSHIPS,
): boolean {
  const normalized = normalizeCraftingIngredient(ingredient);
  if (normalized._tag === "AnyOf") {
    return normalized.options.some((option) =>
      ingredientMatches(option, item, itemTags),
    );
  }
  if (normalized._tag === "Exact") {
    return normalized.item === item;
  }
  return itemTags.get(normalized.tag)?.has(item) ?? false;
}

export function shapedRecipe(
  id: RecipeId,
  rows: ReadonlyArray<string>,
  key: Readonly<Record<string, CraftingIngredientInput>>,
  output: ItemStack,
  options?: RecipeOptions,
): ShapedRecipe;
export function shapedRecipe(
  id: RecipeId,
  rows: ReadonlyArray<string>,
  key: Readonly<Record<string, CraftingIngredientInput>>,
  output: ItemStack,
  options?: RecipeOptions,
): ShapedRecipe {
  if (!isItemStack(output)) {
    throw new TypeError("Recipe output must be a valid non-empty item stack");
  }
  return {
    _tag: "Shaped",
    id: assertRecipeId(id),
    output,
    pattern: normalizePatternRows(rows, key),
    ...normalizeOptions(options),
  };
}

export function shapelessRecipe(
  id: RecipeId,
  ingredients: ReadonlyArray<CraftingIngredientInput>,
  output: ItemStack,
  options?: RecipeOptions,
): ShapelessRecipe;
export function shapelessRecipe(
  id: RecipeId,
  ingredients: ReadonlyArray<CraftingIngredientInput>,
  output: ItemStack,
  options?: RecipeOptions,
): ShapelessRecipe {
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    throw new RangeError(
      "Shapeless recipes must contain at least one ingredient",
    );
  }
  if (!isItemStack(output)) {
    throw new TypeError("Recipe output must be a valid non-empty item stack");
  }
  return {
    _tag: "Shapeless",
    id: assertRecipeId(id),
    ingredients: ingredients.map(normalizeCraftingIngredient),
    output,
    ...normalizeOptions(options),
  };
}

const normalizeGridItem = (value: unknown): Slot => {
  if (value === undefined) {
    return undefined;
  }
  if (isItemStack(value)) {
    return value;
  }
  if (isItemType(value)) {
    return itemStack(value, 1);
  }
  throw new TypeError(
    "Craft grid cells must be item types, valid item stacks, or undefined",
  );
};

export function craftGrid(
  width: number,
  height: number,
  items: ReadonlyArray<CraftGridInput>,
): CraftGrid;
export function craftGrid(
  width: number,
  height: number,
  items: ReadonlyArray<CraftGridInput>,
): CraftGrid {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 0 ||
    height < 0 ||
    width > MAX_RECIPE_SIDE ||
    height > MAX_RECIPE_SIDE
  ) {
    throw new RangeError(
      `Craft grid dimensions must be safe integers in [0, ${MAX_RECIPE_SIDE}]`,
    );
  }
  if (!Array.isArray(items) || items.length > width * height) {
    throw new RangeError(
      "Craft grid contains more cells than its dimensions allow",
    );
  }
  const inputItems: ReadonlyArray<unknown> = items;
  const cells = Array.from({ length: width * height }, (_, index) =>
    normalizeGridItem(inputItems[index]),
  );
  return { width, height, cells };
}

export const cellAt = (grid: CraftGrid, x: number, y: number): Slot => {
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
