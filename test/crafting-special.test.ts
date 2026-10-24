import { Result } from "effect";
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
import { itemStack as itemStackResult } from "../src/domain/item/item-stack";
import { BookGeneration } from "../src/domain/item/item-primitives";
import { ResourceLocation } from "../src/domain/text/identifiers";
import {
  RecipeGroup,
  RecipePriority,
  exactly as exactlyResult,
} from "../src/domain/recipe/recipe-data";
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

const exactly = (...args: Parameters<typeof exactlyResult>) =>
  recipeSuccess(exactlyResult(...args));

const dyeRecipe = recipeSuccess(craftingDyeRecipe(
  ResourceLocation("minecraft:leather_dye"),
  exactly("leather"),
  exactly("redstone_dust"),
  itemStack("leather", 1),
  { priority: recipeSuccess(RecipePriority.result(1)) },
));

const imbueRecipe = recipeSuccess(craftingImbueRecipe(
  ResourceLocation("minecraft:arrow_imbue"),
  exactly("arrow"),
  exactly("glass_bottle"),
  itemStack("arrow", 1),
));

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

    recipeFailure(
      Reflect.apply(craftingDyeRecipe, undefined, [
        "",
        exactly("leather"),
        exactly("redstone_dust"),
        itemStack("leather", StackCount(1)),
      ]),
      "RecipeTypeFailure",
    );
    expectRecipeFailure(
      Reflect.apply(craftingDyeRecipe, undefined, [
        { id: null },
        exactly("leather"),
        exactly("redstone_dust"),
        itemStack("leather", 1),
      ]),
      {
        _tag: "RecipeTypeFailure",
        name: "TypeError",
        message: "Crafting special recipe id must be a resource location",
      },
    );
    expectRecipeFailure(
      Reflect.apply(craftingDyeRecipe, undefined, [
        ResourceLocation("minecraft:bad_ingredient"),
        null,
        exactly("redstone_dust"),
        itemStack("leather", 1),
      ]),
      {
        _tag: "RecipeTypeFailure",
        name: "TypeError",
        message: "Recipe ingredient must be an item type, item tag, or ingredient object",
      },
    );
    recipeFailure(
      Reflect.apply(craftingDyeRecipe, undefined, [
        "minecraft:bad",
        exactly("leather"),
        exactly("redstone_dust"),
        itemStack("leather", StackCount(1)),
        null,
      ]),
      "RecipeTypeFailure",
    );
    for (const [options, tag] of [
      [{ category: "invalid" }, "RecipeTypeFailure"],
      [{ group: 1 }, "RecipeTypeFailure"],
      [{ priority: -1 }, "RecipeRangeFailure"],
      [{ showNotification: 1 }, "RecipeTypeFailure"],
      [{ tags: null }, "RecipeTypeFailure"],
      [{ tags: [""] }, "RecipeTypeFailure"],
    ] as const) {
      recipeFailure(
        Reflect.apply(craftingDyeRecipe, undefined, [
          "minecraft:bad",
          exactly("leather"),
          exactly("redstone_dust"),
          itemStack("leather", StackCount(1)),
          options,
        ]),
        tag,
      );
    }
    recipeFailure(
      Reflect.apply(craftingImbueRecipe, undefined, [
        "minecraft:bad",
        exactly("arrow"),
        exactly("glass_bottle"),
        itemStack("arrow", StackCount(1)),
        { tags: "crafting_table" },
      ]),
      "RecipeTypeFailure",
    );
    const invalidIdOrOptions = Reflect.apply(craftingDyeRecipe, undefined, [
      null,
      exactly("leather"),
      exactly("redstone_dust"),
      itemStack("leather", 1),
    ]);
    expect(Result.isFailure(invalidIdOrOptions)).toBe(true);
    if (Result.isFailure(invalidIdOrOptions)) {
      expect(invalidIdOrOptions.failure).toMatchObject({
        _tag: "RecipeTypeFailure",
        message: "Crafting special recipe options must be an object when provided",
      });
    }

    const invalidShapes = Reflect.apply(craftingFireworkStarRecipe, undefined, [
      "minecraft:bad_shapes",
      exactly("diamond"),
      exactly("glowstone_dust"),
      exactly("gunpowder"),
      exactly("red_dye"),
      null,
      itemStack("firework_star", 1),
    ]);
    expect(Result.isFailure(invalidShapes)).toBe(true);
    if (Result.isFailure(invalidShapes)) {
      expect(invalidShapes.failure).toMatchObject({
        _tag: "RecipeTypeFailure",
        message: "Firework star shapes must be an object",
      });
    }

    const invalidShapeIngredient = Reflect.apply(craftingFireworkStarRecipe, undefined, [
      "minecraft:bad_shape_ingredient",
      exactly("diamond"),
      exactly("glowstone_dust"),
      exactly("gunpowder"),
      exactly("red_dye"),
      { small_ball: null },
      itemStack("firework_star", 1),
    ]);
    expect(Result.isFailure(invalidShapeIngredient)).toBe(true);
    expect(invalidShapeIngredient).toMatchObject({
      failure: { _tag: "RecipeTypeFailure" },
    });
  });

  it("normalizes recipe metadata from either argument shape", () => {
    const fromId = recipeSuccess(craftingDyeRecipe(
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
    ));
    expect(isCraftingDyeRecipe(fromId)).toBe(true);
    const fromOptions = recipeSuccess(craftingDyeRecipe(
      {
        id: ResourceLocation("minecraft:described_dye"),
        category: "misc",
        group: RecipeGroup("dyeing"),
        priority: RecipePriority(3),
        showNotification: false,
      },
      exactly("leather"),
      exactly("redstone_dust"),
      itemStack("leather", 1),
    ));
    expect(fromOptions).toEqual(fromId);
    expect(fromId).toMatchObject({
      category: "misc",
      group: "dyeing",
      priority: 3,
      showNotification: false,
    });

    const imbueFromOptions = recipeSuccess(craftingImbueRecipe(
      {
        id: ResourceLocation("minecraft:described_imbue"),
        group: RecipeGroup("imbuing"),
      },
      exactly("arrow"),
      exactly("glass_bottle"),
      itemStack("arrow", 1),
    ));
    expect(imbueFromOptions.group).toBe("imbuing");

    recipeFailure(
      Reflect.apply(craftingDyeRecipe, undefined, [
        ResourceLocation("minecraft:bad"),
        exactly("leather"),
        exactly("redstone_dust"),
        {},
      ]),
      "RecipeTypeFailure",
    );

    expect(
      recipeSuccess(craftingBookCloningRecipe(
        ResourceLocation("minecraft:default_generations"),
        exactly("written_book"),
        exactly("paper"),
        itemStack("written_book", 1),
      )).allowedGenerations,
    ).toEqual([0, 1]);
    expect(
      recipeSuccess(craftingBookCloningRecipe(
        ResourceLocation("minecraft:max_generations"),
        exactly("written_book"),
        exactly("paper"),
        itemStack("written_book", StackCount(1)),
        [BookGeneration(2), BookGeneration(2)],
      )).allowedGenerations,
    ).toEqual([2, 2]);
    for (const generations of [
      "0,1",
      [0],
      [0.5, 1],
      [0, 1.5],
      [-1, 1],
      [3, 3],
      [0, 4],
      [2, 1],
    ]) {
      recipeFailure(
        Reflect.apply(craftingBookCloningRecipe, undefined, [
          ResourceLocation("minecraft:bad_generations"),
          exactly("written_book"),
          exactly("paper"),
          itemStack("written_book", StackCount(1)),
          generations,
        ]),
        "RecipeRangeFailure",
      );
    }

    recipeFailure(
      Reflect.apply(craftingFireworkStarRecipe, undefined, [
        ResourceLocation("minecraft:bad_shape"),
        exactly("diamond"),
        exactly("glowstone_dust"),
        exactly("gunpowder"),
        exactly("red_dye"),
        { spiral: exactly("fire_charge") },
        itemStack("firework_star", StackCount(1)),
      ]),
      "RecipeTypeFailure",
    );
  });

  it("rejects recipe records whose shape fields are the wrong kind", () => {
    const cloning = recipeSuccess(craftingBookCloningRecipe(
      ResourceLocation("minecraft:guarded_cloning"),
      exactly("written_book"),
      exactly("paper"),
      itemStack("written_book", 1),
      [BookGeneration(0), BookGeneration(1)],
    ));
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

    const star = recipeSuccess(craftingFireworkStarRecipe(
      ResourceLocation("minecraft:guarded_star"),
      exactly("diamond"),
      exactly("glowstone_dust"),
      exactly("gunpowder"),
      exactly("red_dye"),
      { star: exactly("fire_charge") },
      itemStack("firework_star", 1),
    ));
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
    const bannerDuplicate = recipeSuccess(craftingBannerDuplicateRecipe(
      ResourceLocation("minecraft:banner_duplicate"),
      exactly("white_banner"),
      itemStack("white_banner", 1),
    ));
    const decoratedPot = recipeSuccess(craftingDecoratedPotRecipe(
      ResourceLocation("minecraft:decorated_pot"),
      exactly("brick"),
      exactly("brick"),
      exactly("brick"),
      exactly("brick"),
      itemStack("decorated_pot", 1),
    ));
    const fireworkRocket = recipeSuccess(craftingFireworkRocketRecipe(
      ResourceLocation("minecraft:firework_rocket"),
      exactly("paper"),
      exactly("gunpowder"),
      exactly("firework_star"),
      itemStack("firework_rocket", 1),
    ));
    const fireworkStarFade = recipeSuccess(craftingFireworkStarFadeRecipe(
      ResourceLocation("minecraft:firework_star_fade"),
      exactly("firework_star"),
      exactly("red_dye"),
      itemStack("firework_star", 1),
    ));
    const mapExtending = recipeSuccess(craftingMapExtendingRecipe(
      ResourceLocation("minecraft:map_extending"),
      exactly("filled_map"),
      exactly("paper"),
      itemStack("filled_map", 1),
    ));
    const shieldDecoration = recipeSuccess(craftingShieldDecorationRecipe(
      ResourceLocation("minecraft:shield_decoration"),
      exactly("white_banner"),
      exactly("shield"),
      itemStack("shield", 1),
    ));

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
