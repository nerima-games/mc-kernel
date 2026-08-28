import { Brand } from "effect";

import { NamespacedResourceLocation } from "./identifiers.js";

const DATA_PACK_FORMAT_MIN = 0;
const DATA_PACK_PRIORITY_MIN = 0;

/** A non-negative data-pack format number, including decimal formats such as 107.1. */
export type DataPackFormat = number & Brand.Brand<"DataPackFormat">;

export const DataPackFormat: Brand.Brand.Constructor<DataPackFormat> =
  Brand.refined<DataPackFormat>(
    (value) => Number.isFinite(value) && value >= DATA_PACK_FORMAT_MIN,
    (value) =>
      Brand.error(
        `DataPackFormat must be a finite non-negative number, received ${value}`,
      ),
  );

/** A stable non-negative precedence for a data-pack layer. Larger values win. */
export type DataPackPriority = number & Brand.Brand<"DataPackPriority">;

export const DataPackPriority: Brand.Brand.Constructor<DataPackPriority> =
  Brand.refined<DataPackPriority>(
    (value) => Number.isSafeInteger(value) && value >= DATA_PACK_PRIORITY_MIN,
    (value) =>
      Brand.error(
        `DataPackPriority must be a non-negative safe integer, received ${value}`,
      ),
  );

export type DataPackRegistryEntry<T> = Readonly<{
  readonly id: NamespacedResourceLocation;
  readonly value: T;
}>;

export type DataPackRegistryEntryOptions<T> = Readonly<{
  readonly id: string;
  readonly value: T;
}>;

export type DataPackLayer<T> = Readonly<{
  readonly pack: NamespacedResourceLocation;
  readonly format: DataPackFormat;
  readonly priority: DataPackPriority;
  readonly entries: ReadonlyArray<DataPackRegistryEntry<T>>;
}>;

export type DataPackLayerOptions<T> = Readonly<{
  readonly pack: string;
  readonly format: number;
  readonly priority: number;
  readonly entries: ReadonlyArray<DataPackRegistryEntryOptions<T>>;
}>;

type UnknownRecord = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasOnlyKeys = (
  value: UnknownRecord,
  keys: ReadonlyArray<string>,
): boolean => Object.keys(value).every((key) => keys.includes(key));

const hasAllKeys = (
  value: UnknownRecord,
  keys: ReadonlyArray<string>,
): boolean => keys.every((key) => Object.hasOwn(value, key));

const dataPackEntryFromUnknown = <T>(
  value: unknown,
  decodeValue: (id: string, value: unknown) => T,
): DataPackRegistryEntryOptions<T> => {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["id", "value"]) ||
    !hasAllKeys(value, ["id", "value"])
  ) {
    throw new TypeError(
      "Data-pack registry entries must contain exactly id and value",
    );
  }
  if (typeof value["id"] !== "string") {
    throw new TypeError("Data-pack registry entry id must be a string");
  }
  return { id: value["id"], value: decodeValue(value["id"], value["value"]) };
};

const namespacedEntryOf = <T>(
  entry: DataPackRegistryEntryOptions<T>,
  ids: ReadonlySet<NamespacedResourceLocation>,
): DataPackRegistryEntry<T> => {
  const id = NamespacedResourceLocation(entry.id);
  if (ids.has(id)) {
    throw new TypeError(`Data-pack registry entry is duplicated: ${id}`);
  }
  return Object.freeze({ id, value: entry.value });
};

export const dataPackLayer = <T>(
  options: DataPackLayerOptions<T>,
): DataPackLayer<T> => {
  const pack = NamespacedResourceLocation(options.pack);
  const ids = new Set<NamespacedResourceLocation>();
  const entries = Object.freeze(
    options.entries.map((entry) => {
      const normalized = namespacedEntryOf(entry, ids);
      ids.add(normalized.id);
      return normalized;
    }),
  );
  return Object.freeze({
    pack,
    format: DataPackFormat(options.format),
    priority: DataPackPriority(options.priority),
    entries,
  });
};

/**
 * Decodes the portable data-pack layer document used by kernel integrations.
 * The caller owns JSON loading; this function owns the structural boundary and
 * delegates each registry value to the supplied domain decoder.
 */
const dataPackLayerFromUnknownWithDecoder = <T>(
  value: unknown,
  decodeValue: (id: string, value: unknown) => T,
): DataPackLayer<T> => {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["pack", "format", "priority", "entries"]) ||
    !hasAllKeys(value, ["pack", "format", "priority", "entries"])
  ) {
    throw new TypeError(
      "Data-pack layer must contain exactly pack, format, priority, and entries",
    );
  }
  if (typeof value["pack"] !== "string") {
    throw new TypeError("Data-pack layer pack must be a string");
  }
  if (typeof value["format"] !== "number") {
    throw new TypeError("Data-pack layer format must be a number");
  }
  if (typeof value["priority"] !== "number") {
    throw new TypeError("Data-pack layer priority must be a number");
  }
  if (!Array.isArray(value["entries"])) {
    throw new TypeError("Data-pack layer entries must be an array");
  }
  return dataPackLayer({
    pack: value["pack"],
    format: value["format"],
    priority: value["priority"],
    entries: value["entries"].map((entry) =>
      dataPackEntryFromUnknown(entry, decodeValue),
    ),
  });
};

export const dataPackLayerFromUnknown = <T>(
  value: unknown,
  decodeValue: (value: unknown) => T,
): DataPackLayer<T> =>
  dataPackLayerFromUnknownWithDecoder(value, (_id, entryValue) =>
    decodeValue(entryValue),
  );

export const dataPackLayerFromUnknownWithId = <T>(
  value: unknown,
  decodeValue: (id: string, value: unknown) => T,
): DataPackLayer<T> => dataPackLayerFromUnknownWithDecoder(value, decodeValue);

export const mapDataPackLayer = <Input, Output>(
  layer: DataPackLayer<Input>,
  mapValue: (value: Input) => Output,
): DataPackLayer<Output> =>
  Object.freeze({
    ...layer,
    entries: Object.freeze(
      layer.entries.map((entry) =>
        Object.freeze({ id: entry.id, value: mapValue(entry.value) }),
      ),
    ),
  });

/**
 * Resolves the exact-format data-pack stack. Higher priorities override lower
 * priorities; equal priorities retain the caller's layer order.
 */
export const selectDataPackRegistry = <T>(
  layers: ReadonlyArray<DataPackLayer<T>>,
  format: DataPackFormat,
): ReadonlyMap<NamespacedResourceLocation, T> => {
  const orderedLayers = layers
    .map((layer, order) => ({ layer, order }))
    .filter(({ layer }) => layer.format === format)
    .sort((left, right) => {
      const priorityComparison = left.layer.priority - right.layer.priority;
      if (priorityComparison !== 0) {
        return priorityComparison;
      }
      return left.order - right.order;
    });
  const registry = new Map<NamespacedResourceLocation, T>();
  for (const { layer } of orderedLayers) {
    for (const entry of layer.entries) {
      registry.set(entry.id, entry.value);
    }
  }
  return registry;
};

export const dataPackResourcePath = (
  registry: NamespacedResourceLocation,
  entry: NamespacedResourceLocation,
): string => {
  const registrySeparator = registry.indexOf(":");
  const registryPath = registry.slice(registrySeparator + 1);
  const entrySeparator = entry.indexOf(":");
  return `data/${entry.slice(0, entrySeparator)}/${registryPath}/${entry.slice(entrySeparator + 1)}.json`;
};
