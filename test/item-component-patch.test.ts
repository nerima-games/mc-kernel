import { describe, expect, it } from "vitest";

import {
  ItemComponentPatchKey,
  applyItemComponentPatch,
  isItemComponentPatch,
  itemComponentPatch,
  itemComponentPatchFromUnknown,
  itemComponentPatchFromUnknownEither,
  itemComponentPatchesEqual,
  mergeItemComponentPatches,
  mergeItemComponentPatchesEither,
} from "../src/domain/item/item-component-patch";
import { itemComponents } from "../src/domain/item/item-components";
import { itemComponentsSnapshot } from "../src/domain/item/item-components-validation";

describe("item component patches", () => {
  it("rejects hostile proxy records without throwing", () => {
    const hostile = new Proxy({}, { ownKeys: () => { throw new Error("hostile"); } });
    expect(isItemComponentPatch(hostile)).toBe(false);
    const symbolHostile = new Proxy({}, { ownKeys: () => { throw Symbol("hostile"); } });
    expect(itemComponentPatchFromUnknownEither(symbolHostile)._tag).toBe("Left");
    expect(Reflect.apply(mergeItemComponentPatchesEither, undefined, [{ invalid: true }, undefined])._tag).toBe("Left");
    let reads = 0;
    const shifting = new Proxy({ "minecraft:damage": 1 }, {
      get: (target, key) => {
        reads += 1;
        if (reads > 1 && key === "minecraft:damage") throw Symbol("hostile");
        return Reflect.get(target, key);
      },
    });
    expect(Reflect.apply(mergeItemComponentPatchesEither, undefined, [shifting, undefined])._tag).toBe("Left");
  });
  it("accepts namespaced component keys and removal keys", () => {
    expect(ItemComponentPatchKey.is("minecraft:custom_name")).toBe(true);
    expect(ItemComponentPatchKey.is("!minecraft:damage")).toBe(true);
    expect(ItemComponentPatchKey.is("!")).toBe(false);
    expect(ItemComponentPatchKey.is("custom_name")).toBe(false);
    expect(() => ItemComponentPatchKey("minecraft:custom_name")).not.toThrow();
    expect(() => ItemComponentPatchKey("!")).toThrow();

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
  });

  it("decodes and freezes arbitrary JSON component values", () => {
    const input = {
      "minecraft:custom_data": { nested: [1, true] },
    };
    const normalized = itemComponentPatchFromUnknown(input);

    expect(normalized).toEqual(input);
    expect(normalized).not.toBe(input);
    const value = Object.values(normalized)[0];
    if (value === undefined || value === null || typeof value !== "object") {
      throw new Error("expected a nested component value");
    }
    expect(Object.isFrozen(value)).toBe(true);
    expect(() => itemComponentPatchFromUnknown(null)).toThrow(TypeError);
    expect(() => itemComponentPatchFromUnknown([])).toThrow(TypeError);
    expect(() =>
      itemComponentPatchFromUnknown({ custom_name: "Stone" }),
    ).toThrow(TypeError);
    expect(() => itemComponentPatchFromUnknown({ "!": null })).toThrow(
      TypeError,
    );
    expect(() =>
      itemComponentPatchFromUnknown({ "minecraft:damage": undefined }),
    ).toThrow(TypeError);
    expect(() =>
      itemComponentPatchFromUnknown({ "minecraft:damage": Number.NaN }),
    ).toThrow(TypeError);
    expect(() => itemComponentPatchFromUnknown(new Date())).toThrow(TypeError);

    const cycle: Record<string, unknown> = {};
    cycle["self"] = cycle;
    expect(() =>
      itemComponentPatchFromUnknown({ "minecraft:custom_data": cycle }),
    ).toThrow(TypeError);
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

    expect(mergeItemComponentPatches(undefined, undefined)).toBeUndefined();
    expect(mergeItemComponentPatches(left, undefined)).toEqual(left);
    expect(mergeItemComponentPatches(undefined, right)).toEqual(right);
    const conflict = mergeItemComponentPatchesEither(left, right);
    expect(conflict._tag).toBe("Left");
    if (conflict._tag === "Left") {
      expect(conflict.left).toMatchObject({ _tag: "ItemComponentPatchConflictError", componentKey: "minecraft:custom_name" });
    }
    expect(mergeItemComponentPatches(left, itemComponentPatch({ "minecraft:repair_cost": 1 }))).toEqual({
      "minecraft:custom_name": "Stone",
      "minecraft:damage": 1,
      "minecraft:repair_cost": 1,
    });
    expect(() => mergeItemComponentPatches(
      itemComponentPatch({ "minecraft:damage": 1 }),
      itemComponentPatch({ "!minecraft:damage": null }),
    )).toThrow();
    expect(() =>
      Reflect.apply(mergeItemComponentPatches, undefined, [
        { invalid: true },
        right,
      ]),
    ).toThrow(TypeError);
    expect(() =>
      Reflect.apply(mergeItemComponentPatches, undefined, [
        left,
        { invalid: true },
      ]),
    ).toThrow(TypeError);

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
    expect(() =>
      Reflect.apply(mergeItemComponentPatches, undefined, [shifting, right]),
    ).toThrow(TypeError);
  });

  it("applies supported set/remove operations and rejects malformed operations", () => {
    const base = itemComponents("stone");
    expect(applyItemComponentPatch(base, itemComponentPatch({
      "minecraft:custom_name": { text: "Stone" },
    }))).toBeDefined();
    expect(applyItemComponentPatch(base, itemComponentPatch({
      "!minecraft:custom_name": null,
    }))).toEqual(base);
    expect(() => Reflect.apply(applyItemComponentPatch, undefined, [{}, itemComponentPatch({})])).toThrow(TypeError);
    expect(() => Reflect.apply(applyItemComponentPatch, undefined, [base, { invalid: true }])).toThrow(TypeError);
    expect(() => applyItemComponentPatch(base, itemComponentPatch({ "minecraft:unknown": true }))).toThrow(TypeError);
    expect(() => applyItemComponentPatch(base, itemComponentPatch({ "!minecraft:custom_name": true }))).toThrow(TypeError);
    expect(() => applyItemComponentPatch(base, itemComponentPatch({ "minecraft:max_stack_size": 0 }))).toThrow(TypeError);
    expect(() => Reflect.apply(itemComponentsSnapshot, undefined, [{}])).toThrow(TypeError);
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
    expect(() => Reflect.apply(itemComponentsSnapshot, undefined, [unstable])).toThrow(TypeError);
  });
});
