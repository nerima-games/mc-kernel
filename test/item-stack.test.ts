import { describe, expect, it } from "vitest";
import * as fc from "effect/FastCheck";
import { itemComponents } from "../src/domain/item-components";
import { itemComponentPatch, itemComponentPatchFromUnknownEither } from "../src/domain/item-component-patch";
import { enchantmentsComponent } from "../src/domain/item-enchantments";
import { TransferQuantity } from "../src/domain/quantities";
import {
  isItemStack,
  itemStack,
  itemStackFromUnknown,
  itemStackEqualsIgnoringCount,
  itemStackWithCount,
  maxStackCountForItem,
  maxStackCountForStack,
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
    expect(() => Reflect.apply(itemStack, undefined, ["not_an_item", 1])).toThrow(TypeError);
    expect(maxStackCountForStack({ item: "stone" })).toBe(64);
  });

  it("rejects hostile stack records without throwing", () => {
    const hostile = new Proxy({}, { ownKeys: () => { throw new Error("hostile"); } });
    expect(isItemStack(hostile)).toBe(false);
    expect(isItemStack({ item: "stone", count: 1, components: itemComponents("stone"), extra: true })).toBe(false);
    expect(isItemStack({ item: "stone", count: 1 })).toBe(false);
    expect(isItemStack({ item: "not_an_item", count: 1, components: itemComponents("stone") })).toBe(false);
    expect(() => itemStackFromUnknown("not_an_item", 1)).toThrow(TypeError);
    expect(() => itemStackFromUnknown("stone", "1")).toThrow(TypeError);
    expect(() => itemStackFromUnknown("stone", 1, null)).toThrow(TypeError);
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

  it("pins the K03 literal payload oracles", () => {
    const named = itemStack("stone", 32, { components: itemComponents("stone", { customName: { text: "K03 stone" } }) });
    const sharpness = itemStack("stone", 1, { components: itemComponents("stone", { enchantments: enchantmentsComponent({ "minecraft:sharpness": 5 }) }) });
    const mending = itemStack("stone", 1, { components: itemComponents("stone", { enchantments: enchantmentsComponent({ "minecraft:mending": 1 }) }) });
    const fortune = itemStack("stone", 1, { components: itemComponents("stone", { enchantments: enchantmentsComponent({ "minecraft:fortune": 3 }) }) });
    const damaged = itemStack("diamond_sword", 1, { components: itemComponents("diamond_sword", { damage: 0 }) });
    const split = splitItemStack(named, TransferQuantity(12));
    expect(named.components.customName).toEqual({ text: "K03 stone" });
    expect(sharpness.components.enchantments).toEqual({ "minecraft:sharpness": 5 });
    expect(mending.components.enchantments).toEqual({ "minecraft:mending": 1 });
    expect(fortune.components.enchantments).toEqual({ "minecraft:fortune": 3 });
    expect(damaged.components.damage).toBe(0);
    expect(split.taken.count).toBe(12);
    expect(split.remainder?.count).toBe(20);
    expect(split.taken.components.customName).toEqual({ text: "K03 stone" });
    expect(mergeItemStacks(split.taken, split.remainder!).merged.count).toBe(32);
    expect(itemStack("stone", 1, { components: itemComponents("stone", { maxStackSize: 99 }) }).count).toBe(1);
    expect(itemStack("stone", 99, { components: itemComponents("stone", { maxStackSize: 99 }) }).count).toBe(99);
    expect(itemStack("diamond_pickaxe", 1).count).toBe(1);
    expect(() => itemStack("diamond_pickaxe", 2)).toThrow(RangeError);
    expect(() => itemStack("stone", 100, { components: itemComponents("stone", { maxStackSize: 99 }) })).toThrow(RangeError);
  });

  it("rejects K03 split and merge boundary quantities without partial results", () => {
    const components = itemComponents("stone", { maxStackSize: 99 });
    const one = itemStack("stone", 1, { components });
    const ninetyNine = itemStack("stone", 99, { components });
    expect(splitItemStack(one, TransferQuantity(1)).remainder).toBeUndefined();
    expect(splitItemStack(ninetyNine, TransferQuantity(99)).remainder).toBeUndefined();
    expect(mergeItemStacks(itemStack("stone", 60, { components }), itemStack("stone", 50, { components }))).toEqual({
      merged: itemStack("stone", 99, { components }),
      remainder: itemStack("stone", 11, { components }),
    });
    expect(() => Reflect.apply(splitItemStack, undefined, [ninetyNine, 100])).toThrow(RangeError);
    expect(() => Reflect.apply(splitItemStack, undefined, [ninetyNine, 0])).toThrow(RangeError);
    expect(() => Reflect.apply(splitItemStack, undefined, [ninetyNine, 1.5])).toThrow(RangeError);
  });

  it("rejects malformed operation inputs and reports merge overflow", () => {
    const left = itemStack("stone", 64);
    const right = itemStack("stone", 2);
    expect(() => Reflect.apply(itemStackWithCount, undefined, [{}, 1])).toThrow(TypeError);
    expect(() => Reflect.apply(transmuteItemStack, undefined, [{}, right])).toThrow(TypeError);
    expect(() => Reflect.apply(mergeItemStacks, undefined, [{}, right])).toThrow(TypeError);
    expect(() => Reflect.apply(splitItemStack, undefined, [{}, 1])).toThrow(TypeError);
    expect(() => mergeItemStacks(left, itemStack("dirt", 1))).toThrow(TypeError);
    expect(() => mergeItemStacks(left, right)).not.toThrow();
    expect(mergeItemStacks(left, right).remainder?.count).toBe(2);
  });

  it("preserves split/merge arithmetic for generated positive counts", () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 99 }), fc.integer({ min: 1, max: 99 }), (count, amount) => {
      const components = itemComponents("stone", { maxStackSize: 99 });
      const source = itemStack("stone", count, { components });
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
