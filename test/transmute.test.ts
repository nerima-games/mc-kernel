import { describe, expect, it } from "vitest";

import { itemStack } from "../src/domain/item-stack";
import { craftGrid, exactly, tagged } from "../src/domain/recipe-data";
import {
  applyTransmute,
  matchTransmuteRecipe,
  matchTransmuteRecipes,
  matchesTransmuteRecipe,
} from "../src/domain/transmute";
import {
  isTransmuteMaterialCount,
  isTransmuteRecipe,
  transmuteRecipe,
  transmuteRecipeForItem,
} from "../src/domain/transmute-data";

const recipe = transmuteRecipe(
  "minecraft:diamond_from_iron",
  "iron_block",
  "diamond",
  itemStack("netherite_scrap", 1),
  { materialCount: { min: 2, max: 8 }, addMaterialCountToResult: true },
);

const grid = craftGrid(3, 3, [
  itemStack("iron_block", 1),
  itemStack("diamond", 1),
  itemStack("diamond", 1),
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
]);

describe("portable transmute recipes", () => {
  it("constructs and validates the material range", () => {
    expect(recipe.materialCount).toEqual({ min: 2, max: 8 });
    expect(recipe.addMaterialCountToResult).toBe(true);
    expect(isTransmuteRecipe(recipe)).toBe(true);
    expect(isTransmuteRecipe(null)).toBe(false);
    expect(() =>
      transmuteRecipe(
        "minecraft:bad",
        "iron_block",
        "diamond",
        itemStack("netherite_scrap", 1),
        { materialCount: { min: 1, max: 2 } },
      ),
    ).toThrow(RangeError);
    expect(() =>
      transmuteRecipe(
        "minecraft:bad",
        "iron_block",
        "diamond",
        itemStack("netherite_scrap", 1),
        { materialCount: { min: 2, max: 8 }, addMaterialCountToResult: true },
      ),
    ).not.toThrow();

    for (const materialCount of [
      { min: "2", max: 8 },
      { min: 2, max: "8" },
      { min: 0, max: 8 },
      { min: 2, max: 9 },
      { min: 8, max: 2 },
    ]) {
      expect(() =>
        Reflect.apply(transmuteRecipe, undefined, [
          "minecraft:bad",
          "iron_block",
          "diamond",
          itemStack("netherite_scrap", 1),
          { materialCount },
        ]),
      ).toThrow(RangeError);
    }
    expect(isTransmuteMaterialCount({ min: 1, max: 1 })).toBe(true);
    expect(isTransmuteMaterialCount({ min: 2, max: 8 })).toBe(true);
    expect(isTransmuteMaterialCount(null)).toBe(false);

    const valid = [
      "minecraft:bad",
      "iron_block",
      "diamond",
      itemStack("netherite_scrap", 1),
    ];
    expect(() =>
      Reflect.apply(transmuteRecipe, undefined, ["", ...valid.slice(1)]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(transmuteRecipe, undefined, [
        valid[0],
        null,
        ...valid.slice(2),
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(transmuteRecipe, undefined, [...valid.slice(0, 3), {}]),
    ).toThrow(TypeError);
    for (const options of [
      null,
      { category: "invalid" },
      { group: 1 },
      { priority: -1 },
      { showNotification: 1 },
      { addMaterialCountToResult: 1 },
    ]) {
      expect(() =>
        Reflect.apply(transmuteRecipe, undefined, [...valid, options]),
      ).toThrow();
    }

    // Folding the material count into the result cannot push the stack past
    // what the item can hold.
    expect(() =>
      transmuteRecipe(
        "minecraft:overflowing",
        "iron_block",
        "diamond",
        itemStack("netherite_scrap", 60),
        { materialCount: { min: 2, max: 8 }, addMaterialCountToResult: true },
      ),
    ).toThrow(RangeError);

    const described = transmuteRecipe(
      "minecraft:described",
      "iron_block",
      "diamond",
      itemStack("netherite_scrap", 1),
      { category: "misc", group: "gems" },
    );
    expect(isTransmuteRecipe(described)).toBe(true);
    expect(isTransmuteRecipe({ ...described, category: "invalid" })).toBe(false);
    expect(isTransmuteRecipe({ ...described, group: 1 })).toBe(false);
    expect(isTransmuteRecipe({ ...described, showNotification: 1 })).toBe(false);

    expect(
      transmuteRecipeForItem(
        "minecraft:for_item",
        "iron_block",
        "diamond",
        "netherite_scrap",
        2,
      ),
    ).toMatchObject({
      _tag: "Transmute",
      output: itemStack("netherite_scrap", 2),
    });
  });

  it("matches source and material slots and computes the output count", () => {
    const match = matchTransmuteRecipe(grid, {}, [recipe]);
    expect(match).toMatchObject({
      _tag: "Match",
      sourceSlotIndex: 0,
      materialSlotIndexes: [1, 2],
      output: itemStack("netherite_scrap", 3),
    });
    expect(matchesTransmuteRecipe(recipe, grid)).toBe(true);
    expect(matchTransmuteRecipes(grid, {}, [recipe])).toHaveLength(1);
    expect(
      matchTransmuteRecipe(craftGrid(2, 2, [itemStack("iron_block", 1)]), {}, [
        recipe,
      ]),
    ).toEqual({ _tag: "NoMatch" });
    expect(
      matchTransmuteRecipe(
        craftGrid(3, 3, [itemStack("iron_block", 1), undefined, undefined]),
        {},
        [recipe],
      ),
    ).toEqual({ _tag: "NoMatch" });
    expect(
      matchTransmuteRecipe(
        craftGrid(3, 3, [
          itemStack("iron_block", 1),
          itemStack("stone", 1),
          itemStack("diamond", 1),
        ]),
        {},
        [recipe],
      ),
    ).toEqual({ _tag: "NoMatch" });
    expect(
      matchTransmuteRecipe(
        craftGrid(3, 3, [
          itemStack("iron_block", 1),
          itemStack("diamond", 1),
          undefined,
        ]),
        {},
        [recipe],
      ),
    ).toEqual({ _tag: "NoMatch" });
  });

  it("supports tags and applies consumption immutably", () => {
    const taggedRecipe = transmuteRecipe(
      "minecraft:tagged",
      exactly("iron_block", 2),
      tagged("#minecraft:gems"),
      itemStack("netherite_scrap", 1),
      { materialCount: { min: 1, max: 1 } },
    );
    const taggedGrid = craftGrid(3, 3, [
      itemStack("iron_block", 2),
      itemStack("diamond", 2),
      undefined,
    ]);
    const itemTags = new Map([
      [tagged("#minecraft:gems").tag, new Set(["diamond"] as const)],
    ]);
    expect(matchesTransmuteRecipe(taggedRecipe, taggedGrid, { itemTags })).toBe(
      true,
    );
    const applied = applyTransmute(taggedRecipe, taggedGrid, { itemTags });
    expect(applied).toMatchObject({
      _tag: "Applied",
      output: itemStack("netherite_scrap", 1),
      remainingGrid: craftGrid(3, 3, [
        undefined,
        itemStack("diamond", 1),
        undefined,
      ]),
    });
    expect(taggedGrid.cells[0]).toEqual(itemStack("iron_block", 2));
    expect(applyTransmute(recipe, taggedGrid)).toEqual({ _tag: "NoMatch" });
    expect(() =>
      Reflect.apply(matchesTransmuteRecipe, undefined, [recipe, {}, {}]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(matchTransmuteRecipes, undefined, [grid, { itemTags: [] }]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(matchTransmuteRecipes, undefined, [grid, null]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(matchTransmuteRecipes, undefined, [grid, { station: "" }]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(matchTransmuteRecipes, undefined, [null, {}, []]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(matchTransmuteRecipes, undefined, [grid, {}, null]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(matchTransmuteRecipes, undefined, [
        grid,
        {},
        [{ ...recipe, _tag: "NotTransmute" }],
      ]),
    ).toThrow(TypeError);

    // Two matching recipes is what puts the comparator to work.
    const rival = transmuteRecipe(
      "minecraft:diamond_from_iron_rival",
      "iron_block",
      "diamond",
      itemStack("netherite_scrap", 1),
      { materialCount: { min: 2, max: 8 }, addMaterialCountToResult: true },
    );
    expect(
      matchTransmuteRecipes(grid, {}, [rival, recipe]).map((match) =>
        match._tag === "Match" ? match.recipe.id : match._tag,
      ),
    ).toEqual([recipe.id, rival.id]);
  });

  it("resolves a genuine vanilla tag when itemTags is omitted from the match context", () => {
    const vanillaTaggedRecipe = transmuteRecipe(
      "minecraft:trim_material_transmute",
      exactly("iron_block", 1),
      tagged("#minecraft:trim_materials"),
      itemStack("netherite_scrap", 1),
    );
    const vanillaGrid = craftGrid(3, 3, [
      itemStack("iron_block", 1),
      itemStack("diamond", 1),
      undefined,
    ]);
    expect(matchesTransmuteRecipe(vanillaTaggedRecipe, vanillaGrid)).toBe(true);
  });
});
