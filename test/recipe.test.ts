import { Result } from "effect";
import { describe, expect, it, vi } from "vitest";

import { isItemStack, itemStack as itemStackResult } from "../src/domain/item/item-stack";
import type { ItemType } from "../src/domain/item/item-type";
import { TagLocation } from "../src/domain/text/identifiers";
import { StackCount } from "../src/domain/time/quantities";
import {
  MAX_RECIPE_SIDE,
  RecipeGridDimension,
  RecipeGridIndex,
  RecipeCompletionCount,
  RecipeGroup,
  RecipeId,
  RecipeIngredientCount,
  RecipePatternRow,
  RecipePatternSymbol,
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
import {
  craftingIngredient,
  isAnyOfIngredient,
  isCraftingIngredient,
  isIngredient,
  isIngredientInput,
  staticShapedRecipe,
  staticShapelessRecipe,
} from "../src/domain/recipe/recipe-data";
import type { RecipePatternKeyMap } from "../src/domain/recipe/recipe-data";
import { recipeExternalFailure } from "../src/domain/recipe/recipe-error";
import type {
  ItemTagMemberships,
  RecipeFailure,
  RecipeOptions,
} from "../src/domain/recipe/recipe";

const expectRecipeSuccess = <A, E>(result: Result.Result<A, E>): A => {
  expect(Result.isSuccess(result)).toBe(true);
  if (Result.isSuccess(result)) {
    return result.success;
  }
  throw new Error(`Expected recipe success, received ${JSON.stringify(result.failure)}`);
};

const itemStack = (item: Parameters<typeof itemStackResult>[0], count: number) =>
  expectRecipeSuccess(
    itemStackResult(item, expectRecipeSuccess(StackCount.result(count))),
  );

const recipeId = (value: string) => expectRecipeSuccess(RecipeId.result(value));
const recipeIngredientCount = (value: number) =>
  expectRecipeSuccess(RecipeIngredientCount.result(value));
const recipePatternRow = (value: string) =>
  expectRecipeSuccess(RecipePatternRow.result(value));
const recipePatternSymbol = (value: string) =>
  expectRecipeSuccess(RecipePatternSymbol.result(value));
const recipeGroup = (value: string) =>
  expectRecipeSuccess(RecipeGroup.result(value));
const recipePriority = (value: number) =>
  expectRecipeSuccess(RecipePriority.result(value));
const recipeStationTag = (value: string) =>
  expectRecipeSuccess(RecipeStationTag.result(value));
const itemTag = (value: string) => expectRecipeSuccess(TagLocation.result(value));
const gridDimension = (value: number) =>
  expectRecipeSuccess(RecipeGridDimension.result(value));
const gridIndex = (value: number) =>
  expectRecipeSuccess(RecipeGridIndex.result(value));

const expectBrandFailure = <A>(
  result: Result.Result<A, unknown>,
  message: string,
): void => {
  expect(Result.isFailure(result)).toBe(true);
  if (Result.isFailure(result)) {
    expect(result.failure).toMatchObject({
      _tag: "BrandError",
      name: "BrandError",
      message,
    });
  }
};

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
  [expectRecipeSuccess(tagged(itemTag("#minecraft:planks"))).tag, new Set<ItemType>(["oak_planks"])],
  [expectRecipeSuccess(tagged(itemTag("#minecraft:both"))).tag, new Set<ItemType>(["oak_planks", "stone"])],
]);

describe("recipe data", () => {
  it("snapshots ingredient records, alternatives, and options before validation", () => {
    let countReads = 0;
    const ingredient = new Proxy(
      { _tag: "Exact", item: "stone", count: 1 },
      {
        get(target, property, receiver) {
          if (property === "count") {
            countReads += 1;
            return countReads === 1 ? 1 : 0;
          }
          return Reflect.get(target, property, receiver);
        },
      },
    );
    const normalizedIngredient = craftingIngredient(ingredient);
    expect(Result.isSuccess(normalizedIngredient)).toBe(true);
    if (Result.isSuccess(normalizedIngredient)) {
      expect(normalizedIngredient.success).toEqual({
        _tag: "Exact",
        item: "stone",
        count: 1,
      });
    }
    expect(countReads).toBe(1);

    let lengthReads = 0;
    const alternatives = new Proxy(["stone"], {
      get(target, property, receiver) {
        if (property === "length") {
          lengthReads += 1;
          return lengthReads === 1 ? 1 : 0;
        }
        return Reflect.get(target, property, receiver);
      },
    });
    const normalizedAlternatives = craftingIngredient(alternatives);
    expect(Result.isSuccess(normalizedAlternatives)).toBe(true);
    if (Result.isSuccess(normalizedAlternatives)) {
      expect(normalizedAlternatives.success).toMatchObject({
        _tag: "AnyOf",
        count: 1,
        options: [{ _tag: "Exact", item: "stone", count: 1 }],
      });
    }
    expect(lengthReads).toBe(1);

    let priorityReads = 0;
    const options: RecipeOptions = { priority: recipePriority(2) };
    Object.defineProperty(options, "priority", {
      enumerable: true,
      get() {
        priorityReads += 1;
        return priorityReads === 1 ? 2 : -1;
      },
    });
    const recipe = shapelessRecipe(
      recipeId("minecraft:snapshot_options"),
      ["stone"],
      itemStack("stick", 1),
      options,
    );
    expect(Result.isSuccess(recipe)).toBe(true);
    if (Result.isSuccess(recipe)) {
      expect(recipe.success.priority).toBe(2);
    }
    expect(priorityReads).toBe(1);

    const unreadableIngredient = new Proxy({}, {
      get() {
        throw new Error("hostile getter");
      },
    });
    expectRecipeFailure(
      craftingIngredient(unreadableIngredient),
      typeFailure("Recipe ingredient must be an item type, item tag, or ingredient object"),
    );
  });

  it("guards exact, tagged, and alternative ingredients", () => {
    const exact = { _tag: "Exact", item: "stone", count: 1 };
    const taggedIngredient = {
      _tag: "ItemTag",
      tag: "#minecraft:planks",
      count: 1,
    };
    const alternatives = expectRecipeSuccess(anyOf(["stone", "dirt"]));

    expect(isIngredient(exact)).toBe(true);
    expect(isIngredient(taggedIngredient)).toBe(true);
    expect(isIngredientInput("stone")).toBe(true);
    expect(isIngredientInput("#minecraft:planks")).toBe(true);
    expect(isIngredientInput(exact)).toBe(true);
    expect(isAnyOfIngredient(alternatives)).toBe(true);
    expect(isCraftingIngredient(exact)).toBe(true);
    expect(isCraftingIngredient(alternatives)).toBe(true);
    expect(isCraftingIngredient({ _tag: "AnyOf", count: 1, options: [] })).toBe(false);
    expect(isCraftingIngredientInput("stone")).toBe(true);
    expect(isCraftingIngredientInput(["stone", "dirt"])).toBe(true);
    expect(isCraftingIngredientInput(alternatives)).toBe(true);
    expect(isCraftingIngredientInput({})).toBe(false);
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    expect(isCraftingIngredientInput(revoked.proxy)).toBe(false);
    expectRecipeFailure(
      craftingIngredient([revoked.proxy]),
      typeFailure("Recipe ingredient must be an item type, item tag, or ingredient object"),
    );

    const structuredAlternative = {
      _tag: "AnyOf",
      count: 1,
      options: [{ _tag: "Exact", item: "stone", count: 1 }],
    };
    expect(Result.isSuccess(craftingIngredient(structuredAlternative))).toBe(true);

    const unreadableIngredient = new Proxy({}, {
      get(_target, property) {
        if (property === "_tag") return "Exact";
        if (property === "item") throw new Error("hostile ingredient getter");
        return undefined;
      },
    });
    expectRecipeFailure(
      craftingIngredient(unreadableIngredient),
      typeFailure("Recipe ingredient must be an item type, item tag, or ingredient object"),
    );
    expectRecipeFailure(
      craftingIngredient([unreadableIngredient]),
      typeFailure("Recipe ingredient must be an item type, item tag, or ingredient object"),
    );
    const unreadableAlternative = new Proxy({}, {
      get(_target, property) {
        if (property === "_tag") return "AnyOf";
        if (property === "count") return 1;
        if (property === "options") throw new Error("hostile alternative getter");
        return undefined;
      },
    });
    expectRecipeFailure(
      craftingIngredient(unreadableAlternative),
      typeFailure("Recipe ingredient object has an invalid shape"),
    );
  });

  it("returns failures for hostile snapshot inspection and invalid scalar details", () => {
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    expectRecipeFailure(
      craftingIngredient(revoked.proxy),
      typeFailure("Recipe ingredient must be an item type, item tag, or ingredient object"),
    );

    const invalidLength = new Proxy(["stone"], {
      get(target, property, receiver) {
        return property === "length" ? Number.NaN : Reflect.get(target, property, receiver);
      },
    });
    expectRecipeFailure(
      craftingIngredient(invalidLength),
      typeFailure("Recipe ingredient must be an item type, item tag, or ingredient object"),
    );
    const unreadableLength = new Proxy(["stone"], {
      get(target, property, receiver) {
        if (property === "length") throw new Error("hostile array getter");
        return Reflect.get(target, property, receiver);
      },
    });
    expectRecipeFailure(
      craftingIngredient(unreadableLength),
      typeFailure("Recipe ingredient must be an item type, item tag, or ingredient object"),
    );

    const unreadableKey = new Proxy({ A: "stone" }, {
      ownKeys() {
        throw new Error("hostile ownKeys trap");
      },
    });
    expectRecipeFailure(
      Reflect.apply(shapedRecipe, undefined, [
        recipeId("minecraft:unreadable_key"),
        [recipePatternRow("A")],
        unreadableKey,
        itemStack("stick", 1),
      ]),
      typeFailure("Shaped recipe key must be an object"),
    );

    expectRecipeFailure(
      Reflect.apply(tagged, undefined, ["#minecraft:planks", null]),
      rangeFailure("Ingredient count must be a safe integer in [1, 64]"),
    );
    expectRecipeFailure(
      Reflect.apply(tagged, undefined, [7]),
      typeFailure("Recipe item tag must start with # and contain a name, received 7"),
    );
    expectRecipeFailure(
      Reflect.apply(tagged, undefined, [{}]),
      typeFailure("Recipe item tag must start with # and contain a name, received non-string"),
    );
    expectRecipeFailure(
      Reflect.apply(exactly, undefined, [null]),
      typeFailure("Unknown exact ingredient item"),
    );
    expectRecipeFailure(
      Reflect.apply(shapelessRecipe, undefined, [
        recipeId("minecraft:bad_tags"),
        ["stone"],
        itemStack("stick", 1),
        { tags: "not-an-array" },
      ]),
      typeFailure("Recipe station tags must be an array"),
    );
    for (const options of [
      { category: 1 },
      { priority: {} },
      { priority: -1 },
    ]) {
      expect(Result.isFailure(Reflect.apply(shapelessRecipe, undefined, [
        recipeId("minecraft:bad_option_value"),
        ["stone"],
        itemStack("stick", 1),
        options,
      ]))).toBe(true);
    }
  });

  it("maps recipe brand failures into Result failures", () => {
    const symbolResult = RecipePatternSymbol.result("");
    if (Result.isSuccess(symbolResult)) throw new Error("expected an invalid pattern symbol");
    const brandFailure = symbolResult.failure;
    const validId = recipeId("minecraft:brand_failure");
    const validRow = [recipePatternRow("A")];
    const validKey: RecipePatternKeyMap = {
      [recipePatternSymbol("A")]: "stone",
    };
    const validOutput = itemStack("stick", 1);
    const groupSpy = vi
      .spyOn(RecipeGroup, "result")
      .mockReturnValue(Result.fail(brandFailure));
    try {
      expectRecipeFailure(
        shapelessRecipe(
          recipeId("minecraft:bad_group"),
          ["stone"],
          itemStack("stick", 1),
          { group: RecipeGroup("group") },
        ),
        typeFailure("Recipe group must be a string"),
      );
    } finally {
      groupSpy.mockRestore();
    }

    const symbolSpy = vi
      .spyOn(RecipePatternSymbol, "result")
      .mockReturnValue(Result.fail(brandFailure));
    try {
      expectRecipeFailure(
        shapedRecipe(
          validId,
          validRow,
          validKey,
          validOutput,
        ),
        typeFailure("Shaped recipe keys must use one non-space character"),
      );
    } finally {
      symbolSpy.mockRestore();
    }

    const originalDimensionResult = RecipeGridDimension.result.bind(RecipeGridDimension);
    const widthSpy = vi
      .spyOn(RecipeGridDimension, "result")
      .mockReturnValue(Result.fail(brandFailure));
    try {
      expectRecipeFailure(
        shapedRecipe(
          validId,
          validRow,
          validKey,
          validOutput,
        ),
        rangeFailure("Shaped recipe dimensions are out of range"),
      );
    } finally {
      widthSpy.mockRestore();
    }

    const heightSpy = vi
      .spyOn(RecipeGridDimension, "result")
      .mockImplementationOnce((value) => originalDimensionResult(value))
      .mockReturnValue(Result.fail(brandFailure));
    try {
      expectRecipeFailure(
        shapedRecipe(
          validId,
          validRow,
          validKey,
          validOutput,
        ),
        rangeFailure("Shaped recipe dimensions are out of range"),
      );
    } finally {
      heightSpy.mockRestore();
    }
  });

  it("rejects invalid scalar recipe brands", () => {
    expect(RecipeCompletionCount(0)).toBe(0);
    expectBrandFailure(
      RecipeGridIndex.result(3),
      "RecipeGridIndex must be an integer in [0, 2], received 3",
    );
    expectBrandFailure(
      Reflect.apply(RecipeGroup.result, undefined, [1]),
      "RecipeGroup must be a string",
    );
    expectBrandFailure(
      RecipeCompletionCount.result(-1),
      "RecipeCompletionCount must be a non-negative safe integer, received -1",
    );
  });

  it("normalizes static recipe ingredients and optional metadata", () => {
    const direct = expectRecipeSuccess(exactly("stone", recipeIngredientCount(2)));
    const alternatives = expectRecipeSuccess(anyOf(["stone", "dirt"]));
    const output = itemStack("stick", 1);
    const shaped = staticShapedRecipe(
      "minecraft:static_shaped",
      [" S "],
      { S: direct },
      output,
      {
        assumeSymmetry: true,
        category: "equipment",
        group: recipeGroup("static"),
        priority: recipePriority(2),
        showNotification: false,
        tags: [recipeStationTag("crafting_table")],
      },
    );
    expect(shaped.pattern).toEqual({ width: 1, height: 1, cells: [direct] });
    expect(shaped).toMatchObject({
      assumeSymmetry: true,
      category: "equipment",
      group: "static",
      priority: 2,
      showNotification: false,
      tags: ["crafting_table"],
    });

    const shapeless = staticShapelessRecipe(
      "minecraft:static_shapeless",
      [["stone", "dirt"], alternatives, itemTag("#minecraft:planks"), direct],
      output,
    );
    expect(shapeless.ingredients).toEqual([
      {
        _tag: "AnyOf",
        count: 1,
        options: [
          { _tag: "Exact", item: "stone", count: 1 },
          { _tag: "Exact", item: "dirt", count: 1 },
        ],
      },
      alternatives,
      { _tag: "ItemTag", tag: "#minecraft:planks", count: 1 },
      direct,
    ]);
    expect(shapeless).toMatchObject({
      assumeSymmetry: false,
      priority: 0,
      tags: [],
    });
  });

  it("retains external recipe failure details with or without a component key", () => {
    const withoutComponentKey = recipeExternalFailure(
      "SyntaxError",
      "invalid recipe document",
    );
    expect(Result.isFailure(withoutComponentKey)).toBe(true);
    if (Result.isFailure(withoutComponentKey)) {
      expect(withoutComponentKey.failure).toEqual({
        _tag: "RecipeExternalFailure",
        name: "SyntaxError",
        message: "invalid recipe document",
      });
    }

    const withComponentKey = recipeExternalFailure(
      "SyntaxError",
      "invalid item component",
      "minecraft:custom_name",
    );
    expect(Result.isFailure(withComponentKey)).toBe(true);
    if (Result.isFailure(withComponentKey)) {
      expect(withComponentKey.failure).toEqual({
        _tag: "RecipeExternalFailure",
        name: "SyntaxError",
        message: "invalid item component",
        componentKey: "minecraft:custom_name",
      });
    }
  });

  it("constructs and matches exact and tagged ingredients", () => {
    const exact = expectRecipeSuccess(exactly("stone", recipeIngredientCount(2)));
    const tag = expectRecipeSuccess(tagged(itemTag("#minecraft:planks"), recipeIngredientCount(2)));
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
    expect(expectRecipeSuccess(tagged(itemTag("#minecraft:planks")))).toEqual({
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
      Reflect.apply(exactly, undefined, ["stone", 0]),
      rangeFailure("Ingredient count must be a safe integer in [1, 64], received 0"),
    );
    expectRecipeFailure(
      Reflect.apply(exactly, undefined, ["stone", 65]),
      rangeFailure("Ingredient count must be a safe integer in [1, 64], received 65"),
    );
    expectRecipeFailure(
      Reflect.apply(exactly, undefined, ["stone", 1.5]),
      rangeFailure("Ingredient count must be a safe integer in [1, 64], received 1.5"),
    );
    expectRecipeFailure(
      Reflect.apply(exactly, undefined, ["stone", "2"]),
      rangeFailure("Ingredient count must be a safe integer in [1, 64], received 2"),
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
      typeFailure("Recipe ingredient object has an invalid shape"),
    );
  });

  it("normalizes shaped patterns, options, and ingredient objects", () => {
    const recipe = expectRecipeSuccess(shapedRecipe(
      recipeId("minecraft:column"),
      [recipePatternRow("  E"), recipePatternRow("T ")],
      {
        [recipePatternSymbol("E")]: expectRecipeSuccess(exactly("stone", recipeIngredientCount(2))),
        [recipePatternSymbol("T")]: expectRecipeSuccess(tagged(itemTag("#minecraft:planks"))),
      },
      itemStack("crafting_table", 1),
      {
        assumeSymmetry: true,
        priority: recipePriority(2),
        tags: [recipeStationTag("crafting_table")],
      },
    ));

    expect(recipe._tag).toBe("Shaped");
    expect(recipe.pattern).toEqual({
      width: 3,
      height: 2,
      cells: [
        undefined,
        undefined,
        expectRecipeSuccess(exactly("stone", recipeIngredientCount(2))),
        expectRecipeSuccess(tagged(itemTag("#minecraft:planks"))),
        undefined,
        undefined,
      ],
    });
    expect(recipe.assumeSymmetry).toBe(true);
    expect(recipe.priority).toBe(2);
    expect(recipe.tags).toEqual(["crafting_table"]);

    const alternativeRecipe = expectRecipeSuccess(shapedRecipe(
      recipeId("minecraft:alternative"),
      [recipePatternRow("A")],
      { [recipePatternSymbol("A")]: ["stone", "dirt"] },
      itemStack("stick", 1),
      { category: "misc", group: recipeGroup("alternatives"), showNotification: true },
    ));
    expect(alternativeRecipe.pattern.cells).toEqual([
      expectRecipeSuccess(anyOf(["stone", "dirt"])),
    ]);
    expect(alternativeRecipe.category).toBe("misc");
    expect(alternativeRecipe.group).toBe("alternatives");
    expect(alternativeRecipe.showNotification).toBe(true);

    const defaultRecipe = expectRecipeSuccess(shapedRecipe(
      recipeId("minecraft:default"),
      [recipePatternRow("S"), recipePatternRow("")],
      { [recipePatternSymbol("S")]: "stone" },
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
      Reflect.apply(shapedRecipe, undefined, [" ", ["S"], { S: "stone" }, itemStack("stick", 1)]),
      typeFailure("Recipe id must be a resource location"),
    );
    expectRecipeFailure(
      Reflect.apply(shapedRecipe, undefined, [null, [recipePatternRow("S")], { [recipePatternSymbol("S")]: "stone" }, itemStack("stick", 1)]),
      typeFailure("Recipe id must be a resource location"),
    );
    expectRecipeFailure(
      Reflect.apply(shapedRecipe, undefined, ["minecraft:bad", [], { S: "stone" }, itemStack("stick", 1)]),
      rangeFailure("Shaped recipe rows must contain 1 to 3 rows"),
    );
    expectRecipeFailure(
      Reflect.apply(shapedRecipe, undefined, ["minecraft:bad", ["S", "S", "S", "S"], { S: "stone" }, itemStack("stick", 1)]),
      rangeFailure("Shaped recipe rows must contain 1 to 3 rows"),
    );
    expectRecipeFailure(
      Reflect.apply(shapedRecipe, undefined, ["minecraft:bad", ["SSSS"], { S: "stone" }, itemStack("stick", 1)]),
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
      Reflect.apply(shapedRecipe, undefined, ["minecraft:bad", ["S"], { AB: "stone" }, itemStack("stick", 1)]),
      typeFailure("Shaped recipe keys must use one non-space character"),
    );
    expectRecipeFailure(
      Reflect.apply(shapedRecipe, undefined, ["minecraft:bad", ["S"], { " ": "stone" }, itemStack("stick", 1)]),
      typeFailure("Shaped recipe keys must use one non-space character"),
    );
    expectRecipeFailure(
      Reflect.apply(shapedRecipe, undefined, ["minecraft:bad", ["X"], { S: "stone" }, itemStack("stick", 1)]),
      typeFailure("Shaped recipe pattern references unknown key: X"),
    );
    expectRecipeFailure(
      Reflect.apply(shapedRecipe, undefined, ["minecraft:bad", ["   "], {}, itemStack("stick", 1)]),
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
      Reflect.apply(shapedRecipe, undefined, ["minecraft:bad", ["S"], { S: "stone" }, itemStack("stick", 1), { priority: -1 }]),
      rangeFailure("Recipe priority must be a non-negative safe integer, received -1"),
    );
    expectRecipeFailure(
      Reflect.apply(shapedRecipe, undefined, ["minecraft:bad", ["S"], { S: "stone" }, itemStack("stick", 1), { priority: 1.5 }]),
      rangeFailure("Recipe priority must be a non-negative safe integer, received 1.5"),
    );
    expectRecipeFailure(
      Reflect.apply(shapedRecipe, undefined, ["minecraft:bad", ["S"], { S: "stone" }, itemStack("stick", 1), { priority: "1" }]),
      rangeFailure("Recipe priority must be a non-negative safe integer, received 1"),
    );
    expectRecipeFailure(
      Reflect.apply(shapedRecipe, undefined, ["minecraft:bad", ["S"], { S: "stone" }, itemStack("stick", 1), { tags: "crafting_table" }]),
      typeFailure("Recipe station tags must be an array"),
    );
    expectRecipeFailure(
      Reflect.apply(shapedRecipe, undefined, ["minecraft:bad", ["S"], { S: "stone" }, itemStack("stick", 1), { tags: [""] }]),
      typeFailure("Recipe station tags must be resource locations"),
    );
    expectRecipeFailure(
      Reflect.apply(shapedRecipe, undefined, ["minecraft:bad", ["S"], { S: "stone" }, itemStack("stick", 1), { tags: [1] }]),
      typeFailure("Recipe station tags must be resource locations"),
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
      recipeId("minecraft:mix"),
      ["stone", itemTag("#minecraft:planks"), expectRecipeSuccess(exactly("dirt", recipeIngredientCount(2)))],
      itemStack("stick", 1),
      { priority: recipePriority(1), tags: [recipeStationTag("crafting_table")] },
    ));

    expect(recipe._tag).toBe("Shapeless");
    expect(recipe.ingredients).toEqual([
      expectRecipeSuccess(exactly("stone")),
      expectRecipeSuccess(tagged(itemTag("#minecraft:planks"))),
      expectRecipeSuccess(exactly("dirt", recipeIngredientCount(2))),
    ]);
    expect(recipe.priority).toBe(1);
    expect(recipe.tags).toEqual(["crafting_table"]);
    expectRecipeFailure(
      Reflect.apply(shapelessRecipe, undefined, ["minecraft:bad", [], itemStack("stick", 1)]),
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
    const grid = expectRecipeSuccess(craftGrid(
      gridDimension(2),
      gridDimension(2),
      ["stone", stack, undefined],
    ));

    expect(grid).toEqual({
      width: 2,
      height: 2,
      cells: [itemStack("stone", 1), stack, undefined, undefined],
    });
    expect(cellAt(grid, gridIndex(0), gridIndex(0))).toEqual(itemStack("stone", 1));
    expect(cellAt(grid, gridIndex(1), gridIndex(0))).toEqual(stack);
    expect(Reflect.apply(cellAt, undefined, [grid, -1, 0])).toBeUndefined();
    expect(cellAt(grid, gridIndex(0), gridIndex(2))).toBeUndefined();
    expect(Reflect.apply(cellAt, undefined, [grid, 0.5, 0])).toBeUndefined();
    expect(expectRecipeSuccess(craftGrid(gridDimension(0), gridDimension(0), []))).toEqual({ width: 0, height: 0, cells: [] });
    expectRecipeFailure(
      Reflect.apply(craftGrid, undefined, [-1, 1, []]),
      rangeFailure("Craft grid dimensions must be safe integers in [0, 3]"),
    );
    expectRecipeFailure(
      Reflect.apply(craftGrid, undefined, [1, MAX_RECIPE_SIDE + 1, []]),
      rangeFailure("Craft grid dimensions must be safe integers in [0, 3]"),
    );
    expectRecipeFailure(
      Reflect.apply(craftGrid, undefined, [1.5, 1, []]),
      rangeFailure("Craft grid dimensions must be safe integers in [0, 3]"),
    );
    expectRecipeFailure(
      craftGrid(gridDimension(1), gridDimension(1), [itemStack("stone", 1), itemStack("dirt", 1)]),
      rangeFailure("Craft grid contains more cells than its dimensions allow"),
    );
    let lengthReads = 0
    let elementReads = 0
    let prototypeReads = 0
    const oversized = new Proxy([], {
      get(target, key, receiver) {
        if (key === 'length') {
          lengthReads += 1
          return 1_000_000_000
        }
        if (typeof key === 'string' && /^\d+$/u.test(key)) elementReads += 1
        return Reflect.get(target, key, receiver)
      },
      getPrototypeOf() {
        prototypeReads += 1
        throw new Error('array prototype must not be inspected')
      },
    })
    expectRecipeFailure(
      Reflect.apply(craftGrid, undefined, [3, 3, oversized]),
      rangeFailure("Craft grid contains more cells than its dimensions allow"),
    )
    expect(lengthReads).toBe(1)
    expect(elementReads).toBe(0)
    expect(prototypeReads).toBe(0)
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
        recipe.tags.includes(recipeStationTag("crafting_table")),
      ),
    ).toBe(true);
  });
});
