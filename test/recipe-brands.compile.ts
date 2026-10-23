import { itemStack } from "../src/domain/item/item-stack";
import {
  RecipeGridDimension,
  RecipeGridIndex,
  RecipeGroup,
  RecipeId,
  RecipeIngredientCount,
  RecipePatternRow,
  RecipePatternSymbol,
  RecipePriority,
  RecipeExperience,
  RecipeStationTag,
  craftGrid,
  exactly,
  shapedRecipe,
  cellAt,
} from "../src/domain/recipe/recipe";
import { cookingRecipe } from "../src/domain/recipe/cooking-data";
import { craftingRecipeFromUnknown } from "../src/domain/recipe/recipe-json";
import { NamespacedResourceLocation } from "../src/domain/text/identifiers";
import { PositiveTickCount, StackCount } from "../src/domain/time/quantities";

const ingredient = exactly("stone", RecipeIngredientCount(1));
const grid = craftGrid(RecipeGridDimension(1), RecipeGridDimension(1), ["stone"]);
const cell = cellAt(grid, RecipeGridIndex(0), RecipeGridIndex(0));
const shaped = shapedRecipe(
  RecipeId("minecraft:one_stone"),
  [RecipePatternRow("S")],
  { [RecipePatternSymbol("S")]: ingredient },
  itemStack("stick", StackCount(1)),
  {
    priority: RecipePriority(0),
    group: RecipeGroup("stones"),
    tags: [RecipeStationTag("crafting_table")],
  },
);
const cooking = cookingRecipe(
  RecipeId("minecraft:smelt_stone"),
  "furnace",
  "stone",
  itemStack("stone", StackCount(1)),
  PositiveTickCount(1),
  RecipeExperience(0),
);
const decoded = craftingRecipeFromUnknown(
  NamespacedResourceLocation("minecraft:one_stone"),
  {},
);

export const recipeBrandFixtures: readonly unknown[] = [shaped, cooking, decoded, cell];

// @ts-expect-error Recipe ingredient quantities require their validated brand.
exactly("stone", 1);
// @ts-expect-error Recipe identifiers require ResourceLocation validation.
shapedRecipe("minecraft:one_stone", [RecipePatternRow("S")], { [RecipePatternSymbol("S")]: "stone" }, itemStack("stick", StackCount(1)));
// @ts-expect-error Pattern rows require the recipe-row brand.
shapedRecipe(RecipeId("minecraft:one_stone"), ["S"], { [RecipePatternSymbol("S")]: "stone" }, itemStack("stick", StackCount(1)));
// @ts-expect-error Recipe priorities use the non-negative safe-integer brand.
shapedRecipe(RecipeId("minecraft:one_stone"), [RecipePatternRow("S")], { [RecipePatternSymbol("S")]: "stone" }, itemStack("stick", StackCount(1)), { priority: 0 });
// @ts-expect-error Recipe groups are free-form text with their own semantic brand.
shapedRecipe(RecipeId("minecraft:one_stone"), [RecipePatternRow("S")], { [RecipePatternSymbol("S")]: "stone" }, itemStack("stick", StackCount(1)), { group: "stones" });
// @ts-expect-error Recipe station tags require ResourceLocation validation.
shapedRecipe(RecipeId("minecraft:one_stone"), [RecipePatternRow("S")], { [RecipePatternSymbol("S")]: "stone" }, itemStack("stick", StackCount(1)), { tags: ["crafting_table"] });
// @ts-expect-error Pattern symbols require their one non-space character brand.
shapedRecipe(RecipeId("minecraft:one_stone"), [RecipePatternRow("S")], { S: "stone" }, itemStack("stick", StackCount(1)));
// @ts-expect-error Grid dimensions use their bounded dimension brand.
craftGrid(1, RecipeGridDimension(1), []);
// @ts-expect-error Cell coordinates use a bounded grid-index brand.
cellAt(grid, 0, RecipeGridIndex(0));
// @ts-expect-error Item stacks require the existing StackCount brand.
itemStack("stick", 1);
// @ts-expect-error Cooking recipe time requires the existing positive tick-count brand.
cookingRecipe(RecipeId("minecraft:smelt_stone"), "furnace", "stone", itemStack("stone", StackCount(1)), 1, RecipeExperience(0));
// @ts-expect-error Cooking experience uses its non-negative finite brand.
cookingRecipe(RecipeId("minecraft:smelt_stone"), "furnace", "stone", itemStack("stone", StackCount(1)), PositiveTickCount(1), 0);
// @ts-expect-error Recipe JSON decoders take fully qualified resource locations.
craftingRecipeFromUnknown("minecraft:one_stone", {});
