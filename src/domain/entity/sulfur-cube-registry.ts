import {
  dataPackLayer,
  dataPackResourcePath,
  mapDataPackLayer,
  selectDataPackRegistry,
  dataPackLayerFromUnknown,
} from "../world/data-pack-registry.ts.js";
import type { DataPackFormat, DataPackLayer } from "../world/data-pack-registry.ts.js";
import { NamespacedResourceLocation } from "../text/identifiers.ts.js";
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

export type SulfurCubeArchetypeDataPackLayerOptions = Readonly<{
  readonly pack: string;
  readonly format: number;
  readonly priority: number;
  readonly entries: ReadonlyArray<
    Readonly<{ readonly id: string; readonly value: unknown }>
  >;
}>;

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
): string => dataPackResourcePath(SULFUR_CUBE_ARCHETYPE_REGISTRY_ID, entry);
