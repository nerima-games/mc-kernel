import { Brand } from "effect";
import { NamespacedResourceLocation } from "./identifiers.js";
import {
  isJsonValue,
  jsonValueFromUnknown,
  jsonValuesEqual,
  type JsonValue,
} from "./json-value.js";

/** A component key, optionally prefixed with `!` to remove that component. */
export type ItemComponentPatchKey = string &
  Brand.Brand<"ItemComponentPatchKey">;

export const ItemComponentPatchKey: Brand.Brand.Constructor<ItemComponentPatchKey> =
  Brand.refined<ItemComponentPatchKey>(
    (value) =>
      NamespacedResourceLocation.is(
        value.startsWith("!") ? value.slice(1) : value,
      ),
    (value) =>
      Brand.error(
        `ItemComponentPatchKey must be a namespaced component with an optional ! prefix, received ${JSON.stringify(value)}`,
      ),
  );

export type ItemComponentPatch = Readonly<
  Record<ItemComponentPatchKey, JsonValue>
>;

export type ItemComponentPatchOptions = Readonly<Record<string, JsonValue>>;

type UnknownRecord = Readonly<Record<string, unknown>>;

const isPlainRecord = (value: unknown): value is UnknownRecord => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const isItemComponentPatchEntry = (key: string, value: unknown): boolean =>
  ItemComponentPatchKey.is(key) && isJsonValue(value);

export const isItemComponentPatch = (
  value: unknown,
): value is ItemComponentPatch =>
  isPlainRecord(value) &&
  Object.keys(value).every((key) => isItemComponentPatchEntry(key, value[key]));

export const itemComponentPatchFromUnknown = (
  value: unknown,
): ItemComponentPatch => {
  if (!isPlainRecord(value)) {
    throw new TypeError("Item component patch must be a plain object");
  }
  const normalized: Record<ItemComponentPatchKey, JsonValue> = {};
  for (const key of Object.keys(value)) {
    if (!ItemComponentPatchKey.is(key)) {
      throw new TypeError(`Item component key must be namespaced: ${key}`);
    }
    const componentValue = value[key];
    if (!isJsonValue(componentValue)) {
      throw new TypeError(`Item component value must be JSON: ${key}`);
    }
    normalized[ItemComponentPatchKey(key)] =
      jsonValueFromUnknown(componentValue);
  }
  return Object.freeze(normalized);
};

export const itemComponentPatch = (
  options: ItemComponentPatchOptions,
): ItemComponentPatch => itemComponentPatchFromUnknown(options);

export function mergeItemComponentPatches(
  left: ItemComponentPatch | undefined,
  right: ItemComponentPatch,
): ItemComponentPatch;
export function mergeItemComponentPatches(
  left: ItemComponentPatch,
  right: ItemComponentPatch | undefined,
): ItemComponentPatch;
export function mergeItemComponentPatches(
  left: ItemComponentPatch | undefined,
  right: ItemComponentPatch | undefined,
): ItemComponentPatch | undefined;
export function mergeItemComponentPatches(
  left: ItemComponentPatch | undefined,
  right: ItemComponentPatch | undefined,
): ItemComponentPatch | undefined {
  if (left !== undefined && !isItemComponentPatch(left)) {
    throw new TypeError("Left item component patch is invalid");
  }
  if (right !== undefined && !isItemComponentPatch(right)) {
    throw new TypeError("Right item component patch is invalid");
  }
  if (left === undefined) {
    return right;
  }
  if (right === undefined) {
    return left;
  }
  const merged: Record<string, JsonValue> = {};
  for (const patch of [left, right]) {
    for (const key of Object.keys(patch)) {
      const componentKey = ItemComponentPatchKey(key);
      const value = patch[componentKey];
      if (value === undefined) {
        throw new TypeError(
          `Item component patch has an invalid value: ${key}`,
        );
      }
      merged[key] = value;
    }
  }
  return itemComponentPatchFromUnknown(merged);
}

export const itemComponentPatchesEqual = (
  left: ItemComponentPatch | undefined,
  right: ItemComponentPatch | undefined,
): boolean => {
  if (left === right) {
    return true;
  }
  if (left === undefined || right === undefined) {
    return false;
  }
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every((key) => {
      if (!ItemComponentPatchKey.is(key)) {
        return false;
      }
      const rightKey = ItemComponentPatchKey(key);
      const leftValue = left[rightKey];
      const rightValue = right[rightKey];
      return (
        leftValue !== undefined &&
        rightValue !== undefined &&
        jsonValuesEqual(leftValue, rightValue)
      );
    })
  );
};
