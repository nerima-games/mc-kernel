import { ResourceLocation, TagLocation } from "./identifiers.js";
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
import { AttributeModifierAmount } from "./quantities.js";

const explosionOf = (
  options: SulfurCubeArchetypeOptions["explosion"],
): SulfurCubeExplosion | undefined => {
  if (options === undefined) {
    return undefined;
  }
  return Object.freeze({
    fuse: options.fuse,
    power: options.power,
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
    amount: options.amount,
    damageType: ResourceLocation(options.damageType),
    attributeToSource: options.attributeToSource,
  });
};

const attributeModifierOf = (
  options: SulfurCubeArchetypeOptions["attributeModifiers"][number],
): SulfurCubeAttributeModifier =>
  Object.freeze({
    attribute: ResourceLocation(options.attribute),
    id: ResourceLocation(options.id),
    amount: AttributeModifierAmount(options.amount),
    operation: options.operation,
  });

const knockbackModifiersOf = (
  options: SulfurCubeArchetypeOptions["knockbackModifiers"],
): SulfurCubeKnockbackModifiers =>
  Object.freeze({
    horizontalPower: options.horizontalPower,
    verticalPower: options.verticalPower,
  });

const soundSettingsOf = (
  options: SulfurCubeArchetypeOptions["soundSettings"],
): SulfurCubeSoundSettings =>
  Object.freeze({
    hitSound: ResourceLocation(options.hitSound),
    pushSound: ResourceLocation(options.pushSound),
    pushSoundImpulseThreshold: options.pushSoundImpulseThreshold,
    pushSoundCooldown: options.pushSoundCooldown,
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

export const sulfurCubeArchetypeFromUnknown = (
  value: unknown,
): SulfurCubeArchetype => {
  if (!isSulfurCubeArchetypeOptions(value)) {
    throw new TypeError("Sulfur Cube archetype options must be valid");
  }
  return sulfurCubeArchetype(value);
};

export {
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
