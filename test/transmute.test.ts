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

const expectRecipeFailure = (
  result: Result.Result<unknown, RecipeFailure>,
  expected: RecipeFailure,
): void => {
  expect(Result.isFailure(result)).toBe(true);
  if (Result.isFailure(result)) expect(result.failure).toEqual(expected);
};

describe("transmute recipe data", () => {
  it("snapshots material bounds once and returns option getter failures", () => {
    let minReads = 0;
    let maxReads = 0;
    const materialCount = new Proxy({}, {
      get(_target, property) {
        if (property === "min") {
          minReads += 1;
          return minReads === 1 ? 2 : 9;
        }
        if (property === "max") {
          maxReads += 1;
          return maxReads === 1 ? 3 : 0;
        }
        return undefined;
      },
    });
    const result = Reflect.apply(transmuteRecipe, undefined, [
      RecipeId("minecraft:snapshot_material_count"),
      "stone",
      "dirt",
      itemStack("sand", 1),
      { materialCount },
    ]);
    expect(Result.isSuccess(result)).toBe(true);
    expect(minReads).toBe(1);
    expect(maxReads).toBe(1);

    const options = new Proxy({}, {
      get(_target, property) {
        if (property === "priority") throw new Error("hostile getter");
        return undefined;
      },
    });
    const unreadable = Reflect.apply(transmuteRecipe, undefined, [
      RecipeId("minecraft:unreadable_options"),
      "stone",
      "dirt",
      itemStack("sand", 1),
      options,
    ]);
    expectRecipeFailure(unreadable, {
      _tag: "RecipeTypeFailure",
      name: "TypeError",
      message: "Transmute recipe options must be an object",
    });
  });

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
    )).output).toEqual(itemStack("gravel", 2));
  });

  it("rejects invalid constructor fields and unsafe result counts", () => {
    const output = itemStack("sand", 1);
    expectRecipeFailure(
      Reflect.apply(transmuteRecipe, undefined, [null, "stone", "dirt", output]),
      {
        _tag: "RecipeTypeFailure",
        name: "TypeError",
        message: "Transmute recipe id must be a resource location",
      },
    );
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

  it("rejects unknown output items and counts outside the result stack range", () => {
    const unknownOutput = Reflect.apply(transmuteRecipeForItem, undefined, [
      "minecraft:unknown_output",
      "stone",
      "dirt",
      "not_an_item",
      1,
    ]);
    expect(Result.isFailure(unknownOutput)).toBe(true);
    if (Result.isFailure(unknownOutput)) {
      expect(unknownOutput.failure).toMatchObject({
        _tag: "RecipeTypeFailure",
        message: "Unknown item type: not_an_item",
      });
    }

    const invalidCounts: ReadonlyArray<readonly [string, number, number]> = [
      ["sand", 0, 64],
      ["sand", 1.5, 64],
      ["diamond_sword", 2, 1],
    ];
    for (const [output, count, maxCount] of invalidCounts) {
      const invalidCount = Reflect.apply(transmuteRecipeForItem, undefined, [
        "minecraft:invalid_output_count",
        "stone",
        "dirt",
        output,
        count,
      ]);
      expect(Result.isFailure(invalidCount)).toBe(true);
      if (Result.isFailure(invalidCount)) {
        expect(invalidCount.failure).toMatchObject({
          _tag: "RecipeRangeFailure",
          message: `Item stack count for ${output} must be an integer in [1, ${maxCount}], received ${count}`,
        });
      }
    }
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
