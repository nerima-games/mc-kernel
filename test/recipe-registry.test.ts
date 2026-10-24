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

const namespacedResourceLocation = (value: string) =>
  resultValue(NamespacedResourceLocation.result(value));

const recipeLayerFromRaw = (options: {
  readonly pack: string;
  readonly format: number;
  readonly priority: number;
  readonly entries: ReadonlyArray<Readonly<{ readonly id: string; readonly value: unknown }>>;
}) => recipeDataPackLayer({
  pack: namespacedResourceLocation(options.pack),
  format: resultValue(DataPackFormat(options.format)),
  priority: resultValue(DataPackPriority(options.priority)),
  entries: options.entries.map(({ id, value }) => ({ id: namespacedResourceLocation(id), value })),
});

const genericLayerFromRaw = (options: {
  readonly pack: string;
  readonly format: number;
  readonly priority: number;
  readonly entries: ReadonlyArray<Readonly<{ readonly id: string; readonly value: unknown }>>;
}) => dataPackLayer({
  pack: namespacedResourceLocation(options.pack),
  format: resultValue(DataPackFormat(options.format)),
  priority: resultValue(DataPackPriority(options.priority)),
  entries: options.entries.map(({ id, value }) => ({ id: namespacedResourceLocation(id), value })),
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
    const base = resultValue(recipeLayerFromRaw({
      pack: "example:base",
      format: 107.1,
      priority: 0,
      entries: [{ id: "example:shared", value: craftingDocument }],
    }));
    const override = resultValue(recipeLayerFromRaw({
      pack: "example:override",
      format: 107.1,
      priority: 1,
      entries: [{ id: "example:shared", value: cookingDocument }],
    }));

    const selected = selectRecipes(
      [base, override],
      resultValue(DataPackFormat(107.1)),
    );
    const recipe = selected.get(namespacedResourceLocation("example:shared"));

    expect(recipe?._tag).toBe("Cooking");
    expect(
      resultValue(recipeDataPackPath(namespacedResourceLocation("example:shared"))),
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
      namespacedResourceLocation("example:json"),
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

  it("returns registry failures for unreadable or invalid recipe layer inputs", () => {
    const validLayer = {
      pack: "example:json",
      format: 107.1,
      priority: 0,
      entries: [{ id: "example:json", value: craftingDocument }],
    };
    const decode = (input: unknown) => Reflect.apply(recipeDataPackLayer, undefined, [input]);
    const unreadable = new Proxy({ ...validLayer }, {
      get(target, key, receiver) {
        if (key === 'pack') throw new Error('recipe layer pack is unavailable')
        return Reflect.get(target, key, receiver)
      },
    });

    expect(resultFailure(decode(unreadable))).toMatchObject({
      _tag: "DataPackRegistryFailure",
      reason: "invalid-layer",
    });
    expect(resultFailure(decode({ ...validLayer, entries: null }))).toMatchObject({
      _tag: "DataPackRegistryFailure",
      reason: "invalid-layer",
    });
    expect(resultFailure(decode({ ...validLayer, pack: 1 }))).toMatchObject({
      _tag: "DataPackRegistryFailure",
      reason: "invalid-layer",
    });
    expect(resultFailure(decode({ ...validLayer, pack: "recipe" }))).toMatchObject({
      _tag: "DataPackRegistryFailure",
      reason: "invalid-resource-location",
    });
    expect(resultFailure(decode({ ...validLayer, format: "107.1" }))).toMatchObject({
      _tag: "DataPackRegistryFailure",
      reason: "invalid-layer",
    });
    expect(resultFailure(decode({ ...validLayer, format: -1 }))).toMatchObject({
      _tag: "DataPackRegistryFailure",
      reason: "invalid-format",
    });
    expect(resultFailure(decode({ ...validLayer, priority: "0" }))).toMatchObject({
      _tag: "DataPackRegistryFailure",
      reason: "invalid-layer",
    });
    expect(resultFailure(decode({ ...validLayer, priority: 1.5 }))).toMatchObject({
      _tag: "DataPackRegistryFailure",
      reason: "invalid-priority",
    });

    for (const entry of [
      null,
      { id: "example:json" },
      { value: craftingDocument },
      { id: 1, value: craftingDocument },
      { id: "example:json", value: craftingDocument, extra: true },
    ]) {
      expect(resultFailure(decode({ ...validLayer, entries: [entry] }))).toMatchObject({
        _tag: "DataPackRegistryFailure",
        reason: "invalid-entry",
      });
    }
    expect(resultFailure(decode({
      ...validLayer,
      entries: [{ id: "invalid", value: craftingDocument }],
    }))).toMatchObject({
      _tag: "DataPackRegistryFailure",
      reason: "invalid-resource-location",
    });
  });

  it("keeps the generic data-pack layer compatible with recipe layer values", () => {
    const layer = resultValue(genericLayerFromRaw({
      pack: "example:generic",
      format: 107.1,
      priority: 0,
      entries: [{ id: "example:generic", value: craftingDocument }],
    }));

    expect(layer.entries[0]?.value).toEqual(craftingDocument);
  });
});
