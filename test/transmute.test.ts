import { Result } from "effect";
import { describe, expect, it } from "vitest";

import { itemStack as itemStackResult } from "../src/domain/item/item-stack";
import {
  TransmuteMaterialSlotCount,
  transmuteRecipe,
  transmuteRecipeForItem,
  isTransmuteMaterialCount,
  isTransmuteRecipe,
  TRANSMUTE_MAX_MATERIAL_SLOTS,
} from "../src/domain/recipe/transmute-data";
import { RecipeGroup, RecipeId, RecipePriority } from "../src/domain/recipe/recipe-data";
import { StackCount } from "../src/domain/time/quantities";
import type { RecipeFailure } from "../src/domain/recipe/recipe-error";

const recipeSuccess = <A, E>(result: Result.Result<A, E>): A => {
  expect(Result.isSuccess(result)).toBe(true);
  if (Result.isSuccess(result)) return result.success;
  throw new Error(`Expected recipe success, received ${JSON.stringify(result.failure)}`);
};

const itemStack = (item: Parameters<typeof itemStackResult>[0], count: number) =>
  recipeSuccess(itemStackResult(item, recipeSuccess(StackCount.result(count))));

const recipeFailure = (
  result: Result.Result<unknown, RecipeFailure>,
  tag: RecipeFailure["_tag"],
): void => {
  expect(Result.isFailure(result)).toBe(true);
  if (Result.isFailure(result)) expect(result.failure._tag).toBe(tag);
};

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

    const recipe = recipeSuccess(transmuteRecipe(
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
    ));
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
    expect(recipeSuccess(transmuteRecipeForItem(
      RecipeId("minecraft:convert_gravel"),
      "stone",
      "dirt",
      "gravel",
      StackCount(2),
    ))).output).toEqual(itemStack("gravel", 2));
  });

  it("rejects invalid constructor fields and unsafe result counts", () => {
    const output = itemStack("sand", 1);
    recipeFailure(Reflect.apply(transmuteRecipe, undefined, [" ", "stone", "dirt", output]), "RecipeTypeFailure");
    recipeFailure(Reflect.apply(transmuteRecipe, undefined, ["minecraft:bad", null, "dirt", output]), "RecipeTypeFailure");
    recipeFailure(Reflect.apply(transmuteRecipe, undefined, ["minecraft:bad", "stone", null, output]), "RecipeTypeFailure");
    recipeFailure(Reflect.apply(transmuteRecipe, undefined, ["minecraft:bad", "stone", "dirt", {}]), "RecipeTypeFailure");
    recipeFailure(Reflect.apply(transmuteRecipe, undefined, ["minecraft:bad", "stone", "dirt", output, null]), "RecipeTypeFailure");

    for (const [options, tag] of [
      [{ category: "invalid" }, "RecipeTypeFailure"],
      [{ group: 1 }, "RecipeTypeFailure"],
      [{ priority: -1 }, "RecipeRangeFailure"],
      [{ priority: 1.5 }, "RecipeRangeFailure"],
      [{ showNotification: 1 }, "RecipeTypeFailure"],
      [{ addMaterialCountToResult: 1 }, "RecipeTypeFailure"],
      [{ materialCount: { min: 1, max: 2 } }, "RecipeRangeFailure"],
    ] as const) {
      recipeFailure(Reflect.apply(transmuteRecipe, undefined, [
        "minecraft:bad_options",
        "stone",
        "dirt",
        output,
        options,
      ]), tag);
    }
    recipeFailure(transmuteRecipe(
      RecipeId("minecraft:overflow"),
      "stone",
      "dirt",
      itemStack("diamond_sword", 1),
      {
        addMaterialCountToResult: true,
        materialCount: {
          min: TransmuteMaterialSlotCount(2),
          max: TransmuteMaterialSlotCount(2),
        },
      },
    ), "RecipeRangeFailure");
  });

  it("guards recipe records and rejects invalid metadata", () => {
    const valid = recipeSuccess(transmuteRecipe(
      RecipeId("minecraft:guarded"),
      "stone",
      "dirt",
      itemStack("sand", 1),
      {
        category: "misc",
        group: RecipeGroup("test"),
        priority: RecipePriority(1),
        showNotification: true,
      },
    ));
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
