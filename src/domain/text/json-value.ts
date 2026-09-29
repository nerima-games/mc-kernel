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

export const isJsonValue = (value: unknown): value is JsonValue =>
  isJsonValueIn(value, new WeakSet<object>());

const freezeJsonValue = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) {
    return Object.freeze(value.map(freezeJsonValue));
  }
  if (value !== null && typeof value === "object") {
    const frozen: Record<string, JsonValue> = {};
    for (const [key, child] of Object.entries(value)) {
      frozen[key] = freezeJsonValue(child);
    }
    return Object.freeze(frozen);
  }
  return value;
};

export const jsonValueFromUnknown = (value: unknown): JsonValue => {
  if (!isJsonValue(value)) {
    throw new TypeError("Value must be a finite, acyclic JSON value");
  }
  return freezeJsonValue(value);
};

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
