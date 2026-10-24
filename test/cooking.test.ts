import { Result } from "effect";
import { describe, expect, it, vi } from "vitest";

import { itemStack as itemStackResult } from "../src/domain/item/item-stack";
import {
  RecipeExperience,
  RecipeGroup,
  RecipeId,
  RecipePriority,
  exactly,
} from "../src/domain/recipe/recipe-data";
import { PositiveTickCount, StackCount } from "../src/domain/time/quantities";
import {
  COOKING_STATIONS,
  cookingRecipe,
  cookingRecipeForItem,
  isCookingRecipe,
} from "../src/domain/recipe/cooking-data";
import type { RecipeFailure } from "../src/domain/recipe/recipe-error";

const success = <A, E>(result: Result.Result<A, E>): A => {
  expect(Result.isSuccess(result)).toBe(true);
  if (Result.isSuccess(result)) return result.success;
  throw new Error(`Expected recipe success, received ${JSON.stringify(result.failure)}`);
};

const itemStack = (item: Parameters<typeof itemStackResult>[0], count: number) =>
  success(itemStackResult(item, StackCount(count)));

const expectFailure = (
  result: Result.Result<unknown, RecipeFailure>,
  expected: RecipeFailure,
): void => {
  expect(Result.isFailure(result)).toBe(true);
  if (Result.isFailure(result)) expect(result.failure).toEqual(expected);
};

const typeFailure = (message: string): RecipeFailure => ({
  _tag: "RecipeTypeFailure",
  name: "TypeError",
  message,
});
const rangeFailure = (message: string): RecipeFailure => ({
  _tag: "RecipeRangeFailure",
  name: "RangeError",
  message,
});

describe("cooking recipe data", () => {
  it("normalizes an ingredient snapshot without a guard reread", () => {
    let countReads = 0;
    const ingredient = new Proxy(
      { _tag: "Exact", item: "raw_iron", count: 1 },
      {
        get(target, property, receiver) {
          if (property === "count") {
            countReads += 1;
            return countReads === 1 ? 1 : 0;
          }
          return Reflect.get(target, property, receiver);
        },
      },
    );
    const result = Reflect.apply(cookingRecipe, undefined, [
      RecipeId("minecraft:snapshot_ingredient"),
      "furnace",
      ingredient,
      itemStack("iron_ingot", 1),
      PositiveTickCount(200),
      RecipeExperience(0.7),
    ]);
    expect(Result.isSuccess(result)).toBe(true);
    expect(countReads).toBe(1);
  });

  it("returns an options inspection failure when a getter throws", () => {
    const options = new Proxy({}, {
      get(_target, property) {
        if (property === "priority") throw new Error("hostile getter");
        return undefined;
      },
    });
    const result = Reflect.apply(cookingRecipe, undefined, [
      RecipeId("minecraft:unreadable_options"),
      "furnace",
      "raw_iron",
      itemStack("iron_ingot", 1),
      PositiveTickCount(200),
      RecipeExperience(0.7),
      options,
    ]);
    expectFailure(
      result,
      typeFailure("Cooking recipe options must be an object"),
    );
  });

  it("returns failures for non-string fields and revoked option proxies", () => {
    const output = itemStack("iron_ingot", 1);
    expectFailure(
      Reflect.apply(cookingRecipe, undefined, [
        RecipeId("minecraft:bad_station"),
        3,
        "raw_iron",
        output,
        PositiveTickCount(200),
        RecipeExperience(0.7),
      ]),
      typeFailure("Unknown cooking station"),
    );
    expectFailure(
      Reflect.apply(cookingRecipe, undefined, [
        RecipeId("minecraft:bad_category"),
        "furnace",
        "raw_iron",
        output,
        PositiveTickCount(200),
        RecipeExperience(0.7),
        { category: 3 },
      ]),
      typeFailure("Cooking recipe category is invalid"),
    );
    expectFailure(
      Reflect.apply(cookingRecipe, undefined, [
        RecipeId("minecraft:bad_priority"),
        "furnace",
        "raw_iron",
        output,
        PositiveTickCount(200),
        RecipeExperience(0.7),
        { priority: "high" },
      ]),
      rangeFailure(
        "Cooking recipe priority must be a non-negative safe integer, received high",
      ),
    );
    expectFailure(
      Reflect.apply(cookingRecipe, undefined, [
        RecipeId("minecraft:object_priority"),
        "furnace",
        "raw_iron",
        output,
        PositiveTickCount(200),
        RecipeExperience(0.7),
        { priority: {} },
      ]),
      rangeFailure("Cooking recipe priority must be a non-negative safe integer"),
    );

    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    expectFailure(
      Reflect.apply(cookingRecipe, undefined, [
        RecipeId("minecraft:revoked_options"),
        "furnace",
        "raw_iron",
        output,
        PositiveTickCount(200),
        RecipeExperience(0.7),
        revoked.proxy,
      ]),
      typeFailure("Cooking recipe options must be an object"),
    );
  });

  it("maps a group brand validation failure to a recipe failure", () => {
    const brandResult = RecipePriority.result(-1);
    if (Result.isSuccess(brandResult)) throw new Error("expected an invalid recipe priority");
    const resultSpy = vi
      .spyOn(RecipeGroup, "result")
      .mockReturnValue(Result.fail(brandResult.failure));
    try {
      expectFailure(
        cookingRecipe(
          RecipeId("minecraft:bad_group"),
          "furnace",
          "raw_iron",
          itemStack("iron_ingot", 1),
          PositiveTickCount(200),
          RecipeExperience(0.7),
          { group: RecipeGroup("ores") },
        ),
        typeFailure("Cooking recipe group must be a string"),
      );
    } finally {
      resultSpy.mockRestore();
    }
  });

  it("constructs cooking recipes for each station and normalizes metadata", () => {
    expect(COOKING_STATIONS).toEqual([
      "furnace",
      "blast_furnace",
      "smoker",
      "campfire",
    ]);

    const recipe = success(cookingRecipe(
      RecipeId("minecraft:smelt_iron"),
      "furnace",
      "raw_iron",
      itemStack("iron_ingot", 1),
      PositiveTickCount(200),
      RecipeExperience(0.7),
      {
        category: "redstone",
        group: RecipeGroup("ores"),
        priority: RecipePriority(2),
        showNotification: true,
      },
    ));
    expect(recipe).toMatchObject({
      _tag: "Cooking",
      station: "furnace",
      ingredient: success(exactly("raw_iron")),
      cookTimeTicks: 200,
      experience: 0.7,
      category: "redstone",
      group: "ores",
      priority: RecipePriority(2),
      showNotification: true,
    });

    const defaultOptionsRecipe = success(cookingRecipe(
      RecipeId("minecraft:default_options"),
      "furnace",
      "stone",
      itemStack("stone", 1),
      PositiveTickCount(1),
      RecipeExperience(0),
      {},
    ));
    expect(defaultOptionsRecipe.priority).toBe(0);
    expect(defaultOptionsRecipe).not.toHaveProperty("category");
    expect(defaultOptionsRecipe).not.toHaveProperty("group");
    expect(defaultOptionsRecipe).not.toHaveProperty("showNotification");

    expect(success(cookingRecipeForItem(
      RecipeId("minecraft:smoke_beef"),
      "smoker",
      success(exactly("beef")),
      "cooked_beef",
      StackCount(2),
      PositiveTickCount(100),
      RecipeExperience(0.35),
    ))).toMatchObject({
      station: "smoker",
      output: itemStack("cooked_beef", 2),
      priority: RecipePriority(0),
    });

    for (const station of COOKING_STATIONS) {
      expect(success(cookingRecipe(
        RecipeId(`minecraft:${station}_recipe`),
        station,
        "stone",
        itemStack("stone", 1),
        PositiveTickCount(1),
        RecipeExperience(0),
      )).station).toBe(station);
    }
  });

  it("returns tagged failures for invalid constructor fields and options", () => {
    const output = itemStack("iron_ingot", 1);
    expectFailure(
      Reflect.apply(cookingRecipe, undefined, [" ", "furnace", "raw_iron", output, 200, 0]),
      typeFailure("Cooking recipe id must be a resource location"),
    );
    expectFailure(
      Reflect.apply(cookingRecipe, undefined, [null, "furnace", "raw_iron", output, 200, 0]),
      typeFailure("Cooking recipe id must be a resource location"),
    );
    expectFailure(
      Reflect.apply(cookingRecipe, undefined, ["minecraft:bad", "campfire_bad", "raw_iron", output, 200, 0]),
      typeFailure("Unknown cooking station: campfire_bad"),
    );
    expectFailure(
      Reflect.apply(cookingRecipe, undefined, ["minecraft:bad", "furnace", null, output, 200, 0]),
      typeFailure("Cooking recipe ingredient has an invalid shape"),
    );
    expectFailure(
      Reflect.apply(cookingRecipe, undefined, ["minecraft:bad", "furnace", "raw_iron", {}, 200, 0]),
      typeFailure("Cooking recipe output must be an ItemStack"),
    );
    expectFailure(
      Reflect.apply(cookingRecipe, undefined, ["minecraft:bad", "furnace", "raw_iron", output, 0, 0]),
      rangeFailure("Cooking time must be a positive safe integer, received 0"),
    );
    expectFailure(
      Reflect.apply(cookingRecipe, undefined, ["minecraft:bad", "furnace", "raw_iron", output, 1.5, 0]),
      rangeFailure("Cooking time must be a positive safe integer, received 1.5"),
    );
    expectFailure(
      Reflect.apply(cookingRecipe, undefined, ["minecraft:bad", "furnace", "raw_iron", output, "200", 0]),
      rangeFailure("Cooking time must be a positive safe integer, received 200"),
    );
    expectFailure(
      Reflect.apply(cookingRecipe, undefined, ["minecraft:bad", "furnace", "raw_iron", output, 1, -0.1]),
      rangeFailure("Cooking experience must be a finite non-negative number, received -0.1"),
    );
    expectFailure(
      Reflect.apply(cookingRecipe, undefined, ["minecraft:bad", "furnace", "raw_iron", output, 1, Number.POSITIVE_INFINITY]),
      rangeFailure("Cooking experience must be a finite non-negative number, received Infinity"),
    );
    expectFailure(
      Reflect.apply(cookingRecipe, undefined, ["minecraft:bad", "furnace", "raw_iron", output, 1, "0"]),
      rangeFailure("Cooking experience must be a finite non-negative number, received 0"),
    );
    expectFailure(
      Reflect.apply(cookingRecipe, undefined, ["minecraft:bad", "furnace", "raw_iron", output, 1, 0, null]),
      typeFailure("Cooking recipe options must be an object"),
    );
    for (const [options, expected] of [
      [{ category: "invalid" }, typeFailure("Cooking recipe category is invalid: invalid")],
      [{ group: 1 }, typeFailure("Cooking recipe group must be a string")],
      [{ priority: -1 }, rangeFailure("Cooking recipe priority must be a non-negative safe integer, received -1")],
      [{ priority: 1.5 }, rangeFailure("Cooking recipe priority must be a non-negative safe integer, received 1.5")],
      [{ priority: "1" }, rangeFailure("Cooking recipe priority must be a non-negative safe integer, received 1")],
      [{ showNotification: 1 }, typeFailure("Cooking recipe show notification must be a boolean")],
    ] as const) {
      expectFailure(
        Reflect.apply(cookingRecipe, undefined, [
          "minecraft:bad",
          "furnace",
          "raw_iron",
          output,
          1,
          0,
          options,
        ]),
        expected,
      );
    }
  });

  it("rejects unknown output items and counts outside the result stack range", () => {
    const unknownOutput = Reflect.apply(cookingRecipeForItem, undefined, [
      "minecraft:unknown_output",
      "furnace",
      "raw_iron",
      "not_an_item",
      1,
      200,
      0,
    ]);
    expectFailure(
      unknownOutput,
      typeFailure("Unknown item type: not_an_item"),
    );

    for (const [output, count] of [
      ["iron_ingot", 0],
      ["iron_ingot", 1.5],
      ["diamond_sword", 2],
    ]) {
      expectFailure(
        Reflect.apply(cookingRecipeForItem, undefined, [
          "minecraft:invalid_output_count",
          "furnace",
          "raw_iron",
          output,
          count,
          200,
          0,
        ]),
        rangeFailure(
          `Item stack count for ${output} must be an integer in [1, ${output === "diamond_sword" ? 1 : 64}], received ${count}`,
        ),
      );
    }
  });

  it("guards cooking recipe identity, quantities, and metadata", () => {
    const valid = success(cookingRecipe(
      RecipeId("minecraft:valid"),
      "blast_furnace",
      success(exactly("raw_iron")),
      itemStack("iron_ingot", 1),
      PositiveTickCount(100),
      RecipeExperience(0),
      { category: "building", group: RecipeGroup("ores"), showNotification: false },
    ));
    expect(isCookingRecipe(valid)).toBe(true);
    expect(isCookingRecipe(null)).toBe(false);
    expect(isCookingRecipe([])).toBe(false);

    const invalidValues: ReadonlyArray<unknown> = [
      { ...valid, _tag: "Other" },
      { ...valid, id: 1 },
      { ...valid, id: " " },
      { ...valid, station: "campfire_bad" },
      { ...valid, ingredient: null },
      { ...valid, output: null },
      { ...valid, cookTimeTicks: 0 },
      { ...valid, cookTimeTicks: 1.5 },
      { ...valid, experience: -1 },
      { ...valid, experience: Number.NaN },
      { ...valid, priority: -1 },
      { ...valid, priority: 1.5 },
      { ...valid, category: "invalid" },
      { ...valid, group: 1 },
      { ...valid, showNotification: 1 },
    ];
    for (const value of invalidValues) {
      expect(isCookingRecipe(value)).toBe(false);
    }
  });
});
