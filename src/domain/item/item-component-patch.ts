import { Brand } from "effect";
import { Either } from "effect";
import { TaggedError } from "effect/Data";
import { NamespacedResourceLocation } from "../text/identifiers.js";
import {
  isJsonValue,
  jsonValueFromUnknown,
  jsonValuesEqual,
  type JsonValue,
} from "../text/json-value.js";
import { isItemComponents, itemComponentsSnapshot, type ItemComponents } from "./item-components-validation.js";
export const ItemComponentPatchConflictError: new (args: { readonly componentKey: string }) => {
  readonly _tag: "ItemComponentPatchConflictError";
  readonly componentKey: string;
} = TaggedError("ItemComponentPatchConflictError");

export type ItemComponentPatchDecodeError = Error | Readonly<{
  readonly _tag: "ItemComponentPatchConflictError";
  readonly componentKey: string;
}>;

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
): value is ItemComponentPatch => {
  try {
    return isPlainRecord(value) &&
      Object.keys(value).every((key) => isItemComponentPatchEntry(key, value[key]));
  } catch {
    return false;
  }
};

export const itemComponentPatchFromUnknown = (
  value: unknown,
): ItemComponentPatch => {
  if (!isPlainRecord(value)) {
    throw new TypeError("Item component patch must be a plain object");
  }
  const normalized: Record<ItemComponentPatchKey, JsonValue> = {};
  const canonicalKeys = new Set<string>();
  for (const key of Object.keys(value)) {
    if (!ItemComponentPatchKey.is(key)) {
      throw new TypeError(`Item component key must be namespaced: ${key}`);
    }
    const componentValue = value[key];
    if (!isJsonValue(componentValue)) {
      throw new TypeError(`Item component value must be JSON: ${key}`);
    }
    const canonicalKey = key.startsWith("!") ? key.slice(1) : key;
    if (canonicalKeys.has(canonicalKey)) {
      throw new ItemComponentPatchConflictError({ componentKey: canonicalKey });
    }
    canonicalKeys.add(canonicalKey);
    normalized[ItemComponentPatchKey(key)] =
      jsonValueFromUnknown(componentValue);
  }
  return Object.freeze(normalized);
};

export const itemComponentPatchFromUnknownEither = (
  value: unknown,
): Either.Either<ItemComponentPatch, ItemComponentPatchDecodeError> =>
  Either.try({
    try: () => itemComponentPatchFromUnknown(value),
    catch: (error) => (error instanceof Error ? error : new Error("Invalid item component patch")),
  });

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
    return right === undefined ? undefined : itemComponentPatchFromUnknown(right);
  }
  if (right === undefined) {
    return itemComponentPatchFromUnknown(left);
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
      const removal = key.startsWith("!");
      const canonicalKey = removal ? key.slice(1) : key;
      const oppositeKey = removal ? canonicalKey : `!${canonicalKey}`;
      if (Object.hasOwn(merged, key) || Object.hasOwn(merged, oppositeKey)) {
        throw new ItemComponentPatchConflictError({ componentKey: canonicalKey });
      }
      merged[key] = value;
    }
  }
  return itemComponentPatchFromUnknown(merged);
}

export const mergeItemComponentPatchesEither = (
  left: ItemComponentPatch | undefined,
  right: ItemComponentPatch | undefined,
): Either.Either<ItemComponentPatch | undefined, ItemComponentPatchDecodeError> =>
  Either.try({
    try: () => mergeItemComponentPatches(left, right),
    catch: (error) => (error instanceof Error ? error : new Error("Invalid item component patch")),
  });

const COMPONENT_NAMES: Readonly<Record<string, keyof ItemComponents>> = {
  max_stack_size: "maxStackSize",
  max_damage: "maxDamage",
  damage: "damage",
  repair_cost: "repairCost",
  unbreakable: "unbreakable",
  enchantment_glint_override: "enchantmentGlintOverride",
  tooltip_display: "tooltipDisplay",
  custom_name: "customName",
  item_name: "itemName",
  lore: "lore",
  item_model: "itemModel",
  custom_data: "customData",
  entity_data: "entityData",
  bucket_entity_data: "bucketEntityData",
  profile: "profile",
  block_entity_data: "blockEntityData",
  charged_projectiles: "chargedProjectiles",
  bundle_contents: "bundleContents",
  container: "container",
  map_color: "mapColor",
  map_decorations: "mapDecorations",
  writable_book_content: "writableBookContent",
  written_book_content: "writtenBookContent",
  trim: "trim",
  suspicious_stew: "suspiciousStew",
  hide_additional_tooltip: "hideAdditionalTooltip",
  can_break: "canBreak",
  can_place_on: "canPlaceOn",
  bees: "bees",
  potion_contents: "potionContents",
  dyed_color: "dyedColor",
  custom_model_data: "customModelData",
  map_id: "mapId",
  block_state: "blockState",
  instrument: "instrument",
  note_block_sound: "noteBlockSound",
  recipes: "recipes",
  lock: "lock",
  tooltip_style: "tooltipStyle",
  base_color: "baseColor",
  equippable: "equippable",
  glider: "glider",
  death_protection: "deathProtection",
  repairable: "repairable",
  enchantable: "enchantable",
  jukebox_playable: "jukeboxPlayable",
  ominous_bottle_amplifier: "ominousBottleAmplifier",
  "painting/variant": "paintingVariant",
  lodestone_tracker: "lodestoneTracker",
  firework_explosion: "fireworkExplosion",
  fireworks: "fireworks",
  banner_patterns: "bannerPatterns",
  pot_decorations: "potDecorations",
  container_loot: "containerLoot",
  debug_stick_state: "debugStickState",
  rarity: "rarity",
  food: "food",
  consumable: "consumable",
  use_remainder: "useRemainder",
  use_cooldown: "useCooldown",
  use_effects: "useEffects",
  tool: "tool",
  weapon: "weapon",
  kinetic_weapon: "kineticWeapon",
  piercing_weapon: "piercingWeapon",
  attribute_modifiers: "attributeModifiers",
  enchantments: "enchantments",
  stored_enchantments: "storedEnchantments",
  blocks_attacks: "blocksAttacks",
  damage_resistant: "damageResistant",
  minimum_attack_charge: "minimumAttackCharge",
  damage_type: "damageType",
  swing_animation: "swingAnimation",
  attack_range: "attackRange",
  potion_duration_scale: "potionDurationScale",
  break_sound: "breakSound",
  provides_banner_patterns: "providesBannerPatterns",
  provides_trim_material: "providesTrimMaterial",
  dye: "dye",
  additional_trade_cost: "additionalTradeCost",
  sulfur_cube_content: "sulfurCubeContent",
};

export const applyItemComponentPatch = (
  base: ItemComponents,
  patch: ItemComponentPatch,
): ItemComponents => {
  if (!isItemComponents(base)) throw new TypeError("Base item components are invalid");
  if (!isItemComponentPatch(patch)) throw new TypeError("Item component patch is invalid");
  let next: Record<string, unknown> = { ...base };
  for (const key of Object.keys(patch)) {
    const componentKey = key.startsWith("!") ? key.slice(1) : key;
    const field = COMPONENT_NAMES[componentKey.slice(componentKey.indexOf(":") + 1)];
    if (field === undefined) throw new TypeError(`Unsupported item component: ${componentKey}`);
    if (key.startsWith("!")) {
      if (patch[ItemComponentPatchKey(key)] !== null) {
        throw new TypeError(`Removal patch must use null: ${key}`);
      }
      next = Object.fromEntries(Object.entries(next).filter(([propertyKey]) => propertyKey !== field));
    } else {
      next[field] = patch[ItemComponentPatchKey(key)];
    }
  }
  if (!isItemComponents(next)) throw new TypeError("Patched item components are invalid");
  return itemComponentsSnapshot(next);
};

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
