import { describe, expect, it } from "vitest";

import { isAnyOfIngredient } from "../src/domain/recipe-data";
import {
  cookingRecipeFromUnknown,
  craftingBannerDuplicateRecipeFromUnknown,
  craftingBookCloningRecipeFromUnknown,
  craftingDecoratedPotRecipeFromUnknown,
  craftingDyeRecipeFromUnknown,
  craftingFireworkRocketRecipeFromUnknown,
  craftingFireworkStarFadeRecipeFromUnknown,
  craftingFireworkStarRecipeFromUnknown,
  craftingImbueRecipeFromUnknown,
  craftingMapExtendingRecipeFromUnknown,
  craftingRecipeDataPath,
  craftingRecipeFromUnknown,
  craftingShieldDecorationRecipeFromUnknown,
  portableRecipeFromUnknown,
  recipeDataPath,
  smithingRecipeFromUnknown,
  smithingTransformRecipeFromUnknown,
  smithingTrimRecipeFromUnknown,
  stonecuttingRecipeFromUnknown,
  transmuteRecipeFromUnknown,
} from "../src/domain/recipe-json";

const expectInvalidRecipe = (id: string, value: unknown): void => {
  expect(() => craftingRecipeFromUnknown(id, value)).toThrow();
};

describe("current Java crafting recipe JSON", () => {
  it("decodes shaped recipes with component patches and alternatives", () => {
    const recipe = craftingRecipeFromUnknown("minecraft:iron_block", {
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
          "minecraft:custom_name": "Block",
          "!minecraft:damage": null,
        },
      },
    });

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
    expect(recipe.output).toEqual({
      item: "iron_block",
      count: 1,
      componentPatch: {
        "minecraft:custom_name": "Block",
        "!minecraft:damage": null,
      },
    });
    expect(isAnyOfIngredient(recipe.pattern.cells[0])).toBe(true);
  });

  it("decodes shapeless recipes with item tags and short results", () => {
    const recipe = craftingRecipeFromUnknown("example:stick", {
      type: "minecraft:crafting_shapeless",
      category: "misc",
      ingredients: [
        "minecraft:iron_ingot",
        "#minecraft:planks",
        ["minecraft:gold_ingot", "minecraft:iron_ingot"],
      ],
      result: "minecraft:stick",
    });

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
    expect(recipe.output).toEqual({ item: "stick", count: 1 });
  });

  it("maps namespaced recipe ids to data-pack paths", () => {
    expect(craftingRecipeDataPath("minecraft:iron_block")).toBe(
      "data/minecraft/recipe/iron_block.json",
    );
    expect(craftingRecipeDataPath("example:recipes/one")).toBe(
      "data/example/recipe/recipes/one.json",
    );
  });

  it("rejects stale, malformed, and unsupported recipe documents", () => {
    expectInvalidRecipe("iron_block", {});
    expectInvalidRecipe("minecraft:iron_block", null);
    expectInvalidRecipe("minecraft:iron_block", {});
    expectInvalidRecipe("minecraft:iron_block", { type: 1 });
    expectInvalidRecipe("minecraft:iron_block", { type: "minecraft:smelting" });

    const shaped = {
      type: "minecraft:crafting_shaped",
      pattern: ["S"],
      key: { S: "minecraft:stone" },
      result: "minecraft:stick",
    };
    expectInvalidRecipe("minecraft:bad", { ...shaped, extra: true });
    expectInvalidRecipe("minecraft:bad", { ...shaped, pattern: 1 });
    expectInvalidRecipe("minecraft:bad", { ...shaped, pattern: [1] });
    expectInvalidRecipe("minecraft:bad", { ...shaped, key: [] });
    expectInvalidRecipe("minecraft:bad", { ...shaped, key: { S: [] } });
    expectInvalidRecipe("minecraft:bad", {
      ...shaped,
      key: { S: ["#minecraft:planks"] },
    });
    expectInvalidRecipe("minecraft:bad", {
      ...shaped,
      key: { S: { item: "minecraft:stone" } },
    });
    expectInvalidRecipe("minecraft:bad", {
      ...shaped,
      key: { S: "minecraft:air" },
    });
    expectInvalidRecipe("minecraft:bad", {
      ...shaped,
      key: { S: "stone" },
    });
    expectInvalidRecipe("minecraft:bad", {
      ...shaped,
      key: { S: "example:stone" },
    });
    expectInvalidRecipe("minecraft:bad", {
      ...shaped,
      key: { S: "#planks" },
    });
    expectInvalidRecipe("minecraft:bad", { ...shaped, result: null });
    expectInvalidRecipe("minecraft:bad", { ...shaped, result: 1 });
    expectInvalidRecipe("minecraft:bad", {
      ...shaped,
      result: { id: "minecraft:stick", extra: true },
    });
    expectInvalidRecipe("minecraft:bad", {
      ...shaped,
      result: { count: 1 },
    });
    expectInvalidRecipe("minecraft:bad", {
      ...shaped,
      result: { id: "minecraft:stick", count: "1" },
    });
    expectInvalidRecipe("minecraft:bad", {
      ...shaped,
      result: { id: "minecraft:stick", count: 0 },
    });
    expectInvalidRecipe("minecraft:bad", {
      ...shaped,
      result: { id: "minecraft:custom_item" },
    });
    expectInvalidRecipe("minecraft:bad", {
      ...shaped,
      result: { id: "minecraft:stick", components: undefined },
    });
    expectInvalidRecipe("minecraft:bad", {
      ...shaped,
      result: {
        id: "minecraft:stick",
        components: { custom_name: "invalid" },
      },
    });
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
    expectInvalidRecipe("minecraft:bad", { ...shapeless, extra: true });
    expectInvalidRecipe("minecraft:bad", { ...shapeless, ingredients: 1 });
    expectInvalidRecipe("minecraft:bad", { ...shapeless, ingredients: [] });
    expectInvalidRecipe("minecraft:bad", {
      ...shapeless,
      ingredients: ["#minecraft:planks", "minecraft:air"],
    });
    expectInvalidRecipe("minecraft:bad", {
      ...shapeless,
      ingredients: [["#minecraft:planks"]],
    });
    expectInvalidRecipe("minecraft:bad", {
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
      const recipe = cookingRecipeFromUnknown(`minecraft:${station}`, {
        type,
        category: "misc",
        group: "ores",
        show_notification: false,
        ingredient: "minecraft:iron_ore",
        result: { id: "minecraft:iron_ingot", count: 2 },
        experience: 0.7,
        cookingtime: 200,
      });
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
    const recipe = transmuteRecipeFromUnknown("minecraft:transmute", {
      type: "minecraft:crafting_transmute",
      category: "equipment",
      group: "transmute",
      show_notification: true,
      source: "minecraft:stone",
      material: "#minecraft:planks",
      result: { id: "minecraft:stick", count: 2 },
      material_count: { min: 2, max: 4 },
      add_material_count_to_result: true,
    });

    expect(recipe).toMatchObject({
      _tag: "Transmute",
      source: { _tag: "Exact", item: "stone", count: 1 },
      material: { _tag: "ItemTag", tag: "#minecraft:planks", count: 1 },
      output: { item: "stick", count: 2 },
      materialCount: { min: 2, max: 4 },
      addMaterialCountToResult: true,
    });
    expect(
      portableRecipeFromUnknown("minecraft:transmute", {
        type: "minecraft:crafting_transmute",
        source: "minecraft:stone",
        material: "minecraft:stick",
        result: "minecraft:torch",
      }),
    ).toMatchObject({ _tag: "Transmute", output: { count: 1 } });
  });

  it("decodes stonecutting documents with component-bearing results", () => {
    const recipe = stonecuttingRecipeFromUnknown(
      "minecraft:stone_slab_from_stone",
      {
        type: "minecraft:stonecutting",
        ingredient: "minecraft:stone",
        result: {
          id: "minecraft:stone_slab",
          count: 2,
          components: { "minecraft:custom_name": "Slab" },
        },
        show_notification: false,
      },
    );

    expect(recipe).toMatchObject({
      _tag: "Stonecutting",
      id: "minecraft:stone_slab_from_stone",
      ingredient: { _tag: "Exact", item: "stone", count: 1 },
      output: {
        item: "stone_slab",
        count: 2,
        componentPatch: { "minecraft:custom_name": "Slab" },
      },
      showNotification: false,
    });
    expect(
      portableRecipeFromUnknown("minecraft:stone_slab_from_stone", {
        type: "minecraft:stonecutting",
        ingredient: "#minecraft:stone_ore_replaceables",
        result: "minecraft:stone_slab",
      }),
    ).toMatchObject({
      _tag: "Stonecutting",
      ingredient: {
        _tag: "ItemTag",
        tag: "#minecraft:stone_ore_replaceables",
      },
    });
  });

  it("decodes smithing transform and trim documents", () => {
    const transform = smithingTransformRecipeFromUnknown(
      "minecraft:netherite_sword",
      {
        type: "minecraft:smithing_transform",
        template: "minecraft:netherite_upgrade_smithing_template",
        base: "minecraft:diamond_sword",
        addition: "minecraft:netherite_ingot",
        result: "minecraft:netherite_sword",
        show_notification: false,
      },
    );
    expect(transform).toMatchObject({
      _tag: "SmithingTransform",
      output: { item: "netherite_sword", count: 1 },
      tags: ["smithing_table"],
      showNotification: false,
    });

    const trim = smithingTrimRecipeFromUnknown("minecraft:coast_armor_trim", {
      type: "minecraft:smithing_trim",
      template: "#minecraft:trim_templates",
      base: "#minecraft:trimmable_armor",
      addition: "#minecraft:trim_materials",
    });
    expect(trim).toMatchObject({
      _tag: "SmithingTrim",
      template: { _tag: "ItemTag", tag: "#minecraft:trim_templates" },
      base: { _tag: "ItemTag", tag: "#minecraft:trimmable_armor" },
      addition: { _tag: "ItemTag", tag: "#minecraft:trim_materials" },
      tags: ["smithing_table"],
    });
    expect(
      smithingRecipeFromUnknown("minecraft:coast_armor_trim", {
        type: "minecraft:smithing_trim",
        template: "#minecraft:trim_templates",
        base: "#minecraft:trimmable_armor",
        addition: "#minecraft:trim_materials",
      }),
    ).toMatchObject({ _tag: "SmithingTrim" });
    expect(
      portableRecipeFromUnknown("minecraft:netherite_sword", {
        type: "minecraft:smithing_transform",
        template: "minecraft:netherite_upgrade_smithing_template",
        base: "minecraft:diamond_sword",
        addition: "minecraft:netherite_ingot",
        result: "minecraft:netherite_sword",
      }),
    ).toMatchObject({ _tag: "SmithingTransform" });
  });

  it("maps generic recipe paths and rejects unsupported portable documents", () => {
    expect(recipeDataPath("minecraft:iron_block")).toBe(
      "data/minecraft/recipe/iron_block.json",
    );
    expect(() =>
      cookingRecipeFromUnknown("minecraft:bad", {
        type: "minecraft:unknown_cooking",
        ingredient: "minecraft:stone",
        result: "minecraft:stick",
        experience: 0,
        cookingtime: 1,
      }),
    ).toThrow();
    expect(() =>
      cookingRecipeFromUnknown("minecraft:bad", {
        type: "minecraft:smelting",
        ingredient: "minecraft:stone",
        result: "minecraft:stick",
        experience: "0",
        cookingtime: 1,
      }),
    ).toThrow();
    expect(() =>
      cookingRecipeFromUnknown("minecraft:bad", {
        type: "minecraft:smelting",
        ingredient: "minecraft:stone",
        result: "minecraft:stick",
        experience: 0,
        cookingtime: "1",
      }),
    ).toThrow();
    expect(() =>
      transmuteRecipeFromUnknown("minecraft:bad", {
        type: "minecraft:crafting_transmute",
        source: "minecraft:stone",
        material: "minecraft:stick",
        result: "minecraft:torch",
        material_count: { min: 2, max: 4, extra: true },
      }),
    ).toThrow();
    expect(() =>
      transmuteRecipeFromUnknown("minecraft:bad", {
        type: "minecraft:crafting_transmute",
        source: "minecraft:stone",
        material: "minecraft:stick",
        result: "minecraft:torch",
        material_count: { min: "2", max: 4 },
      }),
    ).toThrow();
    expect(() =>
      transmuteRecipeFromUnknown("minecraft:bad", {
        type: "minecraft:crafting_transmute",
        source: "minecraft:stone",
        material: "minecraft:stick",
        result: "minecraft:torch",
        material_count: { min: 1, max: 2 },
      }),
    ).toThrow();
    expect(() =>
      transmuteRecipeFromUnknown("minecraft:bad", {
        type: "minecraft:crafting_transmute",
        source: "minecraft:stone",
        material: "minecraft:stick",
        result: "minecraft:torch",
        add_material_count_to_result: "yes",
      }),
    ).toThrow();
    expect(() =>
      portableRecipeFromUnknown("minecraft:bad", {
        type: "minecraft:unsupported",
      }),
    ).toThrow();
    expect(() =>
      stonecuttingRecipeFromUnknown("minecraft:bad", {
        type: "minecraft:stonecutting",
        ingredient: "minecraft:stone",
        result: "minecraft:stick",
        group: "removed",
      }),
    ).toThrow();
    expect(() =>
      stonecuttingRecipeFromUnknown("minecraft:bad", {
        type: "minecraft:smelting",
        ingredient: "minecraft:stone",
        result: "minecraft:stick",
      }),
    ).toThrow();
    expect(() =>
      smithingTransformRecipeFromUnknown("minecraft:bad", {
        type: "minecraft:smithing_transform",
        template: "minecraft:stone",
        base: "minecraft:diamond_sword",
        addition: "minecraft:netherite_ingot",
      }),
    ).toThrow();
    expect(() =>
      smithingTrimRecipeFromUnknown("minecraft:bad", {
        type: "minecraft:smithing_trim",
        template: "minecraft:stone",
        base: "minecraft:diamond_sword",
        addition: "minecraft:netherite_ingot",
        result: "minecraft:diamond_sword",
      }),
    ).toThrow();
    expect(() =>
      smithingRecipeFromUnknown("minecraft:bad", {
        type: "minecraft:crafting_shaped",
      }),
    ).toThrow();
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
      expect(decode("minecraft:test", document)).toMatchObject({ _tag: tag });
      expect(
        decode("minecraft:test", { ...document, show_notification: false }),
      ).toMatchObject({ _tag: tag, showNotification: false });
      expect(portableRecipeFromUnknown("minecraft:test", document)).toMatchObject(
        { _tag: tag },
      );

      expect(() => decode("minecraft:test", null)).toThrow(TypeError);
      expect(() =>
        decode("minecraft:test", { ...document, type: "minecraft:nonsense" }),
      ).toThrow(TypeError);
      expect(() =>
        decode("minecraft:test", { ...document, unexpected: true }),
      ).toThrow(TypeError);
      const withoutRequired = Object.fromEntries(
        Object.entries(document).filter(([key]) => key !== required),
      );
      expect(() => decode("minecraft:test", withoutRequired)).toThrow(TypeError);
      expect(() => decode("not-namespaced", document)).toThrow(TypeError);
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
      craftingDyeRecipeFromUnknown("minecraft:test", withOptions),
    ).toMatchObject({
      category: "equipment",
      group: "leather_dyeing",
      showNotification: false,
    });
    expect(
      craftingImbueRecipeFromUnknown("minecraft:test", {
        type: "minecraft:crafting_imbue",
        category: "misc",
        group: "imbuing",
        show_notification: true,
        source: "minecraft:arrow",
        material: "minecraft:glass_bottle",
        result: "minecraft:arrow",
      }),
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
      expect(() => decode("minecraft:test", null)).toThrow(TypeError);
      expect(() => decode("minecraft:test", { type: 1 })).toThrow(TypeError);
    }
    expect(() =>
      smithingTransformRecipeFromUnknown("minecraft:test", null),
    ).toThrow(TypeError);
    expect(() => smithingTrimRecipeFromUnknown("minecraft:test", null)).toThrow(
      TypeError,
    );

    // A well-formed envelope with the wrong contents fails on the key check,
    // which is a separate rejection from the type check above.
    expect(() =>
      cookingRecipeFromUnknown("minecraft:test", {
        type: "minecraft:smelting",
        ingredient: "minecraft:iron_ore",
        result: "minecraft:iron_ingot",
      }),
    ).toThrow(TypeError);
    expect(() =>
      transmuteRecipeFromUnknown("minecraft:test", {
        type: "minecraft:crafting_transmute",
        source: "minecraft:iron_block",
      }),
    ).toThrow(TypeError);
    expect(() =>
      transmuteRecipeFromUnknown("minecraft:test", {
        type: "minecraft:crafting_shaped",
      }),
    ).toThrow(TypeError);
  });

  it("reads the ranges the book cloning and star documents carry", () => {
    expect(
      craftingBookCloningRecipeFromUnknown("minecraft:test", {
        type: "minecraft:crafting_special_bookcloning",
        source: "minecraft:written_book",
        material: "minecraft:paper",
        allowed_generations: { min: 0, max: 2 },
        result: "minecraft:written_book",
      }).allowedGenerations,
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
      expect(() =>
        craftingBookCloningRecipeFromUnknown("minecraft:test", {
          type: "minecraft:crafting_special_bookcloning",
          source: "minecraft:written_book",
          material: "minecraft:paper",
          allowed_generations,
          result: "minecraft:written_book",
        }),
      ).toThrow();
    }

    for (const shapes of [null, { spiral: "minecraft:fire_charge" }]) {
      expect(() =>
        craftingFireworkStarRecipeFromUnknown("minecraft:test", {
          type: "minecraft:crafting_special_firework_star",
          trail: "minecraft:diamond",
          twinkle: "minecraft:glowstone_dust",
          fuel: "minecraft:gunpowder",
          dye: "minecraft:red_dye",
          shapes,
          result: "minecraft:firework_star",
        }),
      ).toThrow(TypeError);
    }
  });
});
