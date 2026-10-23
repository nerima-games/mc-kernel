import { describe, expect, it } from "vitest";

import { itemStack } from "../src/domain/item/item-stack";
import { exactly } from "../src/domain/recipe/recipe-data";
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

    const transform = smithingTransformRecipe(
      "minecraft:custom_netherite_sword",
      SMITHING_TRIM_TEMPLATE_TAG,
      exactly("diamond_sword"),
      "netherite_ingot",
      itemStack("netherite_sword", 1),
      { priority: 2, showNotification: true, tags: [SMITHING_STATION_TAG] },
    );
    expect(transform).toMatchObject({
      _tag: "SmithingTransform",
      id: "minecraft:custom_netherite_sword",
      template: { _tag: "ItemTag", tag: SMITHING_TRIM_TEMPLATE_TAG },
      base: exactly("diamond_sword"),
      addition: exactly("netherite_ingot"),
      output: itemStack("netherite_sword", 1),
      priority: 2,
      showNotification: true,
      tags: [SMITHING_STATION_TAG],
    });

    const trim = smithingTrimRecipe(
      "minecraft:trim_armor",
      SMITHING_TRIM_TEMPLATE_TAG,
      SMITHING_TRIMMABLE_ARMOR_TAG,
      SMITHING_TRIM_MATERIAL_TAG,
    );
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
    const output = itemStack("netherite_sword", 1);
    const ingredients = [SMITHING_TRIM_TEMPLATE_TAG, "diamond_sword", "netherite_ingot"] as const;
    expect(() => Reflect.apply(smithingTransformRecipe, undefined, [" ", ...ingredients, output])).toThrow(TypeError);
    expect(() => Reflect.apply(smithingTransformRecipe, undefined, ["minecraft:bad", null, ...ingredients.slice(1), output])).toThrow(TypeError);
    expect(() => Reflect.apply(smithingTransformRecipe, undefined, ["minecraft:bad", ...ingredients, {}])).toThrow(TypeError);
    expect(() => Reflect.apply(smithingTrimRecipe, undefined, [" ", ...ingredients])).toThrow(TypeError);
    expect(() => Reflect.apply(smithingTrimRecipe, undefined, ["minecraft:bad", null, ...ingredients.slice(1)])).toThrow(TypeError);

    for (const options of [
      null,
      { priority: -1 },
      { priority: 1.5 },
      { tags: "smithing_table" },
      { tags: [""] },
      { showNotification: 1 },
    ]) {
      expect(() => Reflect.apply(smithingTrimRecipe, undefined, [
        "minecraft:bad_options",
        SMITHING_TRIM_TEMPLATE_TAG,
        SMITHING_TRIMMABLE_ARMOR_TAG,
        SMITHING_TRIM_MATERIAL_TAG,
        options,
      ])).toThrow();
    }
  });
});
