import {
  STONECUTTING_STATION_TAG,
  stonecuttingRecipe,
  type StonecuttingRecipe,
  type StonecuttingRecipeOptions,
  type StonecuttingRecipeTable,
  VANILLA_STONECUTTING_RECIPES,
} from "./stonecutting-data.js";
import {
  buildStonecuttingRecipeIndex,
  type StonecuttingRecipeIndex,
} from "./stonecutting-indexes.js";
import {
  ingredientMatches,
  isCraftingIngredientInput,
  isRecipeItemTag,
  type ItemTagMemberships,
  type RecipeMatchContext,
} from "./recipe-data.js";
import {
  isItemStack,
  itemStackWithCount,
  type ItemStack,
  type Slot,
} from "./item-stack.js";
import { isItemType, type ItemType } from "./item-type.js";

export {
  STONECUTTING_STATION_TAG,
  stonecuttingRecipe,
  VANILLA_STONECUTTING_RECIPES,
};
export type {
  StonecuttingRecipe,
  StonecuttingRecipeOptions,
  StonecuttingRecipeTable,
};

export type StonecuttingMatch =
  | {
      readonly _tag: "Match";
      readonly recipe: StonecuttingRecipe;
      readonly output: ItemStack;
    }
  | {
      readonly _tag: "NoMatch";
    };

export type StonecuttingApplyResult =
  | {
      readonly _tag: "Applied";
      readonly recipe: StonecuttingRecipe;
      readonly output: ItemStack;
      readonly remainingInput: Slot;
    }
  | {
      readonly _tag: "NoMatch";
    };

type RecordValue = {
  readonly _tag?: unknown;
  readonly id?: unknown;
  readonly ingredient?: unknown;
  readonly output?: unknown;
  readonly priority?: unknown;
  readonly showNotification?: unknown;
  readonly station?: unknown;
  readonly itemTags?: unknown;
};

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isItemTypeSet = (value: unknown): value is ReadonlySet<ItemType> =>
  value instanceof Set && [...value].every((item) => isItemType(item));

const isItemTagMemberships = (value: unknown): value is ItemTagMemberships =>
  value instanceof Map &&
  [...value.entries()].every(
    ([tag, members]) => isRecipeItemTag(tag) && isItemTypeSet(members),
  );

function assertRecipeMatchContext(
  value: unknown,
): asserts value is RecipeMatchContext {
  if (!isRecord(value)) {
    throw new TypeError("Stonecutting recipe match context must be an object");
  }
  if (value.station !== undefined && typeof value.station !== "string") {
    throw new TypeError("Stonecutting recipe station must be a string");
  }
  if (value.itemTags !== undefined && !isItemTagMemberships(value.itemTags)) {
    throw new TypeError(
      "Stonecutting itemTags must be a Map of recipe tags to item sets",
    );
  }
}

function assertSlot(value: unknown): asserts value is Slot {
  if (value !== undefined && !isItemStack(value)) {
    throw new TypeError("Stonecutting input must be an ItemStack or undefined");
  }
}

function assertRecipe(value: unknown): asserts value is StonecuttingRecipe {
  if (!isRecord(value)) {
    throw new TypeError("Stonecutting recipe must be an object");
  }
  if (value._tag !== "Stonecutting") {
    throw new TypeError("Stonecutting recipe has an invalid tag");
  }
  if (typeof value.priority !== "number") {
    throw new TypeError("Stonecutting recipe priority must be a number");
  }
  if (typeof value.id !== "string") {
    throw new TypeError("Stonecutting recipe id must be a non-empty string");
  }
  if (!isCraftingIngredientInput(value.ingredient)) {
    throw new TypeError("Stonecutting recipe ingredient has an invalid shape");
  }
  if (!isItemStack(value.output)) {
    throw new TypeError("Stonecutting recipe output has an invalid shape");
  }
  if (
    value.showNotification !== undefined &&
    typeof value.showNotification !== "boolean"
  ) {
    throw new TypeError(
      "Stonecutting recipe show notification must be a boolean",
    );
  }
  stonecuttingRecipe(value.id, value.ingredient, value.output, {
    priority: value.priority,
    ...(value.showNotification === undefined
      ? {}
      : { showNotification: value.showNotification }),
  });
}

function assertRecipeTable(
  value: unknown,
): asserts value is StonecuttingRecipeTable {
  if (!Array.isArray(value)) {
    throw new TypeError("Stonecutting recipes must be an array");
  }
  value.forEach(assertRecipe);
}

const compareRecipes = (
  left: StonecuttingRecipe,
  right: StonecuttingRecipe,
): number => {
  if (left.priority !== right.priority) {
    return left.priority - right.priority;
  }
  return left.id.localeCompare(right.id);
};

const stationMatches = (context: RecipeMatchContext): boolean =>
  context.station === undefined || context.station === STONECUTTING_STATION_TAG;

const VANILLA_STONECUTTING_INDEX = buildStonecuttingRecipeIndex(
  VANILLA_STONECUTTING_RECIPES,
);

const indexFor = (recipes: StonecuttingRecipeTable): StonecuttingRecipeIndex =>
  recipes === VANILLA_STONECUTTING_RECIPES
    ? VANILLA_STONECUTTING_INDEX
    : buildStonecuttingRecipeIndex(recipes);

export function matchStonecuttingRecipes(
  input: Slot,
  context?: RecipeMatchContext,
  recipes?: StonecuttingRecipeTable,
): ReadonlyArray<StonecuttingRecipe>;
export function matchStonecuttingRecipes(
  input: Slot,
  context: RecipeMatchContext = {},
  recipes: StonecuttingRecipeTable = VANILLA_STONECUTTING_RECIPES,
): ReadonlyArray<StonecuttingRecipe> {
  assertSlot(input);
  assertRecipeMatchContext(context);
  assertRecipeTable(recipes);
  if (input === undefined || !stationMatches(context)) {
    return [];
  }

  const index = indexFor(recipes);
  const exactCandidates = index.exactByItem.get(input.item) ?? [];
  return [...exactCandidates, ...index.tagged]
    .filter(
      (recipe) =>
        recipe.ingredient.count <= input.count &&
        ingredientMatches(recipe.ingredient, input.item, context.itemTags),
    )
    .sort(compareRecipes);
}

export function matchStonecuttingRecipe(
  input: Slot,
  context?: RecipeMatchContext,
  recipes?: StonecuttingRecipeTable,
): StonecuttingMatch;
export function matchStonecuttingRecipe(
  input: Slot,
  context?: RecipeMatchContext,
  recipes?: StonecuttingRecipeTable,
): StonecuttingMatch {
  const recipe = matchStonecuttingRecipes(input, context, recipes)[0];
  return recipe === undefined
    ? { _tag: "NoMatch" }
    : { _tag: "Match", output: recipe.output, recipe };
}

const recipeCanApply = (
  recipe: StonecuttingRecipe,
  input: ItemStack,
  context: RecipeMatchContext,
): boolean =>
  stationMatches(context) &&
  recipe.ingredient.count <= input.count &&
  ingredientMatches(recipe.ingredient, input.item, context.itemTags);

export function applyStonecutting(
  recipe: StonecuttingRecipe,
  input: Slot,
  context?: RecipeMatchContext,
): StonecuttingApplyResult;
export function applyStonecutting(
  recipe: StonecuttingRecipe,
  input: Slot,
  context: RecipeMatchContext = {},
): StonecuttingApplyResult {
  assertRecipe(recipe);
  assertSlot(input);
  assertRecipeMatchContext(context);
  if (input === undefined || !recipeCanApply(recipe, input, context)) {
    return { _tag: "NoMatch" };
  }

  const remainingCount = input.count - recipe.ingredient.count;
  return {
    _tag: "Applied",
    output: recipe.output,
    recipe,
    remainingInput:
      remainingCount === 0
        ? undefined
        : itemStackWithCount(input, remainingCount),
  };
}
