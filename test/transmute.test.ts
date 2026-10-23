import { describe, expect, it } from "vitest";

import { itemStack } from "../src/domain/item/item-stack";
import { StackCount } from "../src/domain/time/quantities";
import { RecipeGroup, RecipeId, RecipePriority } from "../src/domain/recipe/recipe-data";
import { transmuteRecipe, transmuteRecipeForItem, isTransmuteMaterialCount, isTransmuteRecipe, TRANSMUTE_MAX_MATERIAL_SLOTS, TransmuteMaterialSlotCount } from "../src/domain/recipe/transmute-data";

describe("transmute recipe data", () => {
  it("validates material ranges and constructs recipes", () => {
    expect(TRANSMUTE_MAX_MATERIAL_SLOTS).toBe(8);
    expect(isTransmuteMaterialCount({ min: 1, max: 1 })).toBe(true);
    expect(isTransmuteMaterialCount({ min: 2, max: 8 })).toBe(true);
    for (const value of [
      null,
      [],
      { min: "1", max: 1 },
      { min: 1.5, max: 2 },
      { min: 0, max: 1 },
      { min: 1, max: 2 },
      { min: 2, max: 9 },
      { min: 4, max: 3 },
    ]) {
      expect(isTransmuteMaterialCount(value)).toBe(false);
    }

    const recipe = transmuteRecipe(
      RecipeId("minecraft:convert_stone"),
      "stone",
      "dirt",
      itemStack("sand", StackCount(1)),
      {
        addMaterialCountToResult: true,
        category: "redstone",
        group: RecipeGroup("conversion"),
        materialCount: {
          min: TransmuteMaterialSlotCount(2),
          max: TransmuteMaterialSlotCount(4),
        },
        priority: RecipePriority(3),
        showNotification: false,
      },
    );
    expect(recipe).toMatchObject({
      _tag: "Transmute",
      source: { _tag: "Exact", item: "stone", count: 1 },
      material: { _tag: "Exact", item: "dirt", count: 1 },
      output: itemStack("sand", StackCount(1)),
      materialCount: { min: 2, max: 4 },
      addMaterialCountToResult: true,
      category: "redstone",
      group: "conversion",
      priority: 3,
      showNotification: false,
    });
    expect(isTransmuteRecipe(recipe)).toBe(true);
    expect(transmuteRecipeForItem(
      RecipeId("minecraft:convert_gravel"),
      "stone",
      "dirt",
      "gravel",
      StackCount(2),
    ).output).toEqual(itemStack("gravel", StackCount(2)));
  });

  it("rejects invalid constructor fields and unsafe result counts", () => {
    const output = itemStack("sand", StackCount(1));
    expect(() => Reflect.apply(transmuteRecipe, undefined, [" ", "stone", "dirt", output])).toThrow(TypeError);
    expect(() => Reflect.apply(transmuteRecipe, undefined, ["minecraft:bad", null, "dirt", output])).toThrow(TypeError);
    expect(() => Reflect.apply(transmuteRecipe, undefined, ["minecraft:bad", "stone", null, output])).toThrow(TypeError);
    expect(() => Reflect.apply(transmuteRecipe, undefined, ["minecraft:bad", "stone", "dirt", {}])).toThrow(TypeError);
    expect(() => Reflect.apply(transmuteRecipe, undefined, ["minecraft:bad", "stone", "dirt", output, null])).toThrow(TypeError);

    for (const options of [
      { category: "invalid" },
      { group: 1 },
      { priority: -1 },
      { priority: 1.5 },
      { showNotification: 1 },
      { addMaterialCountToResult: 1 },
      { materialCount: { min: 1, max: 2 } },
    ]) {
      expect(() => Reflect.apply(transmuteRecipe, undefined, [
        "minecraft:bad_options",
        "stone",
        "dirt",
        output,
        options,
      ])).toThrow();
    }
    expect(() => transmuteRecipe(
      RecipeId("minecraft:overflow"),
      "stone",
      "dirt",
      itemStack("diamond_sword", StackCount(1)),
      {
        addMaterialCountToResult: true,
        materialCount: {
          min: TransmuteMaterialSlotCount(2),
          max: TransmuteMaterialSlotCount(2),
        },
      },
    )).toThrow(RangeError);
  });

  it("guards recipe records and rejects invalid metadata", () => {
    const valid = transmuteRecipe(
      RecipeId("minecraft:guarded"),
      "stone",
      "dirt",
      itemStack("sand", StackCount(1)),
      { category: "misc", group: RecipeGroup("test"), priority: RecipePriority(1), showNotification: true },
    );
    expect(isTransmuteRecipe(valid)).toBe(true);
    expect(isTransmuteRecipe(null)).toBe(false);
    expect(isTransmuteRecipe([])).toBe(false);
    for (const value of [
      { ...valid, _tag: "Other" },
      { ...valid, id: " " },
      { ...valid, source: null },
      { ...valid, material: null },
      { ...valid, output: null },
      { ...valid, materialCount: { min: 1, max: 2 } },
      { ...valid, addMaterialCountToResult: 1 },
      { ...valid, category: "invalid" },
      { ...valid, group: 1 },
      { ...valid, priority: -1 },
      { ...valid, showNotification: 1 },
    ]) {
      expect(isTransmuteRecipe(value)).toBe(false);
    }
  });
});
