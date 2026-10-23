import { Result } from "effect";
import { describe, expect, it } from "vitest";

import { itemStack as itemStackResult } from "../src/domain/item/item-stack";
import { RecipeId, RecipePriority, exactly } from "../src/domain/recipe/recipe-data";
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
import {
  SMITHING_STATION_TAG,
  SMITHING_TRIM_MATERIAL_TAG,
  SMITHING_TRIM_TEMPLATE_TAG,
  SMITHING_TRIMMABLE_ARMOR_TAG,
  VANILLA_SMITHING_RECIPES,
  smithingTransformRecipe,
  smithingTrimRecipe,
} from "../src/domain/recipe/smithing-data";

describe("smithing recipe data", () => {
  it("constructs transform and trim recipes with station metadata", () => {
    expect(SMITHING_STATION_TAG).toBe("smithing_table");
    expect(SMITHING_TRIM_TEMPLATE_TAG).toBe("#minecraft:trim_templates");
    expect(SMITHING_TRIMMABLE_ARMOR_TAG).toBe("#minecraft:trimmable_armor");
    expect(SMITHING_TRIM_MATERIAL_TAG).toBe("#minecraft:trim_materials");

    const transform = recipeSuccess(smithingTransformRecipe(
      RecipeId("minecraft:custom_netherite_sword"),
      SMITHING_TRIM_TEMPLATE_TAG,
      recipeSuccess(exactly("diamond_sword")),
      "netherite_ingot",
      itemStack("netherite_sword", 1),
      { priority: RecipePriority(2), showNotification: true, tags: [SMITHING_STATION_TAG] },
    ));
    expect(transform).toMatchObject({
      _tag: "SmithingTransform",
      id: "minecraft:custom_netherite_sword",
      template: { _tag: "ItemTag", tag: SMITHING_TRIM_TEMPLATE_TAG },
      base: recipeSuccess(exactly("diamond_sword")),
      addition: recipeSuccess(exactly("netherite_ingot")),
      output: itemStack("netherite_sword", 1),
      priority: 2,
      showNotification: true,
      tags: [SMITHING_STATION_TAG],
    });

    const trim = recipeSuccess(smithingTrimRecipe(
      RecipeId("minecraft:trim_armor"),
      SMITHING_TRIM_TEMPLATE_TAG,
      SMITHING_TRIMMABLE_ARMOR_TAG,
      SMITHING_TRIM_MATERIAL_TAG,
    ));
    expect(trim).toMatchObject({
      _tag: "SmithingTrim",
      priority: 0,
      tags: [],
    });
    expect(VANILLA_SMITHING_RECIPES).toHaveLength(10);
    expect(VANILLA_SMITHING_RECIPES.every((recipe) => recipe.tags.includes(SMITHING_STATION_TAG))).toBe(true);
    expect(VANILLA_SMITHING_RECIPES.at(-1)).toMatchObject({ _tag: "SmithingTrim" });
  });

  it("rejects malformed identifiers, ingredients, outputs, and options", () => {
    const output = itemStack("netherite_sword", StackCount(1));
    const ingredients = [SMITHING_TRIM_TEMPLATE_TAG, "diamond_sword", "netherite_ingot"] as const;
    recipeFailure(Reflect.apply(smithingTransformRecipe, undefined, [" ", ...ingredients, output]), "RecipeTypeFailure");
    recipeFailure(Reflect.apply(smithingTransformRecipe, undefined, ["minecraft:bad", null, ...ingredients.slice(1), output]), "RecipeTypeFailure");
    recipeFailure(Reflect.apply(smithingTransformRecipe, undefined, ["minecraft:bad", ...ingredients, {}]), "RecipeTypeFailure");
    recipeFailure(Reflect.apply(smithingTrimRecipe, undefined, [" ", ...ingredients]), "RecipeTypeFailure");
    recipeFailure(Reflect.apply(smithingTrimRecipe, undefined, ["minecraft:bad", null, ...ingredients.slice(1)]), "RecipeTypeFailure");

    for (const [options, tag] of [
      [null, "RecipeTypeFailure"],
      [{ priority: -1 }, "RecipeRangeFailure"],
      [{ priority: 1.5 }, "RecipeRangeFailure"],
      [{ tags: "smithing_table" }, "RecipeTypeFailure"],
      [{ tags: [""] }, "RecipeTypeFailure"],
      [{ showNotification: 1 }, "RecipeTypeFailure"],
    ] as const) {
      recipeFailure(Reflect.apply(smithingTrimRecipe, undefined, [
        "minecraft:bad_options",
        SMITHING_TRIM_TEMPLATE_TAG,
        SMITHING_TRIMMABLE_ARMOR_TAG,
        SMITHING_TRIM_MATERIAL_TAG,
        options,
      ]), tag);
    }
  });
});
