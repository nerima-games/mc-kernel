import {
  cookingRecipe,
  cookingRecipeForItem,
  isCookingRecipe,
  type CookingInput,
  type CookingRecipe,
  type CookingRecipeTable,
} from "./cooking-data.js";
import {
  ingredientMatches,
  type ItemTagMemberships,
  type RecipeMatchContext,
} from "./recipe-data.js";
import {
  isItemStack,
  itemStackWithCount,
  type ItemStack,
} from "./item-stack.js";

export type CookingMatch =
  | {
      readonly _tag: "Match";
      readonly recipe: CookingRecipe;
      readonly output: ItemStack;
    }
  | { readonly _tag: "NoMatch" };

export type CookingApplyResult =
  | {
      readonly _tag: "Applied";
      readonly recipe: CookingRecipe;
      readonly output: ItemStack;
      readonly remainingInput: CookingInput;
    }
  | { readonly _tag: "NoMatch" };

type RecordValue = {
  readonly station?: unknown;
  readonly itemTags?: unknown;
};

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isItemTagMemberships = (value: unknown): value is ItemTagMemberships =>
  value instanceof Map;

function assertContext(value: unknown): asserts value is RecipeMatchContext {
  if (!isRecord(value)) {
    throw new TypeError("Cooking match context must be an object");
  }
  if (
    value.station !== undefined &&
    (typeof value.station !== "string" || value.station.trim().length === 0)
  ) {
    throw new TypeError(
      "Cooking match context station must be a non-empty string",
    );
  }
  if (value.itemTags !== undefined && !isItemTagMemberships(value.itemTags)) {
    throw new TypeError("Cooking match context itemTags must be a Map");
  }
}

function assertInput(value: unknown): asserts value is CookingInput {
  if (value !== undefined && !isItemStack(value)) {
    throw new TypeError("Cooking input must be an ItemStack or undefined");
  }
}

function assertRecipe(value: unknown): asserts value is CookingRecipe {
  if (!isCookingRecipe(value)) {
    throw new TypeError("Cooking recipe has an invalid shape");
  }
}

function assertRecipeTable(
  value: unknown,
): asserts value is CookingRecipeTable {
  if (!Array.isArray(value)) {
    throw new TypeError("Cooking recipes must be an array");
  }
  value.forEach(assertRecipe);
}

const recipeMatches = (
  recipe: CookingRecipe,
  input: CookingInput,
  context: RecipeMatchContext,
): boolean =>
  input !== undefined &&
  (context.station === undefined || recipe.station === context.station) &&
  input.count >= recipe.ingredient.count &&
  ingredientMatches(recipe.ingredient, input.item, context.itemTags);

const compareRecipes = (left: CookingRecipe, right: CookingRecipe): number =>
  left.priority - right.priority || left.id.localeCompare(right.id);

export function matchesCookingRecipe(
  recipe: CookingRecipe,
  input: CookingInput,
  context?: RecipeMatchContext,
): boolean;
export function matchesCookingRecipe(
  recipe: CookingRecipe,
  input: CookingInput,
  context: RecipeMatchContext = {},
): boolean {
  assertRecipe(recipe);
  assertInput(input);
  assertContext(context);
  return recipeMatches(recipe, input, context);
}

export function matchCookingRecipes(
  input: CookingInput,
  context?: RecipeMatchContext,
  recipes?: CookingRecipeTable,
): ReadonlyArray<CookingRecipe>;
export function matchCookingRecipes(
  input: CookingInput,
  context: RecipeMatchContext = {},
  recipes: CookingRecipeTable = [],
): ReadonlyArray<CookingRecipe> {
  assertInput(input);
  assertContext(context);
  assertRecipeTable(recipes);
  return recipes
    .filter((recipe) => recipeMatches(recipe, input, context))
    .sort(compareRecipes);
}

export function matchCookingRecipe(
  input: CookingInput,
  context?: RecipeMatchContext,
  recipes?: CookingRecipeTable,
): CookingMatch;
export function matchCookingRecipe(
  input: CookingInput,
  context: RecipeMatchContext = {},
  recipes: CookingRecipeTable = [],
): CookingMatch {
  const recipe = matchCookingRecipes(input, context, recipes)[0];
  return recipe === undefined
    ? { _tag: "NoMatch" }
    : { _tag: "Match", recipe, output: recipe.output };
}

export function applyCooking(
  recipe: CookingRecipe,
  input: CookingInput,
  context?: RecipeMatchContext,
): CookingApplyResult;
export function applyCooking(
  recipe: CookingRecipe,
  input: CookingInput,
  context: RecipeMatchContext = {},
): CookingApplyResult {
  assertRecipe(recipe);
  assertInput(input);
  assertContext(context);
  if (!recipeMatches(recipe, input, context) || input === undefined) {
    return { _tag: "NoMatch" };
  }
  const remainingCount = input.count - recipe.ingredient.count;
  return {
    _tag: "Applied",
    recipe,
    output: recipe.output,
    remainingInput:
      remainingCount === 0
        ? undefined
        : itemStackWithCount(input, remainingCount),
  };
}

export { cookingRecipe, cookingRecipeForItem, isCookingRecipe };
export type {
  CookingRecipe,
  CookingRecipeOptions,
  CookingRecipeTable,
  CookingStation,
} from "./cooking-data.js";
