import { maxStackCountOfItem, type ItemStackLimit } from "./item-registry.js";
import {
  isItemComponents,
  itemComponentsEqual,
  itemComponentsSnapshot,
  type ItemComponents,
} from "./item-components-validation.js";
import {
  isItemComponentPatch,
  mergeItemComponentPatches,
  itemComponentPatchesEqual,
  type ItemComponentPatch,
} from "./item-component-patch.js";
import { isItemType, type ItemType } from "./item-type.js";
import {
  StackCount,
  type StackCount as StackCountValue,
} from "./quantities.js";

export type ItemStack = {
  readonly item: ItemType;
  readonly count: StackCountValue;
  readonly components?: ItemComponents;
  readonly componentPatch?: ItemComponentPatch;
};

type RecordValue = {
  readonly item?: unknown;
  readonly count?: unknown;
  readonly components?: unknown;
  readonly componentPatch?: unknown;
};

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export type ItemSlot = ItemStack | undefined;
export type Slot = ItemSlot;

export type ItemStackOptions = Readonly<{
  readonly components?: ItemComponents;
  readonly componentPatch?: ItemComponentPatch;
}>;

type StackProperties = Readonly<{
  readonly item: ItemType;
  readonly components?: ItemComponents | undefined;
}>;

export const maxStackCountForItem = (item: ItemType): ItemStackLimit =>
  maxStackCountOfItem(item);

export const maxStackCountForStack = (stack: StackProperties): number =>
  stack.components?.maxStackSize ?? maxStackCountForItem(stack.item);

const isValidStackCount = (
  value: unknown,
  stack: StackProperties,
): value is StackCountValue =>
  typeof value === "number" &&
  Number.isSafeInteger(value) &&
  value >= 1 &&
  value <= maxStackCountForStack(stack);

const stackOptionsFromUnknown = (value: unknown): ItemStackOptions => {
  if (!isRecord(value)) {
    throw new TypeError("Item stack options must be a non-null object");
  }
  const components = value.components;
  if (components !== undefined && !isItemComponents(components)) {
    throw new TypeError(
      "Item stack components must be a resolved item component object",
    );
  }
  const componentPatch = value.componentPatch;
  if (componentPatch !== undefined && !isItemComponentPatch(componentPatch)) {
    throw new TypeError(
      "Item stack component patch must be a namespaced JSON object",
    );
  }
  if (components !== undefined) {
    if (componentPatch !== undefined) {
      return { components, componentPatch };
    }
    return { components };
  }
  if (componentPatch !== undefined) {
    return { componentPatch };
  }
  return {};
};

const itemStackOf = (
  item: ItemType,
  count: number,
  components: ItemComponents | undefined,
  componentPatch: ItemComponentPatch | undefined,
): ItemStack => {
  const stackCount = StackCount(count);
  if (components !== undefined) {
    if (componentPatch !== undefined) {
      return { item, count: stackCount, components, componentPatch };
    }
    return { item, count: stackCount, components };
  }
  if (componentPatch !== undefined) {
    return { item, count: stackCount, componentPatch };
  }
  return { item, count: stackCount };
};

export const itemStack = (
  item: ItemType,
  count: number,
  options: ItemStackOptions = {},
): ItemStack => {
  if (!isItemType(item)) {
    throw new TypeError(`Unknown item type: ${String(item)}`);
  }
  const { components, componentPatch } = stackOptionsFromUnknown(options);
  const resolvedComponents =
    components === undefined ? undefined : itemComponentsSnapshot(components);
  const stack = { item, components: resolvedComponents };
  const maxStackSize = maxStackCountForStack(stack);
  if (!isValidStackCount(count, stack)) {
    throw new RangeError(
      `Item stack count for ${item} must be an integer in [1, ${maxStackSize}], received ${count}`,
    );
  }
  if (componentPatch !== undefined) {
    mergeItemComponentPatches(undefined, componentPatch);
  }
  return itemStackOf(
    item,
    count,
    components === undefined ? undefined : resolvedComponents,
    componentPatch,
  );
};

export const itemStackFromUnknown = (
  item: unknown,
  count: unknown,
  options: unknown = {},
): ItemStack => {
  if (!isItemType(item)) {
    throw new TypeError(`Unknown item type: ${String(item)}`);
  }
  if (typeof count !== "number") {
    throw new TypeError(
      `Item stack count must be a number, received ${String(count)}`,
    );
  }
  return itemStack(item, count, stackOptionsFromUnknown(options));
};

export const isItemStack = (value: unknown): value is ItemStack => {
  if (!isRecord(value)) {
    return false;
  }
  const keys = Object.keys(value);
  if (
    !keys.every(
      (key) =>
        key === "item" ||
        key === "count" ||
        key === "components" ||
        key === "componentPatch",
    )
  ) {
    return false;
  }
  if (!Object.hasOwn(value, "item") || !Object.hasOwn(value, "count")) {
    return false;
  }
  const item = value.item;
  if (!isItemType(item)) {
    return false;
  }
  const components = value.components;
  if (components !== undefined && !isItemComponents(components)) {
    return false;
  }
  const componentPatch = value.componentPatch;
  if (componentPatch !== undefined && !isItemComponentPatch(componentPatch)) {
    return false;
  }
  return isValidStackCount(value.count, { item, components });
};

export const itemStackWithCount = (
  stack: ItemStack,
  count: number,
): ItemStack =>
  itemStack(stack.item, count, {
    ...(stack.components === undefined ? {} : { components: stack.components }),
    ...(stack.componentPatch === undefined
      ? {}
      : { componentPatch: stack.componentPatch }),
  });

export const transmuteItemStack = (
  source: ItemStack,
  result: ItemStack,
  count: number = result.count,
): ItemStack => {
  if (!isItemStack(source) || !isItemStack(result)) {
    throw new TypeError("Transmute source and result must be ItemStacks");
  }
  const components = result.components ?? source.components;
  const componentPatch = mergeItemComponentPatches(
    source.componentPatch,
    result.componentPatch,
  );
  return itemStack(result.item, count, {
    ...(components === undefined ? {} : { components }),
    ...(componentPatch === undefined ? {} : { componentPatch }),
  });
};

export const itemStackEqualsIgnoringCount = (
  left: ItemStack,
  right: ItemStack,
): boolean =>
  isItemStack(left) &&
  isItemStack(right) &&
  left.item === right.item &&
  itemComponentsEqual(
    left.components,
    right.components,
  ) && itemComponentPatchesEqual(left.componentPatch, right.componentPatch);

export const itemStacksCanMerge = (
  left: ItemStack,
  right: ItemStack,
): boolean =>
  left.item === right.item && itemStackEqualsIgnoringCount(left, right);

export const splitItemStack = (
  stack: ItemStack,
  amount: number,
): { readonly taken: ItemStack; readonly remainder: ItemSlot } => {
  if (!isItemStack(stack)) throw new TypeError("Stack must be an ItemStack");
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > stack.count) {
    throw new RangeError(`Split amount must be an integer in [1, ${stack.count}]`);
  }
  return {
    taken: itemStackWithCount(stack, amount),
    remainder: amount === stack.count ? undefined : itemStackWithCount(stack, stack.count - amount),
  };
};

export const mergeItemStacks = (
  left: ItemStack,
  right: ItemStack,
): { readonly merged: ItemStack; readonly remainder: ItemSlot } => {
  if (!isItemStack(left) || !isItemStack(right)) {
    throw new TypeError("Stacks must be ItemStacks");
  }
  if (!itemStackEqualsIgnoringCount(left, right)) {
    throw new TypeError("IncompatibleStacks");
  }
  const capacity = maxStackCountForStack(left);
  const mergedCount = Math.min(capacity, left.count + right.count);
  return {
    merged: itemStackWithCount(left, mergedCount),
    remainder:
      left.count + right.count > capacity
        ? itemStackWithCount(right, left.count + right.count - capacity)
        : undefined,
  };
};
