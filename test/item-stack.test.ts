import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import * as itemComponentsResult from "../src/domain/item/item-components";
import * as itemComponentPatchResult from "../src/domain/item/item-component-patch";
import * as ItemPrimitive from "../src/domain/item/item-primitives";
import { ItemDamage, MaxStackSize, StackCount, TransferQuantity } from "../src/domain/time/quantities";
import * as itemStackResult from "../src/domain/item/item-stack";
import { expectItemFailure, itemResultValue } from "./item-result-assertions";

const itemComponents = (...args: Parameters<typeof itemComponentsResult.itemComponents>) =>
  itemResultValue(itemComponentsResult.itemComponents(...args));
const itemComponentPatch = (...args: Parameters<typeof itemComponentPatchResult.itemComponentPatch>) =>
  itemResultValue(itemComponentPatchResult.itemComponentPatch(...args));
const itemStack = (...args: Parameters<typeof itemStackResult.itemStack>) =>
  itemResultValue(itemStackResult.itemStack(...args));
const itemStackFromUnknown = (...args: Parameters<typeof itemStackResult.itemStackFromUnknown>) =>
  itemResultValue(itemStackResult.itemStackFromUnknown(...args));
const itemStackWithCount = (...args: Parameters<typeof itemStackResult.itemStackWithCount>) =>
  itemResultValue(itemStackResult.itemStackWithCount(...args));
const mergeItemStacks = (...args: Parameters<typeof itemStackResult.mergeItemStacks>) =>
  itemResultValue(itemStackResult.mergeItemStacks(...args));
const splitItemStack = (...args: Parameters<typeof itemStackResult.splitItemStack>) =>
  itemResultValue(itemStackResult.splitItemStack(...args));
const transmuteItemStack = (...args: Parameters<typeof itemStackResult.transmuteItemStack>) =>
  itemResultValue(itemStackResult.transmuteItemStack(...args));
const {
  isItemStack,
  itemStackEqualsIgnoringCount,
  itemStacksCanMerge,
  maxStackCountForItem,
  maxStackCountForStack,
} = itemStackResult;

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
  return itemResultValue(itemStackResult.itemStackFromUnknown(value["item"], value["count"], { components: value["components"] }));
};

describe("canonical item stacks", () => {
  it("uses ordinary limits and stores only a resolved payload", () => {
    expect(maxStackCountForItem("stone")).toBe(64);
    expect(maxStackCountForItem("ender_pearl")).toBe(16);
    expect(maxStackCountForItem("diamond_pickaxe")).toBe(1);
    const stack = itemStack("stone", StackCount(64));
    expect(Object.keys(stack)).toEqual(["item", "count", "components"]);
    expect(Object.isFrozen(stack)).toBe(true);
    expect(isItemStack(stack)).toBe(true);
    for (const count of [0, 65, Number.POSITIVE_INFINITY]) {
      expectItemFailure(Reflect.apply(itemStackResult.itemStack, undefined, ["stone", count]), {
        _tag: "ItemValidationFailure",
        kind: "RangeError",
        reason: "out-of-range",
        field: "count",
        message: `Item stack count for stone must be an integer in [1, 64], received ${count}`,
        value: count,
      });
    }
    expectItemFailure(Reflect.apply(itemStackResult.itemStack, undefined, ["not_an_item", 1]), {
      _tag: "ItemValidationFailure",
      kind: "TypeError",
      reason: "invalid-value",
      field: "item",
      message: "Unknown item type: not_an_item",
      value: "not_an_item",
    });
    expect(maxStackCountForStack({ item: "stone" })).toBe(64);
  });

  it("rejects hostile stack records without throwing", () => {
    const hostile = new Proxy({}, { ownKeys: () => { throw new Error("hostile"); } });
    expect(isItemStack(hostile)).toBe(false);
    expect(isItemStack({ item: "stone", count: 1, components: itemComponents("stone"), extra: true })).toBe(false);
    expect(isItemStack({ item: "stone", count: 1 })).toBe(false);
    expect(isItemStack({ item: "not_an_item", count: 1, components: itemComponents("stone") })).toBe(false);
    expectItemFailure(itemStackResult.itemStackFromUnknown("not_an_item", 1), {
      _tag: "ItemValidationFailure", kind: "TypeError", reason: "invalid-value", field: "item",
      message: "Unknown item type: not_an_item", value: "not_an_item",
    });
    expectItemFailure(itemStackResult.itemStackFromUnknown("stone", "1"), {
      _tag: "ItemValidationFailure", kind: "TypeError", reason: "invalid-type", field: "count",
      message: "Item stack count must be a number, received 1", value: "1",
    });
    expectItemFailure(itemStackResult.itemStackFromUnknown("stone", 0), {
      _tag: "ItemValidationFailure", kind: "RangeError", reason: "out-of-range", field: "count",
      message: "Item stack count for stone must be an integer in [1, 64], received 0", value: 0,
    });
    expectItemFailure(itemStackResult.itemStackFromUnknown("stone", 1, null), {
      _tag: "ItemValidationFailure", kind: "TypeError", reason: "invalid-type", field: "options",
      message: "Item stack options must be a non-null object", value: null,
    });
  });

  it("uses one stack snapshot across count, transmute, split, and merge operations", () => {
    const makeChangingStack = () => {
      const reads = { item: 0, count: 0, components: 0 };
      const values = { item: "stone", count: 4, components: itemComponents("stone") };
      const stack = new Proxy({}, {
        ownKeys: () => ["item", "count", "components"],
        getOwnPropertyDescriptor: () => ({ configurable: true, enumerable: true }),
        get: (_target, key) => {
          if (key === "item" || key === "count" || key === "components") {
            reads[key] += 1;
            if (reads[key] > 1) {
              return key === "item" ? "not_an_item" : key === "count" ? 0 : {};
            }
            return values[key];
          }
          return undefined;
        },
      });
      return { stack, reads };
    };

    const counted = makeChangingStack();
    expect(itemResultValue(Reflect.apply(itemStackResult.itemStackWithCount, undefined, [counted.stack, StackCount(3)]))).toEqual({
      item: "stone", count: 3, components: itemComponents("stone"),
    });
    expect(counted.reads).toEqual({ item: 1, count: 1, components: 1 });

    const transmuted = makeChangingStack();
    expect(itemResultValue(Reflect.apply(itemStackResult.transmuteItemStack, undefined, [
      itemStack("dirt", StackCount(1)), transmuted.stack,
    ]))).toEqual({
      item: "stone", count: 4, components: itemComponents("stone"),
    });
    expect(transmuted.reads).toEqual({ item: 1, count: 1, components: 1 });

    const splitSource = makeChangingStack();
    expect(itemResultValue(Reflect.apply(itemStackResult.splitItemStack, undefined, [
      splitSource.stack, TransferQuantity(2),
    ]))).toEqual({
      taken: itemStack("stone", StackCount(2)),
      remainder: itemStack("stone", StackCount(2)),
    });
    expect(splitSource.reads).toEqual({ item: 1, count: 1, components: 1 });

    const left = makeChangingStack();
    const right = makeChangingStack();
    expect(itemResultValue(Reflect.apply(itemStackResult.mergeItemStacks, undefined, [left.stack, right.stack]))).toEqual({
      merged: itemStack("stone", StackCount(8)), remainder: undefined,
    });
    expect(left.reads).toEqual({ item: 1, count: 1, components: 1 });
    expect(right.reads).toEqual({ item: 1, count: 1, components: 1 });

    const compared = makeChangingStack();
    expect(Reflect.apply(itemStackEqualsIgnoringCount, undefined, [
      compared.stack, itemStack("stone", StackCount(1)),
    ])).toBe(true);
    expect(compared.reads).toEqual({ item: 1, count: 1, components: 1 });
  });

  it("returns a hostile-input failure when stack snapshot getters throw", () => {
    const hostile = new Proxy({ item: "stone", count: 4, components: itemComponents("stone") }, {
      get: (target, key, receiver) => key === "count"
        ? (() => { throw new Error("hostile") })()
        : Reflect.get(target, key, receiver),
    });
    const valid = itemStack("stone", StackCount(1));
    const expected = {
      _tag: "ItemValidationFailure", kind: "TypeError", reason: "hostile-input", field: "count",
      message: "Unable to inspect item stack count",
    };
    expectItemFailure(Reflect.apply(itemStackResult.itemStackWithCount, undefined, [hostile, StackCount(2)]), expected);
    expectItemFailure(Reflect.apply(itemStackResult.transmuteItemStack, undefined, [valid, hostile]), expected);
    expectItemFailure(Reflect.apply(itemStackResult.splitItemStack, undefined, [hostile, TransferQuantity(2)]), expected);
    expectItemFailure(Reflect.apply(itemStackResult.mergeItemStacks, undefined, [hostile, valid]), expected);
  });

  it("snapshots nested component graphs and rejects hostile or invalid stacks", () => {
    const invokeWithCount = (stack: unknown) =>
      Reflect.apply(itemStackResult.itemStackWithCount, undefined, [stack, StackCount(1)]);
    const validComponents = itemComponents("stone", {
      customData: { list: [ItemPrimitive.ItemComponentNbtNumber(1), ItemPrimitive.ItemComponentNbtNumber(2)] },
    });
    expect(itemResultValue(invokeWithCount({ item: "stone", count: 1, components: validComponents }))).toEqual(
      itemStack("stone", StackCount(1), { components: validComponents }),
    );

    const shared = { value: ItemPrimitive.ItemComponentNbtNumber(1) };
    const sharedComponents = {
      ...itemComponents("stone"),
      customData: { left: shared, right: shared },
    };
    const sharedStackValue: unknown = itemResultValue(invokeWithCount({
      item: "stone", count: 1, components: sharedComponents,
    }));
    if (!isItemStack(sharedStackValue)) throw new Error("expected a valid stack snapshot");
    const sharedStack = sharedStackValue;
    expect(sharedStack.components.customData?.["left"]).toBe(sharedStack.components.customData?.["right"]);
    expect(sharedStack.components.customData?.["left"]).not.toBe(shared);

    const cyclicRecord: Record<string, unknown> = {};
    cyclicRecord["self"] = cyclicRecord;
    expectItemFailure(invokeWithCount({
      item: "stone", count: 1, components: { ...itemComponents("stone"), customData: cyclicRecord },
    }), {
      _tag: "ItemValidationFailure", kind: "TypeError", reason: "invalid-value", field: "components.customData.self",
      message: "Cyclic item stack components.customData.self is invalid",
    });

    const cyclicArray: unknown[] = [];
    cyclicArray.push(cyclicArray);
    expectItemFailure(invokeWithCount({
      item: "stone", count: 1, components: { ...itemComponents("stone"), customData: cyclicArray },
    }), {
      _tag: "ItemValidationFailure", kind: "TypeError", reason: "invalid-value", field: "components.customData[0]",
      message: "Cyclic item stack components.customData[0] is invalid",
    });

    const hostileArrayLength = new Proxy([], {
      get: (target, key, receiver) => key === "length"
        ? (() => { throw new Error("hostile"); })()
        : Reflect.get(target, key, receiver),
    });
    expectItemFailure(invokeWithCount({
      item: "stone", count: 1, components: { ...itemComponents("stone"), customData: hostileArrayLength },
    }), {
      _tag: "ItemValidationFailure", kind: "TypeError", reason: "hostile-input", field: "components.customData",
      message: "Unable to inspect item stack components.customData",
    });

    const hostileArrayIndex = new Proxy([1], {
      get: (target, key, receiver) => key === "0"
        ? (() => { throw new Error("hostile"); })()
        : Reflect.get(target, key, receiver),
    });
    expectItemFailure(invokeWithCount({
      item: "stone", count: 1, components: { ...itemComponents("stone"), customData: hostileArrayIndex },
    }), {
      _tag: "ItemValidationFailure", kind: "TypeError", reason: "hostile-input", field: "components.customData[0]",
      message: "Unable to inspect item stack components.customData[0]",
    });

    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    expectItemFailure(invokeWithCount({
      item: "stone", count: 1, components: { ...itemComponents("stone"), customData: revoked.proxy },
    }), {
      _tag: "ItemValidationFailure", kind: "TypeError", reason: "hostile-input", field: "components.customData",
      message: "Unable to inspect item stack components.customData",
    });

    const hostilePrototype = new Proxy({}, { getPrototypeOf: () => { throw new Error("hostile"); } });
    expectItemFailure(invokeWithCount({
      item: "stone", count: 1, components: { ...itemComponents("stone"), customData: hostilePrototype },
    }), {
      _tag: "ItemValidationFailure", kind: "TypeError", reason: "hostile-input", field: "components.customData",
      message: "Unable to inspect item stack components.customData",
    });

    const hostileKeys = new Proxy({}, { ownKeys: () => { throw new Error("hostile"); } });
    expectItemFailure(invokeWithCount({
      item: "stone", count: 1, components: { ...itemComponents("stone"), customData: hostileKeys },
    }), {
      _tag: "ItemValidationFailure", kind: "TypeError", reason: "hostile-input", field: "components.customData",
      message: "Unable to inspect item stack components.customData",
    });

    const hostileGetter = new Proxy({}, {
      ownKeys: () => ["value"],
      getOwnPropertyDescriptor: () => ({ configurable: true, enumerable: true }),
      get: () => { throw new Error("hostile"); },
    });
    expectItemFailure(invokeWithCount({
      item: "stone", count: 1, components: { ...itemComponents("stone"), customData: hostileGetter },
    }), {
      _tag: "ItemValidationFailure", kind: "TypeError", reason: "hostile-input", field: "components.customData.value",
      message: "Unable to inspect item stack components.customData.value",
    });

    const customPrototypeValue = Object.assign(Object.create({ inherited: true }), { value: 1 });
    expectItemFailure(invokeWithCount({
      item: "stone", count: 1, components: { ...itemComponents("stone"), customData: customPrototypeValue },
    }), {
      _tag: "ItemValidationFailure", kind: "TypeError", reason: "invalid-type", field: "stack",
      message: "Stack must be an ItemStack",
    });

    const invalidShape = new Proxy({}, { ownKeys: () => { throw new Error("hostile"); } });
    expectItemFailure(invokeWithCount(invalidShape), {
      _tag: "ItemValidationFailure", kind: "TypeError", reason: "hostile-input", field: "stack",
      message: "Unable to inspect item stack",
    });

    for (const invalid of [
      null,
      { item: "not_an_item", count: 1, components: itemComponents("stone") },
      { item: "stone", count: "1", components: itemComponents("stone") },
      { item: "stone", count: 0, components: itemComponents("stone") },
      { item: "stone", count: 65, components: itemComponents("stone") },
      { item: "stone", count: 1, components: {} },
    ]) {
      expectItemFailure(invokeWithCount(invalid), {
        _tag: "ItemValidationFailure", kind: "TypeError", reason: "invalid-type", field: "stack",
        message: "Stack must be an ItemStack",
      });
    }

    const valid = itemStack("stone", StackCount(1));
    expect(isItemStack(null)).toBe(false);
    expect(Reflect.apply(itemStackEqualsIgnoringCount, undefined, [{}, valid])).toBe(false);
    expect(Reflect.apply(itemStackEqualsIgnoringCount, undefined, [valid, {}])).toBe(false);
    expectItemFailure(Reflect.apply(itemStackResult.mergeItemStacks, undefined, [valid, {}]), {
      _tag: "ItemValidationFailure", kind: "TypeError", reason: "invalid-type", field: "stack",
      message: "Stacks must be ItemStacks",
    });
  });

  it("captures malformed and hostile stack options", () => {
    expectItemFailure(itemStackResult.itemStackFromUnknown("stone", 1, []), {
      _tag: "ItemValidationFailure", field: "options", reason: "invalid-type",
      message: "Item stack options must be a non-null object", value: [],
    });

    const hostileOptions = new Proxy({}, { get: () => { throw new Error("hostile"); } });
    expectItemFailure(itemStackResult.itemStackFromUnknown("stone", 1, hostileOptions), {
      _tag: "ItemValidationFailure", field: "components", reason: "hostile-input",
      message: "Unable to inspect item stack components",
    });

    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    expectItemFailure(itemStackResult.itemStackFromUnknown("stone", 1, revoked.proxy), {
      _tag: "ItemValidationFailure", field: "options", reason: "hostile-input",
      message: "Unable to inspect item stack options",
    });
  });

  it("resolves patches at construction and removes fields canonically", () => {
    const patch = itemComponentPatch({ "minecraft:custom_name": { text: "Stone" } });
    const stack = itemStack("stone", StackCount(1), { componentPatch: patch });
    expect(stack).toEqual({ item: "stone", count: 1, components: { ...itemComponents("stone"), customName: { text: "Stone" } } });
    expect("componentPatch" in stack).toBe(false);
    const removed = itemStack("stone", StackCount(1), { componentPatch: itemComponentPatch({ "!minecraft:custom_name": null }) });
    if (removed.components === undefined) throw new Error("expected canonical components");
    expect("customName" in removed.components).toBe(false);
    expect(JSON.stringify(removed.components)).not.toContain("customName");
  });

  it("rejects duplicate canonical keys with a tagged error", () => {
    const left = itemComponentPatch({ "minecraft:damage": 1 });
    const right = itemComponentPatch({ "minecraft:damage": 2 });
    expect(itemStack("diamond_sword", StackCount(1), { componentPatch: left })).toEqual({
      item: "diamond_sword", count: 1, components: itemComponents("diamond_sword", { damage: ItemDamage(1) }),
    });
    expectItemFailure(itemComponentPatchResult.decodeItemComponentPatch({ "minecraft:damage": 1, "!minecraft:damage": null }), {
      _tag: "ItemComponentPatchConflictError", componentKey: "minecraft:damage",
    });
    expect(left).not.toBe(right);
    expectItemFailure(itemStackResult.itemStackFromUnknown("stone", 1, { components: {} }), {
      _tag: "ItemValidationFailure", kind: "TypeError", reason: "invalid-type", field: "components",
      message: "Item components must be a resolved component object", value: {},
    });
    const invalidPatch = { invalid: true };
    expectItemFailure(itemStackResult.itemStackFromUnknown("stone", 1, { componentPatch: invalidPatch }), {
      _tag: "ItemValidationFailure", kind: "TypeError", reason: "invalid-value", field: "invalid",
      message: 'ItemComponentPatchKey must be a namespaced component with an optional ! prefix, received "invalid"', value: "invalid",
    });
  });

  it("keeps payload isolated through count changes and split/merge", () => {
    const payload = itemComponents("stone", { rarity: "rare", customData: { value: { nested: true } } });
    const source = itemStack("stone", StackCount(32), { components: payload });
    const changed = itemStackWithCount(source, StackCount(12));
    const split = splitItemStack(source, TransferQuantity(12));
    expect(itemStackEqualsIgnoringCount(source, changed)).toBe(true);
    expect(itemStacksCanMerge(source, changed)).toBe(true);
    expect(itemStacksCanMerge(source, itemStack("dirt", StackCount(12)))).toBe(false);
    expect(split.taken.count + (split.remainder?.count ?? 0)).toBe(32);
    expect(split.remainder).toBeDefined();
    if (split.remainder === undefined) throw new Error("expected remainder");
    expect(mergeItemStacks(split.taken, split.remainder)).toEqual({ merged: source, remainder: undefined });
    expectItemFailure(Reflect.apply(itemStackResult.splitItemStack, undefined, [source, 0]), {
      _tag: "ItemValidationFailure", kind: "RangeError", reason: "out-of-range", field: "amount",
      message: `Split amount must be an integer in [1, ${source.count}]`, value: 0,
    });
    expect(split.taken.components).not.toBe(payload);
    expect(Object.isFrozen(split.taken.components)).toBe(true);
  });

  it("accepts a 99-item override and rejects 100", () => {
    const components = itemComponents("stone", { maxStackSize: MaxStackSize(99) });
    expect(itemStack("stone", StackCount(65), { components }).count).toBe(65);
    expect(itemStack("stone", StackCount(99), { components }).count).toBe(99);
    expectItemFailure(itemStackResult.itemStackFromUnknown("stone", 100, { components }), {
      _tag: "ItemValidationFailure", kind: "RangeError", reason: "out-of-range", field: "count",
      message: "Item stack count for stone must be an integer in [1, 99], received 100", value: 100,
    });
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
    expectItemFailure(itemStackResult.itemStackFromUnknown("stone", 100, {
      components: { ...stoneComponentsLiteral, maxStackSize: 99 },
    }), {
      _tag: "ItemValidationFailure", kind: "RangeError", reason: "out-of-range", field: "count",
      message: "Item stack count for stone must be an integer in [1, 99], received 100", value: 100,
    });

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
    for (const amount of [100, 0, 1.5]) {
      expectItemFailure(Reflect.apply(itemStackResult.splitItemStack, undefined, [ninetyNineStack, amount]), {
        _tag: "ItemValidationFailure", kind: "RangeError", reason: "out-of-range", field: "amount",
        message: "Split amount must be an integer in [1, 99]", value: amount,
      });
    }
    expectItemFailure(Reflect.apply(itemStackResult.splitItemStack, undefined, [oneStack, 2]), {
      _tag: "ItemValidationFailure", kind: "RangeError", reason: "out-of-range", field: "amount",
      message: "Split amount must be an integer in [1, 1]", value: 2,
    });
  });

  it("rejects malformed operation inputs and reports merge overflow", () => {
    const left = itemStack("stone", StackCount(64));
    const right = itemStack("stone", StackCount(2));
    expectItemFailure(Reflect.apply(itemStackResult.itemStackWithCount, undefined, [[], 1]), {
      _tag: "ItemValidationFailure", kind: "TypeError", reason: "invalid-type", field: "stack",
      message: "Stack must be an ItemStack", value: [],
    });
    expectItemFailure(Reflect.apply(itemStackResult.itemStackWithCount, undefined, [null, 1]), {
      _tag: "ItemValidationFailure", kind: "TypeError", reason: "invalid-type", field: "stack",
      message: "Stack must be an ItemStack", value: null,
    });
    expectItemFailure(Reflect.apply(itemStackResult.itemStackWithCount, undefined, [{}, 1]), {
      _tag: "ItemValidationFailure", kind: "TypeError", reason: "invalid-type", field: "stack",
      message: "Stack must be an ItemStack", value: {},
    });
    expectItemFailure(Reflect.apply(itemStackResult.transmuteItemStack, undefined, [{}, right]), {
      _tag: "ItemValidationFailure", kind: "TypeError", reason: "invalid-type", field: "stack",
      message: "Transmute source and result must be ItemStacks", value: undefined,
    });
    expectItemFailure(Reflect.apply(itemStackResult.mergeItemStacks, undefined, [{}, right]), {
      _tag: "ItemValidationFailure", kind: "TypeError", reason: "invalid-type", field: "stack",
      message: "Stacks must be ItemStacks", value: undefined,
    });
    expectItemFailure(Reflect.apply(itemStackResult.splitItemStack, undefined, [{}, 1]), {
      _tag: "ItemValidationFailure", kind: "TypeError", reason: "invalid-type", field: "stack",
      message: "Stack must be an ItemStack", value: {},
    });
    expectItemFailure(itemStackResult.mergeItemStacks(left, itemStack("dirt", StackCount(1))), {
      _tag: "ItemValidationFailure", kind: "TypeError", reason: "invalid-value", field: "stack",
      message: "IncompatibleStacks", value: undefined,
    });
    const merged = mergeItemStacks(left, right);
    expect(merged).toEqual({ merged: left, remainder: right });
    expect(merged.remainder?.count).toBe(2);
  });

  it("transmutes a valid source into the requested result stack", () => {
    const source = itemStack("stone", StackCount(4));
    const result = itemStack("dirt", StackCount(3), {
      components: itemComponents("dirt", { rarity: "rare" }),
    });

    expect(transmuteItemStack(source, result)).toEqual(result);
    expect(transmuteItemStack(source, result, StackCount(2))).toEqual({
      ...result,
      count: 2,
    });
    expectItemFailure(Reflect.apply(itemStackResult.transmuteItemStack, undefined, [source, {}]), {
      _tag: "ItemValidationFailure", kind: "TypeError", reason: "invalid-type", field: "stack",
      message: "Transmute source and result must be ItemStacks", value: undefined,
    });
  });

  it("preserves split/merge arithmetic for generated positive counts", () => {
    fc.assert(fc.property(fc.integer({ min: 1, max: 99 }), fc.integer({ min: 1, max: 99 }), (count, amount) => {
      const components = itemComponents("stone", { maxStackSize: MaxStackSize(99) });
      const source = itemStack("stone", StackCount(count), { components });
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
