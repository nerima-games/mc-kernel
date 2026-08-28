import {
  type CraftGrid,
  type CraftingIngredient,
  type ExactIngredient,
  ingredientMatches,
  isCraftingIngredient,
  type ItemTagMemberships,
  type Recipe,
  type RecipeMatchContext,
  type RecipeTable,
  type ShapedRecipe,
  type ShapelessRecipe,
} from "./recipe-data.js";
import { VANILLA_CRAFTING_RECIPES } from "./recipe-vanilla-data.js";
import type { ItemStack } from "./item-stack.js";
import type { ItemType } from "./item-type.js";

export type RecipeMatch =
  | {
      readonly _tag: "Match";
      readonly recipe: Recipe;
      readonly output: ItemStack;
    }
  | { readonly _tag: "NoMatch" };

export type RecipeIngredientAssignment = {
  readonly slotIndex: number;
  readonly item: ItemType;
  readonly ingredient: CraftingIngredient;
};

export type RecipeMatchWithAssignments =
  | {
      readonly _tag: "Match";
      readonly recipe: Recipe;
      readonly output: ItemStack;
      readonly assignments: ReadonlyArray<RecipeIngredientAssignment>;
    }
  | { readonly _tag: "NoMatch" };

type MatchedRecipeWithAssignments = Extract<
  RecipeMatchWithAssignments,
  { readonly _tag: "Match" }
>;

export type RecipeConflictReason =
  | "duplicate-id"
  | "same-shape"
  | "same-ingredients";

export type RecipeConflict = {
  readonly firstId: string;
  readonly secondId: string;
  readonly reason: RecipeConflictReason;
};

const EMPTY_ITEM_TAGS: ItemTagMemberships = new Map();
const EMPTY_RECIPE_CONTEXT: RecipeMatchContext = {};

type RecordValue = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null;

type RecipeIndexes = {
  readonly exactByItem: ReadonlyMap<ItemType, ReadonlyArray<Recipe>>;
  readonly tagged: ReadonlyArray<Recipe>;
};

type ExactIndexIngredient =
  | ExactIngredient
  | {
      readonly _tag: "AnyOf";
      readonly options: ReadonlyArray<ExactIngredient>;
      readonly count: number;
    };

const isExactIndexIngredient = (
  ingredient: CraftingIngredient,
): ingredient is ExactIndexIngredient =>
  ingredient._tag === "Exact" ||
  (ingredient._tag === "AnyOf" &&
    ingredient.options.every((option) => option._tag === "Exact"));

const exactItemsOf = (
  ingredient: ExactIndexIngredient,
): ReadonlyArray<ItemType> => {
  if (ingredient._tag === "Exact") {
    return [ingredient.item];
  }
  return ingredient.options.map((option) => option.item);
};

/** Exported only for focused invariant tests; matchRecipe remains the stable facade. */
export const buildRecipeIndexes = (table: RecipeTable): RecipeIndexes => {
  const exactByItem = new Map<ItemType, ReadonlyArray<Recipe>>();
  const tagged: Array<Recipe> = [];

  for (const recipe of table) {
    const ingredients =
      recipe._tag === "Shaped" ? recipe.pattern.cells : recipe.ingredients;
    const seenItems = new Set<ItemType>();
    for (const ingredient of ingredients) {
      if (ingredient === undefined) {
        continue;
      }
      if (!isExactIndexIngredient(ingredient)) {
        tagged.push(recipe);
        break;
      }
      for (const item of exactItemsOf(ingredient)) {
        if (seenItems.has(item)) {
          continue;
        }
        seenItems.add(item);
        const recipes = exactByItem.get(item);
        exactByItem.set(
          item,
          recipes === undefined ? [recipe] : [...recipes, recipe],
        );
      }
    }
  }

  return { exactByItem, tagged };
};

const VANILLA_RECIPE_INDEX = buildRecipeIndexes(VANILLA_CRAFTING_RECIPES);

type GridBounds = {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
};

const occupiedBounds = (grid: CraftGrid): GridBounds | undefined => {
  let minX = grid.width;
  let minY = grid.height;
  let maxX = -1;
  let maxY = -1;

  for (let index = 0; index < grid.cells.length; index += 1) {
    const cell = grid.cells[index];
    if (cell === undefined) {
      continue;
    }
    const x = index % grid.width;
    const y = Math.floor(index / grid.width);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  return maxX < 0 ? undefined : { maxX, maxY, minX, minY };
};

const shapedIngredientAssignmentsAt = (
  recipe: ShapedRecipe,
  grid: CraftGrid,
  offsetX: number,
  offsetY: number,
  mirrored: boolean,
  itemTags: ItemTagMemberships,
): ReadonlyArray<RecipeIngredientAssignment> | undefined => {
  const patternWidth = recipe.pattern.width;
  const patternHeight = recipe.pattern.height;
  const patternCells = recipe.pattern.cells;
  const gridWidth = grid.width;
  const gridCells = grid.cells;
  const assignments: Array<RecipeIngredientAssignment> = [];
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      const patternX = x - offsetX;
      const patternY = y - offsetY;
      const expected =
        patternY < 0 ||
        patternY >= patternHeight ||
        patternX < 0 ||
        patternX >= patternWidth
          ? undefined
          : patternCells[
              patternY * patternWidth +
                (mirrored ? patternWidth - patternX - 1 : patternX)
            ];
      const actual = gridCells[y * gridWidth + x];
      if (expected === undefined) {
        if (actual !== undefined) {
          return undefined;
        }
        continue;
      }
      if (
        actual === undefined ||
        actual.count < expected.count ||
        !ingredientMatches(expected, actual.item, itemTags)
      ) {
        return undefined;
      }
      assignments.push({
        ingredient: expected,
        item: actual.item,
        slotIndex: y * gridWidth + x,
      });
    }
  }
  return assignments;
};

const shapedFitsAt = (
  recipe: ShapedRecipe,
  grid: CraftGrid,
  offsetX: number,
  offsetY: number,
  mirrored: boolean,
  itemTags: ItemTagMemberships,
): boolean =>
  shapedIngredientAssignmentsAt(
    recipe,
    grid,
    offsetX,
    offsetY,
    mirrored,
    itemTags,
  ) !== undefined;

const shapedIngredientAssignments = (
  recipe: ShapedRecipe,
  grid: CraftGrid,
  context: RecipeMatchContext,
): ReadonlyArray<RecipeIngredientAssignment> | undefined => {
  const bounds = occupiedBounds(grid);
  if (bounds === undefined) {
    return undefined;
  }
  const itemTags = context.itemTags ?? EMPTY_ITEM_TAGS;
  const firstOffsetX = bounds.minX;
  const firstOffsetY = bounds.minY;
  const lastOffsetX = bounds.maxX - recipe.pattern.width + 1;
  const lastOffsetY = bounds.maxY - recipe.pattern.height + 1;
  for (let offsetY = firstOffsetY; offsetY <= lastOffsetY; offsetY += 1) {
    for (let offsetX = firstOffsetX; offsetX <= lastOffsetX; offsetX += 1) {
      const assignments = shapedIngredientAssignmentsAt(
        recipe,
        grid,
        offsetX,
        offsetY,
        false,
        itemTags,
      );
      if (assignments !== undefined) {
        return assignments;
      }
      if (recipe.assumeSymmetry) {
        const mirroredAssignments = shapedIngredientAssignmentsAt(
          recipe,
          grid,
          offsetX,
          offsetY,
          true,
          itemTags,
        );
        if (mirroredAssignments !== undefined) {
          return mirroredAssignments;
        }
      }
    }
  }
  return undefined;
};

export const matchesShaped = (
  recipe: ShapedRecipe,
  grid: CraftGrid,
  context: RecipeMatchContext = EMPTY_RECIPE_CONTEXT,
): boolean => {
  const bounds = occupiedBounds(grid);
  if (bounds === undefined) {
    return false;
  }
  const itemTags = context.itemTags ?? EMPTY_ITEM_TAGS;
  const firstOffsetX = bounds.minX;
  const firstOffsetY = bounds.minY;
  const lastOffsetX = bounds.maxX - recipe.pattern.width + 1;
  const lastOffsetY = bounds.maxY - recipe.pattern.height + 1;
  for (let offsetY = firstOffsetY; offsetY <= lastOffsetY; offsetY += 1) {
    for (let offsetX = firstOffsetX; offsetX <= lastOffsetX; offsetX += 1) {
      if (shapedFitsAt(recipe, grid, offsetX, offsetY, false, itemTags)) {
        return true;
      }
      if (
        recipe.assumeSymmetry &&
        shapedFitsAt(recipe, grid, offsetX, offsetY, true, itemTags)
      ) {
        return true;
      }
    }
  }
  return false;
};

export function matchesShapeless(
  recipe: ShapelessRecipe,
  grid: CraftGrid,
  context?: RecipeMatchContext,
): boolean;
export function matchesShapeless(
  recipe: ShapelessRecipe,
  grid: CraftGrid,
  context: RecipeMatchContext = EMPTY_RECIPE_CONTEXT,
): boolean {
  if (!isRecord(recipe) || !Array.isArray(recipe["ingredients"])) {
    throw new TypeError("Shapeless recipe must contain an ingredients array");
  }
  const ingredients: ReadonlyArray<unknown> = recipe["ingredients"];
  let occupiedCount = 0;
  for (const cell of grid.cells) {
    if (cell !== undefined) {
      occupiedCount += 1;
    }
  }
  if (
    occupiedCount === 0 ||
    ingredients.length === 0 ||
    ingredients.length !== occupiedCount
  ) {
    return false;
  }
  const itemTags = context.itemTags ?? EMPTY_ITEM_TAGS;
  let failedStates: Set<number> | undefined;
  // The grid bound makes the integer state key cheaper than a Set of occupied slots.
  // oxlint-disable-next-line no-bitwise
  const stateStride = 1 << grid.cells.length;

  // CraftGrid is bounded to 3×3, so a bitmask replaces Set allocation during backtracking.
  const visit = (ingredientIndex: number, usedMask: number): boolean => {
    const stateKey = ingredientIndex * stateStride + usedMask;
    if (failedStates?.has(stateKey) === true) {
      return false;
    }
    if (ingredientIndex >= ingredients.length) {
      return true;
    }
    const ingredient = ingredients[ingredientIndex];
    if (!isCraftingIngredient(ingredient)) {
      failedStates ??= new Set<number>();
      failedStates.add(stateKey);
      return false;
    }
    for (let slotIndex = 0; slotIndex < grid.cells.length; slotIndex += 1) {
      // oxlint-disable-next-line no-bitwise
      const slotBit = 1 << slotIndex;
      // oxlint-disable-next-line no-bitwise
      if ((usedMask & slotBit) !== 0) {
        continue;
      }
      const candidate = grid.cells[slotIndex];
      if (candidate === undefined) {
        continue;
      }
      if (
        candidate.count < ingredient.count ||
        !ingredientMatches(ingredient, candidate.item, itemTags)
      ) {
        continue;
      }
      // oxlint-disable-next-line no-bitwise
      if (visit(ingredientIndex + 1, usedMask | slotBit)) {
        return true;
      }
    }
    failedStates ??= new Set<number>();
    failedStates.add(stateKey);
    return false;
  };

  return visit(0, 0);
}

const stationMatches = (
  recipe: Recipe,
  context: RecipeMatchContext,
): boolean => {
  if (recipe.tags.length === 0) {
    return true;
  }
  return context.station !== undefined && recipe.tags.includes(context.station);
};

export const matchesRecipe = (
  recipe: Recipe,
  grid: CraftGrid,
  context: RecipeMatchContext = EMPTY_RECIPE_CONTEXT,
): boolean => {
  if (!stationMatches(recipe, context)) {
    return false;
  }
  if (recipe._tag === "Shaped") {
    return matchesShaped(recipe, grid, context);
  }
  return matchesShapeless(recipe, grid, context);
};

const recipeOrder = (left: Recipe, right: Recipe): number => {
  if (left.priority !== right.priority) {
    return left.priority - right.priority;
  }
  if (left._tag !== right._tag) {
    return left._tag === "Shaped" ? -1 : 1;
  }
  return left.id.localeCompare(right.id);
};

const shapelessIngredientAssignments = (
  recipe: ShapelessRecipe,
  grid: CraftGrid,
  context: RecipeMatchContext,
): ReadonlyArray<RecipeIngredientAssignment> | undefined => {
  let occupiedCount = 0;
  for (const cell of grid.cells) {
    if (cell !== undefined) {
      occupiedCount += 1;
    }
  }
  if (
    occupiedCount === 0 ||
    recipe.ingredients.length === 0 ||
    recipe.ingredients.length !== occupiedCount
  ) {
    return undefined;
  }

  const itemTags = context.itemTags ?? EMPTY_ITEM_TAGS;
  const assignments: Array<RecipeIngredientAssignment> = [];
  const failedStates = new Set<number>();
  // CraftGrid is bounded to 3×3, so a bitmask replaces Set allocation during backtracking.
  // oxlint-disable-next-line no-bitwise
  const stateStride = 1 << grid.cells.length;

  const visit = (ingredientIndex: number, usedMask: number): boolean => {
    if (ingredientIndex >= recipe.ingredients.length) {
      return true;
    }
    const stateKey = ingredientIndex * stateStride + usedMask;
    if (failedStates.has(stateKey)) {
      return false;
    }
    const ingredient = recipe.ingredients[ingredientIndex];
    if (ingredient === undefined) {
      return false;
    }
    for (let slotIndex = 0; slotIndex < grid.cells.length; slotIndex += 1) {
      // oxlint-disable-next-line no-bitwise
      const slotBit = 1 << slotIndex;
      // oxlint-disable-next-line no-bitwise
      if ((usedMask & slotBit) !== 0) {
        continue;
      }
      const candidate = grid.cells[slotIndex];
      if (
        candidate === undefined ||
        candidate.count < ingredient.count ||
        !ingredientMatches(ingredient, candidate.item, itemTags)
      ) {
        continue;
      }
      assignments.push({ ingredient, item: candidate.item, slotIndex });
      // oxlint-disable-next-line no-bitwise
      if (visit(ingredientIndex + 1, usedMask | slotBit)) {
        return true;
      }
      assignments.pop();
    }
    failedStates.add(stateKey);
    return false;
  };

  if (!visit(0, 0)) {
    return undefined;
  }
  return [...assignments].sort(
    (left, right) => left.slotIndex - right.slotIndex,
  );
};

const recipeIngredientAssignments = (
  recipe: Recipe,
  grid: CraftGrid,
  context: RecipeMatchContext,
): ReadonlyArray<RecipeIngredientAssignment> | undefined => {
  if (!stationMatches(recipe, context)) {
    return undefined;
  }
  return recipe._tag === "Shaped"
    ? shapedIngredientAssignments(recipe, grid, context)
    : shapelessIngredientAssignments(recipe, grid, context);
};

const matchedRecipe = (
  recipe: Recipe,
  grid: CraftGrid,
  context: RecipeMatchContext,
): MatchedRecipeWithAssignments | undefined => {
  const assignments = recipeIngredientAssignments(recipe, grid, context);
  if (assignments === undefined) {
    return undefined;
  }
  return { _tag: "Match", assignments, output: recipe.output, recipe };
};

const bestRecipeWithAssignments = (
  table: ReadonlyArray<Recipe>,
  grid: CraftGrid,
  context: RecipeMatchContext,
): MatchedRecipeWithAssignments | undefined => {
  let best: MatchedRecipeWithAssignments | undefined;

  for (const candidate of table) {
    const match = matchedRecipe(candidate, grid, context);
    if (match === undefined) {
      continue;
    }
    if (best === undefined || recipeOrder(match.recipe, best.recipe) < 0) {
      best = match;
    }
  }

  return best;
};

const matchIndexedRecipeWithAssignments = (
  index: RecipeIndexes,
  grid: CraftGrid,
  context: RecipeMatchContext,
): MatchedRecipeWithAssignments | undefined => {
  let best: MatchedRecipeWithAssignments | undefined;
  let firstItem: ItemType | undefined;
  for (const cell of grid.cells) {
    if (cell !== undefined) {
      firstItem = cell.item;
      break;
    }
  }
  const indexed =
    firstItem === undefined ? undefined : index.exactByItem.get(firstItem);
  if (indexed !== undefined) {
    best = bestRecipeWithAssignments(indexed, grid, context);
  }
  const taggedMatch = bestRecipeWithAssignments(index.tagged, grid, context);
  if (
    taggedMatch !== undefined &&
    (best === undefined || recipeOrder(taggedMatch.recipe, best.recipe) < 0)
  ) {
    best = taggedMatch;
  }
  return best;
};

/** Exported only for focused invariant tests; matchRecipe remains the stable facade. */
export const matchIndexedRecipe = (
  index: RecipeIndexes,
  grid: CraftGrid,
  context: RecipeMatchContext = EMPTY_RECIPE_CONTEXT,
): Recipe | undefined => {
  const match = matchIndexedRecipeWithAssignments(index, grid, context);
  return match === undefined ? undefined : match.recipe;
};

export const matchRecipeWithAssignments = (
  table: RecipeTable,
  grid: CraftGrid,
  context: RecipeMatchContext = EMPTY_RECIPE_CONTEXT,
): RecipeMatchWithAssignments => {
  const match =
    table === VANILLA_CRAFTING_RECIPES
      ? matchIndexedRecipeWithAssignments(VANILLA_RECIPE_INDEX, grid, context)
      : bestRecipeWithAssignments(table, grid, context);
  return match ?? { _tag: "NoMatch" };
};

export const matchRecipe = (
  table: RecipeTable,
  grid: CraftGrid,
  context: RecipeMatchContext = EMPTY_RECIPE_CONTEXT,
): RecipeMatch => {
  const match = matchRecipeWithAssignments(table, grid, context);
  if (match._tag === "NoMatch") {
    return { _tag: "NoMatch" };
  }
  return { _tag: "Match", output: match.output, recipe: match.recipe };
};

const ingredientKey = (ingredient: CraftingIngredient): string => {
  if (ingredient._tag === "Exact") {
    return `item:${ingredient.item}:${ingredient.count}`;
  }
  if (ingredient._tag === "AnyOf") {
    return `any:${ingredient.count}:${ingredient.options.map(ingredientKey).sort().join(",")}`;
  }
  return `tag:${ingredient.tag}:${ingredient.count}`;
};

const patternKey = (recipe: ShapedRecipe): string =>
  `${recipe.pattern.width}x${recipe.pattern.height}:${recipe.pattern.cells.map((cell) => (cell === undefined ? "_" : ingredientKey(cell))).join("|")}`;

const ingredientsKey = (recipe: ShapelessRecipe): string =>
  recipe.ingredients.map(ingredientKey).sort().join("|");

const conflictBetween = (
  first: Recipe,
  second: Recipe,
): RecipeConflict | undefined => {
  if (first.id === second.id) {
    return { firstId: first.id, reason: "duplicate-id", secondId: second.id };
  }
  if (
    first._tag === "Shaped" &&
    second._tag === "Shaped" &&
    patternKey(first) === patternKey(second)
  ) {
    return { firstId: first.id, reason: "same-shape", secondId: second.id };
  }
  if (
    first._tag === "Shapeless" &&
    second._tag === "Shapeless" &&
    ingredientsKey(first) === ingredientsKey(second)
  ) {
    return {
      firstId: first.id,
      reason: "same-ingredients",
      secondId: second.id,
    };
  }
  return undefined;
};

export const conflictsIn = (
  table: ReadonlyArray<Recipe | undefined>,
): ReadonlyArray<RecipeConflict> => {
  const conflicts: Array<RecipeConflict> = [];
  for (let firstIndex = 0; firstIndex < table.length; firstIndex += 1) {
    const first = table[firstIndex];
    if (first === undefined) {
      continue;
    }
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < table.length;
      secondIndex += 1
    ) {
      const second = table[secondIndex];
      if (second === undefined) {
        continue;
      }
      const conflict = conflictBetween(first, second);
      if (conflict !== undefined) {
        conflicts.push(conflict);
      }
    }
  }
  return conflicts.sort(
    (left, right) =>
      left.firstId.localeCompare(right.firstId) ||
      left.secondId.localeCompare(right.secondId),
  );
};
