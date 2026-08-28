import {
  craftGrid,
  ingredientMatches,
  isRecipeItemTag,
  type CraftGrid,
  type ItemTagMemberships,
  type RecipeMatchContext,
} from "./recipe-data.js";
import {
  isItemStack,
  itemStackWithCount,
  transmuteItemStack,
  type ItemStack,
} from "./item-stack.js";
import { isItemType } from "./item-type.js";
import {
  isTransmuteRecipe,
  type TransmuteRecipe,
  type TransmuteRecipeTable,
} from "./transmute-data.js";

export type TransmuteMatch =
  | {
      readonly _tag: "Match";
      readonly recipe: TransmuteRecipe;
      readonly sourceSlotIndex: number;
      readonly materialSlotIndexes: ReadonlyArray<number>;
      readonly output: ItemStack;
    }
  | { readonly _tag: "NoMatch" };

export type TransmuteApplyResult =
  | {
      readonly _tag: "Applied";
      readonly recipe: TransmuteRecipe;
      readonly sourceSlotIndex: number;
      readonly materialSlotIndexes: ReadonlyArray<number>;
      readonly output: ItemStack;
      readonly remainingGrid: CraftGrid;
    }
  | { readonly _tag: "NoMatch" };

type RecordValue = {
  readonly width?: unknown;
  readonly height?: unknown;
  readonly cells?: unknown;
  readonly station?: unknown;
  readonly itemTags?: unknown;
};

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isItemTagMemberships = (value: unknown): value is ItemTagMemberships => {
  if (!(value instanceof Map)) {
    return false;
  }
  return [...value.entries()].every(
    ([tag, items]) =>
      isRecipeItemTag(tag) &&
      items instanceof Set &&
      [...items].every((item) => isItemType(item)),
  );
};

function assertContext(value: unknown): asserts value is RecipeMatchContext {
  if (!isRecord(value)) {
    throw new TypeError("Transmute match context must be an object");
  }
  if (
    value.station !== undefined &&
    (typeof value.station !== "string" || value.station.trim().length === 0)
  ) {
    throw new TypeError(
      "Transmute match context station must be a non-empty string",
    );
  }
  if (value.itemTags !== undefined && !isItemTagMemberships(value.itemTags)) {
    throw new TypeError("Transmute match context itemTags must be a Map");
  }
}

const isCraftGrid = (value: unknown): value is CraftGrid => {
  if (!isRecord(value)) {
    return false;
  }
  if (
    typeof value.width !== "number" ||
    !Number.isSafeInteger(value.width) ||
    typeof value.height !== "number" ||
    !Number.isSafeInteger(value.height) ||
    value.width < 0 ||
    value.width > 3 ||
    value.height < 0 ||
    value.height > 3 ||
    !Array.isArray(value.cells) ||
    value.cells.length !== value.width * value.height
  ) {
    return false;
  }
  return value.cells.every((cell) => cell === undefined || isItemStack(cell));
};

function assertGrid(value: unknown): asserts value is CraftGrid {
  if (!isCraftGrid(value)) {
    throw new TypeError("Transmute grid must be a valid craft grid");
  }
}

function assertRecipe(value: unknown): asserts value is TransmuteRecipe {
  if (!isTransmuteRecipe(value)) {
    throw new TypeError("Transmute recipe has an invalid shape");
  }
}

function assertRecipeTable(
  value: unknown,
): asserts value is TransmuteRecipeTable {
  if (!Array.isArray(value)) {
    throw new TypeError("Transmute recipes must be an array");
  }
  value.forEach(assertRecipe);
}

const materialMatches = (
  recipe: TransmuteRecipe,
  slot: ItemStack,
  itemTags: ItemTagMemberships | undefined,
): boolean =>
  slot.count >= recipe.material.count &&
  ingredientMatches(recipe.material, slot.item, itemTags);

const sourceMatches = (
  recipe: TransmuteRecipe,
  slot: ItemStack,
  itemTags: ItemTagMemberships | undefined,
): boolean =>
  slot.count >= recipe.source.count &&
  ingredientMatches(recipe.source, slot.item, itemTags);

const transmuteMatch = (
  recipe: TransmuteRecipe,
  grid: CraftGrid,
  context: RecipeMatchContext,
): TransmuteMatch => {
  if (grid.width !== 3 || grid.height !== 3) {
    return { _tag: "NoMatch" };
  }
  for (const sourceSlotIndex of grid.cells.keys()) {
    const source = grid.cells[sourceSlotIndex];
    if (
      source === undefined ||
      !sourceMatches(recipe, source, context.itemTags)
    ) {
      continue;
    }
    const materialSlotIndexes: number[] = [];
    let invalidMaterialSlot = false;
    for (const [slotIndex, slot] of grid.cells.entries()) {
      if (slotIndex === sourceSlotIndex || slot === undefined) {
        continue;
      }
      if (!materialMatches(recipe, slot, context.itemTags)) {
        invalidMaterialSlot = true;
        break;
      }
      materialSlotIndexes.push(slotIndex);
    }
    if (
      invalidMaterialSlot ||
      materialSlotIndexes.length < recipe.materialCount.min ||
      materialSlotIndexes.length > recipe.materialCount.max
    ) {
      continue;
    }
    const outputCount = recipe.addMaterialCountToResult
      ? recipe.output.count + materialSlotIndexes.length
      : recipe.output.count;
    return {
      _tag: "Match",
      recipe,
      sourceSlotIndex,
      materialSlotIndexes,
      output: transmuteItemStack(source, recipe.output, outputCount),
    };
  }
  return { _tag: "NoMatch" };
};

const compareRecipes = (
  left: TransmuteRecipe,
  right: TransmuteRecipe,
): number => left.priority - right.priority || left.id.localeCompare(right.id);

export function matchesTransmuteRecipe(
  recipe: TransmuteRecipe,
  grid: TransmuteInput,
  context?: RecipeMatchContext,
): boolean;
export function matchesTransmuteRecipe(
  recipe: TransmuteRecipe,
  grid: TransmuteInput,
  context: RecipeMatchContext = {},
): boolean {
  assertRecipe(recipe);
  assertGrid(grid);
  assertContext(context);
  return transmuteMatch(recipe, grid, context)._tag === "Match";
}

export function matchTransmuteRecipes(
  grid: TransmuteInput,
  context?: RecipeMatchContext,
  recipes?: TransmuteRecipeTable,
): ReadonlyArray<TransmuteMatch>;
export function matchTransmuteRecipes(
  grid: TransmuteInput,
  context: RecipeMatchContext = {},
  recipes: TransmuteRecipeTable = [],
): ReadonlyArray<TransmuteMatch> {
  assertGrid(grid);
  assertContext(context);
  assertRecipeTable(recipes);
  return recipes
    .slice()
    .sort(compareRecipes)
    .map((recipe) => transmuteMatch(recipe, grid, context))
    .filter((match) => match._tag === "Match");
}

export function matchTransmuteRecipe(
  grid: TransmuteInput,
  context?: RecipeMatchContext,
  recipes?: TransmuteRecipeTable,
): TransmuteMatch;
export function matchTransmuteRecipe(
  grid: TransmuteInput,
  context: RecipeMatchContext = {},
  recipes: TransmuteRecipeTable = [],
): TransmuteMatch {
  return (
    matchTransmuteRecipes(grid, context, recipes)[0] ?? { _tag: "NoMatch" }
  );
}

export function applyTransmute(
  recipe: TransmuteRecipe,
  grid: TransmuteInput,
  context?: RecipeMatchContext,
): TransmuteApplyResult;
export function applyTransmute(
  recipe: TransmuteRecipe,
  grid: TransmuteInput,
  context: RecipeMatchContext = {},
): TransmuteApplyResult {
  assertRecipe(recipe);
  assertGrid(grid);
  assertContext(context);
  const match = transmuteMatch(recipe, grid, context);
  if (match._tag === "NoMatch") {
    return match;
  }
  const consumed = new Set([
    match.sourceSlotIndex,
    ...match.materialSlotIndexes,
  ]);
  const remainingCells = grid.cells.map((slot, slotIndex) => {
    if (slot === undefined || !consumed.has(slotIndex)) {
      return slot;
    }
    const ingredient =
      slotIndex === match.sourceSlotIndex ? recipe.source : recipe.material;
    const remainingCount = slot.count - ingredient.count;
    return remainingCount === 0
      ? undefined
      : itemStackWithCount(slot, remainingCount);
  });
  return {
    _tag: "Applied",
    recipe,
    sourceSlotIndex: match.sourceSlotIndex,
    materialSlotIndexes: match.materialSlotIndexes,
    output: match.output,
    remainingGrid: craftGrid(grid.width, grid.height, remainingCells),
  };
}

export type TransmuteInput = CraftGrid;

export {
  TRANSMUTE_MAX_MATERIAL_SLOTS,
  isTransmuteMaterialCount,
  isTransmuteRecipe,
  transmuteRecipe,
  transmuteRecipeForItem,
} from "./transmute-data.js";
export type {
  TransmuteMaterialCount,
  TransmuteRecipe,
  TransmuteRecipeOptions,
  TransmuteRecipeTable,
} from "./transmute-data.js";
