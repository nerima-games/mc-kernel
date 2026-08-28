import { describe, expect, it } from "vitest";

import {
  isJsonValue,
  jsonValueFromUnknown,
  jsonValuesEqual,
} from "../src/domain/json-value";

describe("JSON values", () => {
  it("recognizes finite, acyclic JSON values", () => {
    expect(isJsonValue(null)).toBe(true);
    expect(isJsonValue(false)).toBe(true);
    expect(isJsonValue(1)).toBe(true);
    expect(isJsonValue("text")).toBe(true);
    expect(isJsonValue([1, { nested: ["text"] }])).toBe(true);

    const nullPrototype: Record<string, unknown> = Object.create(null);
    nullPrototype["value"] = "valid";
    expect(isJsonValue(nullPrototype)).toBe(true);

    const cycle: Record<string, unknown> = {};
    cycle["self"] = cycle;
    expect(isJsonValue(cycle)).toBe(false);
    expect(isJsonValue([undefined])).toBe(false);
    expect(isJsonValue({ value: undefined })).toBe(false);
    expect(isJsonValue(Number.NaN)).toBe(false);
    expect(isJsonValue(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isJsonValue(new Date())).toBe(false);
    expect(isJsonValue(new Map())).toBe(false);
  });

  it("clones and freezes values at the decoder boundary", () => {
    const input = { nested: [1, { valid: true }] };
    const normalized = jsonValueFromUnknown(input);

    expect(normalized).toEqual(input);
    expect(normalized).not.toBe(input);
    if (
      normalized === null ||
      typeof normalized !== "object" ||
      Array.isArray(normalized)
    ) {
      throw new Error("expected a JSON object");
    }
    expect(Object.isFrozen(normalized)).toBe(true);
    const nested = Object.values(normalized)[0];
    if (nested === null || typeof nested !== "object") {
      throw new Error("expected a nested JSON value");
    }
    expect(Object.isFrozen(nested)).toBe(true);
    expect(() => jsonValueFromUnknown(undefined)).toThrow(TypeError);

    const cycle: Record<string, unknown> = {};
    cycle["self"] = cycle;
    expect(() => jsonValueFromUnknown(cycle)).toThrow(TypeError);
  });

  it("compares JSON values structurally", () => {
    expect(jsonValuesEqual(null, null)).toBe(true);
    expect(jsonValuesEqual(true, true)).toBe(true);
    expect(jsonValuesEqual(1, 1)).toBe(true);
    expect(jsonValuesEqual("a", "a")).toBe(true);
    expect(jsonValuesEqual(1, 2)).toBe(false);
    expect(jsonValuesEqual([1, { value: "a" }], [1, { value: "a" }])).toBe(
      true,
    );
    expect(jsonValuesEqual([1], [2])).toBe(false);
    expect(jsonValuesEqual([1], [])).toBe(false);
    expect(jsonValuesEqual([1], { "0": 1 })).toBe(false);
    expect(jsonValuesEqual({ value: 1 }, { value: 1 })).toBe(true);
    expect(jsonValuesEqual({ value: 1 }, { value: 2 })).toBe(false);
    expect(jsonValuesEqual({ value: 1 }, { other: 1 })).toBe(false);
    expect(jsonValuesEqual({ value: 1 }, { value: 1, other: 2 })).toBe(false);
    expect(jsonValuesEqual({}, [])).toBe(false);
    expect(jsonValuesEqual({}, null)).toBe(false);

    expect(
      Reflect.apply(jsonValuesEqual, undefined, [[undefined], [undefined]]),
    ).toBe(false);
    expect(
      Reflect.apply(jsonValuesEqual, undefined, [
        { value: undefined },
        { value: undefined },
      ]),
    ).toBe(false);
  });
});
