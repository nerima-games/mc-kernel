import { describe, expect, it } from "vitest";
import * as fc from "effect/FastCheck";
import { itemComponents } from "../src/domain/item-components";
import { itemComponentPatch, itemComponentPatchFromUnknownEither } from "../src/domain/item-component-patch";
import { TransferQuantity } from "../src/domain/quantities";
import {
  isItemStack,
  itemStack,
  itemStackFromUnknown,
  itemStackEqualsIgnoringCount,
  itemStackWithCount,
  maxStackCountForItem,
  mergeItemStacks,
  splitItemStack,
  transmuteItemStack,
} from "../src/domain/item-stack";

describe("canonical item stacks", () => {
  it("uses ordinary limits and stores only a resolved payload", () => {
    expect(maxStackCountForItem("stone")).toBe(64);
    expect(maxStackCountForItem("ender_pearl")).toBe(16);
    expect(maxStackCountForItem("diamond_pickaxe")).toBe(1);
    const stack = itemStack("stone", 64);
    expect(Object.keys(stack)).toEqual(["item", "count", "components"]);
    expect(Object.isFrozen(stack)).toBe(true);
    expect(isItemStack(stack)).toBe(true);
    expect(() => itemStack("stone", 0)).toThrow(RangeError);
    expect(() => itemStack("stone", 65)).toThrow(RangeError);
    expect(() => itemStack("stone", Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it("resolves patches at construction and removes fields canonically", () => {
    const patch = itemComponentPatch({ "minecraft:custom_name": { text: "Stone" } });
    const stack = itemStack("stone", 1, { componentPatch: patch });
    expect(stack).toEqual({ item: "stone", count: 1, components: { ...itemComponents("stone"), customName: { text: "Stone" } } });
    expect("componentPatch" in stack).toBe(false);
    const removed = itemStack("stone", 1, { componentPatch: itemComponentPatch({ "!minecraft:custom_name": null }) });
    if (removed.components === undefined) throw new Error("expected canonical components");
    expect("customName" in removed.components).toBe(false);
    expect(JSON.stringify(removed.components)).not.toContain("customName");
  });

  it("rejects duplicate canonical keys with a tagged error", () => {
    const left = itemComponentPatch({ "minecraft:damage": 1 });
    const right = itemComponentPatch({ "minecraft:damage": 2 });
    expect(() => itemStack("diamond_sword", 1, { componentPatch: left })).not.toThrow();
    expect(itemComponentPatchFromUnknownEither({ "minecraft:damage": 1, "!minecraft:damage": null })._tag).toBe("Left");
    expect(left).not.toBe(right);
    expect(() => itemStackFromUnknown("stone", 1, { components: {} })).toThrow(TypeError);
    expect(() => itemStackFromUnknown("stone", 1, { componentPatch: { invalid: true } })).toThrow(TypeError);
  });

  it("keeps payload isolated through count changes and split/merge", () => {
    const payload = itemComponents("stone", { rarity: "rare", customData: { value: { nested: true } } });
    const source = itemStack("stone", 32, { components: payload });
    const changed = itemStackWithCount(source, 12);
    const split = splitItemStack(source, TransferQuantity(12));
    expect(itemStackEqualsIgnoringCount(source, changed)).toBe(true);
    expect(split.taken.count + (split.remainder?.count ?? 0)).toBe(32);
    expect(split.remainder).toBeDefined();
    if (split.remainder === undefined) throw new Error("expected remainder");
    expect(mergeItemStacks(split.taken, split.remainder)).toEqual({ merged: source, remainder: undefined });
    expect(() => Reflect.apply(splitItemStack, undefined, [source, 0])).toThrow(RangeError);
    expect(split.taken.components).not.toBe(payload);
    expect(Object.isFrozen(split.taken.components)).toBe(true);
  });

  it("accepts a 99-item override and rejects 100", () => {
    const components = itemComponents("stone", { maxStackSize: 99 });
    expect(itemStack("stone", 65, { components }).count).toBe(65);
    expect(itemStack("stone", 99, { components }).count).toBe(99);
    expect(() => itemStack("stone", 100, { components })).toThrow(RangeError);
    expect(itemStackFromUnknown("stone", 1, { components })).toBeDefined();
  });

  it("rejects malformed operation inputs and reports merge overflow", () => {
    const left = itemStack("stone", 64);
    const right = itemStack("stone", 2);
    expect(() => Reflect.apply(itemStackWithCount, undefined, [{}, 1])).toThrow(TypeError);
    expect(() => Reflect.apply(transmuteItemStack, undefined, [{}, right])).toThrow(TypeError);
    expect(() => Reflect.apply(mergeItemStacks, undefined, [{}, right])).toThrow(TypeError);
    expect(() => mergeItemStacks(left, right)).not.toThrow();
    expect(mergeItemStacks(left, right).remainder?.count).toBe(2);
  });

  it("preserves split/merge arithmetic for generated positive counts", () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 64 }), fc.integer({ min: 1, max: 64 }), (count, amount) => {
      const source = itemStack("stone", count);
      const splitAmount = Math.min(amount, count);
      const split = splitItemStack(source, TransferQuantity(splitAmount));
      const remainderCount = split.remainder?.count ?? 0;
      expect(split.taken.count + remainderCount).toBe(count);
      if (split.remainder !== undefined) {
        expect(mergeItemStacks(split.taken, split.remainder).merged.count).toBe(count);
      } else {
        expect(split.taken.count).toBe(count);
      }
    }));
  });
});
