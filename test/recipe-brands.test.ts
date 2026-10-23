import { describe, expect, it } from "vitest";

import {
  RecipeCompletionCount,
  RecipeExperience,
  RecipeGridDimension,
  RecipeGridIndex,
  RecipeGroup,
  RecipeIngredientCount,
  RecipePatternRow,
  RecipePatternSymbol,
  RecipePriority,
} from "../src/domain/recipe/recipe";
import { BrewingFuelCharges } from "../src/domain/recipe/brewing-data";
import { TransmuteMaterialSlotCount } from "../src/domain/recipe/transmute-data";

describe("recipe quantity brands", () => {
  it("accepts recipe counts, priorities, dimensions, and indexes at their boundaries", () => {
    expect(RecipeIngredientCount(1)).toBe(1);
    expect(RecipeIngredientCount(32)).toBe(32);
    expect(RecipeIngredientCount(64)).toBe(64);
    expect(() => RecipeIngredientCount(0)).toThrow();
    expect(() => RecipeIngredientCount(65)).toThrow();
    expect(() => RecipeIngredientCount(1.5)).toThrow();

    expect(RecipePriority(0)).toBe(0);
    expect(RecipePriority(1)).toBe(1);
    expect(RecipePriority(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
    expect(() => RecipePriority(-1)).toThrow();
    expect(() => RecipePriority(Number.MAX_SAFE_INTEGER + 1)).toThrow();
    expect(() => RecipePriority(1.5)).toThrow();

    expect(RecipeGridDimension(0)).toBe(0);
    expect(RecipeGridDimension(2)).toBe(2);
    expect(RecipeGridDimension(3)).toBe(3);
    expect(() => RecipeGridDimension(-1)).toThrow();
    expect(() => RecipeGridDimension(4)).toThrow();
    expect(() => RecipeGridDimension(1.5)).toThrow();

    expect(RecipeGridIndex(0)).toBe(0);
    expect(RecipeGridIndex(1)).toBe(1);
    expect(RecipeGridIndex(2)).toBe(2);
    expect(() => RecipeGridIndex(-1)).toThrow();
    expect(() => RecipeGridIndex(3)).toThrow();
    expect(() => RecipeGridIndex(0.5)).toThrow();
  });

  it("validates experience, completion, material, and brewing fuel quantities", () => {
    expect(RecipeExperience(0)).toBe(0);
    expect(RecipeExperience(0.7)).toBe(0.7);
    expect(() => RecipeExperience(-0.1)).toThrow();
    expect(() => RecipeExperience(Number.POSITIVE_INFINITY)).toThrow();
    expect(() => RecipeExperience(Number.NaN)).toThrow();

    expect(RecipeCompletionCount(0)).toBe(0);
    expect(RecipeCompletionCount(2)).toBe(2);
    expect(RecipeCompletionCount(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
    expect(() => RecipeCompletionCount(-1)).toThrow();
    expect(() => RecipeCompletionCount(Number.MAX_SAFE_INTEGER + 1)).toThrow();
    expect(() => RecipeCompletionCount(0.5)).toThrow();

    expect(TransmuteMaterialSlotCount(1)).toBe(1);
    expect(TransmuteMaterialSlotCount(4)).toBe(4);
    expect(TransmuteMaterialSlotCount(8)).toBe(8);
    expect(() => TransmuteMaterialSlotCount(0)).toThrow();
    expect(() => TransmuteMaterialSlotCount(9)).toThrow();
    expect(() => TransmuteMaterialSlotCount(1.5)).toThrow();

    expect(BrewingFuelCharges(0)).toBe(0);
    expect(BrewingFuelCharges(10)).toBe(10);
    expect(BrewingFuelCharges(20)).toBe(20);
    expect(() => BrewingFuelCharges(-1)).toThrow();
    expect(() => BrewingFuelCharges(21)).toThrow();
    expect(() => BrewingFuelCharges(1.5)).toThrow();
  });

  it("keeps free-form groups distinct from bounded pattern rows", () => {
    expect(RecipeGroup("")).toBe("");
    expect(RecipeGroup("group name with spaces")).toBe("group name with spaces");
    expect(() => Reflect.apply(RecipeGroup, undefined, [1])).toThrow();

    expect(RecipePatternRow("")).toBe("");
    expect(RecipePatternRow("S")).toBe("S");
    expect(RecipePatternRow("ABC")).toBe("ABC");
    expect(() => RecipePatternRow("ABCD")).toThrow();
    expect(() => Reflect.apply(RecipePatternRow, undefined, [1])).toThrow();

    expect(RecipePatternSymbol("S")).toBe("S");
    expect(() => RecipePatternSymbol("")).toThrow();
    expect(() => RecipePatternSymbol(" ")).toThrow();
    expect(() => RecipePatternSymbol("AB")).toThrow();
    expect(() => Reflect.apply(RecipePatternSymbol, undefined, [1])).toThrow();
  });
});
