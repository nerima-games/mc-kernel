import { describe, expect, it } from "vitest";
import { resultFailure, resultValue } from "./block-result-helpers.js";
import {
  DataPackFormat,
  DataPackPriority,
  dataPackLayer,
} from "../src/domain/world/data-pack-registry";
import { NamespacedResourceLocation } from "../src/domain/text/identifiers";
import {
  recipeDataPackLayer,
  recipeDataPackLayerFromUnknown,
  recipeDataPackPath,
  selectRecipes,
} from "../src/domain/recipe/recipe-registry";

const recipeLayerFromRaw = (options: {
  readonly pack: string;
  readonly format: number;
  readonly priority: number;
  readonly entries: ReadonlyArray<Readonly<{ readonly id: string; readonly value: unknown }>>;
}) => recipeDataPackLayer({
  pack: NamespacedResourceLocation(options.pack),
  format: DataPackFormat(options.format),
  priority: DataPackPriority(options.priority),
  entries: options.entries.map(({ id, value }) => ({ id: NamespacedResourceLocation(id), value })),
});

const genericLayerFromRaw = (options: {
  readonly pack: string;
  readonly format: number;
  readonly priority: number;
  readonly entries: ReadonlyArray<Readonly<{ readonly id: string; readonly value: unknown }>>;
}) => dataPackLayer({
  pack: NamespacedResourceLocation(options.pack),
  format: DataPackFormat(options.format),
  priority: DataPackPriority(options.priority),
  entries: options.entries.map(({ id, value }) => ({ id: NamespacedResourceLocation(id), value })),
});

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
    const base = resultValue(recipeDataPackLayer({
      pack: "example:base",
      format: 107.1,
      priority: 0,
      entries: [{ id: "example:shared", value: craftingDocument }],
    }));
    const override = resultValue(recipeDataPackLayer({
      pack: "example:override",
      format: 107.1,
      priority: 1,
      entries: [{ id: "example:shared", value: cookingDocument }],
    }));

    const selected = selectRecipes(
      [base, override],
      resultValue(DataPackFormat(107.1)),
    );
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
    const layer = resultValue(recipeDataPackLayerFromUnknown(validLayer));

    expect(layer.entries[0]?.id).toBe(
      NamespacedResourceLocation("example:json"),
    );
    expect(layer.entries[0]?.value._tag).toBe("Shapeless");
    const failure = resultFailure(recipeDataPackLayerFromUnknown({
      ...validLayer,
      entries: [
        { id: "example:json", value: { type: "minecraft:unsupported" } },
      ],
    }));
    expect(failure).toStrictEqual({
      _tag: "RecipeTypeFailure",
      name: "TypeError",
      message: "Unsupported portable recipe type: minecraft:unsupported",
    });
  });

  it("keeps the generic data-pack layer compatible with recipe layer values", () => {
    const layer = resultValue(dataPackLayer({
      pack: "example:generic",
      format: 107.1,
      priority: 0,
      entries: [{ id: "example:generic", value: craftingDocument }],
    }));

    expect(layer.entries[0]?.value).toEqual(craftingDocument);
  });
});
