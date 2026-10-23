import {
  dataPackLayer,
  dataPackResourcePath,
  mapDataPackLayer,
  selectDataPackRegistry,
  dataPackLayerFromUnknown,
} from "../world/data-pack-registry.js";
import type { DataPackFormat, DataPackLayer, DataPackLayerOptions, DataPackResourcePath } from "../world/data-pack-registry.js";
import { NamespacedResourceLocation } from "../text/identifiers.js";
import {
  SULFUR_CUBE_ARCHETYPE_REGISTRY,
  type SulfurCubeArchetype,
} from "./sulfur-cube-data.js";
import { sulfurCubeArchetypeFromUnknown } from "./sulfur-cube.js";

const SULFUR_CUBE_ARCHETYPE_REGISTRY_ID = NamespacedResourceLocation(
  SULFUR_CUBE_ARCHETYPE_REGISTRY,
);

export type SulfurCubeArchetypeDataPackLayer =
  DataPackLayer<SulfurCubeArchetype>;

export type SulfurCubeArchetypeDataPackLayerOptions = DataPackLayerOptions<unknown>;

export const sulfurCubeArchetypeDataPackLayer = (
  options: SulfurCubeArchetypeDataPackLayerOptions,
): SulfurCubeArchetypeDataPackLayer =>
  mapDataPackLayer(
    dataPackLayer({
      pack: options.pack,
      format: options.format,
      priority: options.priority,
      entries: options.entries,
    }),
    sulfurCubeArchetypeFromUnknown,
  );

export const sulfurCubeArchetypeDataPackLayerFromUnknown = (
  value: unknown,
): SulfurCubeArchetypeDataPackLayer =>
  dataPackLayerFromUnknown(value, sulfurCubeArchetypeFromUnknown);

export const selectSulfurCubeArchetypes = (
  layers: ReadonlyArray<SulfurCubeArchetypeDataPackLayer>,
  format: DataPackFormat,
): ReadonlyMap<NamespacedResourceLocation, SulfurCubeArchetype> =>
  selectDataPackRegistry(layers, format);

export const sulfurCubeArchetypeDataPath = (
  entry: NamespacedResourceLocation,
): DataPackResourcePath => dataPackResourcePath(SULFUR_CUBE_ARCHETYPE_REGISTRY_ID, entry);
