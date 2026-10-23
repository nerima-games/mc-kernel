import { Brand, Result } from "effect";

import { NamespacedResourceLocation } from "../text/identifiers.js";

const DATA_PACK_FORMAT_MIN = 0;
const DATA_PACK_PRIORITY_MIN = 0;

export type DataPackRegistryFailure = Readonly<{
  readonly _tag: 'DataPackRegistryFailure'
  readonly reason:
    | 'invalid-layer'
    | 'invalid-entry'
    | 'invalid-format'
    | 'invalid-priority'
    | 'invalid-resource-location'
    | 'duplicate-entry'
  readonly message: string
}>

const failure = (
  reason: DataPackRegistryFailure['reason'],
  message: string,
): Result.Result<never, DataPackRegistryFailure> => Result.fail({ _tag: 'DataPackRegistryFailure', reason, message })

/** A non-negative data-pack format number, including decimal formats such as 107.1. */
export type DataPackFormat = number & Brand.Brand<"DataPackFormat">;

const dataPackFormatBrand = Brand.make<DataPackFormat>((value) =>
  Number.isFinite(value) && value >= DATA_PACK_FORMAT_MIN
    ? true
    : `DataPackFormat must be a finite non-negative number, received ${value}`,
)

export const DataPackFormat = (value: number): Result.Result<DataPackFormat, DataPackRegistryFailure> =>
  Number.isFinite(value) && value >= DATA_PACK_FORMAT_MIN
    ? Result.succeed(dataPackFormatBrand(value))
    : failure('invalid-format', `DataPackFormat must be a finite non-negative number, received ${value}`)

/** A stable non-negative precedence for a data-pack layer. Larger values win. */
export type DataPackPriority = number & Brand.Brand<"DataPackPriority">;

const dataPackPriorityBrand = Brand.make<DataPackPriority>((value) =>
  Number.isSafeInteger(value) && value >= DATA_PACK_PRIORITY_MIN
    ? true
    : `DataPackPriority must be a non-negative safe integer, received ${value}`,
)

export const DataPackPriority = (value: number): Result.Result<DataPackPriority, DataPackRegistryFailure> =>
  Number.isSafeInteger(value) && value >= DATA_PACK_PRIORITY_MIN
    ? Result.succeed(dataPackPriorityBrand(value))
    : failure('invalid-priority', `DataPackPriority must be a non-negative safe integer, received ${value}`)

/** Safe relative JSON path below a data-pack's `data/` directory. */
export type DataPackResourcePath = string & Brand.Brand<"DataPackResourcePath">;

export const DataPackResourcePath: Brand.Constructor<DataPackResourcePath> =
  Brand.make<DataPackResourcePath>((value) => {
    const segments = value.split("/");
    return value.startsWith("data/") && value.endsWith(".json") &&
      segments.every((segment) => /^[a-z0-9._-]+$/.test(segment) && segment !== "." && segment !== "..")
      ? true
      : `DataPackResourcePath must be a safe relative JSON path below data/, received ${JSON.stringify(value)}`;
  });

export type DataPackRegistryEntry<T> = Readonly<{
  readonly id: NamespacedResourceLocation;
  readonly value: T;
}>;

export type DataPackRegistryEntryOptions<T> = Readonly<{
  readonly id: NamespacedResourceLocation;
  readonly value: T;
}>;

export type DataPackLayer<T> = Readonly<{
  readonly pack: NamespacedResourceLocation;
  readonly format: DataPackFormat;
  readonly priority: DataPackPriority;
  readonly entries: ReadonlyArray<DataPackRegistryEntry<T>>;
}>;

export type DataPackLayerOptions<T> = Readonly<{
  readonly pack: NamespacedResourceLocation;
  readonly format: DataPackFormat;
  readonly priority: DataPackPriority;
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

const namespacedResourceLocation = (value: string): Result.Result<NamespacedResourceLocation, DataPackRegistryFailure> =>
  Result.mapError(
    NamespacedResourceLocation.result(value),
    (error) => ({ _tag: 'DataPackRegistryFailure', reason: 'invalid-resource-location', message: error.message }),
  )

const dataPackEntryFromUnknown = <T, E>(
  value: unknown,
  decodeValue: (id: NamespacedResourceLocation, value: unknown) => Result.Result<T, E>,
): Result.Result<DataPackRegistryEntryOptions<T>, DataPackRegistryFailure | E> => {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["id", "value"]) ||
    !hasAllKeys(value, ["id", "value"])
  ) {
    return failure('invalid-entry', "Data-pack registry entries must contain exactly id and value")
  }
  const id = value["id"]
  if (typeof id !== "string") {
    return failure('invalid-entry', "Data-pack registry entry id must be a string")
  }
  return Result.flatMap(namespacedResourceLocation(id), (namespacedId) =>
    Result.map(decodeValue(namespacedId, value["value"]), (decoded) => ({ id: namespacedId, value: decoded })),
  )
}

const namespacedEntryOf = <T>(
  entry: DataPackRegistryEntryOptions<T>,
  ids: ReadonlySet<NamespacedResourceLocation>,
): Result.Result<DataPackRegistryEntry<T>, DataPackRegistryFailure> =>
  Result.flatMap(namespacedResourceLocation(entry.id), (id) => {
    if (ids.has(id)) {
      return failure('duplicate-entry', `Data-pack registry entry is duplicated: ${id}`)
    }
    return Result.succeed(Object.freeze({ id, value: entry.value }))
  })

export const dataPackLayer = <T>(
  options: DataPackLayerOptions<T>,
): Result.Result<DataPackLayer<T>, DataPackRegistryFailure> =>
  Result.gen(function* () {
    if (
      !isRecord(options) ||
      typeof options['pack'] !== 'string' ||
      typeof options['format'] !== 'number' ||
      typeof options['priority'] !== 'number' ||
      !Array.isArray(options['entries'])
    ) {
      return yield* failure('invalid-layer', 'Data-pack layer must contain a pack, format, priority, and entries array')
    }
    const pack = yield* namespacedResourceLocation(options.pack)
    const format = yield* DataPackFormat(options.format)
    const priority = yield* DataPackPriority(options.priority)
    const ids = new Set<NamespacedResourceLocation>()
    const entries: Array<DataPackRegistryEntry<T>> = []
    for (const entry of options.entries) {
      const unknownEntry: unknown = entry
      if (!isRecord(unknownEntry) || typeof unknownEntry['id'] !== 'string') {
        return yield* failure('invalid-entry', 'Data-pack registry entry id must be a string')
      }
      const normalized = yield* namespacedEntryOf({ id: unknownEntry['id'], value: entry.value }, ids)
      ids.add(normalized.id)
      entries.push(normalized)
    }
    return Object.freeze({
      pack,
      format,
      priority,
      entries: Object.freeze(entries),
    })
  })

/**
 * Decodes the portable data-pack layer document used by kernel integrations.
 * The caller owns JSON loading; this function owns the structural boundary and
 * delegates each registry value to the supplied domain decoder.
 */
const dataPackLayerFromUnknownWithDecoder = <T, E>(
  value: unknown,
  decodeValue: (id: NamespacedResourceLocation, value: unknown) => Result.Result<T, E>,
): Result.Result<DataPackLayer<T>, DataPackRegistryFailure | E> =>
  Result.gen(function* () {
    if (
      !isRecord(value) ||
      !hasOnlyKeys(value, ["pack", "format", "priority", "entries"]) ||
      !hasAllKeys(value, ["pack", "format", "priority", "entries"])
    ) {
      return yield* failure('invalid-layer', "Data-pack layer must contain exactly pack, format, priority, and entries")
    }
    if (typeof value["pack"] !== "string") {
      return yield* failure('invalid-layer', "Data-pack layer pack must be a string")
    }
    if (typeof value["format"] !== "number") {
      return yield* failure('invalid-layer', "Data-pack layer format must be a number")
    }
    const format = yield* DataPackFormat(value['format'])
    if (typeof value["priority"] !== "number") {
      return yield* failure('invalid-layer', "Data-pack layer priority must be a number")
    }
    const priority = yield* DataPackPriority(value['priority'])
    if (!Array.isArray(value["entries"])) {
      return yield* failure('invalid-layer', "Data-pack layer entries must be an array")
    }
    const pack = yield* namespacedResourceLocation(value['pack'])
    const entries = yield* Result.all(value['entries'].map((entry) => dataPackEntryFromUnknown(entry, decodeValue)))
    return yield* dataPackLayer({
      pack,
      format,
      priority,
      entries,
    })
  })

export const dataPackLayerFromUnknown = <T, E>(
  value: unknown,
  decodeValue: (value: unknown) => Result.Result<T, E>,
): Result.Result<DataPackLayer<T>, DataPackRegistryFailure | E> =>
  dataPackLayerFromUnknownWithDecoder(value, (_id, entryValue) => decodeValue(entryValue))

export const dataPackLayerFromUnknownWithId = <T, E>(
  value: unknown,
  decodeValue: (id: NamespacedResourceLocation, value: unknown) => Result.Result<T, E>,
): Result.Result<DataPackLayer<T>, DataPackRegistryFailure | E> =>
  dataPackLayerFromUnknownWithDecoder(value, decodeValue)

export const mapDataPackLayer = <Input, Output, E>(
  layer: DataPackLayer<Input>,
  mapValue: (value: Input) => Result.Result<Output, E>,
): Result.Result<DataPackLayer<Output>, E> =>
  Result.map(
    Result.all(layer.entries.map((entry) =>
      Result.map(mapValue(entry.value), (value) => Object.freeze({ id: entry.id, value })),
    )),
    (entries) => Object.freeze({ ...layer, entries: Object.freeze(entries) }),
  )

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
): DataPackResourcePath => {
  const registrySeparator = registry.indexOf(":");
  const registryPath = registry.slice(registrySeparator + 1);
  const entrySeparator = entry.indexOf(":");
  return DataPackResourcePath(`data/${entry.slice(0, entrySeparator)}/${registryPath}/${entry.slice(entrySeparator + 1)}.json`);
};
