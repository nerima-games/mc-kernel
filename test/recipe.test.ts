import { describe, expect, it } from "vitest";

import { isItemStack, itemStack } from "../src/domain/item-stack";
import type { ItemType } from "../src/domain/item-type";
import {
  MAX_RECIPE_SIDE,
  VANILLA_CRAFTING_RECIPES,
  anyOf,
  cellAt,
  conflictsIn,
  craftGrid,
  exactly,
  ingredientMatches,
  isCraftingIngredientInput,
  matchRecipe,
  matchRecipeWithAssignments,
  matchesRecipe,
  matchesShaped,
  matchesShapeless,
  shapelessRecipe,
  shapedRecipe,
  tagged,
} from "../src/domain/recipe";
import type { ItemTagMemberships } from "../src/domain/recipe";
import {
  buildRecipeIndexes,
  matchIndexedRecipe,
} from "../src/domain/recipe-matching";

const itemTags: ItemTagMemberships = new Map([
  [tagged("#minecraft:planks").tag, new Set<ItemType>(["oak_planks"])],
  [tagged("#minecraft:both").tag, new Set<ItemType>(["oak_planks", "stone"])],
]);

describe("recipe data", () => {
  it("constructs and matches exact and tagged ingredients", () => {
    const exact = exactly("stone", 2);
    const tag = tagged("#minecraft:planks", 2);
    const alternatives = anyOf(["stone", "dirt"]);

    expect(exact).toEqual({ _tag: "Exact", item: "stone", count: 2 });
    expect(tag).toEqual({
      _tag: "ItemTag",
      tag: "#minecraft:planks",
      count: 2,
    });
    expect(exactly("stone")).toEqual({
      _tag: "Exact",
      item: "stone",
      count: 1,
    });
    expect(tagged("#minecraft:planks")).toEqual({
      _tag: "ItemTag",
      tag: "#minecraft:planks",
      count: 1,
    });
    expect(ingredientMatches(exact, "stone")).toBe(true);
    expect(ingredientMatches(exact, "dirt")).toBe(false);
    expect(ingredientMatches(tag, "oak_planks", itemTags)).toBe(true);
    expect(ingredientMatches(tag, "stone", itemTags)).toBe(false);
    expect(ingredientMatches(tag, "stone")).toBe(false);
    expect(alternatives).toEqual({
      _tag: "AnyOf",
      count: 1,
      options: [exactly("stone"), exactly("dirt")],
    });
    expect(ingredientMatches(alternatives, "stone")).toBe(true);
    expect(ingredientMatches(alternatives, "sand")).toBe(false);
    expect(isCraftingIngredientInput(["stone"])).toBe(true);
    expect(isCraftingIngredientInput([])).toBe(false);
    expect(isCraftingIngredientInput(["not-a-tag"])).toBe(false);
    expect(isCraftingIngredientInput(alternatives)).toBe(true);
    expect(isCraftingIngredientInput({})).toBe(false);
    expect(() => Reflect.apply(exactly, undefined, ["unknown"])).toThrow(
      TypeError,
    );
    expect(() => exactly("stone", 0)).toThrow(RangeError);
    expect(() => exactly("stone", 65)).toThrow(RangeError);
    expect(() => exactly("stone", 1.5)).toThrow(RangeError);
    expect(() => Reflect.apply(tagged, undefined, ["planks"])).toThrow(
      TypeError,
    );
    expect(() => Reflect.apply(tagged, undefined, [1])).toThrow(TypeError);
    expect(() => Reflect.apply(anyOf, undefined, [[]])).toThrow(RangeError);
    expect(() => Reflect.apply(anyOf, undefined, [null])).toThrow(RangeError);
    expect(() =>
      Reflect.apply(ingredientMatches, undefined, [
        { _tag: "Unknown" },
        "stone",
      ]),
    ).toThrow(TypeError);
  });

  it("normalizes shaped patterns, options, and ingredient objects", () => {
    const recipe = shapedRecipe(
      "minecraft:column",
      ["  E", "T "],
      {
        E: { _tag: "Exact", item: "stone", count: 2 },
        T: { _tag: "ItemTag", tag: "#minecraft:planks", count: 1 },
      },
      itemStack("crafting_table", 1),
      { assumeSymmetry: true, priority: 2, tags: ["crafting_table"] },
    );

    expect(recipe._tag).toBe("Shaped");
    expect(recipe.pattern).toEqual({
      width: 3,
      height: 2,
      cells: [
        undefined,
        undefined,
        exactly("stone", 2),
        tagged("#minecraft:planks"),
        undefined,
        undefined,
      ],
    });
    expect(recipe.assumeSymmetry).toBe(true);
    expect(recipe.priority).toBe(2);
    expect(recipe.tags).toEqual(["crafting_table"]);

    const alternativeRecipe = shapedRecipe(
      "minecraft:alternative",
      ["A"],
      { A: ["stone", "dirt"] },
      itemStack("stick", 1),
      { category: "misc", group: "alternatives", showNotification: true },
    );
    expect(alternativeRecipe.pattern.cells).toEqual([anyOf(["stone", "dirt"])]);
    expect(alternativeRecipe.category).toBe("misc");
    expect(alternativeRecipe.group).toBe("alternatives");
    expect(alternativeRecipe.showNotification).toBe(true);

    const defaultRecipe = shapedRecipe(
      "minecraft:default",
      ["S", ""],
      { S: "stone" },
      itemStack("stick", 1),
    );
    expect(defaultRecipe.assumeSymmetry).toBe(false);
    expect(defaultRecipe.pattern).toEqual({
      width: 1,
      height: 1,
      cells: [exactly("stone")],
    });
    expect(MAX_RECIPE_SIDE).toBe(3);
    expect(() =>
      shapedRecipe(" ", ["S"], { S: "stone" }, itemStack("stick", 1)),
    ).toThrow(TypeError);
    expect(() =>
      shapedRecipe("minecraft:bad", [], { S: "stone" }, itemStack("stick", 1)),
    ).toThrow(RangeError);
    expect(() =>
      shapedRecipe(
        "minecraft:bad",
        ["S", "S", "S", "S"],
        { S: "stone" },
        itemStack("stick", 1),
      ),
    ).toThrow(RangeError);
    expect(() =>
      shapedRecipe(
        "minecraft:bad",
        ["SSSS"],
        { S: "stone" },
        itemStack("stick", 1),
      ),
    ).toThrow(RangeError);
    expect(() =>
      Reflect.apply(shapedRecipe, undefined, [
        "minecraft:bad",
        [1],
        { S: "stone" },
        itemStack("stick", 1),
      ]),
    ).toThrow(RangeError);
    expect(() =>
      Reflect.apply(shapedRecipe, undefined, [
        "minecraft:bad",
        ["S"],
        null,
        itemStack("stick", 1),
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(shapedRecipe, undefined, [
        "minecraft:bad",
        ["S"],
        [],
        itemStack("stick", 1),
      ]),
    ).toThrow(TypeError);
    expect(() =>
      shapedRecipe(
        "minecraft:bad",
        ["S"],
        { AB: "stone" },
        itemStack("stick", 1),
      ),
    ).toThrow(TypeError);
    expect(() =>
      shapedRecipe(
        "minecraft:bad",
        ["S"],
        { " ": "stone" },
        itemStack("stick", 1),
      ),
    ).toThrow(TypeError);
    expect(() =>
      shapedRecipe(
        "minecraft:bad",
        ["X"],
        { S: "stone" },
        itemStack("stick", 1),
      ),
    ).toThrow(TypeError);
    expect(() =>
      shapedRecipe("minecraft:bad", ["   "], {}, itemStack("stick", 1)),
    ).toThrow(RangeError);
    expect(() =>
      Reflect.apply(shapedRecipe, undefined, [
        "minecraft:bad",
        ["S"],
        { S: "stone" },
        {},
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(shapedRecipe, undefined, [
        "minecraft:bad",
        ["S"],
        { S: "stone" },
        itemStack("stick", 1),
        null,
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(shapedRecipe, undefined, [
        "minecraft:bad",
        ["S"],
        { S: "stone" },
        itemStack("stick", 1),
        [],
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(shapedRecipe, undefined, [
        "minecraft:bad",
        ["S"],
        { S: "stone" },
        itemStack("stick", 1),
        { assumeSymmetry: "yes" },
      ]),
    ).toThrow(TypeError);
    expect(() =>
      shapedRecipe(
        "minecraft:bad",
        ["S"],
        { S: "stone" },
        itemStack("stick", 1),
        { priority: -1 },
      ),
    ).toThrow(RangeError);
    expect(() =>
      shapedRecipe(
        "minecraft:bad",
        ["S"],
        { S: "stone" },
        itemStack("stick", 1),
        { priority: 1.5 },
      ),
    ).toThrow(RangeError);
    expect(() =>
      Reflect.apply(shapedRecipe, undefined, [
        "minecraft:bad",
        ["S"],
        { S: "stone" },
        itemStack("stick", 1),
        { tags: "crafting_table" },
      ]),
    ).toThrow(TypeError);
    expect(() =>
      shapedRecipe(
        "minecraft:bad",
        ["S"],
        { S: "stone" },
        itemStack("stick", 1),
        { tags: [""] },
      ),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(shapedRecipe, undefined, [
        "minecraft:bad",
        ["S"],
        { S: "stone" },
        itemStack("stick", 1),
        { tags: [1] },
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(shapedRecipe, undefined, [
        "minecraft:bad",
        ["S"],
        { S: "stone" },
        itemStack("stick", 1),
        { category: "invalid" },
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(shapedRecipe, undefined, [
        "minecraft:bad",
        ["S"],
        { S: "stone" },
        itemStack("stick", 1),
        { group: 1 },
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(shapedRecipe, undefined, [
        "minecraft:bad",
        ["S"],
        { S: "stone" },
        itemStack("stick", 1),
        { showNotification: "yes" },
      ]),
    ).toThrow(TypeError);
  });

  it("constructs shapeless recipes and rejects invalid ingredients", () => {
    const recipe = shapelessRecipe(
      "minecraft:mix",
      ["stone", "#minecraft:planks", { _tag: "Exact", item: "dirt", count: 2 }],
      itemStack("stick", 1),
      { priority: 1, tags: ["crafting_table"] },
    );

    expect(recipe._tag).toBe("Shapeless");
    expect(recipe.ingredients).toEqual([
      exactly("stone"),
      tagged("#minecraft:planks"),
      exactly("dirt", 2),
    ]);
    expect(recipe.priority).toBe(1);
    expect(recipe.tags).toEqual(["crafting_table"]);
    expect(() =>
      shapelessRecipe("minecraft:bad", [], itemStack("stick", 1)),
    ).toThrow(RangeError);
    expect(() =>
      Reflect.apply(shapelessRecipe, undefined, [
        "minecraft:bad",
        "stone",
        itemStack("stick", 1),
      ]),
    ).toThrow(RangeError);
    expect(() =>
      Reflect.apply(shapelessRecipe, undefined, [
        "minecraft:bad",
        ["not-a-tag"],
        itemStack("stick", 1),
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(shapelessRecipe, undefined, [
        "minecraft:bad",
        [1],
        itemStack("stick", 1),
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(shapelessRecipe, undefined, [
        "minecraft:bad",
        [{ _tag: "Exact", item: "stone", count: "1" }],
        itemStack("stick", 1),
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(shapelessRecipe, undefined, [
        "minecraft:bad",
        [{ _tag: "Exact", item: "unknown", count: 1 }],
        itemStack("stick", 1),
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(shapelessRecipe, undefined, [
        "minecraft:bad",
        ["stone"],
        {},
      ]),
    ).toThrow(TypeError);
  });

  it("normalizes craft grids and exposes safe cell lookup", () => {
    const stack = itemStack("dirt", 2);
    const grid = craftGrid(2, 2, ["stone", stack, undefined]);

    expect(grid).toEqual({
      width: 2,
      height: 2,
      cells: [itemStack("stone", 1), stack, undefined, undefined],
    });
    expect(cellAt(grid, 0, 0)).toEqual(itemStack("stone", 1));
    expect(cellAt(grid, 1, 0)).toEqual(stack);
    expect(cellAt(grid, -1, 0)).toBeUndefined();
    expect(cellAt(grid, 0, 2)).toBeUndefined();
    expect(cellAt(grid, 0.5, 0)).toBeUndefined();
    expect(craftGrid(0, 0, [])).toEqual({ width: 0, height: 0, cells: [] });
    expect(() => craftGrid(-1, 1, [])).toThrow(RangeError);
    expect(() => craftGrid(1, MAX_RECIPE_SIDE + 1, [])).toThrow(RangeError);
    expect(() => craftGrid(1.5, 1, [])).toThrow(RangeError);
    expect(() =>
      craftGrid(1, 1, [itemStack("stone", 1), itemStack("dirt", 1)]),
    ).toThrow(RangeError);
    expect(() => Reflect.apply(craftGrid, undefined, [1, 1, "stone"])).toThrow(
      RangeError,
    );
    expect(() => Reflect.apply(craftGrid, undefined, [1, 1, [{}]])).toThrow(
      TypeError,
    );
    expect(isItemStack(grid.cells[0])).toBe(true);
  });
});

describe("recipe matching", () => {
  const pair = shapedRecipe(
    "minecraft:pair",
    ["AB"],
    { A: "stone", B: "dirt" },
    itemStack("crafting_table", 1),
  );

  it("matches shaped recipes in a grid position and rejects extra cells", () => {
    const placed = craftGrid(3, 3, [undefined, "stone", "dirt"]);
    const hole = craftGrid(3, 1, ["stone", undefined, "dirt"]);

    expect(matchesShaped(pair, placed)).toBe(true);
    expect(matchesRecipe(pair, placed)).toBe(true);
    expect(matchesShaped(pair, craftGrid(3, 3, []))).toBe(false);
    expect(
      matchesShaped(pair, craftGrid(3, 3, ["stone", "stone", "dirt"])),
    ).toBe(false);
    expect(matchesShaped(pair, hole)).toBe(false);
    expect(matchesShaped(pair, craftGrid(3, 3, ["stone", "stone"]))).toBe(
      false,
    );
    expect(
      matchesShaped(
        pair,
        craftGrid(3, 3, ["stone", "dirt", undefined, "stone"]),
      ),
    ).toBe(false);
  });

  it("matches counts, item tags, and optional horizontal symmetry", () => {
    const countRecipe = shapedRecipe(
      "minecraft:count",
      ["S"],
      { S: exactly("stone", 2) },
      itemStack("stick", 1),
    );
    const tagRecipe = shapedRecipe(
      "minecraft:tag",
      ["P"],
      { P: "#minecraft:planks" },
      itemStack("stick", 1),
    );
    const mirrored = shapedRecipe(
      "minecraft:mirror",
      ["AB"],
      { A: "stone", B: "dirt" },
      itemStack("stick", 1),
      { assumeSymmetry: true },
    );
    const reversed = craftGrid(2, 1, ["dirt", "stone"]);

    expect(
      matchesShaped(countRecipe, craftGrid(1, 1, [itemStack("stone", 1)])),
    ).toBe(false);
    expect(
      matchesShaped(countRecipe, craftGrid(1, 1, [itemStack("stone", 2)])),
    ).toBe(true);
    expect(matchesShaped(tagRecipe, craftGrid(1, 1, ["oak_planks"]))).toBe(
      false,
    );
    expect(
      matchesShaped(tagRecipe, craftGrid(1, 1, ["oak_planks"]), { itemTags }),
    ).toBe(true);
    expect(matchesShaped(pair, reversed)).toBe(false);
    expect(matchesShaped(mirrored, reversed)).toBe(true);
  });

  it("matches shapeless recipes by distinct occupied slots", () => {
    const backtracking = shapelessRecipe(
      "minecraft:backtracking",
      ["#minecraft:both", "oak_planks"],
      itemStack("stick", 1),
    );
    const countRecipe = shapelessRecipe(
      "minecraft:count",
      [exactly("stone", 2)],
      itemStack("stick", 1),
    );
    const twoSlots = craftGrid(2, 1, ["oak_planks", "stone"]);

    expect(matchesShapeless(backtracking, twoSlots, { itemTags })).toBe(true);
    expect(matchesRecipe(backtracking, twoSlots, { itemTags })).toBe(true);
    expect(matchesShapeless(backtracking, twoSlots)).toBe(false);
    expect(
      matchesShapeless(
        backtracking,
        craftGrid(3, 1, ["oak_planks", "stone", "dirt"]),
        { itemTags },
      ),
    ).toBe(false);
    expect(
      matchesShapeless(countRecipe, craftGrid(1, 1, [itemStack("stone", 2)])),
    ).toBe(true);
    expect(
      matchesShapeless(countRecipe, craftGrid(1, 1, [itemStack("stone", 1)])),
    ).toBe(false);
    expect(
      matchesShapeless(
        countRecipe,
        craftGrid(2, 1, [itemStack("stone", 2), "stone"]),
      ),
    ).toBe(false);
    expect(
      matchesShapeless(backtracking, craftGrid(0, 0, []), { itemTags }),
    ).toBe(false);
    expect(
      Reflect.apply(matchesShapeless, undefined, [
        { ...backtracking, ingredients: [] },
        twoSlots,
      ]),
    ).toBe(false);
    expect(
      Reflect.apply(matchesShapeless, undefined, [
        { ...backtracking, ingredients: [undefined] },
        twoSlots,
      ]),
    ).toBe(false);
    expect(
      Reflect.apply(matchesShapeless, undefined, [
        { ...backtracking, ingredients: [undefined] },
        craftGrid(1, 1, ["oak_planks"]),
      ]),
    ).toBe(false);
    expect(
      Reflect.apply(matchesShapeless, undefined, [
        { ...backtracking, ingredients: [{}] },
        craftGrid(1, 1, ["oak_planks"]),
      ]),
    ).toBe(false);
    expect(
      Reflect.apply(matchesShapeless, undefined, [
        { ...backtracking, ingredients: ["malformed"] },
        craftGrid(1, 1, ["oak_planks"]),
      ]),
    ).toBe(false);
    expect(
      Reflect.apply(matchRecipeWithAssignments, undefined, [
        [
          {
            _tag: "Shapeless",
            id: "minecraft:sparse",
            ingredients: new Array(1),
            output: itemStack("stick", 1),
            priority: 0,
            tags: [],
          },
        ],
        craftGrid(1, 1, ["oak_planks"]),
      ]),
    ).toEqual({ _tag: "NoMatch" });
    expect(() =>
      Reflect.apply(matchesShapeless, undefined, [null, twoSlots]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(matchesShapeless, undefined, [{}, twoSlots]),
    ).toThrow(TypeError);
    const memoizedFailure = shapelessRecipe(
      "minecraft:memoized-failure",
      [
        tagged("#minecraft:both"),
        tagged("#minecraft:both"),
        tagged("#minecraft:both"),
        "dirt",
      ],
      itemStack("stick", 1),
    );
    expect(
      matchesShapeless(
        memoizedFailure,
        craftGrid(2, 2, ["stone", "stone", "stone", "stone"]),
        { itemTags },
      ),
    ).toBe(false);
    const missingSlot = shapelessRecipe(
      "minecraft:missing-slot",
      ["dirt"],
      itemStack("stick", 1),
    );
    expect(
      matchesShapeless(missingSlot, craftGrid(2, 1, ["stone", undefined])),
    ).toBe(false);
  });

  it("filters by station and orders matching recipes", () => {
    const stationRecipe = shapedRecipe(
      "minecraft:station",
      ["S"],
      { S: "stone" },
      itemStack("stick", 1),
      { tags: ["crafting_table"] },
    );
    const grid = craftGrid(1, 1, ["stone"]);
    const shaped = shapedRecipe(
      "minecraft:z-shaped",
      ["S"],
      { S: "stone" },
      itemStack("oak_planks", 1),
      { priority: 1 },
    );
    const shapeless = shapelessRecipe(
      "minecraft:a-shapeless",
      ["stone"],
      itemStack("dirt", 1),
      { priority: 1 },
    );
    const priority = shapelessRecipe(
      "minecraft:priority",
      ["stone"],
      itemStack("stick", 1),
      { priority: 0 },
    );

    expect(matchesRecipe(stationRecipe, grid)).toBe(false);
    expect(matchesRecipe(stationRecipe, grid, { station: "furnace" })).toBe(
      false,
    );
    expect(
      matchesRecipe(stationRecipe, grid, { station: "crafting_table" }),
    ).toBe(true);
    expect(matchesRecipe(shaped, grid)).toBe(true);
    expect(matchRecipe([shaped, shapeless], grid)).toMatchObject({
      _tag: "Match",
      recipe: shaped,
    });
    const earlierShaped = shapedRecipe(
      "minecraft:a-shaped",
      ["S"],
      { S: "stone" },
      itemStack("sand", 1),
      { priority: 1 },
    );
    const laterShapeless = shapelessRecipe(
      "minecraft:z-shapeless",
      ["stone"],
      itemStack("gravel", 1),
      { priority: 1 },
    );
    expect(matchRecipe([laterShapeless, earlierShaped], grid)).toMatchObject({
      _tag: "Match",
      recipe: earlierShaped,
    });
    expect(matchRecipe([shaped, earlierShaped], grid)).toMatchObject({
      _tag: "Match",
      recipe: earlierShaped,
    });
    expect(matchRecipe([shaped, shapeless, priority], grid)).toMatchObject({
      _tag: "Match",
      recipe: priority,
    });
    expect(matchRecipe([], grid)).toEqual({ _tag: "NoMatch" });
  });

  it("indexes exact and tagged recipe candidates without changing ordering", () => {
    const taggedRecipe = shapedRecipe(
      "minecraft:index-tag",
      ["P"],
      { P: "#minecraft:planks" },
      itemStack("stick", 1),
    );
    const exactRecipe = shapedRecipe(
      "minecraft:index-exact",
      ["S"],
      { S: "stone" },
      itemStack("dirt", 1),
    );
    const index = buildRecipeIndexes([taggedRecipe, exactRecipe]);

    expect(index.tagged).toEqual([taggedRecipe]);
    expect(
      matchIndexedRecipe(index, craftGrid(1, 1, ["oak_planks"]), { itemTags }),
    ).toBe(taggedRecipe);
    expect(matchIndexedRecipe(index, craftGrid(1, 1, ["stone"]))).toBe(
      exactRecipe,
    );
    expect(matchIndexedRecipe(index, craftGrid(0, 0, []))).toBeUndefined();
    expect(
      matchIndexedRecipe(index, craftGrid(2, 1, [undefined, "stone"])),
    ).toBe(exactRecipe);

    const taggedFirst = shapedRecipe(
      "minecraft:a-index-tag",
      ["P"],
      { P: "#minecraft:planks" },
      itemStack("sand", 1),
    );
    const exactSecond = shapedRecipe(
      "minecraft:z-index-exact",
      ["P"],
      { P: "oak_planks" },
      itemStack("gravel", 1),
    );
    expect(
      matchIndexedRecipe(
        buildRecipeIndexes([taggedFirst, exactSecond]),
        craftGrid(1, 1, ["oak_planks"]),
        { itemTags },
      ),
    ).toBe(taggedFirst);

    const exactFirst = shapedRecipe(
      "minecraft:a-index-exact",
      ["P"],
      { P: "oak_planks" },
      itemStack("gravel", 1),
    );
    const taggedSecond = shapedRecipe(
      "minecraft:z-index-tag",
      ["P"],
      { P: "#minecraft:planks" },
      itemStack("sand", 1),
    );
    expect(
      matchIndexedRecipe(
        buildRecipeIndexes([exactFirst, taggedSecond]),
        craftGrid(1, 1, ["oak_planks"]),
        { itemTags },
      ),
    ).toBe(exactFirst);

    const alternativeRecipe = shapedRecipe(
      "minecraft:index-alternative",
      ["A"],
      { A: ["stone", "dirt"] },
      itemStack("stick", 1),
    );
    const taggedAlternativeRecipe = shapedRecipe(
      "minecraft:index-tagged-alternative",
      ["A"],
      { A: ["#minecraft:planks", "stone"] },
      itemStack("sand", 1),
    );
    const alternativeIndex = buildRecipeIndexes([
      alternativeRecipe,
      taggedAlternativeRecipe,
    ]);
    expect(alternativeIndex.tagged).toEqual([taggedAlternativeRecipe]);
    expect(alternativeIndex.exactByItem.get("dirt")).toEqual([
      alternativeRecipe,
    ]);
    expect(
      matchIndexedRecipe(alternativeIndex, craftGrid(1, 1, ["dirt"])),
    ).toBe(alternativeRecipe);
  });

  it("reports duplicate and equivalent recipes", () => {
    const duplicateFirst = shapedRecipe(
      "minecraft:duplicate",
      ["D"],
      { D: "dirt" },
      itemStack("stick", 1),
    );
    const duplicateSecond = shapelessRecipe(
      "minecraft:duplicate",
      ["stone"],
      itemStack("dirt", 1),
    );
    const duplicateThird = shapedRecipe(
      "minecraft:duplicate",
      ["X"],
      { X: "sand" },
      itemStack("torch", 1),
    );
    const sameShapeFirst = shapedRecipe(
      "minecraft:shape-a",
      ["S"],
      { S: "stone" },
      itemStack("stick", 1),
    );
    const sameShapeSecond = shapedRecipe(
      "minecraft:shape-b",
      ["S"],
      { S: "stone" },
      itemStack("dirt", 1),
    );
    const sameIngredientsFirst = shapelessRecipe(
      "minecraft:ingredients-a",
      ["stone", "#minecraft:planks"],
      itemStack("stick", 1),
    );
    const sameIngredientsSecond = shapelessRecipe(
      "minecraft:ingredients-b",
      ["#minecraft:planks", "stone"],
      itemStack("dirt", 1),
    );
    const different = shapedRecipe(
      "minecraft:different",
      ["P"],
      { P: "oak_planks" },
      itemStack("stick", 1),
    );
    const sparse = [undefined];

    const conflicts = conflictsIn([
      duplicateFirst,
      duplicateSecond,
      duplicateThird,
      sameShapeFirst,
      sameShapeSecond,
      sameIngredientsFirst,
      sameIngredientsSecond,
      different,
      ...sparse,
    ]);

    expect(conflicts).toEqual(
      expect.arrayContaining([
        {
          firstId: "minecraft:duplicate",
          secondId: "minecraft:duplicate",
          reason: "duplicate-id",
        },
        {
          firstId: "minecraft:shape-a",
          secondId: "minecraft:shape-b",
          reason: "same-shape",
        },
        {
          firstId: "minecraft:ingredients-a",
          secondId: "minecraft:ingredients-b",
          reason: "same-ingredients",
        },
      ]),
    );
    expect(conflicts).toHaveLength(5);
    expect(conflictsIn([different])).toEqual([]);

    const sameAlternativesFirst = shapelessRecipe(
      "minecraft:alternatives-a",
      [["stone", "dirt"]],
      itemStack("stick", 1),
    );
    const sameAlternativesSecond = shapelessRecipe(
      "minecraft:alternatives-b",
      [["dirt", "stone"]],
      itemStack("dirt", 1),
    );
    expect(
      conflictsIn([sameAlternativesFirst, sameAlternativesSecond]),
    ).toEqual([
      {
        firstId: "minecraft:alternatives-a",
        secondId: "minecraft:alternatives-b",
        reason: "same-ingredients",
      },
    ]);
  });

  it("keeps the supported vanilla crafting table data conflict-free", () => {
    expect(VANILLA_CRAFTING_RECIPES.length).toBeGreaterThan(70);
    expect(
      VANILLA_CRAFTING_RECIPES.every((recipe) =>
        recipe.tags.includes("crafting_table"),
      ),
    ).toBe(true);
    expect(conflictsIn(VANILLA_CRAFTING_RECIPES)).toEqual([]);
    const match = matchRecipe(
      VANILLA_CRAFTING_RECIPES,
      craftGrid(3, 3, ["oak_planks", undefined, undefined, "oak_planks"]),
      { station: "crafting_table" },
    );
    expect(match._tag).toBe("Match");
    if (match._tag === "Match") {
      expect(match.recipe.id).toBe("minecraft:stick");
      expect(match.output).toEqual(itemStack("stick", 4));
    }
  });

  it("matches the appended vanilla recipes at their documented inputs", () => {
    const goldBlock = matchRecipe(
      VANILLA_CRAFTING_RECIPES,
      craftGrid(3, 3, [
        "gold_ingot",
        "gold_ingot",
        "gold_ingot",
        "gold_ingot",
        "gold_ingot",
        "gold_ingot",
        "gold_ingot",
        "gold_ingot",
        "gold_ingot",
      ]),
      { station: "crafting_table" },
    );
    expect(goldBlock).toEqual({
      _tag: "Match",
      recipe: expect.objectContaining({ id: "minecraft:gold-block" }),
      output: itemStack("gold_block", 1),
    });

    const paper = matchRecipe(
      VANILLA_CRAFTING_RECIPES,
      craftGrid(3, 3, ["sugar_cane", "sugar_cane", "sugar_cane"]),
      { station: "crafting_table" },
    );
    expect(paper).toEqual({
      _tag: "Match",
      recipe: expect.objectContaining({ id: "minecraft:paper" }),
      output: itemStack("paper", 3),
    });

    const book = matchRecipe(
      VANILLA_CRAFTING_RECIPES,
      craftGrid(3, 3, ["paper", "paper", undefined, "paper", "leather"]),
      { station: "crafting_table" },
    );
    expect(book).toEqual({
      _tag: "Match",
      recipe: expect.objectContaining({ id: "minecraft:book" }),
      output: itemStack("book", 1),
    });

    const netheriteIngot = matchRecipe(
      VANILLA_CRAFTING_RECIPES,
      craftGrid(3, 3, [
        "netherite_scrap",
        "netherite_scrap",
        "netherite_scrap",
        "netherite_scrap",
        "gold_ingot",
        "gold_ingot",
        "gold_ingot",
        "gold_ingot",
      ]),
      { station: "crafting_table" },
    );
    expect(netheriteIngot).toEqual({
      _tag: "Match",
      recipe: expect.objectContaining({ id: "minecraft:netherite-ingot" }),
      output: itemStack("netherite_ingot", 1),
    });
  });
});
