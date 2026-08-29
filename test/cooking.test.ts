import { describe, expect, it } from "vitest";

import {
  cookingRecipe,
  cookingRecipeForItem,
  isCookingRecipe,
} from "../src/domain/cooking-data";
import {
  applyCooking,
  matchCookingRecipe,
  matchCookingRecipes,
  matchesCookingRecipe,
} from "../src/domain/cooking";
import { itemStack } from "../src/domain/item-stack";

const recipe = cookingRecipe(
  "minecraft:iron",
  "furnace",
  "iron_ore",
  itemStack("iron_ingot", 1),
  200,
  0.7,
  { priority: 2, showNotification: true },
);

const fasterRecipe = cookingRecipe(
  "minecraft:gold",
  "furnace",
  "gold_ore",
  itemStack("gold_ingot", 1),
  100,
  1,
  { priority: 1 },
);

describe("portable cooking recipes", () => {
  it("constructs and validates cooking recipes", () => {
    expect(recipe).toMatchObject({
      _tag: "Cooking",
      station: "furnace",
      cookTimeTicks: 200,
      experience: 0.7,
      priority: 2,
      showNotification: true,
    });
    expect(isCookingRecipe(recipe)).toBe(true);
    expect(isCookingRecipe(null)).toBe(false);
    expect(isCookingRecipe({ ...recipe, station: "invalid" })).toBe(false);
    expect(() =>
      cookingRecipe(
        "minecraft:bad",
        "campfire",
        [],
        itemStack("iron_ingot", 1),
        200,
        0,
      ),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(cookingRecipe, undefined, [
        "minecraft:bad",
        "furnace",
        "iron_ore",
        itemStack("iron_ingot", 1),
        0,
        0,
      ]),
    ).toThrow(RangeError);
    expect(() =>
      Reflect.apply(cookingRecipe, undefined, [
        "minecraft:bad",
        "furnace",
        "iron_ore",
        itemStack("iron_ingot", 1),
        1,
        -1,
      ]),
    ).toThrow(RangeError);
    expect(() =>
      Reflect.apply(cookingRecipe, undefined, [
        "minecraft:bad",
        "furnace",
        "iron_ore",
        itemStack("iron_ingot", 1),
        1,
        0,
        { category: "invalid" },
      ]),
    ).toThrow(TypeError);

    const validArgs = [
      "minecraft:bad",
      "furnace",
      "iron_ore",
      itemStack("iron_ingot", 1),
      1,
      0,
    ];
    expect(() =>
      Reflect.apply(cookingRecipe, undefined, ["", ...validArgs.slice(1)]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(cookingRecipe, undefined, [
        "minecraft:bad",
        "toaster",
        ...validArgs.slice(2),
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(cookingRecipe, undefined, [
        ...validArgs.slice(0, 3),
        {},
        ...validArgs.slice(4),
      ]),
    ).toThrow(TypeError);
    for (const options of [
      null,
      { group: 1 },
      { priority: -1 },
      { showNotification: 1 },
    ]) {
      expect(() =>
        Reflect.apply(cookingRecipe, undefined, [...validArgs, options]),
      ).toThrow();
    }

    // No options at all is the defaulting path, distinct from an options object
    // that happens to omit every field.
    const bare = cookingRecipe(
      "minecraft:bare",
      "furnace",
      "iron_ore",
      itemStack("iron_ingot", 1),
      1,
      0,
    );
    expect(bare.priority).toBe(0);

    const described = cookingRecipe(
      "minecraft:described",
      "furnace",
      "iron_ore",
      itemStack("iron_ingot", 1),
      1,
      0,
      { category: "misc", group: "ores" },
    );
    expect(isCookingRecipe(described)).toBe(true);
    expect(isCookingRecipe({ ...described, category: "invalid" })).toBe(false);
    expect(isCookingRecipe({ ...described, group: 1 })).toBe(false);
    expect(isCookingRecipe({ ...described, showNotification: 1 })).toBe(false);

    expect(
      cookingRecipeForItem(
        "minecraft:for_item",
        "smoker",
        "porkchop",
        "cooked_porkchop",
        2,
        100,
        0.35,
      ),
    ).toMatchObject({
      _tag: "Cooking",
      station: "smoker",
      output: itemStack("cooked_porkchop", 2),
    });
  });

  it("matches by station and chooses priority then id", () => {
    const input = itemStack("iron_ore", 2);
    expect(matchesCookingRecipe(recipe, input)).toBe(true);
    expect(matchesCookingRecipe(recipe, input, { station: "smoker" })).toBe(
      false,
    );
    expect(
      matchCookingRecipes(input, { station: "furnace" }, [recipe]),
    ).toEqual([recipe]);
    expect(matchCookingRecipes(undefined, {}, [recipe])).toEqual([]);
    expect(
      matchCookingRecipes(itemStack("gold_ore", 1), {}, [recipe, fasterRecipe]),
    ).toEqual([fasterRecipe]);
    expect(matchCookingRecipe(input, {}, [recipe])).toMatchObject({
      _tag: "Match",
      recipe,
      output: itemStack("iron_ingot", 1),
    });
    expect(matchCookingRecipe(itemStack("dirt", 1), {}, [recipe])).toEqual({
      _tag: "NoMatch",
    });
  });

  it("applies a match without mutating the input", () => {
    const input = itemStack("iron_ore", 2);
    const applied = applyCooking(recipe, input);
    expect(applied).toMatchObject({
      _tag: "Applied",
      output: itemStack("iron_ingot", 1),
      remainingInput: itemStack("iron_ore", 1),
    });
    expect(input).toEqual(itemStack("iron_ore", 2));
    expect(applyCooking(recipe, itemStack("dirt", 1))).toEqual({
      _tag: "NoMatch",
    });
    expect(() =>
      Reflect.apply(matchesCookingRecipe, undefined, [recipe, {}, {}]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(matchCookingRecipes, undefined, [undefined, {}, []]),
    ).not.toThrow();
    expect(() =>
      Reflect.apply(matchCookingRecipes, undefined, [
        undefined,
        { itemTags: [] },
        [],
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(matchCookingRecipes, undefined, [undefined, null, []]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(matchCookingRecipes, undefined, [
        undefined,
        { station: "" },
        [],
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(matchCookingRecipes, undefined, [undefined, {}, null]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(matchCookingRecipes, undefined, [
        undefined,
        {},
        [{ ...recipe, station: "invalid" }],
      ]),
    ).toThrow(TypeError);

    // Two recipes that both match is what puts the comparator to work.
    const alternative = cookingRecipe(
      "minecraft:iron_alternative",
      "furnace",
      "iron_ore",
      itemStack("iron_ingot", 2),
      200,
      0.7,
      { priority: 2 },
    );
    expect(
      matchCookingRecipes(itemStack("iron_ore", 2), {}, [recipe, alternative]),
    ).toEqual([recipe, alternative]);

    // Consuming the input exactly leaves no remainder to hand back.
    expect(applyCooking(recipe, itemStack("iron_ore", 1))).toMatchObject({
      _tag: "Applied",
      remainingInput: undefined,
    });
  });

  it("resolves a genuine vanilla tag when itemTags is omitted from the match context", () => {
    const trimMaterialRecipe = cookingRecipe(
      "minecraft:trim_material_smelt",
      "furnace",
      "#minecraft:trim_materials",
      itemStack("netherite_ingot", 1),
      200,
      0,
    );
    expect(
      matchCookingRecipe(itemStack("gold_ingot", 1), {}, [trimMaterialRecipe]),
    ).toMatchObject({
      _tag: "Match",
      recipe: trimMaterialRecipe,
    });
  });
});
