import { describe, expect, it } from "vitest";

import { itemStack } from "../src/domain/item/item-stack";
import { exactly } from "../src/domain/recipe/recipe-data";
import {
  COOKING_STATIONS,
  cookingRecipe,
  cookingRecipeForItem,
  isCookingRecipe,
} from "../src/domain/recipe/cooking-data";

describe("cooking recipe data", () => {
  it("constructs cooking recipes for each station and normalizes metadata", () => {
    expect(COOKING_STATIONS).toEqual([
      "furnace",
      "blast_furnace",
      "smoker",
      "campfire",
    ]);

    const recipe = cookingRecipe(
      "minecraft:smelt_iron",
      "furnace",
      "raw_iron",
      itemStack("iron_ingot", 1),
      200,
      0.7,
      {
        category: "redstone",
        group: "ores",
        priority: 2,
        showNotification: true,
      },
    );
    expect(recipe).toMatchObject({
      _tag: "Cooking",
      station: "furnace",
      ingredient: exactly("raw_iron"),
      cookTimeTicks: 200,
      experience: 0.7,
      category: "redstone",
      group: "ores",
      priority: 2,
      showNotification: true,
    });
    expect(cookingRecipeForItem(
      "minecraft:smoke_beef",
      "smoker",
      exactly("beef"),
      "cooked_beef",
      2,
      100,
      0.35,
    )).toMatchObject({
      station: "smoker",
      output: itemStack("cooked_beef", 2),
      priority: 0,
    });

    for (const station of COOKING_STATIONS) {
      expect(
        cookingRecipe(
          `minecraft:${station}_recipe`,
          station,
          "stone",
          itemStack("stone", 1),
          1,
          0,
        ).station,
      ).toBe(station);
    }
  });

  it("rejects invalid constructor fields and options", () => {
    const output = itemStack("iron_ingot", 1);
    expect(() => Reflect.apply(cookingRecipe, undefined, [" ", "furnace", "raw_iron", output, 200, 0])).toThrow(TypeError);
    expect(() => Reflect.apply(cookingRecipe, undefined, ["minecraft:bad", "campfire_bad", "raw_iron", output, 200, 0])).toThrow(TypeError);
    expect(() => Reflect.apply(cookingRecipe, undefined, ["minecraft:bad", "furnace", null, output, 200, 0])).toThrow(TypeError);
    expect(() => Reflect.apply(cookingRecipe, undefined, ["minecraft:bad", "furnace", "raw_iron", {}, 200, 0])).toThrow(TypeError);
    expect(() => cookingRecipe("minecraft:bad", "furnace", "raw_iron", output, 0, 0)).toThrow(RangeError);
    expect(() => cookingRecipe("minecraft:bad", "furnace", "raw_iron", output, 1.5, 0)).toThrow(RangeError);
    expect(() => cookingRecipe("minecraft:bad", "furnace", "raw_iron", output, 1, -0.1)).toThrow(RangeError);
    expect(() => cookingRecipe("minecraft:bad", "furnace", "raw_iron", output, 1, Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => Reflect.apply(cookingRecipe, undefined, ["minecraft:bad", "furnace", "raw_iron", output, 1, 0, null])).toThrow(TypeError);
    for (const options of [
      { category: "invalid" },
      { group: 1 },
      { priority: -1 },
      { priority: 1.5 },
      { showNotification: 1 },
    ]) {
      expect(() => Reflect.apply(cookingRecipe, undefined, [
        "minecraft:bad",
        "furnace",
        "raw_iron",
        output,
        1,
        0,
        options,
      ])).toThrow();
    }
  });

  it("guards cooking recipe identity, quantities, and metadata", () => {
    const valid = cookingRecipe(
      "minecraft:valid",
      "blast_furnace",
      exactly("raw_iron"),
      itemStack("iron_ingot", 1),
      100,
      0,
      { category: "building", group: "ores", showNotification: false },
    );
    expect(isCookingRecipe(valid)).toBe(true);
    expect(isCookingRecipe(null)).toBe(false);
    expect(isCookingRecipe([])).toBe(false);

    const invalidValues: ReadonlyArray<unknown> = [
      { ...valid, _tag: "Other" },
      { ...valid, id: 1 },
      { ...valid, id: " " },
      { ...valid, station: "campfire_bad" },
      { ...valid, ingredient: null },
      { ...valid, output: null },
      { ...valid, cookTimeTicks: 0 },
      { ...valid, cookTimeTicks: 1.5 },
      { ...valid, experience: -1 },
      { ...valid, experience: Number.NaN },
      { ...valid, priority: -1 },
      { ...valid, priority: 1.5 },
      { ...valid, category: "invalid" },
      { ...valid, group: 1 },
      { ...valid, showNotification: 1 },
    ];
    for (const value of invalidValues) {
      expect(isCookingRecipe(value)).toBe(false);
    }
  });
});
