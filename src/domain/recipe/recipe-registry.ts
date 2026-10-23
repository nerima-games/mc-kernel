import {
  dataPackLayer,
  dataPackLayerFromUnknownWithId,
  dataPackResourcePath,
  selectDataPackRegistry,
} from "../world/data-pack-registry.js";
import type { DataPackFormat, DataPackLayer, DataPackLayerOptions, DataPackResourcePath } from "../world/data-pack-registry.js";
import { NamespacedResourceLocation } from "../text/identifiers.js";
import {
  portableRecipeFromUnknown,
  type PortableRecipe,
} from "./recipe-json.js";

const RECIPE_DATA_REGISTRY = NamespacedResourceLocation("minecraft:recipe");

export type RecipeDataPackLayer = DataPackLayer<PortableRecipe>;

export type RecipeDataPackLayerOptions = DataPackLayerOptions<unknown>;

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

export const recipeDataPackPath = (entry: NamespacedResourceLocation): DataPackResourcePath =>
  dataPackResourcePath(RECIPE_DATA_REGISTRY, entry);
