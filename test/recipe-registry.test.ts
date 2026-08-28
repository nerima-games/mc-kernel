import { describe, expect, it } from "vitest";
import {
  DataPackFormat,
  dataPackLayer,
} from "../src/domain/data-pack-registry";
import { NamespacedResourceLocation } from "../src/domain/identifiers";
import {
  recipeDataPackLayer,
  recipeDataPackLayerFromUnknown,
  recipeDataPackPath,
  selectRecipes,
} from "../src/domain/recipe-registry";

const craftingDocument = {
  type: "minecraft:crafting_shapeless",
  ingredients: ["minecraft:stone"],
  result: "minecraft:stick",
};

const cookingDocument = {
  type: "minecraft:smelting",
  ingredient: "minecraft:stone",
  result: "minecraft:iron_ingot",
  experience: 0,
  cookingtime: 1,
};

describe("recipe registry", () => {
  it("decodes layers and applies exact-format priority overrides", () => {
    const base = recipeDataPackLayer({
      pack: "example:base",
      format: 107.1,
      priority: 0,
      entries: [{ id: "example:shared", value: craftingDocument }],
    });
    const override = recipeDataPackLayer({
      pack: "example:override",
      format: 107.1,
      priority: 1,
      entries: [{ id: "example:shared", value: cookingDocument }],
    });

    const selected = selectRecipes([base, override], DataPackFormat(107.1));
    const recipe = selected.get(NamespacedResourceLocation("example:shared"));

    expect(recipe?._tag).toBe("Cooking");
    expect(
      recipeDataPackPath(NamespacedResourceLocation("example:shared")),
    ).toBe("data/example/recipe/shared.json");
  });

  it("decodes strict unknown layers and rejects unsupported recipe values", () => {
    const validLayer = {
      pack: "example:json",
      format: 107.1,
      priority: 0,
      entries: [{ id: "example:json", value: craftingDocument }],
    };
    const layer = recipeDataPackLayerFromUnknown(validLayer);

    expect(layer.entries[0]?.id).toBe(
      NamespacedResourceLocation("example:json"),
    );
    expect(layer.entries[0]?.value._tag).toBe("Shapeless");
    expect(() =>
      recipeDataPackLayerFromUnknown({
        ...validLayer,
        entries: [
          { id: "example:json", value: { type: "minecraft:unsupported" } },
        ],
      }),
    ).toThrow();
  });

  it("keeps the generic data-pack layer compatible with recipe layer values", () => {
    const layer = dataPackLayer({
      pack: "example:generic",
      format: 107.1,
      priority: 0,
      entries: [{ id: "example:generic", value: craftingDocument }],
    });

    expect(layer.entries[0]?.value).toEqual(craftingDocument);
  });
});
