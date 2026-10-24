import { Effect, Result } from "effect";
import { NamespacedResourceLocation, ResourceLocation, TagLocation } from "../text/identifiers.js";
import { isSulfurCubeArchetypeOptions } from "./sulfur-cube-validation.js";
import type {
  SulfurCubeArchetype,
  SulfurCubeArchetypeOptions,
  SulfurCubeAttributeModifier,
  SulfurCubeContactDamage,
  SulfurCubeExplosion,
  SulfurCubeKnockbackModifiers,
  SulfurCubeSoundSettings,
} from "./sulfur-cube-data.js";
import { AttributeModifierAmount, PositiveTickCount } from "../time/quantities.js";
import {
  SulfurCubeContactDamageAmount,
  SulfurCubeExplosionPower,
  SulfurCubeKnockbackPower,
  SulfurCubePushSoundCooldown,
  SulfurCubePushSoundImpulseThreshold,
} from "./sulfur-cube-data.js";

const explosionOf = (
  options: SulfurCubeArchetypeOptions["explosion"],
): SulfurCubeExplosion | undefined => {
  if (options === undefined) {
    return undefined;
  }
  return Object.freeze({
    fuse: PositiveTickCount(options.fuse),
    power: SulfurCubeExplosionPower(options.power),
    causesFire: options.causesFire,
  });
};

const contactDamageOf = (
  options: SulfurCubeArchetypeOptions["contactDamage"],
): SulfurCubeContactDamage | undefined => {
  if (options === undefined) {
    return undefined;
  }
  return Object.freeze({
    amount: SulfurCubeContactDamageAmount(options.amount),
    damageType: ResourceLocation(options.damageType),
    attributeToSource: options.attributeToSource,
  });
};

const attributeModifierOf = (
  options: SulfurCubeArchetypeOptions["attributeModifiers"][number],
): SulfurCubeAttributeModifier =>
  Object.freeze({
    attribute: NamespacedResourceLocation(options.attribute),
    id: NamespacedResourceLocation(options.id),
    amount: AttributeModifierAmount(options.amount),
    operation: options.operation,
  });

const knockbackModifiersOf = (
  options: SulfurCubeArchetypeOptions["knockbackModifiers"],
): SulfurCubeKnockbackModifiers =>
  Object.freeze({
    horizontalPower: SulfurCubeKnockbackPower(options.horizontalPower),
    verticalPower: SulfurCubeKnockbackPower(options.verticalPower),
  });

const soundSettingsOf = (
  options: SulfurCubeArchetypeOptions["soundSettings"],
): SulfurCubeSoundSettings =>
  Object.freeze({
    hitSound: ResourceLocation(options.hitSound),
    pushSound: ResourceLocation(options.pushSound),
    pushSoundImpulseThreshold: SulfurCubePushSoundImpulseThreshold(options.pushSoundImpulseThreshold),
    pushSoundCooldown: SulfurCubePushSoundCooldown(options.pushSoundCooldown),
  });

export const sulfurCubeArchetype = (
  options: SulfurCubeArchetypeOptions,
): SulfurCubeArchetype => {
  const explosion = explosionOf(options.explosion);
  const contactDamage = contactDamageOf(options.contactDamage);
  const base = {
    items: TagLocation(options.items),
    buoyant: options.buoyant,
    attributeModifiers: Object.freeze(
      options.attributeModifiers.map(attributeModifierOf),
    ),
    knockbackModifiers: knockbackModifiersOf(options.knockbackModifiers),
    soundSettings: soundSettingsOf(options.soundSettings),
  };
  if (explosion === undefined) {
    if (contactDamage === undefined) {
      return Object.freeze(base);
    }
    return Object.freeze({ ...base, contactDamage });
  }
  if (contactDamage === undefined) {
    return Object.freeze({ ...base, explosion });
  }
  return Object.freeze({ ...base, explosion, contactDamage });
};

export type SulfurCubeArchetypeFailure = Readonly<{
  readonly _tag: "InvalidSulfurCubeArchetypeOptions";
  readonly value: unknown;
}>;

const invalidSulfurCubeArchetypeOptions = (value: unknown): SulfurCubeArchetypeFailure => ({
  _tag: "InvalidSulfurCubeArchetypeOptions",
  value,
})

const mapBrandFailure = <Value, Error>(
  result: Result.Result<Value, Error>,
  original: unknown,
): Result.Result<Value, SulfurCubeArchetypeFailure> =>
  Result.mapError(result, () => invalidSulfurCubeArchetypeOptions(original))

const INVALID_SULFUR_CUBE_SNAPSHOT = Symbol('InvalidSulfurCubeSnapshot')

const snapshotUnknownValue = (value: unknown, active: WeakSet<object>): unknown => {
  if (value === null || typeof value !== 'object') return value
  if (active.has(value)) return INVALID_SULFUR_CUBE_SNAPSHOT

  active.add(value)
  if (Array.isArray(value)) {
    const length = value.length
    const snapshot: unknown[] = new Array(length)
    for (let index = 0; index < length; index += 1) {
      if (Object.hasOwn(value, index)) {
        snapshot[index] = snapshotUnknownValue(value[index], active)
      }
    }
    active.delete(value)
    return snapshot
  }

  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) {
    active.delete(value)
    return value
  }

  const snapshot: Record<string, unknown> = Object.create(prototype)
  for (const [key, child] of Object.entries(value)) {
    Object.defineProperty(snapshot, key, {
      value: snapshotUnknownValue(child, active),
      enumerable: true,
      configurable: true,
      writable: true,
    })
  }
  active.delete(value)
  return snapshot
}

const explosionFromOptions = (
  options: SulfurCubeArchetypeOptions['explosion'],
  original: unknown,
): Result.Result<SulfurCubeExplosion | undefined, SulfurCubeArchetypeFailure> => {
  if (options === undefined) return Result.succeed(undefined)
  return Result.gen(function* () {
    const fuse = yield* mapBrandFailure(PositiveTickCount.result(options.fuse), original)
    const power = yield* mapBrandFailure(SulfurCubeExplosionPower.result(options.power), original)
    return Object.freeze({ fuse, power, causesFire: options.causesFire })
  })
}

const contactDamageFromOptions = (
  options: SulfurCubeArchetypeOptions['contactDamage'],
  original: unknown,
): Result.Result<SulfurCubeContactDamage | undefined, SulfurCubeArchetypeFailure> => {
  if (options === undefined) return Result.succeed(undefined)
  return Result.gen(function* () {
    const amount = yield* mapBrandFailure(SulfurCubeContactDamageAmount.result(options.amount), original)
    const damageType = yield* mapBrandFailure(ResourceLocation.result(options.damageType), original)
    return Object.freeze({ amount, damageType, attributeToSource: options.attributeToSource })
  })
}

const attributeModifierFromOptions = (
  options: SulfurCubeArchetypeOptions['attributeModifiers'][number],
  original: unknown,
): Result.Result<SulfurCubeAttributeModifier, SulfurCubeArchetypeFailure> =>
  Result.gen(function* () {
    const attribute = yield* mapBrandFailure(NamespacedResourceLocation.result(options.attribute), original)
    const id = yield* mapBrandFailure(NamespacedResourceLocation.result(options.id), original)
    const amount = yield* mapBrandFailure(AttributeModifierAmount.result(options.amount), original)
    return Object.freeze({ attribute, id, amount, operation: options.operation })
  })

const knockbackModifiersFromOptions = (
  options: SulfurCubeArchetypeOptions['knockbackModifiers'],
  original: unknown,
): Result.Result<SulfurCubeKnockbackModifiers, SulfurCubeArchetypeFailure> =>
  Result.gen(function* () {
    const horizontalPower = yield* mapBrandFailure(SulfurCubeKnockbackPower.result(options.horizontalPower), original)
    const verticalPower = yield* mapBrandFailure(SulfurCubeKnockbackPower.result(options.verticalPower), original)
    return Object.freeze({ horizontalPower, verticalPower })
  })

const soundSettingsFromOptions = (
  options: SulfurCubeArchetypeOptions['soundSettings'],
  original: unknown,
): Result.Result<SulfurCubeSoundSettings, SulfurCubeArchetypeFailure> =>
  Result.gen(function* () {
    const hitSound = yield* mapBrandFailure(ResourceLocation.result(options.hitSound), original)
    const pushSound = yield* mapBrandFailure(ResourceLocation.result(options.pushSound), original)
    const pushSoundImpulseThreshold = yield* mapBrandFailure(
      SulfurCubePushSoundImpulseThreshold.result(options.pushSoundImpulseThreshold),
      original,
    )
    const pushSoundCooldown = yield* mapBrandFailure(
      SulfurCubePushSoundCooldown.result(options.pushSoundCooldown),
      original,
    )
    return Object.freeze({ hitSound, pushSound, pushSoundImpulseThreshold, pushSoundCooldown })
  })

const sulfurCubeArchetypeFromValidatedOptions = (
  options: SulfurCubeArchetypeOptions,
  original: unknown,
): Result.Result<SulfurCubeArchetype, SulfurCubeArchetypeFailure> =>
  Result.gen(function* () {
    const items = yield* mapBrandFailure(TagLocation.result(options.items), original)
    const explosion = yield* explosionFromOptions(options.explosion, original)
    const contactDamage = yield* contactDamageFromOptions(options.contactDamage, original)
    const attributeModifiers = yield* Result.all(
      options.attributeModifiers.map((modifier) => attributeModifierFromOptions(modifier, original)),
    )
    const knockbackModifiers = yield* knockbackModifiersFromOptions(options.knockbackModifiers, original)
    const soundSettings = yield* soundSettingsFromOptions(options.soundSettings, original)
    return Object.freeze({
      items,
      buoyant: options.buoyant,
      ...(explosion === undefined ? {} : { explosion }),
      ...(contactDamage === undefined ? {} : { contactDamage }),
      attributeModifiers: Object.freeze(attributeModifiers),
      knockbackModifiers,
      soundSettings,
    })
  })

export const sulfurCubeArchetypeFromUnknown = (
  value: unknown,
): Result.Result<SulfurCubeArchetype, SulfurCubeArchetypeFailure> => {
  const snapshot = Effect.runSync(Effect.result(Effect.try({
    try: () => snapshotUnknownValue(value, new WeakSet<object>()),
    catch: () => INVALID_SULFUR_CUBE_SNAPSHOT,
  })))
  if (
    Result.isFailure(snapshot) ||
    snapshot.success === INVALID_SULFUR_CUBE_SNAPSHOT ||
    !isSulfurCubeArchetypeOptions(snapshot.success)
  ) {
    return Result.fail(invalidSulfurCubeArchetypeOptions(value))
  }
  return sulfurCubeArchetypeFromValidatedOptions(snapshot.success, value)
};

export {
  SulfurCubeContactDamageAmount,
  SulfurCubeExplosionPower,
  SulfurCubeKnockbackPower,
  SulfurCubePushSoundCooldown,
  SulfurCubePushSoundImpulseThreshold,
  SULFUR_CUBE_ARCHETYPE_REGISTRY,
  SULFUR_CUBE_ATTRIBUTE_MODIFIER_OPERATIONS,
  SULFUR_CUBE_BLOCK_TAGS,
  SULFUR_CUBE_COMPONENTS,
  SULFUR_CUBE_DAMAGE_TYPES,
  SULFUR_CUBE_DAMAGE_TYPE_TAGS,
  SULFUR_CUBE_ENTITY_TAGS,
  SULFUR_CUBE_GAME_EVENTS,
  SULFUR_CUBE_ITEM_TAGS,
  SULFUR_CUBE_PARTICLES,
} from "./sulfur-cube-data.js";

export {
  isSulfurCubeArchetype,
  isSulfurCubeArchetypeOptions,
} from "./sulfur-cube-validation.js";

export type {
  SulfurCubeArchetype,
  SulfurCubeArchetypeOptions,
  SulfurCubeAttributeModifier,
  SulfurCubeAttributeModifierOptions,
  SulfurCubeAttributeModifierOperation,
  SulfurCubeContactDamage,
  SulfurCubeContactDamageOptions,
  SulfurCubeExplosion,
  SulfurCubeExplosionOptions,
  SulfurCubeKnockbackModifiers,
  SulfurCubeKnockbackModifiersOptions,
  SulfurCubeSoundSettings,
  SulfurCubeSoundSettingsOptions,
} from "./sulfur-cube-data.js";
