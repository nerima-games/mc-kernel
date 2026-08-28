import {
  isItemStack,
  itemStack,
  maxStackCountForStack,
  type ItemStack,
} from "./item-stack.js";
import { type ItemType } from "./item-type.js";
import {
  craftingIngredient,
  isCraftingIngredient,
  isCraftingIngredientInput,
  type CraftingIngredient,
  type CraftingIngredientInput,
  type RecipeCategory,
  type RecipeId,
} from "./recipe-data.js";

export const TRANSMUTE_MAX_MATERIAL_SLOTS = 8;

export type TransmuteMaterialCount = Readonly<{
  readonly min: number;
  readonly max: number;
}>;

export type TransmuteRecipeOptions = Readonly<{
  readonly addMaterialCountToResult?: boolean;
  readonly category?: RecipeCategory;
  readonly group?: string;
  readonly materialCount?: TransmuteMaterialCount;
  readonly priority?: number;
  readonly showNotification?: boolean;
}>;

export type TransmuteRecipe = {
  readonly _tag: "Transmute";
  readonly id: RecipeId;
  readonly source: CraftingIngredient;
  readonly material: CraftingIngredient;
  readonly output: ItemStack;
  readonly materialCount: TransmuteMaterialCount;
  readonly addMaterialCountToResult: boolean;
  readonly category?: RecipeCategory;
  readonly group?: string;
  readonly priority: number;
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
  typeof value === "object" && value !== null && !Array.isArray(value);

const isRecipeCategory = (value: unknown): value is RecipeCategory =>
  value === "building" ||
  value === "equipment" ||
  value === "misc" ||
  value === "redstone";

const assertRecipeId = (id: unknown): RecipeId => {
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new TypeError("Transmute recipe id must be a non-empty string");
  }
  return id;
};

const isInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value);

export const isTransmuteMaterialCount = (
  value: unknown,
): value is TransmuteMaterialCount => {
  if (!isRecord(value) || !isInteger(value.min) || !isInteger(value.max)) {
    return false;
  }
  if (
    value.min < 1 ||
    value.max > TRANSMUTE_MAX_MATERIAL_SLOTS ||
    value.min > value.max
  ) {
    return false;
  }
  return value.min === 1 ? value.max === 1 : value.min >= 2;
};

const assertMaterialCount = (value: unknown): TransmuteMaterialCount => {
  if (!isTransmuteMaterialCount(value)) {
    throw new RangeError(
      `Transmute material count must be [1, 1] or a range in [2, ${TRANSMUTE_MAX_MATERIAL_SLOTS}], received ${String(value)}`,
    );
  }
  return { min: value.min, max: value.max };
};

const assertIngredient = (ingredient: unknown): CraftingIngredient => {
  if (!isCraftingIngredientInput(ingredient)) {
    throw new TypeError("Transmute ingredient has an invalid shape");
  }
  return craftingIngredient(ingredient);
};

const assertOutput = (output: unknown): ItemStack => {
  if (!isItemStack(output)) {
    throw new TypeError("Transmute output must be an ItemStack");
  }
  return output;
};

const assertCategory = (value: unknown): RecipeCategory | undefined => {
  if (value !== undefined && !isRecipeCategory(value)) {
    throw new TypeError(`Transmute recipe category is invalid: ${String(value)}`);
  }
  return value;
};

const assertGroup = (value: unknown): string | undefined => {
  if (value !== undefined && typeof value !== "string") {
    throw new TypeError("Transmute recipe group must be a string");
  }
  return value;
};

const assertPriority = (value: unknown): number => {
  const priority = value ?? 0;
  if (!isInteger(priority) || priority < 0) {
    throw new RangeError(
      `Transmute recipe priority must be a non-negative safe integer, received ${String(priority)}`,
    );
  }
  return priority;
};

const assertShowNotification = (value: unknown): boolean | undefined => {
  if (value !== undefined && typeof value !== "boolean") {
    throw new TypeError("Transmute recipe show notification must be a boolean");
  }
  return value;
};

const assertResultCountFlag = (value: unknown): boolean => {
  const flag = value ?? false;
  if (typeof flag !== "boolean") {
    throw new TypeError("Transmute result count option must be a boolean");
  }
  return flag;
};

const normalizeOptions = (
  options: unknown,
): Required<
  Pick<
    TransmuteRecipe,
    "addMaterialCountToResult" | "materialCount" | "priority"
  >
> &
  Pick<TransmuteRecipe, "category" | "group" | "showNotification"> => {
  if (options !== undefined && !isRecord(options)) {
    throw new TypeError("Transmute recipe options must be an object");
  }
  const record = options;
  const category = assertCategory(record?.category);
  const group = assertGroup(record?.group);
  const priority = assertPriority(record?.priority);
  const showNotification = assertShowNotification(record?.showNotification);
  const addMaterialCountToResult = assertResultCountFlag(
    record?.addMaterialCountToResult,
  );
  const materialCount = assertMaterialCount(
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
};

export function transmuteRecipe(
  id: RecipeId,
  source: CraftingIngredientInput,
  material: CraftingIngredientInput,
  output: ItemStack,
  options?: TransmuteRecipeOptions,
): TransmuteRecipe;
export function transmuteRecipe(
  id: RecipeId,
  source: CraftingIngredientInput,
  material: CraftingIngredientInput,
  output: ItemStack,
  options?: TransmuteRecipeOptions,
): TransmuteRecipe {
  const normalizedOptions = normalizeOptions(options);
  const normalizedOutput = assertOutput(output);
  if (
    normalizedOptions.addMaterialCountToResult &&
    normalizedOutput.count + normalizedOptions.materialCount.max >
      maxStackCountForStack(normalizedOutput)
  ) {
    throw new RangeError(
      "Transmute output cannot contain the configured material count",
    );
  }
  return {
    _tag: "Transmute",
    id: assertRecipeId(id),
    source: assertIngredient(source),
    material: assertIngredient(material),
    output: normalizedOutput,
    ...normalizedOptions,
  };
}

export const isTransmuteRecipe = (value: unknown): value is TransmuteRecipe => {
  if (!isRecord(value)) {
    return false;
  }
  return (
    value._tag === "Transmute" &&
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    isCraftingIngredient(value.source) &&
    isCraftingIngredient(value.material) &&
    isItemStack(value.output) &&
    isTransmuteMaterialCount(value.materialCount) &&
    typeof value.addMaterialCountToResult === "boolean" &&
    (value.category === undefined || isRecipeCategory(value.category)) &&
    (value.group === undefined || typeof value.group === "string") &&
    isInteger(value.priority) &&
    value.priority >= 0 &&
    (value.showNotification === undefined ||
      typeof value.showNotification === "boolean")
  );
};

export const transmuteRecipeForItem = (
  id: RecipeId,
  source: CraftingIngredientInput,
  material: CraftingIngredientInput,
  output: ItemType,
  count: number,
  options?: TransmuteRecipeOptions,
): TransmuteRecipe =>
  transmuteRecipe(id, source, material, itemStack(output, count), options);
