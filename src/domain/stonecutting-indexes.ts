import type {
  StonecuttingRecipe,
  StonecuttingRecipeTable,
} from "./stonecutting-data.js";
import type { ItemType } from "./item-type.js";

export type StonecuttingRecipeIndex = {
  readonly exactByItem: ReadonlyMap<
    ItemType,
    ReadonlyArray<StonecuttingRecipe>
  >;
  readonly tagged: ReadonlyArray<StonecuttingRecipe>;
};

export const buildStonecuttingRecipeIndex = (
  recipes: StonecuttingRecipeTable,
): StonecuttingRecipeIndex => {
  const exactByItem = new Map<ItemType, Array<StonecuttingRecipe>>();
  const tagged: Array<StonecuttingRecipe> = [];

  for (const recipe of recipes) {
    if (recipe.ingredient._tag !== "Exact") {
      tagged.push(recipe);
      continue;
    }

    const recipesForItem = exactByItem.get(recipe.ingredient.item);
    if (recipesForItem === undefined) {
      exactByItem.set(recipe.ingredient.item, [recipe]);
      continue;
    }
    recipesForItem.push(recipe);
  }

  return { exactByItem, tagged };
};
