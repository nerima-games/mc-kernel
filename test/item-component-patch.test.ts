import { describe, expect, it } from "vitest";
import { Result } from "effect";
import { ok } from "node:assert/strict";

import {
  ItemComponentPatchConflictError,
  ItemComponentPatchKey,
  applyItemComponentPatch,
  decodeItemComponentPatch,
  isItemComponentPatch,
  itemComponentPatch as itemComponentPatchResult,
  itemComponentPatchesEqual,
  mergeItemComponentPatches,
} from "../src/domain/item/item-component-patch";
import { itemComponents as itemComponentsResult } from "../src/domain/item/item-components";
import { itemComponentsSnapshot } from "../src/domain/item/item-components-validation";
import { expectItemFailure, itemResultValue } from "./item-result-assertions";

const itemComponentPatch = (options: Parameters<typeof itemComponentPatchResult>[0]) =>
  itemResultValue(itemComponentPatchResult(options));
const itemComponents = (...args: Parameters<typeof itemComponentsResult>) =>
  itemResultValue(itemComponentsResult(...args));

describe("item component patches", () => {
  it("rejects hostile proxy records without throwing", () => {
    const revokedOwnKeys = Proxy.revocable({}, {});
    revokedOwnKeys.revoke();
    const hostile = new Proxy({}, { ownKeys: () => Reflect.ownKeys(revokedOwnKeys.proxy) });
    expect(isItemComponentPatch(hostile)).toBe(false);
    const symbolHostile = new Proxy({}, { ownKeys: () => { throw Symbol("hostile"); } });
    expectItemFailure(decodeItemComponentPatch(symbolHostile), {
      _tag: "ItemValidationFailure", field: "patch", reason: "hostile-input", value: symbolHostile,
    });
    expectItemFailure(Reflect.apply(mergeItemComponentPatches, undefined, [{ invalid: true }, undefined]), {
      _tag: "ItemValidationFailure", field: "invalid", reason: "invalid-value", value: "invalid",
    });
    let reads = 0;
    const shifting = new Proxy({ "minecraft:damage": 1 }, {
      get: (target, key) => {
        reads += 1;
        if (reads > 1 && key === "minecraft:damage") throw Symbol("hostile");
        return Reflect.get(target, key);
      },
    });
    expectItemFailure(Reflect.apply(mergeItemComponentPatches, undefined, [shifting, undefined]), {
      _tag: "ItemValidationFailure", field: "minecraft:damage", reason: "hostile-input", value: shifting,
    });
  });

  it("captures hostile reflection while cloning nested patch values", () => {
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    expectItemFailure(decodeItemComponentPatch(revoked.proxy), {
      _tag: "ItemValidationFailure", field: "patch", reason: "hostile-input",
    });

    const hostilePrototype = new Proxy({}, { getPrototypeOf: () => { throw new Error("hostile"); } });
    expectItemFailure(decodeItemComponentPatch(hostilePrototype), {
      _tag: "ItemValidationFailure", field: "patch", reason: "hostile-input",
    });

    const nestedRevoked = Proxy.revocable({}, {});
    nestedRevoked.revoke();
    expectItemFailure(decodeItemComponentPatch({ "minecraft:custom_data": nestedRevoked.proxy }), {
      _tag: "ItemValidationFailure", field: "minecraft:custom_data", reason: "hostile-input",
    });

    const nestedHostilePrototype = new Proxy({}, { getPrototypeOf: () => { throw new Error("hostile"); } });
    expectItemFailure(decodeItemComponentPatch({ "minecraft:custom_data": nestedHostilePrototype }), {
      _tag: "ItemValidationFailure", field: "minecraft:custom_data", reason: "hostile-input",
    });

    const hostileLength = new Proxy([], {
      get: (target, key, receiver) => key === "length" ? (() => { throw new Error("hostile"); })() : Reflect.get(target, key, receiver),
    });
    expectItemFailure(decodeItemComponentPatch({ "minecraft:custom_data": hostileLength }), {
      _tag: "ItemValidationFailure", field: "minecraft:custom_data", reason: "hostile-input",
    });

    const hostileEntry = new Proxy(["value"], {
      get: (target, key, receiver) => key === "0" ? (() => { throw new Error("hostile"); })() : Reflect.get(target, key, receiver),
    });
    expectItemFailure(decodeItemComponentPatch({ "minecraft:custom_data": hostileEntry }), {
      _tag: "ItemValidationFailure", field: "minecraft:custom_data[0]", reason: "hostile-input",
    });

    const hostileKeys = new Proxy({}, { ownKeys: () => { throw new Error("hostile"); } });
    expectItemFailure(decodeItemComponentPatch({ "minecraft:custom_data": hostileKeys }), {
      _tag: "ItemValidationFailure", field: "minecraft:custom_data", reason: "hostile-input",
    });

    const hostileValue = new Proxy({ leaf: 1 }, {
      get: (target, key, receiver) => key === "leaf" ? (() => { throw new Error("hostile"); })() : Reflect.get(target, key, receiver),
    });
    expectItemFailure(decodeItemComponentPatch({ "minecraft:custom_data": hostileValue }), {
      _tag: "ItemValidationFailure", field: "minecraft:custom_data.leaf", reason: "hostile-input",
    });

    const cyclicArray: unknown[] = [];
    cyclicArray.push(cyclicArray);
    expectItemFailure(decodeItemComponentPatch({ "minecraft:custom_data": cyclicArray }), {
      _tag: "ItemValidationFailure", field: "minecraft:custom_data[0]", reason: "invalid-value",
    });
  });

  it("accepts namespaced component keys and removal keys", () => {
    expect(ItemComponentPatchKey.is("minecraft:custom_name")).toBe(true);
    expect(ItemComponentPatchKey.is("!minecraft:damage")).toBe(true);
    expect(ItemComponentPatchKey.is("!")).toBe(false);
    expect(ItemComponentPatchKey.is("custom_name")).toBe(false);
    expect(ItemComponentPatchKey.result("minecraft:custom_name")).toMatchObject({ _tag: "Success" });
    expect(Result.isFailure(ItemComponentPatchKey.result("!"))).toBe(true);

    const patch = itemComponentPatch({
      "minecraft:custom_name": "Stone",
      "!minecraft:damage": null,
    });
    expect(patch).toEqual({
      "minecraft:custom_name": "Stone",
      "!minecraft:damage": null,
    });
    expect(Object.isFrozen(patch)).toBe(true);
    expect(isItemComponentPatch(patch)).toBe(true);
    expect(isItemComponentPatch(Object.create(null))).toBe(true);
    expectItemFailure(ItemComponentPatchConflictError({ componentKey: "custom_name" }), {
      _tag: "ItemValidationFailure",
      field: "custom_name",
      kind: "TypeError",
      reason: "invalid-value",
      message: 'NamespacedResourceLocation must include a namespace, received "custom_name"',
      value: "custom_name",
    });
  });

  it("decodes and freezes arbitrary JSON component values", () => {
    const input = {
      "minecraft:custom_data": { nested: [1, true] },
    };
    const normalized = itemResultValue(decodeItemComponentPatch(input));

    expect(normalized).toEqual(input);
    expect(normalized).not.toBe(input);
    const value = Object.values(normalized)[0];
    ok(value !== undefined && value !== null && typeof value === "object");
    expect(Object.isFrozen(value)).toBe(true);
    expectItemFailure(decodeItemComponentPatch(null), {
      _tag: "ItemValidationFailure", field: "patch", reason: "invalid-type", value: null,
    });
    expectItemFailure(decodeItemComponentPatch([]), {
      _tag: "ItemValidationFailure", field: "patch", reason: "invalid-type", value: [],
    });
    expectItemFailure(decodeItemComponentPatch({ custom_name: "Stone" }), {
      _tag: "ItemValidationFailure", field: "custom_name", reason: "invalid-value", value: "custom_name",
    });
    expectItemFailure(decodeItemComponentPatch({ "!": null }), {
      _tag: "ItemValidationFailure", field: "!", reason: "invalid-value", value: "!",
    });
    expectItemFailure(decodeItemComponentPatch({ "minecraft:damage": undefined }), {
      _tag: "ItemValidationFailure", field: "minecraft:damage", reason: "invalid-type", value: undefined,
    });
    expectItemFailure(decodeItemComponentPatch({ "minecraft:damage": Number.NaN }), {
      _tag: "ItemValidationFailure", field: "minecraft:damage", reason: "invalid-value", value: Number.NaN,
    });
    expectItemFailure(decodeItemComponentPatch(new Date()), {
      _tag: "ItemValidationFailure", field: "patch", reason: "invalid-type", value: expect.any(Date),
    });

    expectItemFailure(decodeItemComponentPatch({ "minecraft:custom_data": new Date(0) }), {
      _tag: "ItemValidationFailure", field: "minecraft:custom_data", reason: "invalid-type",
    });
    const nullPrototype: Record<string, unknown> = Object.create(null);
    nullPrototype["nested"] = true;
    expect(decodeItemComponentPatch({ "minecraft:custom_data": nullPrototype })).toMatchObject({
      _tag: "Success", success: { "minecraft:custom_data": { nested: true } },
    });

    const cycle: Record<string, unknown> = {};
    cycle["self"] = cycle;
    expectItemFailure(decodeItemComponentPatch({ "minecraft:custom_data": cycle }), {
      _tag: "ItemValidationFailure", field: "minecraft:custom_data.self", reason: "invalid-value", value: cycle,
    });
  });

  it("validates component patch shapes without throwing", () => {
    const patch = itemComponentPatch({ "minecraft:custom_name": "Stone" });
    expect(isItemComponentPatch(null)).toBe(false);
    expect(isItemComponentPatch([])).toBe(false);
    expect(isItemComponentPatch(new Date())).toBe(false);
    expect(isItemComponentPatch({ custom_name: "Stone" })).toBe(false);
    expect(isItemComponentPatch({ "minecraft:custom_name": undefined })).toBe(
      false,
    );
    expect(isItemComponentPatch({ "minecraft:custom_name": Number.NaN })).toBe(
      false,
    );
    expect(isItemComponentPatch(patch)).toBe(true);
  });

  it("compares patches by keys and JSON values", () => {
    const empty = itemComponentPatch({});
    const first = itemComponentPatch({
      "minecraft:custom_name": { text: "Stone" },
    });
    const same = itemComponentPatch({
      "minecraft:custom_name": { text: "Stone" },
    });
    const changed = itemComponentPatch({
      "minecraft:custom_name": { text: "Dirt" },
    });
    const additional = itemComponentPatch({
      "minecraft:custom_name": { text: "Stone" },
      "minecraft:damage": 1,
    });

    expect(itemComponentPatchesEqual(empty, empty)).toBe(true);
    expect(itemComponentPatchesEqual(undefined, undefined)).toBe(true);
    expect(itemComponentPatchesEqual(first, undefined)).toBe(false);
    expect(itemComponentPatchesEqual(first, same)).toBe(true);
    expect(itemComponentPatchesEqual(first, changed)).toBe(false);
    expect(itemComponentPatchesEqual(first, additional)).toBe(false);
    expect(
      Reflect.apply(itemComponentPatchesEqual, undefined, [
        { custom_name: "Stone" },
        { custom_name: "Stone" },
      ]),
    ).toBe(false);
    expect(
      Reflect.apply(itemComponentPatchesEqual, undefined, [
        { "minecraft:custom_name": undefined },
        { "minecraft:custom_name": undefined },
      ]),
    ).toBe(false);
  });

  it("rejects conflicting patches", () => {
    const left = itemComponentPatch({
      "minecraft:custom_name": "Stone",
      "minecraft:damage": 1,
    });
    const right = itemComponentPatch({
      "minecraft:custom_name": "Dirt",
      "!minecraft:damage": null,
    });

    expect(itemResultValue(mergeItemComponentPatches(undefined, undefined))).toBeUndefined();
    expect(itemResultValue(mergeItemComponentPatches(left, undefined))).toEqual(left);
    expect(itemResultValue(mergeItemComponentPatches(undefined, right))).toEqual(right);
    const conflict = mergeItemComponentPatches(left, right);
    expectItemFailure(conflict, { _tag: "ItemComponentPatchConflictError", componentKey: "minecraft:custom_name" });
    expect(itemResultValue(mergeItemComponentPatches(left, itemComponentPatch({ "minecraft:repair_cost": 1 })))).toEqual({
      "minecraft:custom_name": "Stone",
      "minecraft:damage": 1,
      "minecraft:repair_cost": 1,
    });
    expectItemFailure(mergeItemComponentPatches(
      itemComponentPatch({ "minecraft:damage": 1 }),
      itemComponentPatch({ "!minecraft:damage": null }),
    ), { _tag: "ItemComponentPatchConflictError", componentKey: "minecraft:damage" });
    expectItemFailure(Reflect.apply(mergeItemComponentPatches, undefined, [
        { invalid: true },
        right,
      ]), { _tag: "ItemValidationFailure", field: "invalid", reason: "invalid-value", value: "invalid" });
    expectItemFailure(Reflect.apply(mergeItemComponentPatches, undefined, [
        left,
        { invalid: true },
      ]), { _tag: "ItemValidationFailure", field: "invalid", reason: "invalid-value", value: "invalid" });

    // Validation and the merge read the patch twice, so a value that answers
    // once and then vanishes has to be caught on the second read rather than
    // merged as `undefined`.
    let reads = 0;
    const shifting = {
      get "minecraft:damage"(): unknown {
        reads += 1;
        return reads <= 1 ? 1 : undefined;
      },
    };
    expectItemFailure(Reflect.apply(mergeItemComponentPatches, undefined, [shifting, right]), {
      _tag: "ItemValidationFailure", field: "minecraft:damage", reason: "invalid-type", value: undefined,
    });
  });

  it("applies supported set/remove operations and rejects malformed operations", () => {
    const base = itemComponents("stone");
    expect(itemResultValue(applyItemComponentPatch(base, itemComponentPatch({
      "minecraft:custom_name": { text: "Stone" },
    })))).toBeDefined();
    expect(itemResultValue(applyItemComponentPatch(base, itemComponentPatch({
      "!minecraft:custom_name": null,
    })))).toEqual(base);
    expectItemFailure(Reflect.apply(applyItemComponentPatch, undefined, [{}, itemComponentPatch({})]), {
      _tag: "ItemValidationFailure", field: "components", reason: "invalid-type", value: {},
    });
    expectItemFailure(Reflect.apply(applyItemComponentPatch, undefined, [base, { invalid: true }]), {
      _tag: "ItemValidationFailure", field: "invalid", reason: "invalid-value", value: "invalid",
    });
    expectItemFailure(applyItemComponentPatch(base, itemComponentPatch({ "minecraft:unknown": true })), {
      _tag: "ItemValidationFailure", field: "minecraft:unknown", reason: "invalid-value", value: "minecraft:unknown",
    });
    expectItemFailure(applyItemComponentPatch(base, itemComponentPatch({ "!minecraft:custom_name": true })), {
      _tag: "ItemValidationFailure", field: "!minecraft:custom_name", reason: "invalid-value", value: true,
    });
    expectItemFailure(applyItemComponentPatch(base, itemComponentPatch({ "minecraft:max_stack_size": 0 })), {
      _tag: "ItemValidationFailure", field: "components", reason: "invalid-value", value: expect.objectContaining({ maxStackSize: 0 }),
    });
    expectItemFailure(Reflect.apply(itemComponentsSnapshot, undefined, [{}]), {
      _tag: "ItemValidationFailure", field: "components", reason: "invalid-type", value: {},
    });
    let maxStackSizeReads = 0;
    const unstable = new Proxy(base, {
      get(target, property, receiver) {
        if (property === "maxStackSize") {
          maxStackSizeReads += 1;
          return maxStackSizeReads === 1 ? 64 : 0;
        }
        return Reflect.get(target, property, receiver);
      },
    });
    expectItemFailure(Reflect.apply(itemComponentsSnapshot, undefined, [unstable]), {
      _tag: "ItemValidationFailure", field: "components", reason: "hostile-input", value: unstable,
    });
  });
});
