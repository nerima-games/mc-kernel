import {
  isItemStack,
  itemStack,
  type ItemStack,
  type Slot,
} from "./item-stack.js";
import {
  craftingIngredient,
  isCraftingIngredient,
  isCraftingIngredientInput,
  type CraftingIngredient,
  type CraftingIngredientInput,
  type RecipeCategory,
  type RecipeId,
} from "./recipe-data.js";
import type { ItemType } from "./item-type.js";

export const COOKING_STATIONS = [
  "furnace",
  "blast_furnace",
  "smoker",
  "campfire",
] as const;

export type CookingStation = (typeof COOKING_STATIONS)[number];

export type CookingRecipeOptions = {
  readonly category?: RecipeCategory;
  readonly group?: string;
  readonly priority?: number;
  readonly showNotification?: boolean;
};

export type CookingRecipe = {
  readonly _tag: "Cooking";
  readonly id: RecipeId;
  readonly station: CookingStation;
  readonly ingredient: CraftingIngredient;
  readonly output: ItemStack;
  readonly cookTimeTicks: number;
  readonly experience: number;
  readonly category?: RecipeCategory;
  readonly group?: string;
  readonly priority: number;
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
  typeof value === "object" && value !== null && !Array.isArray(value);

const isCookingStation = (value: unknown): value is CookingStation =>
  COOKING_STATIONS.some((station) => station === value);

const isRecipeCategory = (value: unknown): value is RecipeCategory =>
  value === "building" ||
  value === "equipment" ||
  value === "misc" ||
  value === "redstone";

const assertRecipeId = (value: unknown): RecipeId => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError("Cooking recipe id must be a non-empty string");
  }
  return value;
};

const assertStation = (value: unknown): CookingStation => {
  if (!isCookingStation(value)) {
    throw new TypeError(`Unknown cooking station: ${String(value)}`);
  }
  return value;
};

const assertIngredient = (value: unknown): CraftingIngredient => {
  if (!isCraftingIngredientInput(value)) {
    throw new TypeError("Cooking recipe ingredient has an invalid shape");
  }
  return craftingIngredient(value);
};

const assertOutput = (value: unknown): ItemStack => {
  if (!isItemStack(value)) {
    throw new TypeError("Cooking recipe output must be an ItemStack");
  }
  return value;
};

const assertCookTimeTicks = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(
      `Cooking time must be a positive safe integer, received ${String(value)}`,
    );
  }
  return value;
};

const assertExperience = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new RangeError(
      `Cooking experience must be a finite non-negative number, received ${String(value)}`,
    );
  }
  return value;
};

const normalizeOptions = (
  options: unknown,
): Pick<
  CookingRecipe,
  "category" | "group" | "priority" | "showNotification"
> => {
  if (options === undefined) {
    return { priority: 0 };
  }
  if (!isRecord(options)) {
    throw new TypeError("Cooking recipe options must be an object");
  }
  const category = options.category;
  if (category !== undefined && !isRecipeCategory(category)) {
    throw new TypeError(
      `Cooking recipe category is invalid: ${String(category)}`,
    );
  }
  const group = options.group;
  if (group !== undefined && typeof group !== "string") {
    throw new TypeError("Cooking recipe group must be a string");
  }
  const priority = options.priority ?? 0;
  if (
    typeof priority !== "number" ||
    !Number.isSafeInteger(priority) ||
    priority < 0
  ) {
    throw new RangeError(
      `Cooking recipe priority must be a non-negative safe integer, received ${String(priority)}`,
    );
  }
  const showNotification = options.showNotification;
  if (showNotification !== undefined && typeof showNotification !== "boolean") {
    throw new TypeError("Cooking recipe show notification must be a boolean");
  }
  return {
    ...(category === undefined ? {} : { category }),
    ...(group === undefined ? {} : { group }),
    priority,
    ...(showNotification === undefined ? {} : { showNotification }),
  };
};

export function cookingRecipe(
  id: RecipeId,
  station: CookingStation,
  ingredient: CraftingIngredientInput,
  output: ItemStack,
  cookTimeTicks: number,
  experience: number,
  options?: CookingRecipeOptions,
): CookingRecipe;
export function cookingRecipe(
  id: RecipeId,
  station: CookingStation,
  ingredient: CraftingIngredientInput,
  output: ItemStack,
  cookTimeTicks: number,
  experience: number,
  options?: CookingRecipeOptions,
): CookingRecipe {
  return {
    _tag: "Cooking",
    id: assertRecipeId(id),
    station: assertStation(station),
    ingredient: assertIngredient(ingredient),
    output: assertOutput(output),
    cookTimeTicks: assertCookTimeTicks(cookTimeTicks),
    experience: assertExperience(experience),
    ...normalizeOptions(options),
  };
}

const hasCookingIdentity = (value: RecordValue): boolean =>
  value._tag === "Cooking" &&
  typeof value.id === "string" &&
  value.id.trim().length > 0 &&
  isCookingStation(value.station) &&
  isCraftingIngredient(value.ingredient) &&
  isItemStack(value.output);

const hasCookingQuantities = (value: RecordValue): boolean =>
  typeof value.cookTimeTicks === "number" &&
  Number.isSafeInteger(value.cookTimeTicks) &&
  value.cookTimeTicks >= 1 &&
  typeof value.experience === "number" &&
  Number.isFinite(value.experience) &&
  value.experience >= 0 &&
  typeof value.priority === "number" &&
  Number.isSafeInteger(value.priority) &&
  value.priority >= 0;

const hasCookingMetadata = (value: RecordValue): boolean =>
  (value.category === undefined || isRecipeCategory(value.category)) &&
  (value.group === undefined || typeof value.group === "string") &&
  (value.showNotification === undefined ||
    typeof value.showNotification === "boolean");

export const isCookingRecipe = (value: unknown): value is CookingRecipe =>
  isRecord(value) &&
  hasCookingIdentity(value) &&
  hasCookingQuantities(value) &&
  hasCookingMetadata(value);

export const cookingRecipeForItem = (
  id: RecipeId,
  station: CookingStation,
  ingredient: CraftingIngredientInput,
  output: ItemType,
  count: number,
  cookTimeTicks: number,
  experience: number,
  options?: CookingRecipeOptions,
): CookingRecipe =>
  cookingRecipe(
    id,
    station,
    ingredient,
    itemStack(output, count),
    cookTimeTicks,
    experience,
    options,
  );

export type CookingInput = Slot;
