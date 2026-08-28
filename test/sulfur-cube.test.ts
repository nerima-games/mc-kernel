import { describe, expect, it } from "vitest";

import { ResourceLocation, TagLocation } from "../src/domain/identifiers";
import { AttributeModifierAmount } from "../src/domain/quantities";
import {
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
  isSulfurCubeArchetype,
  isSulfurCubeArchetypeOptions,
  sulfurCubeArchetype,
  sulfurCubeArchetypeFromUnknown,
  type SulfurCubeArchetypeOptions,
  type SulfurCubeAttributeModifierOptions,
  type SulfurCubeContactDamageOptions,
  type SulfurCubeExplosionOptions,
  type SulfurCubeKnockbackModifiersOptions,
  type SulfurCubeSoundSettingsOptions,
} from "../src/domain/sulfur-cube";

const explosionOptions: SulfurCubeExplosionOptions = {
  fuse: 20,
  power: 4,
  causesFire: true,
};

const contactDamageOptions: SulfurCubeContactDamageOptions = {
  amount: 3.5,
  damageType: SULFUR_CUBE_DAMAGE_TYPES.hot,
  attributeToSource: true,
};

const firstAttributeModifier: SulfurCubeAttributeModifierOptions = {
  attribute: "minecraft:bounciness",
  id: "minecraft:sulfur_cube_bounciness",
  amount: 0.25,
  operation: "add_value",
};

const attributeModifiers: ReadonlyArray<SulfurCubeAttributeModifierOptions> = [
  firstAttributeModifier,
  {
    attribute: "minecraft:friction_modifier",
    id: "minecraft:sulfur_cube_friction",
    amount: -0.1,
    operation: "add_multiplied_base",
  },
  {
    attribute: "minecraft:air_drag_modifier",
    id: "minecraft:sulfur_cube_air_drag",
    amount: 0.2,
    operation: "add_multiplied_total",
  },
];

const knockbackModifiers: SulfurCubeKnockbackModifiersOptions = {
  horizontalPower: 1.25,
  verticalPower: 0.5,
};

const soundSettings: SulfurCubeSoundSettingsOptions = {
  hitSound: "minecraft:entity.slime.squish",
  pushSound: "minecraft:entity.slime.jump",
  pushSoundImpulseThreshold: 0.4,
  pushSoundCooldown: 0.2,
};

const validOptions = {
  items: SULFUR_CUBE_ITEM_TAGS.food,
  buoyant: true,
  explosion: explosionOptions,
  contactDamage: contactDamageOptions,
  attributeModifiers,
  knockbackModifiers,
  soundSettings,
} satisfies SulfurCubeArchetypeOptions;

const optionsWith = (
  changes: Record<string, unknown>,
): Record<string, unknown> => ({
  ...validOptions,
  ...changes,
});

const explosionWith = (
  changes: Record<string, unknown>,
): Record<string, unknown> =>
  optionsWith({ explosion: { ...explosionOptions, ...changes } });

const contactDamageWith = (
  changes: Record<string, unknown>,
): Record<string, unknown> =>
  optionsWith({ contactDamage: { ...contactDamageOptions, ...changes } });

const attributeModifierWith = (
  changes: Record<string, unknown>,
): Record<string, unknown> =>
  optionsWith({
    attributeModifiers: [{ ...firstAttributeModifier, ...changes }],
  });

const knockbackWith = (
  changes: Record<string, unknown>,
): Record<string, unknown> =>
  optionsWith({ knockbackModifiers: { ...knockbackModifiers, ...changes } });

const soundSettingsWith = (
  changes: Record<string, unknown>,
): Record<string, unknown> =>
  optionsWith({ soundSettings: { ...soundSettings, ...changes } });

const withoutOptionalValues = (): SulfurCubeArchetypeOptions => ({
  items: SULFUR_CUBE_ITEM_TAGS.food,
  buoyant: false,
  attributeModifiers,
  knockbackModifiers,
  soundSettings,
});

describe("Sulfur Cube archetype registry", () => {
  it("constructs the complete official registry shape with branded values", () => {
    const archetype = sulfurCubeArchetype(validOptions);

    expect(SULFUR_CUBE_ARCHETYPE_REGISTRY).toBe(
      "minecraft:sulfur_cube_archetype",
    );
    expect(ResourceLocation.is(SULFUR_CUBE_ARCHETYPE_REGISTRY)).toBe(true);
    expect(SULFUR_CUBE_ATTRIBUTE_MODIFIER_OPERATIONS).toEqual([
      "add_value",
      "add_multiplied_base",
      "add_multiplied_total",
    ]);
    expect(Object.isFrozen(SULFUR_CUBE_ATTRIBUTE_MODIFIER_OPERATIONS)).toBe(
      true,
    );
    expect(SULFUR_CUBE_BLOCK_TAGS).toEqual({
      suppressesBounce: "#suppresses_bounce",
      causesPeriodicGeyserEruptions: "#causes_periodic_geyser_eruptions",
      causesContinuousGeyserEruptions: "#causes_continuous_geyser_eruptions",
      speleothems: "#speleothems",
    });
    expect(SULFUR_CUBE_ITEM_TAGS).toEqual({
      food: "#sulfur_cube_food",
      swallowable: "#sulfur_cube_swallowable",
      archetype: {
        regular: "#sulfur_cube_archetype/regular",
        bouncy: "#sulfur_cube_archetype/bouncy",
        slowFlat: "#sulfur_cube_archetype/slow_flat",
        fastFlat: "#sulfur_cube_archetype/fast_flat",
        light: "#sulfur_cube_archetype/light",
        fastSliding: "#sulfur_cube_archetype/fast_sliding",
        slowSliding: "#sulfur_cube_archetype/slow_sliding",
        highResistance: "#sulfur_cube_archetype/high_resistance",
        sticky: "#sulfur_cube_archetype/sticky",
        hot: "#sulfur_cube_archetype/hot",
        slowBouncy: "#sulfur_cube_archetype/slow_bouncy",
      },
    });
    expect(SULFUR_CUBE_DAMAGE_TYPE_TAGS).toEqual({
      withBlockImmuneTo: "minecraft:sulfur_cube_with_block_immune_to",
    });
    expect(SULFUR_CUBE_ENTITY_TAGS).toEqual({
      notAffectedByGeysers: "#not_affected_by_geysers",
    });
    expect(SULFUR_CUBE_GAME_EVENTS).toEqual({ bounce: "minecraft:bounce" });
    expect(SULFUR_CUBE_COMPONENTS).toEqual({
      content: "minecraft:sulfur_cube_content",
    });
    expect(SULFUR_CUBE_DAMAGE_TYPES).toEqual({
      hot: "minecraft:sulfur_cube_hot",
    });
    expect(SULFUR_CUBE_PARTICLES).toEqual({
      goo: "minecraft:sulfur_cube_goo",
      geyserBase: "minecraft:geyser_base",
      geyserPoof: "minecraft:geyser_poof",
      geyserPlume: "minecraft:geyser_plume",
      geyser: "minecraft:geyser",
    });
    for (const tag of [
      ...Object.values(SULFUR_CUBE_BLOCK_TAGS),
      SULFUR_CUBE_ITEM_TAGS.food,
      SULFUR_CUBE_ITEM_TAGS.swallowable,
      ...Object.values(SULFUR_CUBE_ITEM_TAGS.archetype),
      SULFUR_CUBE_ENTITY_TAGS.notAffectedByGeysers,
    ]) {
      expect(TagLocation.is(tag)).toBe(true);
    }
    for (const location of [
      SULFUR_CUBE_DAMAGE_TYPE_TAGS.withBlockImmuneTo,
      SULFUR_CUBE_GAME_EVENTS.bounce,
      SULFUR_CUBE_COMPONENTS.content,
      SULFUR_CUBE_DAMAGE_TYPES.hot,
      ...Object.values(SULFUR_CUBE_PARTICLES),
    ]) {
      expect(ResourceLocation.is(location)).toBe(true);
    }
    expect(Object.isFrozen(SULFUR_CUBE_BLOCK_TAGS)).toBe(true);
    expect(Object.isFrozen(SULFUR_CUBE_ITEM_TAGS)).toBe(true);
    expect(Object.isFrozen(SULFUR_CUBE_ITEM_TAGS.archetype)).toBe(true);
    expect(Object.isFrozen(SULFUR_CUBE_DAMAGE_TYPE_TAGS)).toBe(true);
    expect(Object.isFrozen(SULFUR_CUBE_ENTITY_TAGS)).toBe(true);
    expect(Object.isFrozen(SULFUR_CUBE_GAME_EVENTS)).toBe(true);
    expect(Object.isFrozen(SULFUR_CUBE_COMPONENTS)).toBe(true);
    expect(Object.isFrozen(SULFUR_CUBE_DAMAGE_TYPES)).toBe(true);
    expect(Object.isFrozen(SULFUR_CUBE_PARTICLES)).toBe(true);
    expect(archetype).toEqual({
      items: "#sulfur_cube_food",
      buoyant: true,
      explosion: explosionOptions,
      contactDamage: contactDamageOptions,
      attributeModifiers,
      knockbackModifiers,
      soundSettings,
    });
    expect(TagLocation.is(archetype.items)).toBe(true);
    expect(ResourceLocation.is(archetype.contactDamage?.damageType ?? "")).toBe(
      true,
    );
    expect(
      ResourceLocation.is(archetype.attributeModifiers[0]?.attribute ?? ""),
    ).toBe(true);
    expect(ResourceLocation.is(archetype.attributeModifiers[0]?.id ?? "")).toBe(
      true,
    );
    expect(
      AttributeModifierAmount.is(
        archetype.attributeModifiers[0]?.amount ?? Number.NaN,
      ),
    ).toBe(true);
    expect(isSulfurCubeArchetypeOptions(validOptions)).toBe(true);
    expect(isSulfurCubeArchetype(archetype)).toBe(true);
    expect(Object.isFrozen(archetype)).toBe(true);
    expect(Object.isFrozen(archetype.explosion)).toBe(true);
    expect(Object.isFrozen(archetype.contactDamage)).toBe(true);
    expect(Object.isFrozen(archetype.attributeModifiers)).toBe(true);
    expect(Object.isFrozen(archetype.attributeModifiers[0])).toBe(true);
    expect(Object.isFrozen(archetype.knockbackModifiers)).toBe(true);
    expect(Object.isFrozen(archetype.soundSettings)).toBe(true);
  });

  it("supports absent and explicitly undefined optional registry fields", () => {
    const withoutOptionals = {
      items: validOptions.items,
      buoyant: false,
      attributeModifiers,
      knockbackModifiers,
      soundSettings,
    } satisfies SulfurCubeArchetypeOptions;
    const neither = sulfurCubeArchetypeFromUnknown({
      ...withoutOptionals,
      explosion: undefined,
      contactDamage: undefined,
    });
    const explosionOnly = sulfurCubeArchetypeFromUnknown({
      ...validOptions,
      contactDamage: undefined,
    });
    const contactOnly = sulfurCubeArchetypeFromUnknown({
      ...validOptions,
      explosion: undefined,
    });

    expect(isSulfurCubeArchetypeOptions(withoutOptionals)).toBe(true);
    expect(isSulfurCubeArchetypeOptions(neither)).toBe(true);
    expect(Object.hasOwn(neither, "explosion")).toBe(false);
    expect(Object.hasOwn(neither, "contactDamage")).toBe(false);
    expect(Object.hasOwn(explosionOnly, "explosion")).toBe(true);
    expect(Object.hasOwn(explosionOnly, "contactDamage")).toBe(false);
    expect(Object.hasOwn(contactOnly, "explosion")).toBe(false);
    expect(Object.hasOwn(contactOnly, "contactDamage")).toBe(true);
    expect(isSulfurCubeArchetype(explosionOnly)).toBe(true);
    expect(isSulfurCubeArchetype(contactOnly)).toBe(true);
    expect(isSulfurCubeArchetype(neither)).toBe(true);
  });

  it("rejects malformed option records at every nested schema boundary", () => {
    const nullPrototype: Record<string, unknown> = Object.create(null);
    Object.assign(nullPrototype, withoutOptionalValues());

    expect(isSulfurCubeArchetypeOptions(nullPrototype)).toBe(true);
    expect(isSulfurCubeArchetypeOptions(null)).toBe(false);
    expect(isSulfurCubeArchetypeOptions([])).toBe(false);
    expect(isSulfurCubeArchetypeOptions("archetype")).toBe(false);
    expect(isSulfurCubeArchetypeOptions(new Date())).toBe(false);
    expect(isSulfurCubeArchetypeOptions(optionsWith({ extra: true }))).toBe(
      false,
    );
    expect(
      isSulfurCubeArchetypeOptions(
        optionsWith({ items: "minecraft:sulfur_cube_food" }),
      ),
    ).toBe(false);
    expect(isSulfurCubeArchetypeOptions(optionsWith({ items: 1 }))).toBe(false);
    expect(isSulfurCubeArchetypeOptions(optionsWith({ buoyant: 1 }))).toBe(
      false,
    );
    expect(isSulfurCubeArchetypeOptions(optionsWith({ explosion: null }))).toBe(
      false,
    );
    expect(isSulfurCubeArchetypeOptions(explosionWith({ fuse: 0 }))).toBe(
      false,
    );
    expect(isSulfurCubeArchetypeOptions(explosionWith({ fuse: 1.5 }))).toBe(
      false,
    );
    expect(isSulfurCubeArchetypeOptions(explosionWith({ power: -1 }))).toBe(
      false,
    );
    expect(isSulfurCubeArchetypeOptions(explosionWith({ power: 1.5 }))).toBe(
      false,
    );
    expect(
      isSulfurCubeArchetypeOptions(explosionWith({ causesFire: "true" })),
    ).toBe(false);
    expect(isSulfurCubeArchetypeOptions(explosionWith({ extra: true }))).toBe(
      false,
    );
    expect(
      isSulfurCubeArchetypeOptions(contactDamageWith({ amount: -1 })),
    ).toBe(false);
    expect(
      isSulfurCubeArchetypeOptions(contactDamageWith({ amount: Number.NaN })),
    ).toBe(false);
    expect(
      isSulfurCubeArchetypeOptions(
        contactDamageWith({ damageType: "invalid!" }),
      ),
    ).toBe(false);
    expect(
      isSulfurCubeArchetypeOptions(contactDamageWith({ attributeToSource: 1 })),
    ).toBe(false);
    expect(
      isSulfurCubeArchetypeOptions(contactDamageWith({ extra: true })),
    ).toBe(false);
    expect(
      isSulfurCubeArchetypeOptions(optionsWith({ attributeModifiers: null })),
    ).toBe(false);
    expect(
      isSulfurCubeArchetypeOptions(
        attributeModifierWith({ attribute: "bounciness" }),
      ),
    ).toBe(false);
    expect(
      isSulfurCubeArchetypeOptions(
        attributeModifierWith({ id: "sulfur_cube_bounciness" }),
      ),
    ).toBe(false);
    expect(
      isSulfurCubeArchetypeOptions(
        attributeModifierWith({ amount: Number.NaN }),
      ),
    ).toBe(false);
    expect(
      isSulfurCubeArchetypeOptions(
        attributeModifierWith({ operation: "invalid" }),
      ),
    ).toBe(false);
    expect(
      isSulfurCubeArchetypeOptions(attributeModifierWith({ extra: true })),
    ).toBe(false);
    expect(
      isSulfurCubeArchetypeOptions(
        knockbackWith({ horizontalPower: Number.NaN }),
      ),
    ).toBe(false);
    expect(
      isSulfurCubeArchetypeOptions(
        knockbackWith({ verticalPower: Number.POSITIVE_INFINITY }),
      ),
    ).toBe(false);
    expect(isSulfurCubeArchetypeOptions(knockbackWith({ extra: true }))).toBe(
      false,
    );
    expect(
      isSulfurCubeArchetypeOptions(optionsWith({ knockbackModifiers: null })),
    ).toBe(false);
    expect(
      isSulfurCubeArchetypeOptions(soundSettingsWith({ hitSound: "invalid!" })),
    ).toBe(false);
    expect(
      isSulfurCubeArchetypeOptions(
        soundSettingsWith({ pushSound: "invalid!" }),
      ),
    ).toBe(false);
    expect(
      isSulfurCubeArchetypeOptions(
        soundSettingsWith({ pushSoundImpulseThreshold: Number.NaN }),
      ),
    ).toBe(false);
    expect(
      isSulfurCubeArchetypeOptions(
        soundSettingsWith({ pushSoundCooldown: Number.POSITIVE_INFINITY }),
      ),
    ).toBe(false);
    expect(
      isSulfurCubeArchetypeOptions(soundSettingsWith({ extra: true })),
    ).toBe(false);
    expect(
      isSulfurCubeArchetypeOptions(optionsWith({ soundSettings: null })),
    ).toBe(false);
    expect(() =>
      sulfurCubeArchetypeFromUnknown(optionsWith({ items: "invalid!" })),
    ).toThrow(TypeError);
  });

  it("rejects malformed normalized values without widening the runtime boundary", () => {
    const archetype = sulfurCubeArchetype(validOptions);

    expect(isSulfurCubeArchetype({ ...archetype, items: "invalid!" })).toBe(
      false,
    );
    expect(isSulfurCubeArchetype({ ...archetype, buoyant: 1 })).toBe(false);
    expect(isSulfurCubeArchetype({ ...archetype, explosion: null })).toBe(
      false,
    );
    expect(
      isSulfurCubeArchetype({
        ...archetype,
        explosion: { ...explosionOptions, power: -1 },
      }),
    ).toBe(false);
    expect(isSulfurCubeArchetype({ ...archetype, contactDamage: null })).toBe(
      false,
    );
    expect(
      isSulfurCubeArchetype({
        ...archetype,
        contactDamage: { ...contactDamageOptions, damageType: "invalid!" },
      }),
    ).toBe(false);
    expect(
      isSulfurCubeArchetype({ ...archetype, attributeModifiers: [null] }),
    ).toBe(false);
    expect(
      isSulfurCubeArchetype({
        ...archetype,
        attributeModifiers: [{ ...firstAttributeModifier, id: "short" }],
      }),
    ).toBe(false);
    expect(
      isSulfurCubeArchetype({ ...archetype, knockbackModifiers: null }),
    ).toBe(false);
    expect(isSulfurCubeArchetype({ ...archetype, soundSettings: null })).toBe(
      false,
    );
    expect(isSulfurCubeArchetype({ ...archetype, extra: true })).toBe(false);
    expect(isSulfurCubeArchetype(null)).toBe(false);
    expect(isSulfurCubeArchetype([])).toBe(false);
  });
});
