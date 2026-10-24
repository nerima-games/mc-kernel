import { Result } from "effect";
import {
  dataPackLayer,
  dataPackResourcePath,
  mapDataPackLayer,
  selectDataPackRegistry,
  dataPackLayerFromUnknown,
} from "../world/data-pack-registry.js";
import type {
  DataPackFormat,
  DataPackLayer,
  DataPackLayerOptions,
  DataPackRegistryFailure,
  DataPackResourcePath,
} from "../world/data-pack-registry.js";
import { NamespacedResourceLocation } from "../text/identifiers.js";
import {
  SULFUR_CUBE_ARCHETYPE_REGISTRY,
  type SulfurCubeArchetype,
} from "./sulfur-cube-data.js";
import {
  sulfurCubeArchetypeFromUnknown,
  type SulfurCubeArchetypeFailure,
} from "./sulfur-cube.js";

const SULFUR_CUBE_ARCHETYPE_REGISTRY_ID = NamespacedResourceLocation(
  SULFUR_CUBE_ARCHETYPE_REGISTRY,
);

export type SulfurCubeArchetypeDataPackLayer =
  DataPackLayer<SulfurCubeArchetype>;

export type SulfurCubeArchetypeDataPackLayerOptions = DataPackLayerOptions<unknown>;

export const sulfurCubeArchetypeDataPackLayer = (
  options: SulfurCubeArchetypeDataPackLayerOptions,
): Result.Result<
  SulfurCubeArchetypeDataPackLayer,
  DataPackRegistryFailure | SulfurCubeArchetypeFailure
> =>
  Result.flatMap(
    dataPackLayer({
      pack: options.pack,
      format: options.format,
      priority: options.priority,
      entries: options.entries,
    }),
    (layer) => mapDataPackLayer(layer, sulfurCubeArchetypeFromUnknown),
  );

export const sulfurCubeArchetypeDataPackLayerFromUnknown = (
  value: unknown,
): Result.Result<
  SulfurCubeArchetypeDataPackLayer,
  DataPackRegistryFailure | SulfurCubeArchetypeFailure
> =>
  dataPackLayerFromUnknown(value, sulfurCubeArchetypeFromUnknown);

export const selectSulfurCubeArchetypes = (
  layers: ReadonlyArray<SulfurCubeArchetypeDataPackLayer>,
  format: DataPackFormat,
): ReadonlyMap<NamespacedResourceLocation, SulfurCubeArchetype> =>
  selectDataPackRegistry(layers, format);

export const sulfurCubeArchetypeDataPath = (
  entry: NamespacedResourceLocation,
): Result.Result<DataPackResourcePath, DataPackRegistryFailure> =>
  dataPackResourcePath(SULFUR_CUBE_ARCHETYPE_REGISTRY_ID, entry);
