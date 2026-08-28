import {
  dataPackLayer,
  dataPackLayerFromUnknownWithId,
  dataPackResourcePath,
  selectDataPackRegistry,
} from "./data-pack-registry.js";
import type { DataPackFormat, DataPackLayer } from "./data-pack-registry.js";
import { NamespacedResourceLocation } from "./identifiers.js";
import {
  portableRecipeFromUnknown,
  type PortableRecipe,
} from "./recipe-json.js";

const RECIPE_DATA_REGISTRY = NamespacedResourceLocation("minecraft:recipe");

export type RecipeDataPackLayer = DataPackLayer<PortableRecipe>;

export type RecipeDataPackLayerOptions = Readonly<{
  readonly pack: string;
  readonly format: number;
  readonly priority: number;
  readonly entries: ReadonlyArray<
    Readonly<{ readonly id: string; readonly value: unknown }>
  >;
}>;

export const recipeDataPackLayer = (
  options: RecipeDataPackLayerOptions,
): RecipeDataPackLayer =>
  dataPackLayer({
    pack: options.pack,
    format: options.format,
    priority: options.priority,
    entries: options.entries.map((entry) => ({
      id: entry.id,
      value: portableRecipeFromUnknown(entry.id, entry.value),
    })),
  });

export const recipeDataPackLayerFromUnknown = (
  value: unknown,
): RecipeDataPackLayer =>
  dataPackLayerFromUnknownWithId(value, portableRecipeFromUnknown);

export const selectRecipes = (
  layers: ReadonlyArray<RecipeDataPackLayer>,
  format: DataPackFormat,
): ReadonlyMap<NamespacedResourceLocation, PortableRecipe> =>
  selectDataPackRegistry(layers, format);

export const recipeDataPackPath = (entry: NamespacedResourceLocation): string =>
  dataPackResourcePath(RECIPE_DATA_REGISTRY, entry);
