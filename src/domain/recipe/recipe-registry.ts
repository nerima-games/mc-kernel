import { Result } from "effect";
import { MAX_GENERIC_INPUT_ARRAY_LENGTH, snapshotInputArray, snapshotInputRecord } from "../../input-snapshot.js";
import {
  dataPackLayer,
  dataPackLayerFromUnknownWithId,
  dataPackResourcePath,
  selectDataPackRegistry,
  DataPackFormat,
  DataPackPriority,
} from "../world/data-pack-registry.js";
import type {
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

const registryFailure = (
  reason: DataPackRegistryFailure['reason'],
  message: string,
): DataPackRegistryFailure => ({ _tag: 'DataPackRegistryFailure', reason, message });

export const recipeDataPackLayer = (
  options: RecipeDataPackLayerOptions,
): Result.Result<RecipeDataPackLayer, DataPackRegistryFailure | RecipeFailure> => {
  const input = snapshotInputRecord(options, ['pack', 'format', 'priority', 'entries'])
  if (Result.isFailure(input)) {
    return Result.fail(registryFailure('invalid-layer', 'Recipe data-pack layer options must be readable'))
  }
  const rawEntries = snapshotInputArray(input.success['entries'], MAX_GENERIC_INPUT_ARRAY_LENGTH)
  if (Result.isFailure(rawEntries)) {
    return Result.fail(registryFailure('invalid-layer', 'Recipe data-pack layer entries must be a readable array'))
  }
  return Result.gen(function* () {
    const packValue = input.success['pack']
    if (typeof packValue !== 'string') {
      return yield* Result.fail(registryFailure('invalid-layer', 'Recipe data-pack layer pack must be a resource location'))
    }
    const pack = yield* Result.mapError(
      NamespacedResourceLocation.result(packValue),
      (error) => registryFailure('invalid-resource-location', error.message),
    )
    const formatValue = input.success['format']
    if (typeof formatValue !== 'number') {
      return yield* Result.fail(registryFailure('invalid-layer', 'Recipe data-pack layer format must be a number'))
    }
    const format = yield* DataPackFormat(formatValue)
    const priorityValue = input.success['priority']
    if (typeof priorityValue !== 'number') {
      return yield* Result.fail(registryFailure('invalid-layer', 'Recipe data-pack layer priority must be a number'))
    }
    const priority = yield* DataPackPriority(priorityValue)
    const entries = []
    for (const rawEntry of rawEntries.success) {
      const entry = snapshotInputRecord(rawEntry, ['id', 'value'], ['id', 'value'])
      if (Result.isFailure(entry) || !Object.hasOwn(entry.success, 'id') || !Object.hasOwn(entry.success, 'value')) {
        return yield* Result.fail(registryFailure('invalid-entry', 'Recipe data-pack entries must contain exactly id and value'))
      }
      const idValue = entry.success['id']
      if (typeof idValue !== 'string') {
        return yield* Result.fail(registryFailure('invalid-entry', 'Recipe data-pack entry id must be a resource location'))
      }
      const id = yield* Result.mapError(
        NamespacedResourceLocation.result(idValue),
        (error) => registryFailure('invalid-resource-location', error.message),
      )
      const value = yield* portableRecipeFromUnknown(id, entry.success['value'])
      entries.push({ id, value })
    }
    return yield* dataPackLayer({ pack, format, priority, entries })
  })
};

export const recipeDataPackLayerFromUnknown = (
  value: unknown,
): Result.Result<RecipeDataPackLayer, DataPackRegistryFailure | RecipeFailure> =>
  dataPackLayerFromUnknownWithId(value, portableRecipeFromUnknown);

export const selectRecipes = (
  layers: ReadonlyArray<RecipeDataPackLayer>,
  format: DataPackFormat,
): ReadonlyMap<NamespacedResourceLocation, PortableRecipe> =>
  selectDataPackRegistry(layers, format);

export const recipeDataPackPath = (entry: NamespacedResourceLocation): Result.Result<DataPackResourcePath, DataPackRegistryFailure> =>
  dataPackResourcePath(RECIPE_DATA_REGISTRY, entry);
