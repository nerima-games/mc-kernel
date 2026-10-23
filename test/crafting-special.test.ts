import { describe, expect, it } from "vitest";
import {
  CRAFTING_SPECIAL_STATION_TAG,
  craftingBannerDuplicateRecipe,
  craftingBookCloningRecipe,
  craftingDecoratedPotRecipe,
  craftingDyeRecipe,
  craftingFireworkRocketRecipe,
  craftingFireworkStarFadeRecipe,
  craftingFireworkStarRecipe,
  craftingImbueRecipe,
  craftingMapExtendingRecipe,
  craftingShieldDecorationRecipe,
  isCraftingBannerDuplicateRecipe,
  isCraftingDyeRecipe,
  isCraftingDecoratedPotRecipe,
  isCraftingFireworkRocketRecipe,
  isCraftingFireworkStarFadeRecipe,
  isCraftingImbueRecipe,
  isCraftingMapExtendingRecipe,
  isCraftingShieldDecorationRecipe,
  isCraftingSpecialRecipe,
} from "../src/domain/recipe/crafting-special-data";
import { itemStack } from "../src/domain/item/item-stack";
import { StackCount } from "../src/domain/time/quantities";
import { ResourceLocation } from "../src/domain/text/identifiers";
import { BookGeneration } from "../src/domain/item/item-primitives";
import { RecipeGroup, RecipePriority, exactly } from "../src/domain/recipe/recipe-data";

const dyeRecipe = craftingDyeRecipe(
  ResourceLocation("minecraft:leather_dye"),
  exactly("leather"),
  exactly("redstone_dust"),
  itemStack("leather", StackCount(1)),
  { priority: RecipePriority(1) },
);

const imbueRecipe = craftingImbueRecipe(
  ResourceLocation("minecraft:arrow_imbue"),
  exactly("arrow"),
  exactly("glass_bottle"),
  itemStack("arrow", StackCount(1)),
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
        itemStack("leather", StackCount(1)),
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(craftingDyeRecipe, undefined, [
        "minecraft:bad",
        exactly("leather"),
        exactly("redstone_dust"),
        itemStack("leather", StackCount(1)),
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
          itemStack("leather", StackCount(1)),
          options,
        ]),
      ).toThrow();
    }
    expect(() =>
      Reflect.apply(craftingImbueRecipe, undefined, [
        "minecraft:bad",
        exactly("arrow"),
        exactly("glass_bottle"),
        itemStack("arrow", StackCount(1)),
        { tags: "crafting_table" },
      ]),
    ).toThrow(TypeError);
  });

  it("normalizes recipe metadata from either argument shape", () => {
    const fromId = craftingDyeRecipe(
      ResourceLocation("minecraft:described_dye"),
      exactly("leather"),
      exactly("redstone_dust"),
      itemStack("leather", StackCount(1)),
      {
        category: "misc",
        group: RecipeGroup("dyeing"),
        priority: RecipePriority(3),
        showNotification: false,
      },
    );
    const fromOptions = craftingDyeRecipe(
      {
        id: ResourceLocation("minecraft:described_dye"),
        category: "misc",
        group: RecipeGroup("dyeing"),
        priority: RecipePriority(3),
        showNotification: false,
      },
      exactly("leather"),
      exactly("redstone_dust"),
      itemStack("leather", StackCount(1)),
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
        group: RecipeGroup("imbuing"),
      },
      exactly("arrow"),
      exactly("glass_bottle"),
      itemStack("arrow", StackCount(1)),
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
        itemStack("written_book", StackCount(1)),
      ).allowedGenerations,
    ).toEqual([0, 1]);
    expect(
      craftingBookCloningRecipe(
        ResourceLocation("minecraft:max_generations"),
        exactly("written_book"),
        exactly("paper"),
        itemStack("written_book", StackCount(1)),
        [BookGeneration(2), BookGeneration(2)],
      ).allowedGenerations,
    ).toEqual([2, 2]);
    for (const generations of [
      [0],
      [0.5, 1],
      [0, 1.5],
      [-1, 1],
      [3, 3],
      [0, 4],
      [2, 1],
    ]) {
      expect(() =>
        Reflect.apply(craftingBookCloningRecipe, undefined, [
          ResourceLocation("minecraft:bad_generations"),
          exactly("written_book"),
          exactly("paper"),
          itemStack("written_book", StackCount(1)),
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
        itemStack("firework_star", StackCount(1)),
      ]),
    ).toThrow(TypeError);
  });

  it("rejects recipe records whose shape fields are the wrong kind", () => {
    const cloning = craftingBookCloningRecipe(
      ResourceLocation("minecraft:guarded_cloning"),
      exactly("written_book"),
      exactly("paper"),
      itemStack("written_book", StackCount(1)),
      [BookGeneration(0), BookGeneration(1)],
    );
    expect(isCraftingSpecialRecipe(cloning)).toBe(true);
    for (const allowedGenerations of [
      "0,1",
      [0],
      [0, 1, 2],
      ["0", 1],
      [0, "1"],
      [-1, 1],
      [0, 4],
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
      itemStack("firework_star", StackCount(1)),
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

  it("guards retained specialized recipe records", () => {
    const bannerDuplicate = craftingBannerDuplicateRecipe(
      ResourceLocation("minecraft:banner_duplicate"),
      exactly("white_banner"),
      itemStack("white_banner", StackCount(1)),
    );
    const decoratedPot = craftingDecoratedPotRecipe(
      ResourceLocation("minecraft:decorated_pot"),
      exactly("brick"),
      exactly("brick"),
      exactly("brick"),
      exactly("brick"),
      itemStack("decorated_pot", StackCount(1)),
    );
    const fireworkRocket = craftingFireworkRocketRecipe(
      ResourceLocation("minecraft:firework_rocket"),
      exactly("paper"),
      exactly("gunpowder"),
      exactly("firework_star"),
      itemStack("firework_rocket", StackCount(1)),
    );
    const fireworkStarFade = craftingFireworkStarFadeRecipe(
      ResourceLocation("minecraft:firework_star_fade"),
      exactly("firework_star"),
      exactly("red_dye"),
      itemStack("firework_star", StackCount(1)),
    );
    const mapExtending = craftingMapExtendingRecipe(
      ResourceLocation("minecraft:map_extending"),
      exactly("filled_map"),
      exactly("paper"),
      itemStack("filled_map", StackCount(1)),
    );
    const shieldDecoration = craftingShieldDecorationRecipe(
      ResourceLocation("minecraft:shield_decoration"),
      exactly("white_banner"),
      exactly("shield"),
      itemStack("shield", StackCount(1)),
    );

    expect(isCraftingBannerDuplicateRecipe(bannerDuplicate)).toBe(true);
    expect(isCraftingDecoratedPotRecipe(decoratedPot)).toBe(true);
    expect(isCraftingFireworkRocketRecipe(fireworkRocket)).toBe(true);
    expect(isCraftingFireworkStarFadeRecipe(fireworkStarFade)).toBe(true);
    expect(isCraftingMapExtendingRecipe(mapExtending)).toBe(true);
    expect(isCraftingShieldDecorationRecipe(shieldDecoration)).toBe(true);
    for (const recipe of [
      bannerDuplicate,
      decoratedPot,
      fireworkRocket,
      fireworkStarFade,
      mapExtending,
      shieldDecoration,
    ]) {
      expect(isCraftingSpecialRecipe(recipe)).toBe(true);
    }
  });
});
