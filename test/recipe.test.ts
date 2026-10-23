import { describe, expect, it } from "vitest";

import { isItemStack, itemStack } from "../src/domain/item/item-stack";
import type { ItemType } from "../src/domain/item/item-type";
import {
  MAX_RECIPE_SIDE,
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
import type { ItemTagMemberships } from "../src/domain/recipe/recipe";

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
    const noItemTags: ItemTagMemberships = new Map();
    expect(ingredientMatches(tag, "stone", noItemTags)).toBe(false);
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

describe("vanilla recipe data", () => {
  it("keeps the supported crafting recipes tagged for their station", () => {
    expect(VANILLA_CRAFTING_RECIPES.length).toBeGreaterThan(70);
    expect(
      VANILLA_CRAFTING_RECIPES.every((recipe) =>
        recipe.tags.includes("crafting_table"),
      ),
    ).toBe(true);
  });
});
