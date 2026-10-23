import { describe, expect, it } from "vitest";

import { itemStack } from "../src/domain/item/item-stack";
import { anyOf, exactly, tagged } from "../src/domain/recipe/recipe-data";
import {
  STONECUTTING_STATION_TAG,
  VANILLA_STONECUTTING_RECIPES,
  stonecuttingRecipe,
} from "../src/domain/recipe/stonecutting-data";

describe("stonecutting recipe data", () => {
  it("constructs exact, tagged, and alternative ingredient recipes", () => {
    expect(STONECUTTING_STATION_TAG).toBe("stonecutter");
    expect(stonecuttingRecipe(
      "minecraft:cut_stone",
      "stone",
      itemStack("stone_slab", 2),
    )).toMatchObject({
      _tag: "Stonecutting",
      ingredient: exactly("stone"),
      output: itemStack("stone_slab", 2),
      priority: 0,
    });

    expect(stonecuttingRecipe(
      "minecraft:cut_planks",
      "#minecraft:planks",
      itemStack("stick", 1),
      { priority: 2, showNotification: false },
    )).toMatchObject({
      ingredient: tagged("#minecraft:planks"),
      priority: 2,
      showNotification: false,
    });
    expect(stonecuttingRecipe(
      "minecraft:cut_alternatives",
      ["stone", "diorite"],
      itemStack("stone_slab", 2),
    ).ingredient).toEqual(anyOf(["stone", "diorite"]));
    expect(stonecuttingRecipe(
      "minecraft:cut_structured_alternatives",
      anyOf(["stone", "diorite"]),
      itemStack("stone_slab", 2),
    ).ingredient).toEqual(anyOf(["stone", "diorite"]));

    expect(VANILLA_STONECUTTING_RECIPES).toHaveLength(5);
    expect(VANILLA_STONECUTTING_RECIPES.map((recipe) => recipe.output.item)).toContain("stone_slab");
    expect(VANILLA_STONECUTTING_RECIPES.find((recipe) => recipe.output.item === "stone_slab")?.output.count).toBe(2);
  });

  it("rejects invalid ingredients, outputs, identifiers, and options", () => {
    const output = itemStack("stone_slab", 2);
    expect(() => Reflect.apply(stonecuttingRecipe, undefined, [" ", "stone", output])).toThrow(TypeError);
    expect(() => Reflect.apply(stonecuttingRecipe, undefined, ["minecraft:bad", "unknown", output])).toThrow(TypeError);
    expect(() => Reflect.apply(stonecuttingRecipe, undefined, ["minecraft:bad", {}, output])).toThrow(TypeError);
    expect(() => Reflect.apply(stonecuttingRecipe, undefined, ["minecraft:bad", { _tag: "Exact", item: "stone", count: "1" }, output])).toThrow(TypeError);
    expect(() => Reflect.apply(stonecuttingRecipe, undefined, ["minecraft:bad", { _tag: "ItemTag", tag: "planks", count: 1 }, output])).toThrow(TypeError);
    expect(() => Reflect.apply(stonecuttingRecipe, undefined, ["minecraft:bad", [], output])).toThrow(TypeError);
    expect(() => Reflect.apply(stonecuttingRecipe, undefined, ["minecraft:bad", ["stone", "invalid"], output])).toThrow(TypeError);
    expect(() => Reflect.apply(stonecuttingRecipe, undefined, ["minecraft:bad", { _tag: "AnyOf", count: 1, options: [] }, output])).toThrow(TypeError);
    expect(() => Reflect.apply(stonecuttingRecipe, undefined, ["minecraft:bad", { _tag: "AnyOf", count: "1", options: ["stone"] }, output])).toThrow(TypeError);
    expect(() => Reflect.apply(stonecuttingRecipe, undefined, ["minecraft:bad", "stone", {}])).toThrow(TypeError);
    expect(() => Reflect.apply(stonecuttingRecipe, undefined, ["minecraft:bad", "stone", output, null])).toThrow(TypeError);
    expect(() => stonecuttingRecipe("minecraft:bad", "stone", output, { priority: -1 })).toThrow(RangeError);
    expect(() => stonecuttingRecipe("minecraft:bad", "stone", output, { priority: 1.5 })).toThrow(RangeError);
    expect(() => Reflect.apply(stonecuttingRecipe, undefined, ["minecraft:bad", "stone", output, { showNotification: 1 }])).toThrow(TypeError);
  });
});
