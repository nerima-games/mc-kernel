import { describe, expect, it } from "vitest";

import { itemComponents } from "../src/domain/item-components";
import { itemComponentPatch } from "../src/domain/item-component-patch";
import {
  isItemStack,
  itemStack,
  itemStackFromUnknown,
  itemStackWithCount,
  itemStacksCanMerge,
  maxStackCountForItem,
  transmuteItemStack,
} from "../src/domain/item-stack";

describe("item stacks", () => {
  it("uses the item registry stack limits", () => {
    expect(maxStackCountForItem("stone")).toBe(64);
    expect(maxStackCountForItem("ender_pearl")).toBe(16);
    expect(maxStackCountForItem("diamond_pickaxe")).toBe(1);
    expect(itemStack("stone", 64)).toEqual({ item: "stone", count: 64 });
    expect(itemStack("ender_pearl", 16)).toEqual({
      item: "ender_pearl",
      count: 16,
    });
    expect(itemStack("diamond_pickaxe", 1)).toEqual({
      item: "diamond_pickaxe",
      count: 1,
    });
  });

  it("rejects unknown items and invalid counts", () => {
    expect(itemStackFromUnknown("stone", 1)).toEqual({
      item: "stone",
      count: 1,
    });
    expect(() => itemStackFromUnknown("unknown", 1)).toThrow(TypeError);
    expect(() => itemStackFromUnknown("stone", "1")).toThrow(TypeError);
    expect(() => itemStackFromUnknown("stone", 1, null)).toThrow(TypeError);
    expect(() => itemStackFromUnknown("stone", 1, { components: {} })).toThrow(
      TypeError,
    );
    expect(() => Reflect.apply(itemStack, undefined, ["unknown", 1])).toThrow(
      TypeError,
    );
    expect(() => itemStack("stone", 0)).toThrow(RangeError);
    expect(() => itemStack("stone", 65)).toThrow(RangeError);
    expect(() => itemStack("stone", 1.5)).toThrow(RangeError);
    expect(() => itemStack("stone", Number.NaN)).toThrow(RangeError);
    expect(() => itemStack("diamond_pickaxe", 2)).toThrow(RangeError);
  });

  it("preserves resolved components and merges only structurally equal stacks", () => {
    const rare = itemComponents("stone", { maxStackSize: 2, rarity: "rare" });
    const sameRare = itemComponents("stone", {
      maxStackSize: 2,
      rarity: "rare",
    });
    const epic = itemComponents("stone", { maxStackSize: 2, rarity: "epic" });
    const stack = itemStack("stone", 2, { components: rare });

    expect(stack).toEqual({ item: "stone", count: 2, components: rare });
    expect(itemStackWithCount(stack, 1)).toEqual({
      item: "stone",
      count: 1,
      components: rare,
    });
    expect(itemStackFromUnknown("stone", 1, { components: sameRare })).toEqual({
      item: "stone",
      count: 1,
      components: sameRare,
    });
    expect(
      itemStacksCanMerge(itemStack("stone", 1), itemStack("stone", 1)),
    ).toBe(true);
    expect(itemStacksCanMerge(itemStack("stone", 1), stack)).toBe(false);
    expect(
      itemStacksCanMerge(
        stack,
        itemStack("stone", 1, { components: sameRare }),
      ),
    ).toBe(true);
    expect(
      itemStacksCanMerge(stack, itemStack("stone", 1, { components: epic })),
    ).toBe(false);
    expect(itemStacksCanMerge(stack, itemStack("dirt", 1))).toBe(false);
    expect(() => itemStack("stone", 3, { components: rare })).toThrow(
      RangeError,
    );

    const honey = itemComponents("honey_bottle");
    const honeyConsumable = honey.consumable;
    if (honeyConsumable === undefined) {
      throw new Error("expected honey bottle consumable component");
    }
    const clonedHoney = itemComponents("honey_bottle", {
      consumable: {
        ...honeyConsumable,
        onConsumeEffects: [...honeyConsumable.onConsumeEffects],
      },
    });
    const changedHoney = itemComponents("honey_bottle", {
      consumable: { ...honeyConsumable, onConsumeEffects: [] },
    });
    expect(
      itemStacksCanMerge(
        itemStack("honey_bottle", 1, { components: honey }),
        itemStack("honey_bottle", 1, { components: clonedHoney }),
      ),
    ).toBe(true);
    expect(
      itemStacksCanMerge(
        itemStack("honey_bottle", 1, { components: honey }),
        itemStack("honey_bottle", 1, { components: changedHoney }),
      ),
    ).toBe(false);
  });

  it("preserves component patches and includes them in merge identity", () => {
    const patch = itemComponentPatch({
      "minecraft:custom_name": "Stone",
      "!minecraft:damage": null,
    });
    const samePatch = itemComponentPatch({
      "minecraft:custom_name": "Stone",
      "!minecraft:damage": null,
    });
    const changedPatch = itemComponentPatch({
      "minecraft:custom_name": "Dirt",
      "!minecraft:damage": null,
    });
    const patched = itemStack("stone", 1, { componentPatch: patch });
    const fullyPatched = itemStack("stone", 1, {
      components: itemComponents("stone"),
      componentPatch: patch,
    });

    expect(patched).toEqual({ item: "stone", count: 1, componentPatch: patch });
    expect(itemStackWithCount(patched, 2)).toEqual({
      item: "stone",
      count: 2,
      componentPatch: patch,
    });
    expect(
      itemStackFromUnknown("stone", 1, { componentPatch: samePatch }),
    ).toEqual({
      item: "stone",
      count: 1,
      componentPatch: samePatch,
    });
    expect(fullyPatched).toEqual({
      item: "stone",
      count: 1,
      components: itemComponents("stone"),
      componentPatch: patch,
    });
    expect(
      itemStacksCanMerge(
        patched,
        itemStack("stone", 1, { componentPatch: samePatch }),
      ),
    ).toBe(true);
    expect(
      itemStacksCanMerge(
        patched,
        itemStack("stone", 1, { componentPatch: changedPatch }),
      ),
    ).toBe(false);
    expect(itemStacksCanMerge(patched, itemStack("stone", 1))).toBe(false);
    expect(() =>
      itemStackFromUnknown("stone", 1, { componentPatch: { invalid: true } }),
    ).toThrow(TypeError);
  });

  it("transmutes immutable stack state and merges component patches", () => {
    const sourcePatch = itemComponentPatch({
      "minecraft:custom_name": "Source",
      "minecraft:damage": 1,
    });
    const resultPatch = itemComponentPatch({
      "minecraft:custom_name": "Result",
      "!minecraft:damage": null,
    });
    const source = itemStack("stone", 2, {
      components: itemComponents("stone"),
      componentPatch: sourcePatch,
    });
    const result = itemStack("diamond", 1, { componentPatch: resultPatch });

    expect(transmuteItemStack(source, result)).toEqual({
      item: "diamond",
      count: 1,
      components: itemComponents("stone"),
      componentPatch: {
        "minecraft:custom_name": "Result",
        "minecraft:damage": 1,
        "!minecraft:damage": null,
      },
    });
    expect(transmuteItemStack(source, itemStack("diamond", 1))).toEqual({
      item: "diamond",
      count: 1,
      components: itemComponents("stone"),
      componentPatch: sourcePatch,
    });
    expect(() => transmuteItemStack(source, result, 65)).toThrow(RangeError);
    expect(() =>
      Reflect.apply(transmuteItemStack, undefined, [{}, result]),
    ).toThrow(TypeError);
  });

  it("guards arbitrary values at a boundary", () => {
    expect(isItemStack(itemStack("stone", 1))).toBe(true);
    expect(isItemStack(null)).toBe(false);
    expect(isItemStack("stone")).toBe(false);
    expect(isItemStack({})).toBe(false);
    expect(isItemStack({ item: "unknown", count: 1 })).toBe(false);
    expect(isItemStack({ item: "stone", count: 1, extra: true })).toBe(false);
    expect(isItemStack({ item: "stone", count: 0 })).toBe(false);
    expect(isItemStack({ item: "stone", count: 1.5 })).toBe(false);
    expect(isItemStack({ item: "diamond_pickaxe", count: 2 })).toBe(false);
    expect(isItemStack({ item: "stone", count: 1, components: {} })).toBe(
      false,
    );
    expect(
      isItemStack({
        item: "stone",
        count: 1,
        componentPatch: { "minecraft:damage": 1 },
      }),
    ).toBe(true);
    expect(
      isItemStack({
        item: "stone",
        count: 1,
        componentPatch: { invalid: true },
      }),
    ).toBe(false);
    expect(
      isItemStack({
        item: "stone",
        count: 3,
        components: itemComponents("stone", { maxStackSize: 2 }),
      }),
    ).toBe(false);
  });
});
