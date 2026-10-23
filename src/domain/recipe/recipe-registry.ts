import { Result } from "effect";
import {
  dataPackLayer,
  dataPackLayerFromUnknownWithId,
  dataPackResourcePath,
  selectDataPackRegistry,
} from "../world/data-pack-registry.js";
import type {
  DataPackFormat,
  DataPackLayer,
  DataPackLayerOptions,
  DataPackRegistryFailure,
  DataPackResourcePath,
} from "../world/data-pack-registry.js";
import { NamespacedResourceLocation } from "../text/identifiers.js";
import type { RecipeFailure } from "./recipe-error.js";
import {
  portableRecipeFromUnknown,
  type PortableRecipe,
} from "./recipe-json.js";

const RECIPE_DATA_REGISTRY = NamespacedResourceLocation("minecraft:recipe");

export type RecipeDataPackLayer = DataPackLayer<PortableRecipe>;

export type RecipeDataPackLayerOptions = DataPackLayerOptions<unknown>;

export const recipeDataPackLayer = (
  options: RecipeDataPackLayerOptions,
): Result.Result<RecipeDataPackLayer, DataPackRegistryFailure | RecipeFailure> =>
  Result.gen(function* () {
    const entries = yield* Result.all(options.entries.map((entry) =>
      Result.map(portableRecipeFromUnknown(entry.id, entry.value), (value) => ({
        id: entry.id,
        value,
      })),
    ))
    return yield* dataPackLayer({
      pack: options.pack,
      format: options.format,
      priority: options.priority,
      entries,
    })
  });

export const recipeDataPackLayerFromUnknown = (
  value: unknown,
): Result.Result<RecipeDataPackLayer, DataPackRegistryFailure | RecipeFailure> =>
  dataPackLayerFromUnknownWithId(value, portableRecipeFromUnknown);

export const selectRecipes = (
  layers: ReadonlyArray<RecipeDataPackLayer>,
  format: DataPackFormat,
): ReadonlyMap<NamespacedResourceLocation, PortableRecipe> =>
  selectDataPackRegistry(layers, format);

export const recipeDataPackPath = (entry: NamespacedResourceLocation): DataPackResourcePath =>
  dataPackResourcePath(RECIPE_DATA_REGISTRY, entry);
