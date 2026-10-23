import { describe, expect, it } from "vitest";
import {
  CRAFTING_SPECIAL_STATION_TAG,
  craftingBookCloningRecipe,
  craftingDyeRecipe,
  craftingFireworkStarRecipe,
  craftingImbueRecipe,
  isCraftingDyeRecipe,
  isCraftingImbueRecipe,
  isCraftingSpecialRecipe,
} from "../src/domain/recipe/crafting-special-data";
import { itemStack } from "../src/domain/item/item-stack";
import { ResourceLocation } from "../src/domain/text/identifiers";
import { exactly } from "../src/domain/recipe/recipe-data";

const dyeRecipe = craftingDyeRecipe(
  ResourceLocation("minecraft:leather_dye"),
  exactly("leather"),
  exactly("redstone_dust"),
  itemStack("leather", 1),
  { priority: 1 },
);

const imbueRecipe = craftingImbueRecipe(
  ResourceLocation("minecraft:arrow_imbue"),
  exactly("arrow"),
  exactly("glass_bottle"),
  itemStack("arrow", 1),
);

describe("crafting special recipe data", () => {
  it("validates special recipe constructors and guards", () => {
    expect(CRAFTING_SPECIAL_STATION_TAG).toBe("crafting_table");
    expect(isCraftingDyeRecipe(dyeRecipe)).toBe(true);
    expect(isCraftingImbueRecipe(imbueRecipe)).toBe(true);
    expect(isCraftingSpecialRecipe(dyeRecipe)).toBe(true);
    expect(isCraftingSpecialRecipe(imbueRecipe)).toBe(true);
    expect(isCraftingSpecialRecipe({})).toBe(false);
    expect(isCraftingDyeRecipe(null)).toBe(false);
    expect(isCraftingImbueRecipe(null)).toBe(false);

    const invalidDyeValues: ReadonlyArray<unknown> = [
      { ...dyeRecipe, _tag: "Invalid" },
      { ...dyeRecipe, id: "" },
      { ...dyeRecipe, target: null },
      { ...dyeRecipe, dye: null },
      { ...dyeRecipe, output: null },
      { ...dyeRecipe, category: "invalid" },
      { ...dyeRecipe, group: 1 },
      { ...dyeRecipe, priority: -1 },
      { ...dyeRecipe, showNotification: 1 },
      { ...dyeRecipe, tags: null },
      { ...dyeRecipe, tags: [""] },
    ];
    for (const value of invalidDyeValues) {
      expect(isCraftingDyeRecipe(value)).toBe(false);
      expect(isCraftingSpecialRecipe(value)).toBe(false);
    }

    const invalidImbueValues: ReadonlyArray<unknown> = [
      { ...imbueRecipe, _tag: "Invalid" },
      { ...imbueRecipe, id: "" },
      { ...imbueRecipe, source: null },
      { ...imbueRecipe, material: null },
      { ...imbueRecipe, output: null },
      { ...imbueRecipe, category: "invalid" },
      { ...imbueRecipe, group: 1 },
      { ...imbueRecipe, priority: -1 },
      { ...imbueRecipe, showNotification: 1 },
      { ...imbueRecipe, tags: null },
      { ...imbueRecipe, tags: [""] },
    ];
    for (const value of invalidImbueValues) {
      expect(isCraftingImbueRecipe(value)).toBe(false);
      expect(isCraftingSpecialRecipe(value)).toBe(false);
    }

    expect(() =>
      Reflect.apply(craftingDyeRecipe, undefined, [
        "",
        exactly("leather"),
        exactly("redstone_dust"),
        itemStack("leather", 1),
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(craftingDyeRecipe, undefined, [
        "minecraft:bad",
        exactly("leather"),
        exactly("redstone_dust"),
        itemStack("leather", 1),
        null,
      ]),
    ).toThrow(TypeError);
    for (const options of [
      { category: "invalid" },
      { group: 1 },
      { priority: -1 },
      { showNotification: 1 },
      { tags: null },
      { tags: [""] },
    ]) {
      expect(() =>
        Reflect.apply(craftingDyeRecipe, undefined, [
          "minecraft:bad",
          exactly("leather"),
          exactly("redstone_dust"),
          itemStack("leather", 1),
          options,
        ]),
      ).toThrow();
    }
    expect(() =>
      Reflect.apply(craftingImbueRecipe, undefined, [
        "minecraft:bad",
        exactly("arrow"),
        exactly("glass_bottle"),
        itemStack("arrow", 1),
        { tags: "crafting_table" },
      ]),
    ).toThrow(TypeError);
  });

  it("normalizes recipe metadata from either argument shape", () => {
    const fromId = craftingDyeRecipe(
      ResourceLocation("minecraft:described_dye"),
      exactly("leather"),
      exactly("redstone_dust"),
      itemStack("leather", 1),
      {
        category: "misc",
        group: "dyeing",
        priority: 3,
        showNotification: false,
      },
    );
    const fromOptions = craftingDyeRecipe(
      {
        id: ResourceLocation("minecraft:described_dye"),
        category: "misc",
        group: "dyeing",
        priority: 3,
        showNotification: false,
      },
      exactly("leather"),
      exactly("redstone_dust"),
      itemStack("leather", 1),
    );
    expect(fromOptions).toEqual(fromId);
    expect(fromId).toMatchObject({
      category: "misc",
      group: "dyeing",
      priority: 3,
      showNotification: false,
    });

    const imbueFromOptions = craftingImbueRecipe(
      {
        id: ResourceLocation("minecraft:described_imbue"),
        group: "imbuing",
      },
      exactly("arrow"),
      exactly("glass_bottle"),
      itemStack("arrow", 1),
    );
    expect(imbueFromOptions.group).toBe("imbuing");

    expect(() =>
      Reflect.apply(craftingDyeRecipe, undefined, [
        ResourceLocation("minecraft:bad"),
        exactly("leather"),
        exactly("redstone_dust"),
        {},
      ]),
    ).toThrow(TypeError);

    expect(
      craftingBookCloningRecipe(
        ResourceLocation("minecraft:default_generations"),
        exactly("written_book"),
        exactly("paper"),
        itemStack("written_book", 1),
      ).allowedGenerations,
    ).toEqual([0, 1]);
    for (const generations of [
      [0],
      [0.5, 1],
      [0, 1.5],
      [-1, 1],
      [3, 3],
      [0, 3],
      [2, 1],
    ]) {
      expect(() =>
        Reflect.apply(craftingBookCloningRecipe, undefined, [
          ResourceLocation("minecraft:bad_generations"),
          exactly("written_book"),
          exactly("paper"),
          itemStack("written_book", 1),
          generations,
        ]),
      ).toThrow(RangeError);
    }

    expect(() =>
      Reflect.apply(craftingFireworkStarRecipe, undefined, [
        ResourceLocation("minecraft:bad_shape"),
        exactly("diamond"),
        exactly("glowstone_dust"),
        exactly("gunpowder"),
        exactly("red_dye"),
        { spiral: exactly("fire_charge") },
        itemStack("firework_star", 1),
      ]),
    ).toThrow(TypeError);
  });

  it("rejects recipe records whose shape fields are the wrong kind", () => {
    const cloning = craftingBookCloningRecipe(
      ResourceLocation("minecraft:guarded_cloning"),
      exactly("written_book"),
      exactly("paper"),
      itemStack("written_book", 1),
      [0, 1],
    );
    expect(isCraftingSpecialRecipe(cloning)).toBe(true);
    for (const allowedGenerations of [
      "0,1",
      [0],
      [0, 1, 2],
      ["0", 1],
      [0, "1"],
      [-1, 1],
      [0, 3],
      [2, 1],
    ]) {
      expect(
        isCraftingSpecialRecipe({ ...cloning, allowedGenerations }),
      ).toBe(false);
    }

    const star = craftingFireworkStarRecipe(
      ResourceLocation("minecraft:guarded_star"),
      exactly("diamond"),
      exactly("glowstone_dust"),
      exactly("gunpowder"),
      exactly("red_dye"),
      { star: exactly("fire_charge") },
      itemStack("firework_star", 1),
    );
    expect(isCraftingSpecialRecipe(star)).toBe(true);
    for (const shapes of [
      null,
      { spiral: exactly("fire_charge") },
      { star: null },
    ]) {
      expect(isCraftingSpecialRecipe({ ...star, shapes })).toBe(false);
    }
  });
});
