import { Result } from "effect";
import { describe, expect, it } from "vitest";
import { TagLocation } from "../src/domain/text/identifiers";

import { itemStack as itemStackResult } from "../src/domain/item/item-stack";
import {
  RecipeId,
  RecipePriority,
  anyOf,
  exactly,
  tagged,
} from "../src/domain/recipe/recipe-data";
import { StackCount } from "../src/domain/time/quantities";
import {
  STONECUTTING_STATION_TAG,
  VANILLA_STONECUTTING_RECIPES,
  stonecuttingRecipe,
} from "../src/domain/recipe/stonecutting-data";
import type { RecipeFailure } from "../src/domain/recipe/recipe-error";

const success = <A, E>(result: Result.Result<A, E>): A => {
  expect(Result.isSuccess(result)).toBe(true);
  if (Result.isSuccess(result)) return result.success;
  throw new Error(`Expected recipe success, received ${JSON.stringify(result.failure)}`);
};
const itemStack = (item: Parameters<typeof itemStackResult>[0], count: number) =>
  success(itemStackResult(item, success(StackCount.result(count))));
const recipeId = (value: string) => success(RecipeId.result(value));
const tagLocation = (value: string) => success(TagLocation.result(value));
const recipePriority = (value: number) => success(RecipePriority.result(value));
const expectFailure = (
  result: Result.Result<unknown, RecipeFailure>,
  expected: RecipeFailure,
): void => {
  expect(Result.isFailure(result)).toBe(true);
  if (Result.isFailure(result)) expect(result.failure).toEqual(expected);
};
const typeFailure = (message: string): RecipeFailure => ({ _tag: "RecipeTypeFailure", name: "TypeError", message });
const rangeFailure = (message: string): RecipeFailure => ({ _tag: "RecipeRangeFailure", name: "RangeError", message });

describe("stonecutting recipe data", () => {
  it("normalizes ingredient snapshots once and contains option getter failures", () => {
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
    const result = Reflect.apply(stonecuttingRecipe, undefined, [
      recipeId("minecraft:snapshot_ingredient"),
      ingredient,
      itemStack("stone_slab", 1),
    ]);
    expect(Result.isSuccess(result)).toBe(true);
    expect(countReads).toBe(1);

    const options = new Proxy({}, {
      get(_target, property) {
        if (property === "priority") throw new Error("hostile getter");
        return undefined;
      },
    });
    expectFailure(
      Reflect.apply(stonecuttingRecipe, undefined, [
        recipeId("minecraft:unreadable_options"),
        "stone",
        itemStack("stone_slab", 1),
        options,
      ]),
      typeFailure("Stonecutting recipe options must be an object"),
    );
  });

  it("constructs exact, tagged, and alternative ingredient recipes", () => {
    expect(STONECUTTING_STATION_TAG).toBe("stonecutter");
    expect(success(stonecuttingRecipe(
      recipeId("minecraft:cut_stone"),
      "stone",
      itemStack("stone_slab", 2),
    ))).toMatchObject({
      _tag: "Stonecutting",
      ingredient: success(exactly("stone")),
      output: itemStack("stone_slab", 2),
      priority: 0,
    });

    expect(success(stonecuttingRecipe(
      recipeId("minecraft:cut_planks"),
      tagLocation("#minecraft:planks"),
      itemStack("stick", 1),
      { priority: recipePriority(2), showNotification: false },
    ))).toMatchObject({
      ingredient: success(tagged(tagLocation("#minecraft:planks"))),
      priority: 2,
      showNotification: false,
    });
    expect(success(stonecuttingRecipe(
      recipeId("minecraft:cut_alternatives"),
      ["stone", "diorite"],
      itemStack("stone_slab", 2),
    )).ingredient).toEqual(success(anyOf(["stone", "diorite"])));
    expect(success(stonecuttingRecipe(
      recipeId("minecraft:cut_structured_alternatives"),
      success(anyOf(["stone", "diorite"])),
      itemStack("stone_slab", 2),
    )).ingredient).toEqual(success(anyOf(["stone", "diorite"])));

    expect(VANILLA_STONECUTTING_RECIPES).toHaveLength(5);
    expect(VANILLA_STONECUTTING_RECIPES.map((recipe) => recipe.output.item)).toContain("stone_slab");
    expect(VANILLA_STONECUTTING_RECIPES.find((recipe) => recipe.output.item === "stone_slab")?.output.count).toBe(2);
  });

  it("returns tagged failures for invalid ingredients, outputs, identifiers, and options", () => {
    const output = itemStack("stone_slab", 2);
    expectFailure(
      Reflect.apply(stonecuttingRecipe, undefined, [null, "stone", output]),
      typeFailure("Stonecutting recipe id must be a resource location"),
    );
    expectFailure(Reflect.apply(stonecuttingRecipe, undefined, [" ", "stone", output]), typeFailure("Stonecutting recipe id must be a resource location"));
    for (const ingredient of [
      "unknown",
      {},
      { _tag: "Exact", item: "stone", count: "1" },
      { _tag: "ItemTag", tag: "planks", count: 1 },
      [],
      { _tag: "AnyOf", count: 1, options: [] },
      { _tag: "AnyOf", count: "1", options: ["stone"] },
    ]) {
      expectFailure(
        Reflect.apply(stonecuttingRecipe, undefined, ["minecraft:bad", ingredient, output]),
        typeFailure("Stonecutting ingredient has an invalid shape"),
      );
    }
    expectFailure(
      Reflect.apply(stonecuttingRecipe, undefined, ["minecraft:bad", ["stone", "invalid"], output]),
      typeFailure("Stonecutting ingredient has an invalid shape"),
    );
    expectFailure(
      Reflect.apply(stonecuttingRecipe, undefined, ["minecraft:bad", "stone", {}]),
      typeFailure("Stonecutting recipe output must be an ItemStack"),
    );
    expectFailure(
      Reflect.apply(stonecuttingRecipe, undefined, ["minecraft:bad", "stone", output, null]),
      typeFailure("Stonecutting recipe options must be an object"),
    );
    expectFailure(
      Reflect.apply(stonecuttingRecipe, undefined, [recipeId("minecraft:bad"), "stone", output, { priority: -1 }]),
      rangeFailure("Stonecutting recipe priority must be a non-negative safe integer, received -1"),
    );
    expectFailure(
      Reflect.apply(stonecuttingRecipe, undefined, [recipeId("minecraft:bad"), "stone", output, { priority: 1.5 }]),
      rangeFailure("Stonecutting recipe priority must be a non-negative safe integer, received 1.5"),
    );
    expectFailure(
      Reflect.apply(stonecuttingRecipe, undefined, ["minecraft:bad", "stone", output, { showNotification: 1 }]),
      typeFailure("Stonecutting recipe show notification must be a boolean"),
    );
  });
});
