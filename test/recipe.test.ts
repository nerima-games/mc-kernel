import { Result } from "effect";
import { describe, expect, it } from "vitest";

import { isItemStack, itemStack as itemStackResult } from "../src/domain/item/item-stack";
import type { ItemType } from "../src/domain/item/item-type";
import { TagLocation } from "../src/domain/text/identifiers";
import { StackCount } from "../src/domain/time/quantities";
import {
  MAX_RECIPE_SIDE,
  RecipeGridDimension,
  RecipeGridIndex,
  RecipeGroup,
  RecipeId,
  RecipeIngredientCount,
  RecipePatternRow,
  RecipePatternSymbol,
  type RecipePatternKeyMap,
  RecipePriority,
  RecipeStationTag,
  VANILLA_CRAFTING_RECIPES,
  anyOf,
  cellAt,
  craftGrid,
  exactly,
  ingredientMatches,
  isCraftingIngredientInput,
  shapelessRecipe,
  shapedRecipe,
  tagged,
} from "../src/domain/recipe/recipe";
import type {
  ItemTagMemberships,
  RecipeFailure,
} from "../src/domain/recipe/recipe";

const expectRecipeSuccess = <A, E>(result: Result.Result<A, E>): A => {
  expect(Result.isSuccess(result)).toBe(true);
  if (Result.isSuccess(result)) {
    return result.success;
  }
  throw new Error(`Expected recipe success, received ${JSON.stringify(result.failure)}`);
};

const itemStack = (item: Parameters<typeof itemStackResult>[0], count: number) =>
  expectRecipeSuccess(itemStackResult(item, count));

const expectRecipeFailure = (
  result: Result.Result<unknown, RecipeFailure>,
  expected: RecipeFailure,
): void => {
  expect(Result.isFailure(result)).toBe(true);
  if (Result.isFailure(result)) {
    expect(result.failure).toEqual(expected);
  }
};

const typeFailure = (message: string): RecipeFailure => ({
  _tag: "RecipeTypeFailure",
  name: "TypeError",
  message,
});

const rangeFailure = (message: string): RecipeFailure => ({
  _tag: "RecipeRangeFailure",
  name: "RangeError",
  message,
});

const itemTags: ItemTagMemberships = new Map([
  [expectRecipeSuccess(tagged("#minecraft:planks")).tag, new Set<ItemType>(["oak_planks"])],
  [expectRecipeSuccess(tagged("#minecraft:both")).tag, new Set<ItemType>(["oak_planks", "stone"])],
]);

describe("recipe data", () => {
  it("constructs and matches exact and tagged ingredients", () => {
    const exact = expectRecipeSuccess(exactly("stone", 2));
    const tag = expectRecipeSuccess(tagged("#minecraft:planks", 2));
    const alternatives = expectRecipeSuccess(anyOf(["stone", "dirt"]));

    expect(exact).toEqual({ _tag: "Exact", item: "stone", count: 2 });
    expect(tag).toEqual({
      _tag: "ItemTag",
      tag: "#minecraft:planks",
      count: 2,
    });
    expect(expectRecipeSuccess(exactly("stone"))).toEqual({
      _tag: "Exact",
      item: "stone",
      count: 1,
    });
    expect(expectRecipeSuccess(tagged("#minecraft:planks"))).toEqual({
      _tag: "ItemTag",
      tag: "#minecraft:planks",
      count: 1,
    });
    expect(expectRecipeSuccess(ingredientMatches(exact, "stone"))).toBe(true);
    expect(expectRecipeSuccess(ingredientMatches(exact, "dirt"))).toBe(false);
    expect(expectRecipeSuccess(ingredientMatches(tag, "oak_planks", itemTags))).toBe(true);
    expect(expectRecipeSuccess(ingredientMatches(tag, "stone", itemTags))).toBe(false);
    const noItemTags: ItemTagMemberships = new Map();
    expect(expectRecipeSuccess(ingredientMatches(tag, "stone", noItemTags))).toBe(false);
    expect(expectRecipeSuccess(ingredientMatches(tag, "stone"))).toBe(false);
    expect(alternatives).toEqual({
      _tag: "AnyOf",
      count: 1,
      options: [expectRecipeSuccess(exactly("stone")), expectRecipeSuccess(exactly("dirt"))],
    });
    expect(expectRecipeSuccess(ingredientMatches(alternatives, "stone"))).toBe(true);
    expect(expectRecipeSuccess(ingredientMatches(alternatives, "sand"))).toBe(false);
    expect(isCraftingIngredientInput(["stone"])).toBe(true);
    expect(isCraftingIngredientInput([])).toBe(false);
    expect(isCraftingIngredientInput(["not-a-tag"])).toBe(false);
    expect(isCraftingIngredientInput(alternatives)).toBe(true);
    expect(isCraftingIngredientInput({})).toBe(false);

    expectRecipeFailure(
      Reflect.apply(exactly, undefined, ["unknown"]),
      typeFailure("Unknown exact ingredient item: unknown"),
    );
    expectRecipeFailure(
      exactly("stone", 0),
      rangeFailure("Ingredient count must be a safe integer in [1, 64], received 0"),
    );
    expectRecipeFailure(
      exactly("stone", 65),
      rangeFailure("Ingredient count must be a safe integer in [1, 64], received 65"),
    );
    expectRecipeFailure(
      exactly("stone", 1.5),
      rangeFailure("Ingredient count must be a safe integer in [1, 64], received 1.5"),
    );
    expectRecipeFailure(
      Reflect.apply(tagged, undefined, ["planks"]),
      typeFailure("Recipe item tag must start with # and contain a name, received planks"),
    );
    expectRecipeFailure(
      Reflect.apply(tagged, undefined, [1]),
      typeFailure("Recipe item tag must start with # and contain a name, received 1"),
    );
    expectRecipeFailure(
      Reflect.apply(anyOf, undefined, [[]]),
      rangeFailure("Alternative ingredient lists must contain at least one ingredient"),
    );
    expectRecipeFailure(
      Reflect.apply(anyOf, undefined, [null]),
      rangeFailure("Alternative ingredient lists must contain at least one ingredient"),
    );
    expectRecipeFailure(
      Reflect.apply(ingredientMatches, undefined, [{ _tag: "Unknown" }, "stone"]),
      typeFailure("Recipe ingredient must be an item type, item tag, or ingredient object"),
    );
  });

  it("normalizes shaped patterns, options, and ingredient objects", () => {
    const recipe = expectRecipeSuccess(shapedRecipe(
      "minecraft:column",
      ["  E", "T "],
      {
        assumeSymmetry: true,
        priority: RecipePriority(2),
        tags: [RecipeStationTag("crafting_table")],
      },
      itemStack("crafting_table", 1),
      { assumeSymmetry: true, priority: 2, tags: ["crafting_table"] },
    ));

    expect(recipe._tag).toBe("Shaped");
    expect(recipe.pattern).toEqual({
      width: 3,
      height: 2,
      cells: [
        undefined,
        undefined,
        expectRecipeSuccess(exactly("stone", 2)),
        expectRecipeSuccess(tagged("#minecraft:planks")),
        undefined,
        undefined,
      ],
    });
    expect(recipe.assumeSymmetry).toBe(true);
    expect(recipe.priority).toBe(2);
    expect(recipe.tags).toEqual(["crafting_table"]);

    const alternativeRecipe = expectRecipeSuccess(shapedRecipe(
      "minecraft:alternative",
      ["A"],
      { A: ["stone", "dirt"] },
      itemStack("stick", 1),
      { category: "misc", group: "alternatives", showNotification: true },
    ));
    expect(alternativeRecipe.pattern.cells).toEqual([
      expectRecipeSuccess(anyOf(["stone", "dirt"])),
    ]);
    expect(alternativeRecipe.category).toBe("misc");
    expect(alternativeRecipe.group).toBe("alternatives");
    expect(alternativeRecipe.showNotification).toBe(true);

    const defaultRecipe = expectRecipeSuccess(shapedRecipe(
      "minecraft:default",
      ["S", ""],
      { S: "stone" },
      itemStack("stick", 1),
    ));
    expect(defaultRecipe.assumeSymmetry).toBe(false);
    expect(defaultRecipe.pattern).toEqual({
      width: 1,
      height: 1,
      cells: [expectRecipeSuccess(exactly("stone"))],
    });
    expect(MAX_RECIPE_SIDE).toBe(3);
    expectRecipeFailure(
      shapedRecipe(" ", ["S"], { S: "stone" }, itemStack("stick", 1)),
      typeFailure("Recipe id must be a non-empty string"),
    );
    expectRecipeFailure(
      shapedRecipe("minecraft:bad", [], { S: "stone" }, itemStack("stick", 1)),
      rangeFailure("Shaped recipe rows must contain 1 to 3 rows"),
    );
    expectRecipeFailure(
      shapedRecipe("minecraft:bad", ["S", "S", "S", "S"], { S: "stone" }, itemStack("stick", 1)),
      rangeFailure("Shaped recipe rows must contain 1 to 3 rows"),
    );
    expectRecipeFailure(
      shapedRecipe("minecraft:bad", ["SSSS"], { S: "stone" }, itemStack("stick", 1)),
      rangeFailure("Shaped recipe rows must be strings no wider than 3 characters"),
    );
    expectRecipeFailure(
      Reflect.apply(shapedRecipe, undefined, ["minecraft:bad", [1], { S: "stone" }, itemStack("stick", 1)]),
      rangeFailure("Shaped recipe rows must be strings no wider than 3 characters"),
    );
    expectRecipeFailure(
      Reflect.apply(shapedRecipe, undefined, ["minecraft:bad", ["S"], null, itemStack("stick", 1)]),
      typeFailure("Shaped recipe key must be an object"),
    );
    expectRecipeFailure(
      Reflect.apply(shapedRecipe, undefined, ["minecraft:bad", ["S"], [], itemStack("stick", 1)]),
      typeFailure("Shaped recipe key must be an object"),
    );
    expectRecipeFailure(
      shapedRecipe("minecraft:bad", ["S"], { AB: "stone" }, itemStack("stick", 1)),
      typeFailure("Shaped recipe keys must use one non-space character"),
    );
    expectRecipeFailure(
      shapedRecipe("minecraft:bad", ["S"], { " ": "stone" }, itemStack("stick", 1)),
      typeFailure("Shaped recipe keys must use one non-space character"),
    );
    expectRecipeFailure(
      shapedRecipe("minecraft:bad", ["X"], { S: "stone" }, itemStack("stick", 1)),
      typeFailure("Shaped recipe pattern references unknown key: X"),
    );
    expectRecipeFailure(
      shapedRecipe("minecraft:bad", ["   "], {}, itemStack("stick", 1)),
      rangeFailure("Shaped recipe pattern must contain at least one ingredient"),
    );
    expectRecipeFailure(
      Reflect.apply(shapedRecipe, undefined, ["minecraft:bad", ["S"], { S: "stone" }, {}]),
      typeFailure("Recipe output must be a valid non-empty item stack"),
    );
    expectRecipeFailure(
      Reflect.apply(shapedRecipe, undefined, ["minecraft:bad", ["S"], { S: "stone" }, itemStack("stick", 1), null]),
      typeFailure("Recipe options must be an object"),
    );
    expectRecipeFailure(
      Reflect.apply(shapedRecipe, undefined, ["minecraft:bad", ["S"], { S: "stone" }, itemStack("stick", 1), []]),
      typeFailure("Recipe options must be an object"),
    );
    expectRecipeFailure(
      Reflect.apply(shapedRecipe, undefined, ["minecraft:bad", ["S"], { S: "stone" }, itemStack("stick", 1), { assumeSymmetry: "yes" }]),
      typeFailure("Recipe symmetry must be a boolean"),
    );
    expectRecipeFailure(
      shapedRecipe("minecraft:bad", ["S"], { S: "stone" }, itemStack("stick", 1), { priority: -1 }),
      rangeFailure("Recipe priority must be a non-negative safe integer, received -1"),
    );
    expectRecipeFailure(
      shapedRecipe("minecraft:bad", ["S"], { S: "stone" }, itemStack("stick", 1), { priority: 1.5 }),
      rangeFailure("Recipe priority must be a non-negative safe integer, received 1.5"),
    );
    expectRecipeFailure(
      Reflect.apply(shapedRecipe, undefined, ["minecraft:bad", ["S"], { S: "stone" }, itemStack("stick", 1), { tags: "crafting_table" }]),
      typeFailure("Recipe station tags must be an array"),
    );
    expectRecipeFailure(
      shapedRecipe("minecraft:bad", ["S"], { S: "stone" }, itemStack("stick", 1), { tags: [""] }),
      typeFailure("Recipe station tags must be non-empty strings"),
    );
    expectRecipeFailure(
      Reflect.apply(shapedRecipe, undefined, ["minecraft:bad", ["S"], { S: "stone" }, itemStack("stick", 1), { tags: [1] }]),
      typeFailure("Recipe station tags must be non-empty strings"),
    );
    expectRecipeFailure(
      Reflect.apply(shapedRecipe, undefined, ["minecraft:bad", ["S"], { S: "stone" }, itemStack("stick", 1), { category: "invalid" }]),
      typeFailure("Recipe category is invalid, received invalid"),
    );
    expectRecipeFailure(
      Reflect.apply(shapedRecipe, undefined, ["minecraft:bad", ["S"], { S: "stone" }, itemStack("stick", 1), { group: 1 }]),
      typeFailure("Recipe group must be a string"),
    );
    expectRecipeFailure(
      Reflect.apply(shapedRecipe, undefined, ["minecraft:bad", ["S"], { S: "stone" }, itemStack("stick", 1), { showNotification: "yes" }]),
      typeFailure("Recipe show notification must be a boolean"),
    );
  });

  it("constructs shapeless recipes and rejects invalid ingredients", () => {
    const recipe = expectRecipeSuccess(shapelessRecipe(
      "minecraft:mix",
      ["stone", "#minecraft:planks", { _tag: "Exact", item: "dirt", count: 2 }],
      itemStack("stick", 1),
      { priority: 1, tags: ["crafting_table"] },
    ));

    expect(recipe._tag).toBe("Shapeless");
    expect(recipe.ingredients).toEqual([
      expectRecipeSuccess(exactly("stone")),
      expectRecipeSuccess(tagged("#minecraft:planks")),
      expectRecipeSuccess(exactly("dirt", 2)),
    ]);
    expect(recipe.priority).toBe(1);
    expect(recipe.tags).toEqual(["crafting_table"]);
    expectRecipeFailure(
      shapelessRecipe("minecraft:bad", [], itemStack("stick", 1)),
      rangeFailure("Shapeless recipes must contain at least one ingredient"),
    );
    expectRecipeFailure(
      Reflect.apply(shapelessRecipe, undefined, ["minecraft:bad", "stone", itemStack("stick", 1)]),
      rangeFailure("Shapeless recipes must contain at least one ingredient"),
    );
    expectRecipeFailure(
      Reflect.apply(shapelessRecipe, undefined, ["minecraft:bad", ["not-a-tag"], itemStack("stick", 1)]),
      typeFailure("Recipe item tag must start with # and contain a name, received not-a-tag"),
    );
    expectRecipeFailure(
      Reflect.apply(shapelessRecipe, undefined, ["minecraft:bad", [1], itemStack("stick", 1)]),
      typeFailure("Recipe ingredient must be an item type, item tag, or ingredient object"),
    );
    expectRecipeFailure(
      Reflect.apply(shapelessRecipe, undefined, ["minecraft:bad", [{ _tag: "Exact", item: "stone", count: "1" }], itemStack("stick", 1)]),
      typeFailure("Recipe ingredient object has an invalid shape"),
    );
    expectRecipeFailure(
      Reflect.apply(shapelessRecipe, undefined, ["minecraft:bad", [{ _tag: "Exact", item: "unknown", count: 1 }], itemStack("stick", 1)]),
      typeFailure("Recipe ingredient object has an invalid shape"),
    );
    expectRecipeFailure(
      Reflect.apply(shapelessRecipe, undefined, ["minecraft:bad", ["stone"], {}]),
      typeFailure("Recipe output must be a valid non-empty item stack"),
    );
  });

  it("normalizes craft grids and exposes safe cell lookup", () => {
    const stack = itemStack("dirt", 2);
    const grid = expectRecipeSuccess(craftGrid(2, 2, ["stone", stack, undefined]));

    expect(grid).toEqual({
      width: 2,
      height: 2,
      cells: [itemStack("stone", StackCount(1)), stack, undefined, undefined],
    });
    expect(cellAt(grid, 0, 0)).toEqual(itemStack("stone", 1));
    expect(cellAt(grid, 1, 0)).toEqual(stack);
    expect(cellAt(grid, -1, 0)).toBeUndefined();
    expect(cellAt(grid, 0, 2)).toBeUndefined();
    expect(cellAt(grid, 0.5, 0)).toBeUndefined();
    expect(expectRecipeSuccess(craftGrid(0, 0, []))).toEqual({ width: 0, height: 0, cells: [] });
    expectRecipeFailure(
      craftGrid(-1, 1, []),
      rangeFailure("Craft grid dimensions must be safe integers in [0, 3]"),
    );
    expectRecipeFailure(
      craftGrid(1, MAX_RECIPE_SIDE + 1, []),
      rangeFailure("Craft grid dimensions must be safe integers in [0, 3]"),
    );
    expectRecipeFailure(
      craftGrid(1.5, 1, []),
      rangeFailure("Craft grid dimensions must be safe integers in [0, 3]"),
    );
    expectRecipeFailure(
      craftGrid(1, 1, [itemStack("stone", 1), itemStack("dirt", 1)]),
      rangeFailure("Craft grid contains more cells than its dimensions allow"),
    );
    expectRecipeFailure(
      Reflect.apply(craftGrid, undefined, [1, 1, "stone"]),
      rangeFailure("Craft grid contains more cells than its dimensions allow"),
    );
    expectRecipeFailure(
      Reflect.apply(craftGrid, undefined, [1, 1, [{}]]),
      typeFailure("Craft grid cells must be item types, valid item stacks, or undefined"),
    );
    expect(isItemStack(grid.cells[0])).toBe(true);
  });
});

describe("vanilla recipe data", () => {
  it("keeps the supported crafting recipes tagged for their station", () => {
    expect(VANILLA_CRAFTING_RECIPES.length).toBeGreaterThan(70);
    expect(
      VANILLA_CRAFTING_RECIPES.every((recipe) =>
        recipe.tags.includes(RecipeStationTag("crafting_table")),
      ),
    ).toBe(true);
  });
});
