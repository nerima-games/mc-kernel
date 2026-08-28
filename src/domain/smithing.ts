import {
  SMITHING_STATION_TAG,
  SMITHING_TRIM_MATERIAL_TAG,
  SMITHING_TRIM_TEMPLATE_TAG,
  SMITHING_TRIMMABLE_ARMOR_TAG,
  VANILLA_SMITHING_RECIPES,
  smithingTransformRecipe,
  smithingTrimRecipe,
  type SmithingInput,
  type SmithingInputInput,
  type SmithingRecipe,
  type SmithingRecipeTable,
  type SmithingTransformRecipe,
} from "./smithing-data.js";
import {
  isItemStack,
  itemStackWithCount,
  type ItemStack,
  type Slot,
} from "./item-stack.js";
import {
  ingredientMatches,
  isCraftingIngredient,
  type CraftingIngredient,
  type ItemTagMemberships,
  type RecipeMatchContext,
} from "./recipe-data.js";
import {
  buildSmithingRecipeIndex,
  type SmithingRecipeIndex,
} from "./smithing-indexes.js";

export {
  SMITHING_STATION_TAG,
  SMITHING_TRIM_MATERIAL_TAG,
  SMITHING_TRIM_TEMPLATE_TAG,
  SMITHING_TRIMMABLE_ARMOR_TAG,
  VANILLA_SMITHING_RECIPES,
  smithingTransformRecipe,
  smithingTrimRecipe,
};
export type {
  SmithingInput,
  SmithingInputInput,
  SmithingRecipe,
  SmithingRecipeTable,
  SmithingRecipeOptions,
  SmithingTrimRecipe,
  SmithingTransformRecipe,
} from "./smithing-data.js";

const DEFAULT_SMITHING_CONTEXT: RecipeMatchContext = {
  station: SMITHING_STATION_TAG,
};
const VANILLA_SMITHING_INDEX: SmithingRecipeIndex = buildSmithingRecipeIndex(
  VANILLA_SMITHING_RECIPES,
);

type RecordValue = {
  readonly _tag?: unknown;
  readonly count?: unknown;
  readonly item?: unknown;
  readonly tag?: unknown;
  readonly id?: unknown;
  readonly template?: unknown;
  readonly base?: unknown;
  readonly addition?: unknown;
  readonly output?: unknown;
  readonly priority?: unknown;
  readonly showNotification?: unknown;
  readonly tags?: unknown;
  readonly station?: unknown;
  readonly itemTags?: unknown;
};

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function assertSlot(value: unknown, field: string): asserts value is Slot {
  if (value !== undefined && !isItemStack(value)) {
    throw new TypeError(`${field} must be an ItemStack or undefined`);
  }
}

function assertIngredient(
  value: unknown,
  field: string,
): asserts value is CraftingIngredient {
  if (!isCraftingIngredient(value)) {
    throw new TypeError(`${field} has an invalid ingredient shape`);
  }
}

function assertRecipe(value: unknown): asserts value is SmithingRecipe {
  if (!isRecord(value)) {
    throw new TypeError("Smithing recipe must be an object");
  }
  const recipe = value;
  if (recipe._tag !== "SmithingTransform" && recipe._tag !== "SmithingTrim") {
    throw new TypeError("Smithing recipe has an invalid tag");
  }
  if (typeof recipe.id !== "string" || recipe.id.trim().length === 0) {
    throw new TypeError("Smithing recipe id must be a non-empty string");
  }
  assertIngredient(recipe.template, "Smithing template");
  assertIngredient(recipe.base, "Smithing base");
  assertIngredient(recipe.addition, "Smithing addition");
  if (recipe._tag === "SmithingTransform" && !isItemStack(recipe.output)) {
    throw new TypeError("Smithing transform output must be an ItemStack");
  }
  if (
    typeof recipe.priority !== "number" ||
    !Number.isSafeInteger(recipe.priority) ||
    recipe.priority < 0
  ) {
    throw new RangeError(
      "Smithing recipe priority must be a non-negative safe integer",
    );
  }
  if (
    recipe.showNotification !== undefined &&
    typeof recipe.showNotification !== "boolean"
  ) {
    throw new TypeError("Smithing recipe show notification must be a boolean");
  }
  if (
    !Array.isArray(recipe.tags) ||
    recipe.tags.some(
      (tag) => typeof tag !== "string" || tag.trim().length === 0,
    )
  ) {
    throw new TypeError(
      "Smithing recipe station tags must be non-empty strings",
    );
  }
}

function assertRecipeTable(
  recipes: unknown,
): asserts recipes is SmithingRecipeTable {
  if (!Array.isArray(recipes)) {
    throw new TypeError("Smithing recipes must be an array");
  }
  recipes.forEach(assertRecipe);
}

function assertInput(input: unknown): asserts input is SmithingInput {
  if (!isRecord(input)) {
    throw new TypeError("Smithing input must be an object");
  }
  const candidate = input;
  assertSlot(candidate.template, "Smithing template");
  assertSlot(candidate.base, "Smithing base");
  assertSlot(candidate.addition, "Smithing addition");
}

function assertContext(
  context: unknown,
): asserts context is RecipeMatchContext {
  if (!isRecord(context)) {
    throw new TypeError("Smithing match context must be an object");
  }
  const candidate = context;
  if (
    candidate.station !== undefined &&
    (typeof candidate.station !== "string" ||
      candidate.station.trim().length === 0)
  ) {
    throw new TypeError(
      "Smithing match context station must be a non-empty string",
    );
  }
  const itemTags = candidate.itemTags;
  if (
    itemTags !== undefined &&
    (typeof itemTags !== "object" ||
      itemTags === null ||
      !("get" in itemTags) ||
      typeof itemTags.get !== "function")
  ) {
    throw new TypeError("Smithing match context itemTags must be a map");
  }
}

const stationMatches = (
  recipe: SmithingRecipe,
  context: RecipeMatchContext,
): boolean =>
  recipe.tags.length === 0 ||
  (context.station !== undefined && recipe.tags.includes(context.station));

const ingredientMatchesSlot = (
  ingredient: CraftingIngredient,
  slot: Slot,
  itemTags: ItemTagMemberships | undefined,
): boolean =>
  slot !== undefined &&
  slot.count >= ingredient.count &&
  ingredientMatches(ingredient, slot.item, itemTags);

const recipeMatches = (
  recipe: SmithingRecipe,
  input: SmithingInput,
  context: RecipeMatchContext,
): boolean =>
  stationMatches(recipe, context) &&
  ingredientMatchesSlot(recipe.template, input.template, context.itemTags) &&
  ingredientMatchesSlot(recipe.base, input.base, context.itemTags) &&
  ingredientMatchesSlot(recipe.addition, input.addition, context.itemTags);

const isPreferredSmithingRecipe = (
  candidate: SmithingRecipe,
  current: SmithingRecipe | undefined,
): boolean =>
  current === undefined ||
  candidate.priority < current.priority ||
  (candidate.priority === current.priority &&
    candidate.id.localeCompare(current.id) < 0);

const findSmithingRecipe = (
  input: SmithingInput,
  context: RecipeMatchContext,
  recipes: SmithingRecipeTable,
): SmithingRecipe | undefined => {
  let match: SmithingRecipe | undefined;
  for (const recipe of recipes) {
    if (!recipeMatches(recipe, input, context)) {
      continue;
    }
    if (isPreferredSmithingRecipe(recipe, match)) {
      match = recipe;
    }
  }
  return match;
};

const findIndexedSmithingRecipe = (
  input: SmithingInput,
  context: RecipeMatchContext,
  index: SmithingRecipeIndex,
): SmithingRecipe | undefined => {
  const candidates =
    input.template !== undefined &&
    input.base !== undefined &&
    input.addition !== undefined
      ? index.exact
          .get(input.template.item)
          ?.get(input.base.item)
          ?.get(input.addition.item)
      : undefined;
  let match: SmithingRecipe | undefined;

  if (candidates !== undefined) {
    for (const recipe of candidates) {
      if (
        recipeMatches(recipe, input, context) &&
        isPreferredSmithingRecipe(recipe, match)
      ) {
        match = recipe;
      }
    }
  }

  for (const recipe of index.fallback) {
    if (
      recipeMatches(recipe, input, context) &&
      isPreferredSmithingRecipe(recipe, match)
    ) {
      match = recipe;
    }
  }
  return match;
};

export function smithingInput(input?: SmithingInputInput): SmithingInput;
export function smithingInput(input: SmithingInputInput = {}): SmithingInput {
  if (!isRecord(input)) {
    throw new TypeError("Smithing input must be an object");
  }
  const normalized = {
    template: input.template,
    base: input.base,
    addition: input.addition,
  };
  assertInput(normalized);
  return normalized;
}

export function matchesSmithingRecipe(
  recipe: SmithingRecipe,
  input: SmithingInput,
  context?: RecipeMatchContext,
): boolean;
export function matchesSmithingRecipe(
  recipe: SmithingRecipe,
  input: SmithingInput,
  context: RecipeMatchContext = DEFAULT_SMITHING_CONTEXT,
): boolean {
  assertRecipe(recipe);
  assertInput(input);
  assertContext(context);
  return recipeMatches(recipe, input, context);
}

export function matchSmithingRecipe(
  input: SmithingInput,
  context?: RecipeMatchContext,
  recipes?: SmithingRecipeTable,
): SmithingRecipe | undefined;
export function matchSmithingRecipe(
  input: SmithingInput,
  context: RecipeMatchContext = DEFAULT_SMITHING_CONTEXT,
  recipes: SmithingRecipeTable = VANILLA_SMITHING_RECIPES,
): SmithingRecipe | undefined {
  assertInput(input);
  assertContext(context);
  if (recipes === VANILLA_SMITHING_RECIPES) {
    return findIndexedSmithingRecipe(input, context, VANILLA_SMITHING_INDEX);
  }
  assertRecipeTable(recipes);
  return findSmithingRecipe(input, context, recipes);
}

const consumeIngredient = (
  slot: ItemStack,
  ingredient: CraftingIngredient,
): Slot => {
  const remaining = slot.count - ingredient.count;
  return remaining === 0 ? undefined : itemStackWithCount(slot, remaining);
};

export type SmithingOperation =
  | { readonly _tag: "NoMatch" }
  | {
      readonly _tag: "Transform";
      readonly recipe: SmithingTransformRecipe;
      readonly output: ItemStack;
      readonly remaining: SmithingInput;
    }
  | {
      readonly _tag: "Trim";
      readonly recipe: Extract<
        SmithingRecipe,
        { readonly _tag: "SmithingTrim" }
      >;
      readonly base: ItemStack;
      readonly remaining: SmithingInput;
    };

export function applySmithing(
  input: SmithingInput,
  context?: RecipeMatchContext,
  recipes?: SmithingRecipeTable,
): SmithingOperation;
export function applySmithing(
  input: SmithingInput,
  context: RecipeMatchContext = DEFAULT_SMITHING_CONTEXT,
  recipes: SmithingRecipeTable = VANILLA_SMITHING_RECIPES,
): SmithingOperation {
  assertInput(input);
  const recipe = matchSmithingRecipe(input, context, recipes);
  if (recipe === undefined) {
    return { _tag: "NoMatch" };
  }
  const { template, base, addition } = input;
  if (template === undefined || base === undefined || addition === undefined) {
    throw new Error("Smithing recipe matched an incomplete input");
  }
  const remaining = smithingInput({
    template: consumeIngredient(template, recipe.template),
    base: consumeIngredient(base, recipe.base),
    addition: consumeIngredient(addition, recipe.addition),
  });
  if (recipe._tag === "SmithingTransform") {
    return { _tag: "Transform", recipe, output: recipe.output, remaining };
  }
  return { _tag: "Trim", recipe, base, remaining };
}
