import { describe, expect, it } from "vitest";
import * as fc from "effect/FastCheck";
import { itemComponents } from "../src/domain/item-components";
import { itemComponentPatch, itemComponentPatchFromUnknownEither } from "../src/domain/item-component-patch";
import { TransferQuantity } from "../src/domain/time/quantities";
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

const stoneComponentsLiteral = {
  maxStackSize: 64,
  maxDamage: undefined,
  damage: undefined,
  repairCost: 0,
  unbreakable: undefined,
  enchantmentGlintOverride: undefined,
  tooltipDisplay: undefined,
  customName: undefined,
  itemName: undefined,
  lore: undefined,
  itemModel: undefined,
  customData: undefined,
  entityData: undefined,
  bucketEntityData: undefined,
  profile: undefined,
  blockEntityData: undefined,
  chargedProjectiles: undefined,
  bundleContents: undefined,
  container: undefined,
  mapColor: undefined,
  mapDecorations: undefined,
  writableBookContent: undefined,
  writtenBookContent: undefined,
  trim: undefined,
  suspiciousStew: undefined,
  hideAdditionalTooltip: undefined,
  canBreak: undefined,
  canPlaceOn: undefined,
  bees: undefined,
  potionContents: undefined,
  dyedColor: undefined,
  customModelData: undefined,
  mapId: undefined,
  blockState: undefined,
  instrument: undefined,
  noteBlockSound: undefined,
  recipes: undefined,
  lock: undefined,
  tooltipStyle: undefined,
  baseColor: undefined,
  equippable: undefined,
  glider: undefined,
  deathProtection: undefined,
  repairable: undefined,
  enchantable: undefined,
  jukeboxPlayable: undefined,
  ominousBottleAmplifier: undefined,
  paintingVariant: undefined,
  lodestoneTracker: undefined,
  fireworkExplosion: undefined,
  fireworks: undefined,
  bannerPatterns: undefined,
  potDecorations: undefined,
  containerLoot: undefined,
  debugStickState: undefined,
  rarity: "common",
  food: undefined,
  consumable: undefined,
  useRemainder: undefined,
  useCooldown: undefined,
  useEffects: undefined,
  tool: undefined,
  weapon: undefined,
  kineticWeapon: undefined,
  piercingWeapon: undefined,
  attributeModifiers: undefined,
  enchantments: undefined,
  storedEnchantments: undefined,
  blocksAttacks: undefined,
  damageResistant: undefined,
  minimumAttackCharge: undefined,
  damageType: undefined,
  swingAnimation: undefined,
  attackRange: undefined,
  potionDurationScale: undefined,
  breakSound: undefined,
  providesBannerPatterns: undefined,
  providesTrimMaterial: undefined,
  dye: undefined,
  additionalTradeCost: undefined,
  sulfurCubeContent: undefined,
} as const;

const isLiteralRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const literalStackOf = (value: unknown) => {
  if (!isLiteralRecord(value) || !Object.hasOwn(value, "item") || !Object.hasOwn(value, "count") || !Object.hasOwn(value, "components")) {
    throw new Error("invalid literal fixture");
  }
  return itemStackFromUnknown(value["item"], value["count"], { components: value["components"] });
};

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
    const named = {
      item: "stone",
      count: 32,
      components: { ...stoneComponentsLiteral, customName: { text: "K03 stone" } },
    };
    const sharpness = {
      item: "stone",
      count: 1,
      components: { ...stoneComponentsLiteral, enchantments: { "minecraft:sharpness": 5 } },
    };
    const mending = {
      item: "stone",
      count: 1,
      components: { ...stoneComponentsLiteral, enchantments: { "minecraft:mending": 1 } },
    };
    const fortune = {
      item: "stone",
      count: 1,
      components: { ...stoneComponentsLiteral, enchantments: { "minecraft:fortune": 3 } },
    };
    const damaged = {
      item: "diamond_sword",
      count: 1,
      components: { ...stoneComponentsLiteral, maxStackSize: 1, maxDamage: 1561, damage: 0 },
    };
    const expectedNamed = literalStackOf(named);
    expect(expectedNamed).toEqual(named);
    expect(literalStackOf(sharpness)).toEqual(sharpness);
    expect(literalStackOf(mending)).toEqual(mending);
    expect(literalStackOf(fortune)).toEqual(fortune);
    expect(literalStackOf(damaged)).toEqual(damaged);

    const split = splitItemStack(expectedNamed, TransferQuantity(12));
    expect(split.taken).toEqual({ ...named, count: 12 });
    expect(split.remainder).toEqual({ ...named, count: 20 });
    if (split.remainder === undefined) throw new Error("expected literal remainder");
    expect(mergeItemStacks(split.taken, split.remainder)).toEqual({ merged: named, remainder: undefined });

    const one = { item: "stone", count: 1, components: { ...stoneComponentsLiteral, maxStackSize: 99 } };
    const ninetyNine = { item: "stone", count: 99, components: { ...stoneComponentsLiteral, maxStackSize: 99 } };
    expect(literalStackOf(one)).toEqual(one);
    expect(literalStackOf(ninetyNine)).toEqual(ninetyNine);
    expect(() => literalStackOf({ ...ninetyNine, count: 100 })).toThrow(RangeError);

    const left = literalStackOf({ ...ninetyNine, count: 60 });
    const right = literalStackOf({ ...ninetyNine, count: 50 });
    expect(mergeItemStacks(left, right)).toEqual({
      merged: { ...ninetyNine, count: 99 },
      remainder: { ...ninetyNine, count: 11 },
    });
  });

  it("rejects K03 split and merge boundary quantities without partial results", () => {
    const one = { item: "stone", count: 1, components: { ...stoneComponentsLiteral, maxStackSize: 99 } };
    const ninetyNine = { item: "stone", count: 99, components: { ...stoneComponentsLiteral, maxStackSize: 99 } };
    const oneStack = literalStackOf(one);
    const ninetyNineStack = literalStackOf(ninetyNine);
    expect(splitItemStack(oneStack, TransferQuantity(1)).remainder).toBeUndefined();
    expect(splitItemStack(ninetyNineStack, TransferQuantity(99)).remainder).toBeUndefined();
    expect(mergeItemStacks(literalStackOf({ ...ninetyNine, count: 60 }), literalStackOf({ ...ninetyNine, count: 50 }))).toEqual({
      merged: { ...ninetyNine, count: 99 },
      remainder: { ...ninetyNine, count: 11 },
    });
    expect(() => Reflect.apply(splitItemStack, undefined, [ninetyNineStack, 100])).toThrow(RangeError);
    expect(() => Reflect.apply(splitItemStack, undefined, [ninetyNineStack, 0])).toThrow(RangeError);
    expect(() => Reflect.apply(splitItemStack, undefined, [ninetyNineStack, 1.5])).toThrow(RangeError);
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
