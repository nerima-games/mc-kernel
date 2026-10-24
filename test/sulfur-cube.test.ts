import { describe, expect, it } from "vitest";
import { Result } from "effect";

import { NamespacedResourceLocation, ResourceLocation, TagLocation } from "../src/domain/text/identifiers";
import { AttributeModifierAmount, PositiveTickCount } from "../src/domain/time/quantities";
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
  SulfurCubeContactDamageAmount,
  SulfurCubeExplosionPower,
  SulfurCubeKnockbackPower,
  SulfurCubePushSoundCooldown,
  SulfurCubePushSoundImpulseThreshold,
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
} from "../src/domain/entity/sulfur-cube";

const explosionOptions: SulfurCubeExplosionOptions = {
  fuse: PositiveTickCount(20),
  power: SulfurCubeExplosionPower(4),
  causesFire: true,
};

const contactDamageOptions: SulfurCubeContactDamageOptions = {
  amount: SulfurCubeContactDamageAmount(3.5),
  damageType: SULFUR_CUBE_DAMAGE_TYPES.hot,
  attributeToSource: true,
};

const firstAttributeModifier: SulfurCubeAttributeModifierOptions = {
  attribute: NamespacedResourceLocation("minecraft:bounciness"),
  id: NamespacedResourceLocation("minecraft:sulfur_cube_bounciness"),
  amount: AttributeModifierAmount(0.25),
  operation: "add_value",
};

const attributeModifiers: ReadonlyArray<SulfurCubeAttributeModifierOptions> = [
  firstAttributeModifier,
  {
    attribute: NamespacedResourceLocation("minecraft:friction_modifier"),
    id: NamespacedResourceLocation("minecraft:sulfur_cube_friction"),
    amount: AttributeModifierAmount(-0.1),
    operation: "add_multiplied_base",
  },
  {
    attribute: NamespacedResourceLocation("minecraft:air_drag_modifier"),
    id: NamespacedResourceLocation("minecraft:sulfur_cube_air_drag"),
    amount: AttributeModifierAmount(0.2),
    operation: "add_multiplied_total",
  },
];

const knockbackModifiers: SulfurCubeKnockbackModifiersOptions = {
  horizontalPower: SulfurCubeKnockbackPower(1.25),
  verticalPower: SulfurCubeKnockbackPower(0.5),
};

const soundSettings: SulfurCubeSoundSettingsOptions = {
  hitSound: ResourceLocation("minecraft:entity.slime.squish"),
  pushSound: ResourceLocation("minecraft:entity.slime.jump"),
  pushSoundImpulseThreshold: SulfurCubePushSoundImpulseThreshold(0.4),
  pushSoundCooldown: SulfurCubePushSoundCooldown(0.2),
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
  it("validates the new quantity brands at their accepted and rejected boundaries", () => {
    expect(PositiveTickCount(1)).toBe(1)
    expect(() => PositiveTickCount(0)).toThrow()
    expect(SulfurCubeExplosionPower(0)).toBe(0)
    expect(SulfurCubeExplosionPower(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER)
    expect(() => SulfurCubeExplosionPower(-1)).toThrow()
    expect(() => SulfurCubeExplosionPower(1.5)).toThrow()
    expect(() => SulfurCubeExplosionPower(Number.MAX_SAFE_INTEGER + 1)).toThrow()
    expect(SulfurCubeContactDamageAmount(0)).toBe(0)
    expect(SulfurCubeContactDamageAmount(Number.MAX_VALUE)).toBe(Number.MAX_VALUE)
    expect(() => SulfurCubeContactDamageAmount(-Number.EPSILON)).toThrow()
    expect(() => SulfurCubeContactDamageAmount(Number.POSITIVE_INFINITY)).toThrow()
    expect(() => SulfurCubeContactDamageAmount(Number.NaN)).toThrow()
    expect(SulfurCubeKnockbackPower(-Number.MAX_VALUE)).toBe(-Number.MAX_VALUE)
    expect(() => SulfurCubeKnockbackPower(Number.NaN)).toThrow()
    expect(() => SulfurCubeKnockbackPower(Number.NEGATIVE_INFINITY)).toThrow()
    expect(SulfurCubePushSoundImpulseThreshold(0)).toBe(0)
    expect(() => SulfurCubePushSoundImpulseThreshold(Number.POSITIVE_INFINITY)).toThrow()
    expect(SulfurCubePushSoundCooldown(0)).toBe(0)
    expect(() => SulfurCubePushSoundCooldown(Number.NEGATIVE_INFINITY)).toThrow()
  })

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
    const neitherOptions = {
      ...withoutOptionals,
      explosion: undefined,
      contactDamage: undefined,
    };
    const explosionOnlyOptions = {
      ...validOptions,
      contactDamage: undefined,
    };
    const contactOnlyOptions = {
      ...validOptions,
      explosion: undefined,
    };
    const neither = sulfurCubeArchetype(withoutOptionals);
    const explosionOnly = sulfurCubeArchetype({
      items: validOptions.items,
      buoyant: validOptions.buoyant,
      explosion: explosionOptions,
      attributeModifiers,
      knockbackModifiers,
      soundSettings,
    });
    const contactOnly = sulfurCubeArchetype({
      items: validOptions.items,
      buoyant: validOptions.buoyant,
      contactDamage: contactDamageOptions,
      attributeModifiers,
      knockbackModifiers,
      soundSettings,
    });

    expect(isSulfurCubeArchetypeOptions(withoutOptionals)).toBe(true);
    expect(sulfurCubeArchetypeFromUnknown(neitherOptions)).toStrictEqual(
      Result.succeed(neither),
    );
    expect(sulfurCubeArchetypeFromUnknown(explosionOnlyOptions)).toStrictEqual(
      Result.succeed(explosionOnly),
    );
    expect(sulfurCubeArchetypeFromUnknown(contactOnlyOptions)).toStrictEqual(
      Result.succeed(contactOnly),
    );
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
    const invalidOptions = optionsWith({ items: "invalid!" });
    expect(sulfurCubeArchetypeFromUnknown(invalidOptions)).toStrictEqual(
      Result.fail({
        _tag: "InvalidSulfurCubeArchetypeOptions",
        value: invalidOptions,
      }),
    );
  });

  it("snapshots getter-backed decoder input before brand construction", () => {
    let reads = 0
    const input = new Proxy({ ...validOptions }, {
      get(target, key, receiver) {
        if (key === 'items') {
          reads += 1
          return reads === 1 ? validOptions.items : 'invalid!'
        }
        return Reflect.get(target, key, receiver)
      },
    })

    const result = sulfurCubeArchetypeFromUnknown(input)
    expect(Result.isSuccess(result)).toBe(true)
    expect(reads).toBe(1)
    if (Result.isSuccess(result)) expect(result.success.items).toBe(validOptions.items)
  })

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
