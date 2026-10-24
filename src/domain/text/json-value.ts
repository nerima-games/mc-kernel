import { Effect, Result } from 'effect'
import { MAX_GENERIC_INPUT_ARRAY_LENGTH, snapshotInputValue } from '../../input-snapshot.js'

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

const jsonValueWithPlainRecords = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) {
    const copy: JsonValue[] = new Array(value.length)
    for (let index = 0; index < value.length; index += 1) {
      if (Object.hasOwn(value, index)) {
        const child = value[index]
        if (child !== undefined) copy[index] = jsonValueWithPlainRecords(child)
      }
    }
    return Object.freeze(copy)
  }
  if (value !== null && typeof value === 'object') {
    const copy: Record<string, JsonValue> = {}
    for (const [key, child] of Object.entries(value)) {
      Object.defineProperty(copy, key, {
        configurable: false,
        enumerable: true,
        value: jsonValueWithPlainRecords(child),
        writable: false,
      })
    }
    return Object.freeze(copy)
  }
  return value
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
  const normalized = snapshotInputValue(value, MAX_GENERIC_INPUT_ARRAY_LENGTH)
  if (Result.isFailure(normalized)) {
    const reason = normalized.failure.reason === 'hostile-input' ? 'hostile-input' : 'invalid-value'
    return Result.fail(jsonValueFailure(reason, 'Unable to inspect JSON value', value))
  }
  if (isJsonValue(normalized.success)) return Result.succeed(jsonValueWithPlainRecords(normalized.success))
  return Result.fail(jsonValueFailure('invalid-value', 'Value must be a finite, acyclic JSON value', value))
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
