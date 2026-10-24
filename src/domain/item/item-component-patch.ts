import { Brand } from "effect";
import { Result } from "effect";
import { MAX_GENERIC_INPUT_ARRAY_LENGTH, snapshotInputValue } from "../../input-snapshot.js";
import { NamespacedResourceLocation } from "../text/identifiers.js";
import {
  isJsonValue,
  jsonValuesEqual,
  type JsonValue,
} from "../text/json-value.js";
import { isItemComponents, itemComponentsSnapshot, type ItemComponents } from "./item-components-validation.js";
import { itemValidationFailure, type ItemValidationFailure } from "./item-failure.js";

export type ItemComponentPatchConflict = Readonly<{
  readonly _tag: "ItemComponentPatchConflictError";
  readonly componentKey: NamespacedResourceLocation;
}>;
export type ItemComponentPatchDecodeError = ItemValidationFailure | ItemComponentPatchConflict;

export const ItemComponentPatchConflictError = (
  args: Readonly<{ readonly componentKey: string }>,
): Result.Result<ItemComponentPatchConflict, ItemComponentPatchDecodeError> =>
  Result.mapError(
    Result.map(NamespacedResourceLocation.result(args.componentKey), (brandedComponentKey) => ({
      _tag: "ItemComponentPatchConflictError" as const,
      componentKey: brandedComponentKey,
    })),
    (error) => itemValidationFailure(
      args.componentKey,
      error.message,
      "invalid-value",
      args.componentKey,
    ),
  );

/** A component key, optionally prefixed with `!` to remove that component. */
export type ItemComponentPatchKey = string &
  Brand.Brand<"ItemComponentPatchKey">;

export const ItemComponentPatchKey: Brand.Constructor<ItemComponentPatchKey> =
  Brand.make<ItemComponentPatchKey>((value) =>
    NamespacedResourceLocation.is(
      value.startsWith("!") ? value.slice(1) : value,
    )
      ? true
      : `ItemComponentPatchKey must be a namespaced component with an optional ! prefix, received ${JSON.stringify(value)}`,
  );

export type ItemComponentPatch = Readonly<
  Record<ItemComponentPatchKey, JsonValue>
>;

export type ItemComponentPatchOptions = Readonly<Record<string, JsonValue>>;

const failure = (
  field: string,
  message: string,
  reason: ItemValidationFailure["reason"] = "invalid-value",
  value?: unknown,
): ItemComponentPatchDecodeError => itemValidationFailure(field, message, reason, value);

export const decodeItemComponentPatch = (
  value: unknown,
): Result.Result<ItemComponentPatch, ItemComponentPatchDecodeError> => {
  const snapshot = snapshotInputValue(value, MAX_GENERIC_INPUT_ARRAY_LENGTH);
  if (Result.isFailure(snapshot)) {
    const reason = snapshot.failure.reason === 'hostile-input'
      ? 'hostile-input'
      : snapshot.failure.reason === 'too-large'
        ? 'out-of-range'
        : snapshot.failure.reason === 'unsupported-prototype' || snapshot.failure.reason === 'invalid-container'
          ? 'invalid-type'
          : 'invalid-value'
    const field = snapshot.failure.path ?? 'patch'
    return Result.fail(failure(field, "Item component patch must be a plain JSON object", reason, snapshot.failure.value));
  }
  if (typeof snapshot.success !== 'object' || snapshot.success === null || Array.isArray(snapshot.success)) {
    return Result.fail(failure("patch", "Item component patch must be a plain object", "invalid-type", value));
  }
  const normalized: Record<ItemComponentPatchKey, JsonValue> = {};
  const canonicalKeys = new Set<string>();
  for (const [key, componentValue] of Object.entries(snapshot.success)) {
    const brandedKey = ItemComponentPatchKey.result(key);
    if (Result.isFailure(brandedKey)) {
      return Result.fail(failure(key, brandedKey.failure.message, "invalid-value", key));
    }
    if (!isJsonValue(componentValue)) {
      const reason = componentValue === undefined ? 'invalid-type' : 'invalid-value'
      return Result.fail(failure(key, `Item component value must be JSON: ${key}`, reason, componentValue));
    }
    const canonicalKey = key.startsWith("!") ? key.slice(1) : key;
    if (canonicalKeys.has(canonicalKey)) {
      return Result.flatMap(
        ItemComponentPatchConflictError({ componentKey: canonicalKey }),
        (conflict) => Result.fail(conflict),
      );
    }
    canonicalKeys.add(canonicalKey);
    normalized[brandedKey.success] = componentValue;
  }
  return Result.succeed(Object.freeze(normalized));
};

export const isItemComponentPatch = (
  value: unknown,
): value is ItemComponentPatch => Result.isSuccess(decodeItemComponentPatch(value));

export const itemComponentPatch = (
  options: ItemComponentPatchOptions,
): Result.Result<ItemComponentPatch, ItemComponentPatchDecodeError> => decodeItemComponentPatch(options);

const mergeDecodedPatches = (
  left: ItemComponentPatch,
  right: ItemComponentPatch,
): Result.Result<ItemComponentPatch, ItemComponentPatchDecodeError> => {
  const merged: Record<string, unknown> = {};
  for (const patch of [left, right]) {
    for (const [key, value] of Object.entries(patch)) {
      const removal = key.startsWith("!");
      const canonicalKey = removal ? key.slice(1) : key;
      const oppositeKey = removal ? canonicalKey : `!${canonicalKey}`;
      if (Object.hasOwn(merged, key) || Object.hasOwn(merged, oppositeKey)) {
        return Result.flatMap(
          ItemComponentPatchConflictError({ componentKey: canonicalKey }),
          (conflict) => Result.fail(conflict),
        );
      }
      merged[key] = value;
    }
  }
  return decodeItemComponentPatch(merged);
};

export const mergeItemComponentPatches = (
  left: ItemComponentPatch | undefined,
  right: ItemComponentPatch | undefined,
): Result.Result<ItemComponentPatch | undefined, ItemComponentPatchDecodeError> =>
  Result.gen(function* () {
    if (left !== undefined) yield* decodeItemComponentPatch(left);
    const decodedRight = right === undefined ? undefined : yield* decodeItemComponentPatch(right);
    if (left === undefined) return decodedRight;
    const currentLeft = yield* decodeItemComponentPatch(left);
    if (decodedRight === undefined) return currentLeft;
    return yield* mergeDecodedPatches(currentLeft, decodedRight);
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

export type ApplyItemComponentPatchFailure = ItemComponentPatchDecodeError | ItemValidationFailure;

export const applyItemComponentPatch = (
  base: ItemComponents,
  patch: ItemComponentPatch,
): Result.Result<ItemComponents, ApplyItemComponentPatchFailure> =>
  Result.gen(function* () {
    const snapshot = yield* itemComponentsSnapshot(base);
    const decoded = yield* decodeItemComponentPatch(patch);
    let next: Record<string, unknown> = { ...snapshot };
    for (const [key, patchValue] of Object.entries(decoded)) {
      const componentKey = key.startsWith("!") ? key.slice(1) : key;
      const field = COMPONENT_NAMES[componentKey.slice(componentKey.indexOf(":") + 1)];
      if (field === undefined) {
        return yield* Result.fail(failure(key, `Unsupported item component: ${componentKey}`, "invalid-value", componentKey));
      }
      if (key.startsWith("!")) {
        if (patchValue !== null) {
          return yield* Result.fail(failure(key, `Removal patch must use null: ${key}`, "invalid-value", patchValue));
        }
        next = Object.fromEntries(Object.entries(next).filter(([propertyKey]) => propertyKey !== field));
      } else {
        next[field] = patchValue;
      }
    }
    if (!isItemComponents(next)) {
      return yield* Result.fail(failure("components", "Patched item components are invalid", "invalid-value", next));
    }
    return yield* itemComponentsSnapshot(next);
  });

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
      const rightKey = key;
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
