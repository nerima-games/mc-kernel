import { Effect, Result } from 'effect'

export type JsonPrimitive = null | boolean | number | string;

export type JsonObject = Readonly<{
  readonly [key: string]: JsonValue;
}>;

export type JsonValue = JsonPrimitive | ReadonlyArray<JsonValue> | JsonObject;

type UnknownRecord = Readonly<Record<string, unknown>>;

const isPlainRecord = (value: object): value is UnknownRecord => {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const isJsonValueIn = (
  value: unknown,
  active: WeakSet<object>,
): value is JsonValue => {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return true;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (typeof value !== "object" || active.has(value)) {
    return false;
  }
  active.add(value);
  const valid = Array.isArray(value)
    ? value.every((child) => isJsonValueIn(child, active))
    : isPlainRecord(value) &&
      Object.values(value).every((child) => isJsonValueIn(child, active));
  active.delete(value);
  return valid;
};

export const isJsonValue = (value: unknown): value is JsonValue => {
  const checked = Effect.runSync(Effect.result(Effect.try({
    try: () => isJsonValueIn(value, new WeakSet<object>()),
    catch: () => false,
  })))
  return Result.isSuccess(checked) && checked.success
}

type JsonSnapshot = Readonly<{ readonly valid: true; readonly value: JsonValue }> | Readonly<{ readonly valid: false }>;

const snapshotJsonValueIn = (
  value: unknown,
  active: WeakSet<object>,
): JsonSnapshot => {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return { valid: true, value }
  }
  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? { valid: true, value }
      : { valid: false }
  }
  if (typeof value !== 'object' || active.has(value)) {
    return { valid: false }
  }

  active.add(value)
  if (Array.isArray(value)) {
    const length = value.length
    const snapshot: JsonValue[] = new Array(length)
    for (let index = 0; index < length; index += 1) {
      if (!Object.hasOwn(value, index)) continue
      const child = snapshotJsonValueIn(value[index], active)
      if (!child.valid) {
        active.delete(value)
        return { valid: false }
      }
      snapshot[index] = child.value
    }
    active.delete(value)
    return { valid: true, value: Object.freeze(snapshot) }
  }
  if (!isPlainRecord(value)) {
    active.delete(value)
    return { valid: false }
  }

  const snapshot: Record<string, JsonValue> = {}
  for (const [key, childValue] of Object.entries(value)) {
    const child = snapshotJsonValueIn(childValue, active)
    if (!child.valid) {
      active.delete(value)
      return { valid: false }
    }
    Object.defineProperty(snapshot, key, {
      value: child.value,
      enumerable: true,
      configurable: true,
      writable: true,
    })
  }
  active.delete(value)
  return { valid: true, value: Object.freeze(snapshot) }
}

export type JsonValueFailure = Readonly<{
  readonly _tag: 'JsonValueFailure'
  readonly kind: 'TypeError'
  readonly reason: 'invalid-value' | 'hostile-input'
  readonly message: string
  readonly value?: unknown
}>

const jsonValueFailure = (
  reason: JsonValueFailure['reason'],
  message: string,
  value?: unknown,
): JsonValueFailure => ({
  _tag: 'JsonValueFailure',
  kind: 'TypeError',
  reason,
  message,
  ...(value === undefined ? {} : { value }),
})

export const jsonValueFromUnknown = (
  value: unknown,
): Result.Result<JsonValue, JsonValueFailure> => {
  const normalized = Effect.runSync(Effect.result(Effect.try({
    try: () => snapshotJsonValueIn(value, new WeakSet<object>()),
    catch: () => jsonValueFailure('hostile-input', 'Unable to inspect JSON value', value),
  })))
  if (Result.isFailure(normalized)) return Result.fail(normalized.failure)
  return normalized.success.valid
    ? Result.succeed(normalized.success.value)
    : Result.fail(jsonValueFailure('invalid-value', 'Value must be a finite, acyclic JSON value', value))
}

const isJsonObject = (value: JsonValue): value is JsonObject =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const jsonValuesEqual = (left: JsonValue, right: JsonValue): boolean => {
  if (Object.is(left, right)) {
    return true;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    if (
      !Array.isArray(left) ||
      !Array.isArray(right) ||
      left.length !== right.length
    ) {
      return false;
    }
    return left.every((value, index) => {
      const rightValue = right[index];
      return rightValue !== undefined && jsonValuesEqual(value, rightValue);
    });
  }
  if (!isJsonObject(left) || !isJsonObject(right)) {
    return false;
  }
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every((key) => {
      if (!Object.hasOwn(right, key)) {
        return false;
      }
      const leftValue = left[key];
      const rightValue = right[key];
      return (
        leftValue !== undefined &&
        rightValue !== undefined &&
        jsonValuesEqual(leftValue, rightValue)
      );
    })
  );
};
