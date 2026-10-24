import { Result } from "effect";
import { describe, expect, it, vi } from "vitest";

import { isAnyOfIngredient } from "../src/domain/recipe/recipe-data";
import { itemStack as itemStackResult } from "../src/domain/item/item-stack";
import { StackCount } from "../src/domain/time/quantities";
import { NamespacedResourceLocation, TagLocation } from "../src/domain/text/identifiers";
import { BookGeneration } from "../src/domain/item/item-primitives";
import { RecipeGroup } from "../src/domain/recipe/recipe-data";
import {
  cookingRecipeFromUnknown as decodeCookingRecipeFromUnknown,
  craftingBannerDuplicateRecipeFromUnknown as decodeCraftingBannerDuplicateRecipeFromUnknown,
  craftingBookCloningRecipeFromUnknown as decodeCraftingBookCloningRecipeFromUnknown,
  craftingDecoratedPotRecipeFromUnknown as decodeCraftingDecoratedPotRecipeFromUnknown,
  craftingDyeRecipeFromUnknown as decodeCraftingDyeRecipeFromUnknown,
  craftingFireworkRocketRecipeFromUnknown as decodeCraftingFireworkRocketRecipeFromUnknown,
  craftingFireworkStarFadeRecipeFromUnknown as decodeCraftingFireworkStarFadeRecipeFromUnknown,
  craftingFireworkStarRecipeFromUnknown as decodeCraftingFireworkStarRecipeFromUnknown,
  craftingImbueRecipeFromUnknown as decodeCraftingImbueRecipeFromUnknown,
  craftingMapExtendingRecipeFromUnknown as decodeCraftingMapExtendingRecipeFromUnknown,
  craftingRecipeDataPath as decodeCraftingRecipeDataPath,
  craftingRecipeFromUnknown as decodeCraftingRecipeFromUnknown,
  craftingShieldDecorationRecipeFromUnknown as decodeCraftingShieldDecorationRecipeFromUnknown,
  portableRecipeFromUnknown as decodePortableRecipeFromUnknown,
  recipeDataPath as decodeRecipeDataPath,
  smithingRecipeFromUnknown as decodeSmithingRecipeFromUnknown,
  smithingTransformRecipeFromUnknown as decodeSmithingTransformRecipeFromUnknown,
  smithingTrimRecipeFromUnknown as decodeSmithingTrimRecipeFromUnknown,
  stonecuttingRecipeFromUnknown as decodeStonecuttingRecipeFromUnknown,
  transmuteRecipeFromUnknown as decodeTransmuteRecipeFromUnknown,
} from "../src/domain/recipe/recipe-json";
import type { RecipeFailure } from "../src/domain/recipe/recipe-error";

const recipeSuccess = <A, E>(result: Result.Result<A, E>): A => {
  expect(Result.isSuccess(result)).toBe(true);
  if (Result.isSuccess(result)) return result.success;
  throw new Error(`Expected recipe success, received ${JSON.stringify(result.failure)}`);
};

const itemStack = (item: Parameters<typeof itemStackResult>[0], count: number) =>
  recipeSuccess(itemStackResult(item, recipeSuccess(StackCount.result(count))));

const namespacedResourceLocation = (value: string) =>
  recipeSuccess(NamespacedResourceLocation.result(value));

const withNamespacedId = <A, E>(
  decode: (
    id: ReturnType<typeof namespacedResourceLocation>,
    value: unknown,
  ) => Result.Result<A, E>,
) =>
  (id: string, value: unknown): Result.Result<A, E> => {
    if (typeof id !== "string") {
      return Reflect.apply(decode, undefined, [id, value]);
    }
    const namespaced = NamespacedResourceLocation.result(id);
    return Result.isSuccess(namespaced)
      ? decode(namespaced.success, value)
      : Reflect.apply(decode, undefined, [id, value]);
  };

const cookingRecipeFromUnknown = withNamespacedId(decodeCookingRecipeFromUnknown);
const craftingBannerDuplicateRecipeFromUnknown = withNamespacedId(decodeCraftingBannerDuplicateRecipeFromUnknown);
const craftingBookCloningRecipeFromUnknown = withNamespacedId(decodeCraftingBookCloningRecipeFromUnknown);
const craftingDecoratedPotRecipeFromUnknown = withNamespacedId(decodeCraftingDecoratedPotRecipeFromUnknown);
const craftingDyeRecipeFromUnknown = withNamespacedId(decodeCraftingDyeRecipeFromUnknown);
const craftingFireworkRocketRecipeFromUnknown = withNamespacedId(decodeCraftingFireworkRocketRecipeFromUnknown);
const craftingFireworkStarFadeRecipeFromUnknown = withNamespacedId(decodeCraftingFireworkStarFadeRecipeFromUnknown);
const craftingFireworkStarRecipeFromUnknown = withNamespacedId(decodeCraftingFireworkStarRecipeFromUnknown);
const craftingImbueRecipeFromUnknown = withNamespacedId(decodeCraftingImbueRecipeFromUnknown);
const craftingMapExtendingRecipeFromUnknown = withNamespacedId(decodeCraftingMapExtendingRecipeFromUnknown);
const craftingRecipeFromUnknown = withNamespacedId(decodeCraftingRecipeFromUnknown);
const craftingShieldDecorationRecipeFromUnknown = withNamespacedId(decodeCraftingShieldDecorationRecipeFromUnknown);
const portableRecipeFromUnknown = withNamespacedId(decodePortableRecipeFromUnknown);
const smithingRecipeFromUnknown = withNamespacedId(decodeSmithingRecipeFromUnknown);
const smithingTransformRecipeFromUnknown = withNamespacedId(decodeSmithingTransformRecipeFromUnknown);
const smithingTrimRecipeFromUnknown = withNamespacedId(decodeSmithingTrimRecipeFromUnknown);
const stonecuttingRecipeFromUnknown = withNamespacedId(decodeStonecuttingRecipeFromUnknown);
const transmuteRecipeFromUnknown = withNamespacedId(decodeTransmuteRecipeFromUnknown);
const recipeDataPath = (id: string) => decodeRecipeDataPath(namespacedResourceLocation(id));
const craftingRecipeDataPath = (id: string) => decodeCraftingRecipeDataPath(namespacedResourceLocation(id));

const recipeFailure = (
  result: Result.Result<unknown, RecipeFailure>,
  tag?: RecipeFailure["_tag"],
  expected?: RecipeFailure,
  messagePattern?: RegExp,
): void => {
  expect(Result.isFailure(result)).toBe(true);
  if (Result.isFailure(result)) {
    if (tag !== undefined) expect(result.failure._tag).toBe(tag);
    if (expected !== undefined) expect(result.failure).toEqual(expected);
    const message = result.failure._tag === "RecipeItemFailure"
        ? result.failure.failure._tag === "ItemValidationFailure" || result.failure.failure._tag === "TextComponentFailure"
        ? result.failure.failure.message
        : result.failure.failure.componentKey
      : result.failure.message;
    expect(message).toBeDefined();
    if (typeof message === "string") expect(message).not.toBe("");
    if (messagePattern !== undefined && typeof message === "string") {
      expect(message).toMatch(messagePattern);
    }
    if (result.failure._tag === "RecipeTypeFailure") {
      expect(result.failure.name).toBe("TypeError");
    } else if (result.failure._tag === "RecipeRangeFailure") {
      expect(result.failure.name).toBe("RangeError");
    }
  }
};

const expectInvalidRecipe = (id: string, value: unknown): void => {
  recipeFailure(craftingRecipeFromUnknown(id, value));
};

describe("current Java crafting recipe JSON", () => {
  it("decodes shaped recipes with canonical components and alternatives", () => {
    const recipe = recipeSuccess(craftingRecipeFromUnknown("minecraft:iron_block", {
      type: "minecraft:crafting_shaped",
      category: "building",
      group: "iron",
      show_notification: false,
      pattern: ["##", "##"],
      key: {
        "#": ["minecraft:iron_ingot", "minecraft:gold_ingot"],
      },
      result: {
        id: "minecraft:iron_block",
        count: 1,
        components: {
          "minecraft:custom_name": { text: "Block" },
        },
      },
    }));

    expect(recipe).toMatchObject({
      _tag: "Shaped",
      id: "minecraft:iron_block",
      category: "building",
      group: "iron",
      showNotification: false,
      tags: ["crafting_table"],
    });
    if (recipe._tag !== "Shaped") {
      throw new Error("expected a shaped recipe");
    }
    expect(recipe.pattern).toEqual({
      width: 2,
      height: 2,
      cells: [
        {
          _tag: "AnyOf",
          count: 1,
          options: [
            { _tag: "Exact", item: "iron_ingot", count: 1 },
            { _tag: "Exact", item: "gold_ingot", count: 1 },
          ],
        },
        {
          _tag: "AnyOf",
          count: 1,
          options: [
            { _tag: "Exact", item: "iron_ingot", count: 1 },
            { _tag: "Exact", item: "gold_ingot", count: 1 },
          ],
        },
        {
          _tag: "AnyOf",
          count: 1,
          options: [
            { _tag: "Exact", item: "iron_ingot", count: 1 },
            { _tag: "Exact", item: "gold_ingot", count: 1 },
          ],
        },
        {
          _tag: "AnyOf",
          count: 1,
          options: [
            { _tag: "Exact", item: "iron_ingot", count: 1 },
            { _tag: "Exact", item: "gold_ingot", count: 1 },
          ],
        },
      ],
    });
    expect(recipe.output).toMatchObject({
      item: "iron_block",
      count: 1,
      components: {
        customName: { text: "Block" },
      },
    });
    expect(recipe.output).not.toHaveProperty("componentPatch");
    expect(isAnyOfIngredient(recipe.pattern.cells[0])).toBe(true);
  });

  it("decodes shapeless recipes with item tags and short results", () => {
    const recipe = recipeSuccess(craftingRecipeFromUnknown("example:stick", {
      type: "minecraft:crafting_shapeless",
      category: "misc",
      ingredients: [
        "minecraft:iron_ingot",
        "#minecraft:planks",
        ["minecraft:gold_ingot", "minecraft:iron_ingot"],
      ],
      result: "minecraft:stick",
    }));

    expect(recipe).toMatchObject({
      _tag: "Shapeless",
      id: "example:stick",
      category: "misc",
      tags: ["crafting_table"],
    });
    if (recipe._tag !== "Shapeless") {
      throw new Error("expected a shapeless recipe");
    }
    expect(recipe.ingredients).toEqual([
      { _tag: "Exact", item: "iron_ingot", count: 1 },
      { _tag: "ItemTag", tag: "#minecraft:planks", count: 1 },
      {
        _tag: "AnyOf",
        count: 1,
        options: [
          { _tag: "Exact", item: "gold_ingot", count: 1 },
          { _tag: "Exact", item: "iron_ingot", count: 1 },
        ],
      },
    ]);
    expect(recipe.output).toEqual(itemStack("stick", recipeSuccess(StackCount.result(1))));
    recipeFailure(craftingRecipeFromUnknown("example:bad_tag", {
      type: "minecraft:crafting_shapeless",
      ingredients: ["#Minecraft:planks"],
      result: "minecraft:stick",
    }), "RecipeTypeFailure", undefined, /must be namespaced/);
    recipeFailure(craftingRecipeFromUnknown("example:bad_tag", {
      type: "minecraft:crafting_shapeless",
      ingredients: ["#minecraft:bad tag"],
      result: "minecraft:stick",
    }), "RecipeTypeFailure", undefined, /must be namespaced/);
  });

  it("maps namespaced recipe ids to data-pack paths", () => {
    expect(recipeSuccess(craftingRecipeDataPath("minecraft:iron_block"))).toBe(
      "data/minecraft/recipe/iron_block.json",
    );
    expect(recipeSuccess(craftingRecipeDataPath("example:recipes/one"))).toBe(
      "data/example/recipe/recipes/one.json",
    );
  });

  it("rejects stale, malformed, and unsupported recipe documents", () => {
    expectInvalidRecipe(namespacedResourceLocation("minecraft:iron_block"), {});
    expectInvalidRecipe(namespacedResourceLocation("minecraft:iron_block"), null);
    expectInvalidRecipe(namespacedResourceLocation("minecraft:iron_block"), {});
    expectInvalidRecipe(namespacedResourceLocation("minecraft:iron_block"), { type: 1 });
    expectInvalidRecipe(namespacedResourceLocation("minecraft:iron_block"), { type: "minecraft:smelting" });

    const shaped = {
      type: "minecraft:crafting_shaped",
      pattern: ["S"],
      key: { S: "minecraft:stone" },
      result: "minecraft:stick",
    };
    recipeFailure(
      craftingRecipeFromUnknown("minecraft:bad", {
        ...shaped,
        result: { id: 1 },
      }),
      "RecipeTypeFailure",
      {
        _tag: "RecipeTypeFailure",
        name: "TypeError",
        message: "Recipe item must be a namespaced id, received 1",
      },
    );
    recipeFailure(
      craftingRecipeFromUnknown("minecraft:bad", {
        ...shaped,
        pattern: ["SSSS"],
      }),
      "RecipeRangeFailure",
      {
        _tag: "RecipeRangeFailure",
        name: "RangeError",
        message: "Shaped recipe pattern rows must be strings no wider than 3 characters",
      },
    );
    recipeFailure(
      craftingRecipeFromUnknown("minecraft:bad", {
        ...shaped,
        key: { SS: "minecraft:stone" },
      }),
      "RecipeTypeFailure",
      {
        _tag: "RecipeTypeFailure",
        name: "TypeError",
        message: "Shaped recipe keys must use one non-space character",
      },
    );
    expectInvalidRecipe(namespacedResourceLocation("minecraft:bad"), { ...shaped, extra: true });
    expectInvalidRecipe(namespacedResourceLocation("minecraft:bad"), { ...shaped, pattern: 1 });
    expectInvalidRecipe(namespacedResourceLocation("minecraft:bad"), { ...shaped, pattern: [1] });
    expectInvalidRecipe(namespacedResourceLocation("minecraft:bad"), { ...shaped, key: [] });
    expectInvalidRecipe(namespacedResourceLocation("minecraft:bad"), { ...shaped, key: { S: [] } });
    expectInvalidRecipe(namespacedResourceLocation("minecraft:bad"), {
      ...shaped,
      key: { S: ["#minecraft:planks"] },
    });
    expectInvalidRecipe(namespacedResourceLocation("minecraft:bad"), {
      ...shaped,
      key: { S: { item: "minecraft:stone" } },
    });
    expectInvalidRecipe(namespacedResourceLocation("minecraft:bad"), {
      ...shaped,
      key: { S: "minecraft:air" },
    });
    expectInvalidRecipe(namespacedResourceLocation("minecraft:bad"), {
      ...shaped,
      key: { S: "stone" },
    });
    expectInvalidRecipe(namespacedResourceLocation("minecraft:bad"), {
      ...shaped,
      key: { S: "example:stone" },
    });
    expectInvalidRecipe(namespacedResourceLocation("minecraft:bad"), {
      ...shaped,
      key: { S: "#planks" },
    });
    expectInvalidRecipe(namespacedResourceLocation("minecraft:bad"), { ...shaped, result: null });
    expectInvalidRecipe(namespacedResourceLocation("minecraft:bad"), { ...shaped, result: 1 });
    expectInvalidRecipe(namespacedResourceLocation("minecraft:bad"), {
      ...shaped,
      result: { id: "minecraft:stick", extra: true },
    });
    expectInvalidRecipe(namespacedResourceLocation("minecraft:bad"), {
      ...shaped,
      result: { count: 1 },
    });
    expectInvalidRecipe(namespacedResourceLocation("minecraft:bad"), {
      ...shaped,
      result: { id: "minecraft:stick", count: "1" },
    });
    recipeFailure(
      craftingRecipeFromUnknown("minecraft:bad", {
        ...shaped,
        result: { id: "minecraft:stick", count: 0 },
      }),
      "RecipeItemFailure",
      {
        _tag: "RecipeItemFailure",
        failure: {
          _tag: "ItemValidationFailure",
          kind: "RangeError",
          reason: "out-of-range",
          field: "count",
          message: "Item stack count for stick must be an integer in [1, 64], received 0",
          value: 0,
        },
      },
    );
    expectInvalidRecipe("minecraft:bad", {
      ...shaped,
      result: { id: "minecraft:custom_item" },
    });
    expectInvalidRecipe(namespacedResourceLocation("minecraft:bad"), {
      ...shaped,
      result: { id: "minecraft:stick", components: undefined },
    });
    recipeFailure(
      craftingRecipeFromUnknown("minecraft:bad", {
        ...shaped,
        result: {
          id: "minecraft:stick",
          components: { custom_name: "invalid" },
        },
      }),
      "RecipeItemFailure",
      {
        _tag: "RecipeItemFailure",
        failure: {
          _tag: "ItemValidationFailure",
          kind: "TypeError",
          reason: "invalid-value",
          field: "custom_name",
          message: 'ItemComponentPatchKey must be a namespaced component with an optional ! prefix, received "custom_name"',
          value: "custom_name",
        },
      },
    );
    expectInvalidRecipe("minecraft:bad", { ...shaped, category: "invalid" });
    expectInvalidRecipe("minecraft:bad", { ...shaped, group: 1 });
    expectInvalidRecipe("minecraft:bad", {
      ...shaped,
      show_notification: "yes",
    });

    const shapeless = {
      type: "minecraft:crafting_shapeless",
      ingredients: ["minecraft:stone"],
      result: "minecraft:stick",
    };
    recipeFailure(
      craftingRecipeFromUnknown("minecraft:bad", {
        ...shapeless,
        ingredients: [[]],
      }),
      "RecipeRangeFailure",
      {
        _tag: "RecipeRangeFailure",
        name: "RangeError",
        message: "Recipe ingredient alternatives must not be empty",
      },
    );
    expectInvalidRecipe(namespacedResourceLocation("minecraft:bad"), { ...shapeless, extra: true });
    expectInvalidRecipe(namespacedResourceLocation("minecraft:bad"), { ...shapeless, ingredients: 1 });
    expectInvalidRecipe(namespacedResourceLocation("minecraft:bad"), { ...shapeless, ingredients: [] });
    expectInvalidRecipe(namespacedResourceLocation("minecraft:bad"), {
      ...shapeless,
      ingredients: ["#minecraft:planks", "minecraft:air"],
    });
    expectInvalidRecipe(namespacedResourceLocation("minecraft:bad"), {
      ...shapeless,
      ingredients: [["#minecraft:planks"]],
    });
    expectInvalidRecipe(namespacedResourceLocation("minecraft:bad"), {
      ...shapeless,
      result: "minecraft:air",
    });
  });
});

describe("current Java portable recipe JSON", () => {
  it("decodes all furnace-family recipe types and result counts", () => {
    const recipes = [
      ["minecraft:smelting", "furnace"],
      ["minecraft:blasting", "blast_furnace"],
      ["minecraft:smoking", "smoker"],
      ["minecraft:campfire_cooking", "campfire"],
    ] as const;

    for (const [type, station] of recipes) {
      const recipe = recipeSuccess(cookingRecipeFromUnknown(`minecraft:${station}`, {
        type,
        category: "misc",
        group: "ores",
        show_notification: false,
        ingredient: "minecraft:iron_ore",
        result: { id: "minecraft:iron_ingot", count: 2 },
        experience: 0.7,
        cookingtime: 200,
      }));
      expect(recipe).toMatchObject({
        _tag: "Cooking",
        station,
        cookTimeTicks: 200,
        experience: 0.7,
        output: { item: "iron_ingot", count: 2 },
        category: "misc",
        group: "ores",
        showNotification: false,
      });
    }
  });

  it("decodes transmute ranges and portable dispatch", () => {
    const recipe = recipeSuccess(transmuteRecipeFromUnknown("minecraft:transmute", {
      type: "minecraft:crafting_transmute",
      category: "equipment",
      group: "transmute",
      show_notification: true,
      source: "minecraft:stone",
      material: "#minecraft:planks",
      result: { id: "minecraft:stick", count: 2 },
      material_count: { min: 2, max: 4 },
      add_material_count_to_result: true,
    }));

    expect(recipe).toMatchObject({
      _tag: "Transmute",
      source: { _tag: "Exact", item: "stone", count: 1 },
      material: { _tag: "ItemTag", tag: "#minecraft:planks", count: 1 },
      output: { item: "stick", count: 2 },
      materialCount: { min: 2, max: 4 },
      addMaterialCountToResult: true,
    });
    expect(
      recipeSuccess(portableRecipeFromUnknown("minecraft:transmute", {
        type: "minecraft:crafting_transmute",
        source: "minecraft:stone",
        material: "minecraft:stick",
        result: "minecraft:torch",
      })),
    ).toMatchObject({ _tag: "Transmute", output: { count: 1 } });
  });

  it("decodes stonecutting documents with component-bearing results", () => {
    const recipe = recipeSuccess(stonecuttingRecipeFromUnknown(
      "minecraft:stone_slab_from_stone",
      {
        type: "minecraft:stonecutting",
        ingredient: "minecraft:stone",
        result: {
          id: "minecraft:stone_slab",
          count: 2,
          components: { "minecraft:custom_name": { text: "Slab" } },
        },
        show_notification: false,
      },
    ));

    expect(recipe).toMatchObject({
      _tag: "Stonecutting",
      id: "minecraft:stone_slab_from_stone",
      ingredient: { _tag: "Exact", item: "stone", count: 1 },
      output: {
        item: "stone_slab",
        count: 2,
        components: { customName: { text: "Slab" } },
      },
      showNotification: false,
    });
    expect(
      recipeSuccess(portableRecipeFromUnknown("minecraft:stone_slab_from_stone", {
        type: "minecraft:stonecutting",
        ingredient: "#minecraft:stone_ore_replaceables",
        result: "minecraft:stone_slab",
      })),
    ).toMatchObject({
      _tag: "Stonecutting",
      ingredient: {
        _tag: "ItemTag",
        tag: "#minecraft:stone_ore_replaceables",
      },
    });
  });

  it("decodes smithing transform and trim documents", () => {
    const transform = recipeSuccess(smithingTransformRecipeFromUnknown(
      "minecraft:netherite_sword",
      {
        type: "minecraft:smithing_transform",
        template: "minecraft:netherite_upgrade_smithing_template",
        base: "minecraft:diamond_sword",
        addition: "minecraft:netherite_ingot",
        result: "minecraft:netherite_sword",
        show_notification: false,
      },
    ));
    expect(transform).toMatchObject({
      _tag: "SmithingTransform",
      output: { item: "netherite_sword", count: 1 },
      tags: ["smithing_table"],
      showNotification: false,
    });

    const trim = recipeSuccess(smithingTrimRecipeFromUnknown("minecraft:coast_armor_trim", {
      type: "minecraft:smithing_trim",
      template: "#minecraft:trim_templates",
      base: "#minecraft:trimmable_armor",
      addition: "#minecraft:trim_materials",
    }));
    expect(trim).toMatchObject({
      _tag: "SmithingTrim",
      template: { _tag: "ItemTag", tag: "#minecraft:trim_templates" },
      base: { _tag: "ItemTag", tag: "#minecraft:trimmable_armor" },
      addition: { _tag: "ItemTag", tag: "#minecraft:trim_materials" },
      tags: ["smithing_table"],
    });
    expect(
      recipeSuccess(smithingRecipeFromUnknown("minecraft:coast_armor_trim", {
        type: "minecraft:smithing_trim",
        template: "#minecraft:trim_templates",
        base: "#minecraft:trimmable_armor",
        addition: "#minecraft:trim_materials",
      })),
    ).toMatchObject({ _tag: "SmithingTrim" });
    expect(
      recipeSuccess(portableRecipeFromUnknown("minecraft:netherite_sword", {
        type: "minecraft:smithing_transform",
        template: "minecraft:netherite_upgrade_smithing_template",
        base: "minecraft:diamond_sword",
        addition: "minecraft:netherite_ingot",
        result: "minecraft:netherite_sword",
      })),
    ).toMatchObject({ _tag: "SmithingTransform" });
  });

  it("maps generic recipe paths and rejects unsupported portable documents", () => {
    expect(recipeSuccess(recipeDataPath("minecraft:iron_block"))).toBe(
      "data/minecraft/recipe/iron_block.json",
    );
    const traversingPath = recipeDataPath("minecraft:../secret");
    expect(Result.isFailure(traversingPath)).toBe(true);
    if (Result.isFailure(traversingPath)) {
      expect(traversingPath.failure).toMatchObject({
        _tag: "DataPackRegistryFailure",
        reason: "invalid-resource-path",
      });
    }
    expect(recipeSuccess(portableRecipeFromUnknown("minecraft:portable_shaped", {
      type: "minecraft:crafting_shaped",
      pattern: ["S"],
      key: { S: "minecraft:stone" },
      result: "minecraft:stick",
    }))).toMatchObject({ _tag: "Shaped" });
    expect(recipeSuccess(portableRecipeFromUnknown("minecraft:portable_smelting", {
      type: "minecraft:smelting",
      ingredient: "minecraft:stone",
      result: "minecraft:stone",
      experience: 0,
      cookingtime: 1,
    }))).toMatchObject({ _tag: "Cooking", station: "furnace" });
    recipeFailure(cookingRecipeFromUnknown("minecraft:bad", {
        type: "minecraft:unknown_cooking",
        ingredient: "minecraft:stone",
        result: "minecraft:stick",
        experience: 0,
        cookingtime: 1,
      }));
    recipeFailure(cookingRecipeFromUnknown("minecraft:bad", {
        type: "minecraft:smelting",
        ingredient: "minecraft:stone",
        result: "minecraft:stick",
        experience: "0",
        cookingtime: 1,
      }), "RecipeTypeFailure");
    recipeFailure(cookingRecipeFromUnknown("minecraft:bad", {
        type: "minecraft:smelting",
        ingredient: "minecraft:stone",
        result: "minecraft:stick",
        experience: 0,
        cookingtime: 0,
      }), "RecipeRangeFailure", {
        _tag: "RecipeRangeFailure",
        name: "RangeError",
        message: "Cooking time must be a positive safe integer, received 0",
      });
    recipeFailure(cookingRecipeFromUnknown("minecraft:bad", {
        type: "minecraft:smelting",
        ingredient: "minecraft:stone",
        result: "minecraft:stick",
        experience: -0.1,
        cookingtime: 1,
      }), "RecipeRangeFailure", {
        _tag: "RecipeRangeFailure",
        name: "RangeError",
        message: "Cooking experience must be a finite non-negative number, received -0.1",
      });
    recipeFailure(cookingRecipeFromUnknown("minecraft:bad", {
        type: "minecraft:smelting",
        ingredient: "minecraft:stone",
        result: "minecraft:stick",
        experience: 0,
        cookingtime: "1",
      }), "RecipeTypeFailure");
    recipeFailure(transmuteRecipeFromUnknown("minecraft:bad", {
        type: "minecraft:crafting_transmute",
        source: "minecraft:stone",
        material: "minecraft:stick",
        result: "minecraft:torch",
        material_count: { min: 2, max: 4, extra: true },
      }), "RecipeTypeFailure");
    recipeFailure(transmuteRecipeFromUnknown("minecraft:bad", {
        type: "minecraft:crafting_transmute",
        source: "minecraft:stone",
        material: "minecraft:stick",
        result: "minecraft:torch",
        material_count: { min: "2", max: 4 },
      }), "RecipeTypeFailure");
    recipeFailure(transmuteRecipeFromUnknown("minecraft:bad", {
        type: "minecraft:crafting_transmute",
        source: "minecraft:stone",
        material: "minecraft:stick",
        result: "minecraft:torch",
        material_count: { min: 1, max: 2 },
      }), "RecipeRangeFailure");
    recipeFailure(transmuteRecipeFromUnknown("minecraft:bad", {
        type: "minecraft:crafting_transmute",
        source: "minecraft:stone",
        material: "minecraft:stick",
        result: "minecraft:torch",
        material_count: { min: 0, max: 2 },
      }), "RecipeRangeFailure", {
        _tag: "RecipeRangeFailure",
        name: "RangeError",
        message: "Transmute material_count bounds must be between 1 and 8",
      });
    recipeFailure(transmuteRecipeFromUnknown("minecraft:bad", {
        type: "minecraft:crafting_transmute",
        source: "minecraft:stone",
        material: "minecraft:stick",
        result: "minecraft:torch",
        material_count: { min: 2, max: 9 },
      }), "RecipeRangeFailure", {
        _tag: "RecipeRangeFailure",
        name: "RangeError",
        message: "Transmute material_count bounds must be between 1 and 8",
      });
    recipeFailure(transmuteRecipeFromUnknown("minecraft:bad", {
        type: "minecraft:crafting_transmute",
        source: "minecraft:stone",
        material: "minecraft:stick",
        result: "minecraft:torch",
        add_material_count_to_result: "yes",
      }), "RecipeTypeFailure");
    recipeFailure(portableRecipeFromUnknown("minecraft:bad", {
        type: "minecraft:unsupported",
      }), "RecipeTypeFailure");
    recipeFailure(stonecuttingRecipeFromUnknown("minecraft:bad", {
        type: "minecraft:stonecutting",
        ingredient: "minecraft:stone",
        result: "minecraft:stick",
        group: "removed",
      }), "RecipeTypeFailure");
    recipeFailure(stonecuttingRecipeFromUnknown("minecraft:bad", {
        type: "minecraft:smelting",
        ingredient: "minecraft:stone",
        result: "minecraft:stick",
      }), "RecipeTypeFailure");
    recipeFailure(smithingTransformRecipeFromUnknown("minecraft:bad", {
        type: "minecraft:smithing_transform",
        template: "minecraft:stone",
        base: "minecraft:diamond_sword",
        addition: "minecraft:netherite_ingot",
      }), "RecipeTypeFailure");
    recipeFailure(smithingTrimRecipeFromUnknown("minecraft:bad", {
        type: "minecraft:smithing_trim",
        template: "minecraft:stone",
        base: "minecraft:diamond_sword",
        addition: "minecraft:netherite_ingot",
        result: "minecraft:diamond_sword",
      }), "RecipeTypeFailure");
    recipeFailure(smithingRecipeFromUnknown("minecraft:bad", {
        type: "minecraft:crafting_shaped",
      }), "RecipeTypeFailure");
    recipeFailure(
      Reflect.apply(craftingRecipeFromUnknown, undefined, [null, {
        type: "minecraft:crafting_shaped",
        pattern: ["S"],
        key: { S: "minecraft:stone" },
        result: "minecraft:stick",
      }]),
      "RecipeTypeFailure",
      {
        _tag: "RecipeTypeFailure",
        name: "TypeError",
        message: "Recipe id must be namespaced, received null",
      },
    );
    recipeFailure(
      craftingRecipeFromUnknown("not-namespaced", {
        type: "minecraft:crafting_shaped",
        pattern: ["S"],
        key: { S: "minecraft:stone" },
        result: "minecraft:stick",
      }),
      "RecipeTypeFailure",
      {
        _tag: "RecipeTypeFailure",
        name: "TypeError",
        message: "Recipe id must be namespaced, received not-namespaced",
      },
    );
    recipeFailure(
      craftingRecipeFromUnknown("invalid id", {}),
      "RecipeTypeFailure",
      {
        _tag: "RecipeTypeFailure",
        name: "TypeError",
        message: "Recipe id must be namespaced, received invalid id",
      },
    );
  });
});

// Each special recipe document is decoded by its own function, and each of
// those rejects a wrong `type`, a missing required key and an unknown extra
// key. The table drives all three checks so a new recipe kind cannot be added
// with only its happy path covered.
const SPECIAL_DOCUMENTS = [
  {
    name: "banner duplicate",
    decode: craftingBannerDuplicateRecipeFromUnknown,
    document: {
      type: "minecraft:crafting_special_bannerduplicate",
      banner: "minecraft:white_banner",
      result: "minecraft:white_banner",
    },
    tag: "CraftingBannerDuplicate",
    required: "banner",
  },
  {
    name: "book cloning",
    decode: craftingBookCloningRecipeFromUnknown,
    document: {
      type: "minecraft:crafting_special_bookcloning",
      source: "minecraft:written_book",
      material: "minecraft:paper",
      result: "minecraft:written_book",
    },
    tag: "CraftingBookCloning",
    required: "source",
  },
  {
    name: "decorated pot",
    decode: craftingDecoratedPotRecipeFromUnknown,
    document: {
      type: "minecraft:crafting_decorated_pot",
      back: "minecraft:brick",
      left: "minecraft:feather",
      right: "minecraft:brick",
      front: "minecraft:gold_nugget",
      result: "minecraft:decorated_pot",
    },
    tag: "CraftingDecoratedPot",
    required: "back",
  },
  {
    name: "dye",
    decode: craftingDyeRecipeFromUnknown,
    document: {
      type: "minecraft:crafting_dye",
      target: "minecraft:leather",
      dye: "minecraft:red_dye",
      result: "minecraft:leather",
    },
    tag: "CraftingDye",
    required: "target",
  },
  {
    name: "firework rocket",
    decode: craftingFireworkRocketRecipeFromUnknown,
    document: {
      type: "minecraft:crafting_special_firework_rocket",
      shell: "minecraft:paper",
      fuel: "minecraft:gunpowder",
      star: "minecraft:firework_star",
      result: "minecraft:firework_rocket",
    },
    tag: "CraftingFireworkRocket",
    required: "shell",
  },
  {
    name: "firework star fade",
    decode: craftingFireworkStarFadeRecipeFromUnknown,
    document: {
      type: "minecraft:crafting_special_firework_star_fade",
      target: "minecraft:firework_star",
      dye: "minecraft:red_dye",
      result: "minecraft:firework_star",
    },
    tag: "CraftingFireworkStarFade",
    required: "target",
  },
  {
    name: "firework star",
    decode: craftingFireworkStarRecipeFromUnknown,
    document: {
      type: "minecraft:crafting_special_firework_star",
      trail: "minecraft:diamond",
      twinkle: "minecraft:glowstone_dust",
      fuel: "minecraft:gunpowder",
      dye: "minecraft:red_dye",
      shapes: { star: "minecraft:fire_charge" },
      result: "minecraft:firework_star",
    },
    tag: "CraftingFireworkStar",
    required: "trail",
  },
  {
    name: "imbue",
    decode: craftingImbueRecipeFromUnknown,
    document: {
      type: "minecraft:crafting_imbue",
      source: "minecraft:arrow",
      material: "minecraft:glass_bottle",
      result: "minecraft:arrow",
    },
    tag: "CraftingImbue",
    required: "source",
  },
  {
    name: "map extending",
    decode: craftingMapExtendingRecipeFromUnknown,
    document: {
      type: "minecraft:crafting_special_mapextending",
      map: "minecraft:filled_map",
      material: "minecraft:paper",
      result: "minecraft:filled_map",
    },
    tag: "CraftingMapExtending",
    required: "map",
  },
  {
    name: "shield decoration",
    decode: craftingShieldDecorationRecipeFromUnknown,
    document: {
      type: "minecraft:crafting_special_shielddecoration",
      banner: "minecraft:white_banner",
      target: "minecraft:shield",
      result: "minecraft:shield",
    },
    tag: "CraftingShieldDecoration",
    required: "banner",
  },
] as const;

describe("current Java special recipe JSON", () => {
  for (const { name, decode, document, tag, required } of SPECIAL_DOCUMENTS) {
    it(`decodes and guards the ${name} document`, () => {
      const decoded = decode("minecraft:test", document);
      expect(decoded._tag).toBe("Success");
      if (decoded._tag === "Success") expect(decoded.success).toMatchObject({ _tag: tag });
      const decodedWithoutNotification = decode("minecraft:test", { ...document, show_notification: false });
      expect(decodedWithoutNotification._tag).toBe("Success");
      if (decodedWithoutNotification._tag === "Success") {
        expect(decodedWithoutNotification.success).toMatchObject({ _tag: tag, showNotification: false });
      }
      expect(recipeSuccess(portableRecipeFromUnknown("minecraft:test", document))).toMatchObject(
        { _tag: tag },
      );

      recipeFailure(decode("minecraft:test", null), "RecipeTypeFailure");
      recipeFailure(
        decode("minecraft:test", { ...document, type: "minecraft:nonsense" }),
        "RecipeTypeFailure",
      );
      recipeFailure(
        decode("minecraft:test", { ...document, unexpected: true }),
        "RecipeTypeFailure",
      );
      const withoutRequired = Object.fromEntries(
        Object.entries(document).filter(([key]) => key !== required),
      );
      recipeFailure(decode("minecraft:test", withoutRequired), "RecipeTypeFailure");
      recipeFailure(decode("not-namespaced", document), "RecipeTypeFailure");
    });
  }

  it("reads the optional fields the dye and imbue documents share", () => {
    const withOptions = {
      type: "minecraft:crafting_dye",
      category: "equipment",
      group: "leather_dyeing",
      show_notification: false,
      target: "minecraft:leather",
      dye: "minecraft:red_dye",
      result: "minecraft:leather",
    };
    expect(
      recipeSuccess(craftingDyeRecipeFromUnknown("minecraft:test", withOptions)),
    ).toMatchObject({
      category: "equipment",
      group: "leather_dyeing",
      showNotification: false,
    });
    expect(
      recipeSuccess(craftingImbueRecipeFromUnknown("minecraft:test", {
        type: "minecraft:crafting_imbue",
        category: "misc",
        group: "imbuing",
        show_notification: true,
        source: "minecraft:arrow",
        material: "minecraft:glass_bottle",
        result: "minecraft:arrow",
      })),
    ).toMatchObject({
      category: "misc",
      group: "imbuing",
      showNotification: true,
    });
  });

  it("rejects a document that is not a record before reading its type", () => {
    for (const decode of [
      cookingRecipeFromUnknown,
      transmuteRecipeFromUnknown,
      smithingRecipeFromUnknown,
      portableRecipeFromUnknown,
    ]) {
      recipeFailure(decode("minecraft:test", null), "RecipeTypeFailure");
      recipeFailure(decode("minecraft:test", { type: 1 }), "RecipeTypeFailure");
    }
    recipeFailure(
      smithingTransformRecipeFromUnknown("minecraft:test", null),
      "RecipeTypeFailure",
    );
    recipeFailure(
      smithingTrimRecipeFromUnknown("minecraft:test", null),
      "RecipeTypeFailure",
    );

    // A well-formed envelope with the wrong contents fails on the key check,
    // which is a separate rejection from the type check above.
    recipeFailure(cookingRecipeFromUnknown("minecraft:test", {
        type: "minecraft:smelting",
        ingredient: "minecraft:iron_ore",
        result: "minecraft:iron_ingot",
      }), "RecipeTypeFailure");
    recipeFailure(transmuteRecipeFromUnknown("minecraft:test", {
        type: "minecraft:crafting_transmute",
        source: "minecraft:iron_block",
      }), "RecipeTypeFailure");
    recipeFailure(transmuteRecipeFromUnknown("minecraft:test", {
        type: "minecraft:crafting_shaped",
      }), "RecipeTypeFailure");
  });

  it("snapshots the recipe type discriminator before dispatch", () => {
    let typeReads = 0;
    const document = Object.defineProperty(
      {
        ingredients: ["minecraft:stone"],
        result: "minecraft:stone",
      },
      "type",
      {
        enumerable: true,
        get() {
          typeReads += 1;
          return typeReads === 1
            ? "minecraft:crafting_shapeless"
            : "minecraft:crafting_shaped";
        },
      },
    );
    const recipe = recipeSuccess(
      craftingRecipeFromUnknown("minecraft:type_snapshot", document),
    );
    expect(recipe._tag).toBe("Shapeless");
    expect(typeReads).toBe(1);

    const unreadableType = Object.defineProperty({}, "type", {
      enumerable: true,
      get() {
        throw new Error("hostile type getter");
      },
    });
    recipeFailure(
      craftingRecipeFromUnknown("minecraft:unreadable_type", unreadableType),
      "RecipeTypeFailure",
    );
  });

  it("returns failures when recipe JSON array and key snapshots cannot be inspected", () => {
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    recipeFailure(
      craftingRecipeFromUnknown("minecraft:revoked_document", revoked.proxy),
      "RecipeTypeFailure",
    );

    const invalidLength = new Proxy(["#"], {
      get(target, property, receiver) {
        return property === "length" ? Number.NaN : Reflect.get(target, property, receiver);
      },
    });
    recipeFailure(
      craftingRecipeFromUnknown("minecraft:invalid_pattern_length", {
        type: "minecraft:crafting_shaped",
        pattern: invalidLength,
        key: { "#": "minecraft:stone" },
        result: "minecraft:stone",
      }),
      "RecipeTypeFailure",
      undefined,
      /Shaped recipe pattern must be an array/,
    );

    const unreadableLength = new Proxy(["#"], {
      get(target, property, receiver) {
        if (property === "length") throw new Error("hostile array getter");
        return Reflect.get(target, property, receiver);
      },
    });
    recipeFailure(
      craftingRecipeFromUnknown("minecraft:unreadable_pattern", {
        type: "minecraft:crafting_shaped",
        pattern: unreadableLength,
        key: { "#": "minecraft:stone" },
        result: "minecraft:stone",
      }),
      "RecipeTypeFailure",
      undefined,
      /Shaped recipe pattern must be an array/,
    );

    const unreadableKey = new Proxy({ "#": "minecraft:stone" }, {
      ownKeys() {
        throw new Error("hostile ownKeys trap");
      },
    });
    recipeFailure(
      craftingRecipeFromUnknown("minecraft:unreadable_key", {
        type: "minecraft:crafting_shaped",
        pattern: ["#"],
        key: unreadableKey,
        result: "minecraft:stone",
      }),
      "RecipeTypeFailure",
      undefined,
      /Shaped recipe key must be an object/,
    );
  });

  it("maps brand validation failures to recipe JSON failures", () => {
    const tagResult = TagLocation.result("not-a-tag");
    if (Result.isSuccess(tagResult)) throw new Error("expected an invalid item tag");
    const brandFailure = tagResult.failure;
    const tagSpy = vi
      .spyOn(TagLocation, "result")
      .mockReturnValue(Result.fail(brandFailure));
    try {
      recipeFailure(
        craftingRecipeFromUnknown("minecraft:bad_item_tag_brand", {
          type: "minecraft:crafting_shapeless",
          ingredients: ["#minecraft:planks"],
          result: "minecraft:stick",
        }),
        "RecipeTypeFailure",
        undefined,
        /Recipe item tag must be namespaced/,
      );
    } finally {
      tagSpy.mockRestore();
    }

    const groupSpy = vi
      .spyOn(RecipeGroup, "result")
      .mockReturnValue(Result.fail(brandFailure));
    try {
      recipeFailure(
        craftingRecipeFromUnknown("minecraft:bad_group_brand", {
          type: "minecraft:crafting_shapeless",
          group: "test",
          ingredients: ["minecraft:stone"],
          result: "minecraft:stick",
        }),
        "RecipeTypeFailure",
        undefined,
        /Recipe group must be a string/,
      );
    } finally {
      groupSpy.mockRestore();
    }

    const generationSpy = vi
      .spyOn(BookGeneration, "result")
      .mockReturnValue(Result.fail(brandFailure));
    try {
      recipeFailure(
        craftingBookCloningRecipeFromUnknown("minecraft:bad_book_generation_brand", {
          type: "minecraft:crafting_special_bookcloning",
          source: "minecraft:written_book",
          material: "minecraft:paper",
          allowed_generations: { min: 0, max: 2 },
          result: "minecraft:written_book",
        }),
        "RecipeRangeFailure",
        undefined,
        /allowed_generations must be between 0 and 2/,
      );
    } finally {
      generationSpy.mockRestore();
    }
  });

  it("reads the ranges the book cloning and star documents carry", () => {
    expect(
      recipeSuccess(craftingBookCloningRecipeFromUnknown("minecraft:test", {
        type: "minecraft:crafting_special_bookcloning",
        source: "minecraft:written_book",
        material: "minecraft:paper",
        allowed_generations: { min: 0, max: 2 },
        result: "minecraft:written_book",
      })).allowedGenerations,
    ).toEqual([0, 2]);
    for (const allowed_generations of [
      null,
      { min: 0 },
      { min: 0, max: 2, extra: 1 },
      { min: "0", max: 2 },
      { min: 0, max: "2" },
      { min: -1, max: 2 },
      { min: 0, max: 3 },
      { min: 2, max: 1 },
    ]) {
      let failureTag: RecipeFailure["_tag"] = "RecipeTypeFailure";
      if (
        typeof allowed_generations === "object" &&
        allowed_generations !== null &&
        !Array.isArray(allowed_generations) &&
        Object.keys(allowed_generations).length === 2 &&
        "min" in allowed_generations &&
        "max" in allowed_generations &&
        typeof allowed_generations.min === "number" &&
        Number.isSafeInteger(allowed_generations.min) &&
        typeof allowed_generations.max === "number" &&
        Number.isSafeInteger(allowed_generations.max)
      ) {
        failureTag = "RecipeRangeFailure";
      }
      recipeFailure(
        craftingBookCloningRecipeFromUnknown("minecraft:test", {
          type: "minecraft:crafting_special_bookcloning",
          source: "minecraft:written_book",
          material: "minecraft:paper",
          allowed_generations,
          result: "minecraft:written_book",
        }),
        failureTag,
      );
    }

    for (const shapes of [null, { spiral: "minecraft:fire_charge" }]) {
      recipeFailure(craftingFireworkStarRecipeFromUnknown("minecraft:test", {
          type: "minecraft:crafting_special_firework_star",
          trail: "minecraft:diamond",
          twinkle: "minecraft:glowstone_dust",
          fuel: "minecraft:gunpowder",
          dye: "minecraft:red_dye",
          shapes,
          result: "minecraft:firework_star",
        }), "RecipeTypeFailure");
    }
  });
});
