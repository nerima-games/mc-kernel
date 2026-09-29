import { maxStackCountOfItem, type ItemStackLimit } from "./item-registry.js";
import { itemComponents } from "./item-components.js";
import { isItemComponents, itemComponentsEqual, itemComponentsSnapshot, type ItemComponents } from "./item-components-validation.js";
import { applyItemComponentPatch, isItemComponentPatch, type ItemComponentPatch } from "./item-component-patch.js";
import { isItemType, type ItemType } from "./item-type.js";
import { StackCount, type StackCount as StackCountValue } from "./quantities.js";

export type ItemStack = Readonly<{
  readonly item: ItemType;
  readonly count: StackCountValue;
  readonly components?: ItemComponents;
  readonly componentPatch?: never;
}>;

type RecordValue = Readonly<{
  readonly item?: unknown;
  readonly count?: unknown;
  readonly components?: unknown;
  readonly componentPatch?: unknown;
}>;

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export type ItemSlot = ItemStack | undefined;
export type Slot = ItemSlot;

export type ItemStackOptions = Readonly<{
  readonly components?: ItemComponents | undefined;
  readonly componentPatch?: ItemComponentPatch | undefined;
}>;

type StackProperties = Readonly<{ readonly item: ItemType; readonly components?: ItemComponents }>;

export const maxStackCountForItem = (item: ItemType): ItemStackLimit => maxStackCountOfItem(item);
export const maxStackCountForStack = (stack: StackProperties): number => stack.components?.maxStackSize ?? maxStackCountForItem(stack.item);

const stackOptionsFromUnknown = (value: unknown): ItemStackOptions => {
  if (!isRecord(value)) throw new TypeError("Item stack options must be a non-null object");
  const components = value.components;
  if (components !== undefined && !isItemComponents(components)) {
    throw new TypeError("Item stack components must be a resolved item component object");
  }
  const componentPatch = value.componentPatch;
  if (componentPatch !== undefined && !isItemComponentPatch(componentPatch)) {
    throw new TypeError("Item stack component patch must be a namespaced JSON object");
  }
  return {
    ...(components === undefined ? {} : { components }),
    ...(componentPatch === undefined ? {} : { componentPatch }),
  };
};

const itemStackOf = (item: ItemType, count: number, components: ItemComponents): ItemStack =>
  Object.freeze({ item, count: StackCount(count), components: itemComponentsSnapshot(components) });

export const itemStack = (item: ItemType, count: number, options: ItemStackOptions = {}): ItemStack => {
  if (!isItemType(item)) throw new TypeError(`Unknown item type: ${String(item)}`);
  const { components: suppliedComponents, componentPatch } = stackOptionsFromUnknown(options);
  const base = suppliedComponents === undefined ? itemComponents(item) : itemComponentsSnapshot(suppliedComponents);
  const components = componentPatch === undefined ? base : applyItemComponentPatch(base, componentPatch);
  const maxStackSize = maxStackCountForStack({ item, components });
  if (!Number.isSafeInteger(count) || count < 1 || count > maxStackSize) {
    throw new RangeError(`Item stack count for ${item} must be an integer in [1, ${maxStackSize}], received ${String(count)}`);
  }
  return itemStackOf(item, count, components);
};

export const itemStackFromUnknown = (item: unknown, count: unknown, options: unknown = {}): ItemStack => {
  if (!isItemType(item)) throw new TypeError(`Unknown item type: ${String(item)}`);
  if (typeof count !== "number") throw new TypeError(`Item stack count must be a number, received ${String(count)}`);
  return itemStack(item, count, stackOptionsFromUnknown(options));
};

export const isItemStack = (value: unknown): value is ItemStack => {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  if (!keys.every((key) => key === "item" || key === "count" || key === "components")) return false;
  if (!Object.hasOwn(value, "item") || !Object.hasOwn(value, "count") || !Object.hasOwn(value, "components")) return false;
  if (!isItemType(value.item) || !isItemComponents(value.components)) return false;
  const count = value.count;
  return typeof count === "number" && Number.isSafeInteger(count) && count >= 1 && count <= value.components.maxStackSize;
};

export const itemStackWithCount = (stack: ItemStack, count: number): ItemStack => {
  if (!isItemStack(stack)) throw new TypeError("Stack must be an ItemStack");
  if (stack.components === undefined) throw new TypeError("Stack components are missing");
  return itemStack(stack.item, count, { components: stack.components });
};

export const transmuteItemStack = (source: ItemStack, result: ItemStack, count: number = result.count): ItemStack => {
  if (!isItemStack(source) || !isItemStack(result)) throw new TypeError("Transmute source and result must be ItemStacks");
  return itemStack(result.item, count, { components: result.components });
};

export const itemStackEqualsIgnoringCount = (left: ItemStack, right: ItemStack): boolean =>
  isItemStack(left) && isItemStack(right) && left.item === right.item && itemComponentsEqual(left.components, right.components);

export const itemStacksCanMerge = (left: ItemStack, right: ItemStack): boolean => itemStackEqualsIgnoringCount(left, right);

export const splitItemStack = (stack: ItemStack, amount: number): { readonly taken: ItemStack; readonly remainder: ItemSlot } => {
  if (!isItemStack(stack)) throw new TypeError("Stack must be an ItemStack");
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > stack.count) {
    throw new RangeError(`Split amount must be an integer in [1, ${stack.count}]`);
  }
  return {
    taken: itemStackWithCount(stack, amount),
    remainder: amount === stack.count ? undefined : itemStackWithCount(stack, stack.count - amount),
  };
};

export const mergeItemStacks = (left: ItemStack, right: ItemStack): { readonly merged: ItemStack; readonly remainder: ItemSlot } => {
  if (!isItemStack(left) || !isItemStack(right)) throw new TypeError("Stacks must be ItemStacks");
  if (!itemStackEqualsIgnoringCount(left, right)) throw new TypeError("IncompatibleStacks");
  const capacity = maxStackCountForStack(left);
  const total = left.count + right.count;
  return {
    merged: itemStackWithCount(left, Math.min(capacity, total)),
    remainder: total > capacity ? itemStackWithCount(right, total - capacity) : undefined,
  };
};
