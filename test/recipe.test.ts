import { describe, expect, it } from "vitest";

import { isItemStack, itemStack } from "../src/domain/item/item-stack";
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
import type { ItemTagMemberships } from "../src/domain/recipe/recipe";

const itemTags: ItemTagMemberships = new Map([
  [tagged(TagLocation("#minecraft:planks")).tag, new Set<ItemType>(["oak_planks"])],
  [tagged(TagLocation("#minecraft:both")).tag, new Set<ItemType>(["oak_planks", "stone"])],
]);

describe("recipe data", () => {
  it("constructs and matches exact and tagged ingredients", () => {
    const exact = exactly("stone", RecipeIngredientCount(2));
    const tag = tagged(TagLocation("#minecraft:planks"), RecipeIngredientCount(2));
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
    expect(tagged(TagLocation("#minecraft:planks"))).toEqual({
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
    expect(() => Reflect.apply(exactly, undefined, ["stone", 0])).toThrow(RangeError);
    expect(() => Reflect.apply(exactly, undefined, ["stone", 65])).toThrow(RangeError);
    expect(() => Reflect.apply(exactly, undefined, ["stone", 1.5])).toThrow(RangeError);
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
    const key: Record<
      RecipePatternSymbol,
      RecipePatternKeyMap[RecipePatternSymbol]
    > = {};
    key[RecipePatternSymbol("E")] = {
      _tag: "Exact",
      item: "stone",
      count: RecipeIngredientCount(2),
    };
    key[RecipePatternSymbol("T")] = {
      _tag: "ItemTag",
      tag: TagLocation("#minecraft:planks"),
      count: RecipeIngredientCount(1),
    };
    const recipe = shapedRecipe(
      RecipeId("minecraft:column"),
      [RecipePatternRow("  E"), RecipePatternRow("T ")],
      key,
      itemStack("crafting_table", StackCount(1)),
      {
        assumeSymmetry: true,
        priority: RecipePriority(2),
        tags: [RecipeStationTag("crafting_table")],
      },
    );

    expect(recipe._tag).toBe("Shaped");
    expect(recipe.pattern).toEqual({
      width: 3,
      height: 2,
      cells: [
        undefined,
        undefined,
        exactly("stone", RecipeIngredientCount(2)),
        tagged(TagLocation("#minecraft:planks")),
        undefined,
        undefined,
      ],
    });
    expect(recipe.assumeSymmetry).toBe(true);
    expect(recipe.priority).toBe(2);
    expect(recipe.tags).toEqual(["crafting_table"]);

    const alternativeRecipe = shapedRecipe(
      RecipeId("minecraft:alternative"),
      [RecipePatternRow("A")],
      { [RecipePatternSymbol("A")]: ["stone", "dirt"] },
      itemStack("stick", StackCount(1)),
      { category: "misc", group: RecipeGroup("alternatives"), showNotification: true },
    );
    expect(alternativeRecipe.pattern.cells).toEqual([anyOf(["stone", "dirt"])]);
    expect(alternativeRecipe.category).toBe("misc");
    expect(alternativeRecipe.group).toBe("alternatives");
    expect(alternativeRecipe.showNotification).toBe(true);

    const defaultRecipe = shapedRecipe(
      RecipeId("minecraft:default"),
      [RecipePatternRow("S"), RecipePatternRow("")],
      { [RecipePatternSymbol("S")]: "stone" },
      itemStack("stick", StackCount(1)),
    );
    expect(defaultRecipe.assumeSymmetry).toBe(false);
    expect(defaultRecipe.pattern).toEqual({
      width: 1,
      height: 1,
      cells: [exactly("stone")],
    });
    expect(MAX_RECIPE_SIDE).toBe(3);
    expect(() =>
      shapedRecipe(RecipeId(" "), [RecipePatternRow("S")], { [RecipePatternSymbol("S")]: "stone" }, itemStack("stick", StackCount(1))),
    ).toThrow();
    expect(() =>
      Reflect.apply(shapedRecipe, undefined, [
        " ",
        [RecipePatternRow("S")],
        { [RecipePatternSymbol("S")]: "stone" },
        itemStack("stick", StackCount(1)),
      ]),
    ).toThrow(TypeError);
    expect(() =>
      shapedRecipe(RecipeId("minecraft:bad"), [], { [RecipePatternSymbol("S")]: "stone" }, itemStack("stick", StackCount(1))),
    ).toThrow(RangeError);
    expect(() =>
      shapedRecipe(
        RecipeId("minecraft:bad"),
        [RecipePatternRow("S"), RecipePatternRow("S"), RecipePatternRow("S"), RecipePatternRow("S")],
        { [RecipePatternSymbol("S")]: "stone" },
        itemStack("stick", StackCount(1)),
      ),
    ).toThrow(RangeError);
    expect(() =>
      shapedRecipe(
        RecipeId("minecraft:bad"),
        [RecipePatternRow("SSSS")],
        { [RecipePatternSymbol("S")]: "stone" },
        itemStack("stick", StackCount(1)),
      ),
    ).toThrow();
    expect(() =>
      Reflect.apply(shapedRecipe, undefined, [
        "minecraft:bad",
        [1],
        { [RecipePatternSymbol("S")]: "stone" },
        itemStack("stick", StackCount(1)),
      ]),
    ).toThrow(RangeError);
    expect(() =>
      Reflect.apply(shapedRecipe, undefined, [
        "minecraft:bad",
        ["S"],
        null,
        itemStack("stick", StackCount(1)),
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(shapedRecipe, undefined, [
        "minecraft:bad",
        ["S"],
        [],
        itemStack("stick", StackCount(1)),
      ]),
    ).toThrow(TypeError);
    expect(() => Reflect.apply(shapedRecipe, undefined, [
      RecipeId("minecraft:bad"),
      [RecipePatternRow("S")],
      { AB: "stone" },
      itemStack("stick", StackCount(1)),
    ])).toThrow(TypeError);
    expect(() => Reflect.apply(shapedRecipe, undefined, [
      RecipeId("minecraft:bad"),
      [RecipePatternRow("S")],
      { " ": "stone" },
      itemStack("stick", StackCount(1)),
    ])).toThrow(TypeError);
    expect(() =>
      shapedRecipe(
        RecipeId("minecraft:bad"),
        [RecipePatternRow("X")],
        { [RecipePatternSymbol("S")]: "stone" },
        itemStack("stick", StackCount(1)),
      ),
    ).toThrow(TypeError);
    expect(() =>
      shapedRecipe(RecipeId("minecraft:bad"), [RecipePatternRow("   ")], {}, itemStack("stick", StackCount(1))),
    ).toThrow(RangeError);
    expect(() =>
      Reflect.apply(shapedRecipe, undefined, [
        "minecraft:bad",
        ["S"],
        { [RecipePatternSymbol("S")]: "stone" },
        {},
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(shapedRecipe, undefined, [
        "minecraft:bad",
        ["S"],
        { [RecipePatternSymbol("S")]: "stone" },
        itemStack("stick", StackCount(1)),
        null,
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(shapedRecipe, undefined, [
        "minecraft:bad",
        ["S"],
        { [RecipePatternSymbol("S")]: "stone" },
        itemStack("stick", StackCount(1)),
        [],
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(shapedRecipe, undefined, [
        "minecraft:bad",
        ["S"],
        { [RecipePatternSymbol("S")]: "stone" },
        itemStack("stick", StackCount(1)),
        { assumeSymmetry: "yes" },
      ]),
    ).toThrow(TypeError);
    expect(() => Reflect.apply(shapedRecipe, undefined, [
      RecipeId("minecraft:bad"),
      ["S"],
      { [RecipePatternSymbol("S")]: "stone" },
      itemStack("stick", StackCount(1)),
      { priority: -1 },
    ])).toThrow(RangeError);
    expect(() => Reflect.apply(shapedRecipe, undefined, [
      RecipeId("minecraft:bad"),
      ["S"],
      { [RecipePatternSymbol("S")]: "stone" },
      itemStack("stick", StackCount(1)),
      { priority: 1.5 },
    ])).toThrow(RangeError);
    expect(() =>
      Reflect.apply(shapedRecipe, undefined, [
        "minecraft:bad",
        ["S"],
        { [RecipePatternSymbol("S")]: "stone" },
        itemStack("stick", StackCount(1)),
        { tags: "crafting_table" },
      ]),
    ).toThrow(TypeError);
    expect(() => Reflect.apply(shapedRecipe, undefined, [
      RecipeId("minecraft:bad"),
      ["S"],
      { [RecipePatternSymbol("S")]: "stone" },
      itemStack("stick", StackCount(1)),
      { tags: [""] },
    ])).toThrow(TypeError);
    expect(() =>
      Reflect.apply(shapedRecipe, undefined, [
        "minecraft:bad",
        ["S"],
        { [RecipePatternSymbol("S")]: "stone" },
        itemStack("stick", StackCount(1)),
        { tags: [1] },
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(shapedRecipe, undefined, [
        "minecraft:bad",
        ["S"],
        { [RecipePatternSymbol("S")]: "stone" },
        itemStack("stick", StackCount(1)),
        { category: "invalid" },
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(shapedRecipe, undefined, [
        "minecraft:bad",
        ["S"],
        { [RecipePatternSymbol("S")]: "stone" },
        itemStack("stick", StackCount(1)),
        { group: 1 },
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(shapedRecipe, undefined, [
        "minecraft:bad",
        ["S"],
        { [RecipePatternSymbol("S")]: "stone" },
        itemStack("stick", StackCount(1)),
        { showNotification: "yes" },
      ]),
    ).toThrow(TypeError);
  });

  it("constructs shapeless recipes and rejects invalid ingredients", () => {
    const recipe = shapelessRecipe(
      RecipeId("minecraft:mix"),
      ["stone", TagLocation("#minecraft:planks"), { _tag: "Exact", item: "dirt", count: RecipeIngredientCount(2) }],
      itemStack("stick", StackCount(1)),
      { priority: RecipePriority(1), tags: [RecipeStationTag("crafting_table")] },
    );

    expect(recipe._tag).toBe("Shapeless");
    expect(recipe.ingredients).toEqual([
      exactly("stone"),
      tagged(TagLocation("#minecraft:planks")),
      exactly("dirt", RecipeIngredientCount(2)),
    ]);
    expect(recipe.priority).toBe(1);
    expect(recipe.tags).toEqual(["crafting_table"]);
    expect(() =>
      shapelessRecipe(RecipeId("minecraft:bad"), [], itemStack("stick", StackCount(1))),
    ).toThrow(RangeError);
    expect(() =>
      Reflect.apply(shapelessRecipe, undefined, [
        "minecraft:bad",
        "stone",
        itemStack("stick", StackCount(1)),
      ]),
    ).toThrow(RangeError);
    expect(() =>
      Reflect.apply(shapelessRecipe, undefined, [
        "minecraft:bad",
        ["not-a-tag"],
        itemStack("stick", StackCount(1)),
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(shapelessRecipe, undefined, [
        "minecraft:bad",
        [1],
        itemStack("stick", StackCount(1)),
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(shapelessRecipe, undefined, [
        "minecraft:bad",
        [{ _tag: "Exact", item: "stone", count: "1" }],
        itemStack("stick", StackCount(1)),
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(shapelessRecipe, undefined, [
        "minecraft:bad",
        [{ _tag: "Exact", item: "unknown", count: 1 }],
        itemStack("stick", StackCount(1)),
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
    const stack = itemStack("dirt", StackCount(2));
    const grid = craftGrid(
      RecipeGridDimension(2),
      RecipeGridDimension(2),
      ["stone", stack, undefined],
    );

    expect(grid).toEqual({
      width: 2,
      height: 2,
      cells: [itemStack("stone", StackCount(1)), stack, undefined, undefined],
    });
    expect(cellAt(grid, RecipeGridIndex(0), RecipeGridIndex(0))).toEqual(itemStack("stone", StackCount(1)));
    expect(cellAt(grid, RecipeGridIndex(1), RecipeGridIndex(0))).toEqual(stack);
    expect(Reflect.apply(cellAt, undefined, [grid, -1, 0])).toBeUndefined();
    expect(cellAt(grid, RecipeGridIndex(0), RecipeGridIndex(2))).toBeUndefined();
    expect(Reflect.apply(cellAt, undefined, [grid, 0.5, 0])).toBeUndefined();
    expect(craftGrid(RecipeGridDimension(0), RecipeGridDimension(0), [])).toEqual({ width: 0, height: 0, cells: [] });
    expect(() => Reflect.apply(craftGrid, undefined, [-1, 1, []])).toThrow(RangeError);
    expect(() => Reflect.apply(craftGrid, undefined, [1, MAX_RECIPE_SIDE + 1, []])).toThrow(RangeError);
    expect(() => Reflect.apply(craftGrid, undefined, [1.5, 1, []])).toThrow(RangeError);
    expect(() =>
      craftGrid(
        RecipeGridDimension(1),
        RecipeGridDimension(1),
        [itemStack("stone", StackCount(1)), itemStack("dirt", StackCount(1))],
      ),
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
        recipe.tags.includes(RecipeStationTag("crafting_table")),
      ),
    ).toBe(true);
  });
});
