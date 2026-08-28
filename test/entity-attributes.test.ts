import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ENTITY_ATTRIBUTES,
  ENTITY_ATTRIBUTE_DEFINITIONS,
  ENTITY_ATTRIBUTE_NAMES,
  effectiveBounciness,
  entityAttributeDefinitionOf,
  entityAttributes,
  isEntityAttributeOptions,
  isEntityAttributes,
} from '../src/domain/entity'
import { Bounciness, EntityPhysicsModifier, EntityVisibilityDistance, KnockbackResistance } from '../src/domain/quantities'

describe('entity attributes', () => {
  it('enforces the official numeric ranges at branded boundaries', () => {
    expect(Bounciness(0)).toBe(0)
    expect(Bounciness(1)).toBe(1)
    expect(EntityPhysicsModifier(0)).toBe(0)
    expect(EntityPhysicsModifier(2048)).toBe(2048)
    expect(EntityVisibilityDistance(0)).toBe(0)
    expect(EntityVisibilityDistance(512)).toBe(512)
    expect(KnockbackResistance(-2)).toBe(-2)
    expect(KnockbackResistance(0)).toBe(0)

    const invalidValues = [
      () => Bounciness(Number.NaN),
      () => Bounciness(2),
      () => EntityPhysicsModifier(Number.POSITIVE_INFINITY),
      () => EntityPhysicsModifier(-1),
      () => EntityPhysicsModifier(2049),
      () => EntityVisibilityDistance(Number.NEGATIVE_INFINITY),
      () => EntityVisibilityDistance(-1),
      () => EntityVisibilityDistance(513),
      () => KnockbackResistance(Number.NaN),
      () => KnockbackResistance(-3),
    ]

    for (const invalidValue of invalidValues) {
      expect(invalidValue).toThrow()
    }
  })

  it('constructs frozen defaults and validates option boundaries', () => {
    expect(entityAttributes()).toStrictEqual({
      bounciness: 0,
      frictionModifier: 1,
      airDragModifier: 1,
      nameTagDistance: 64,
      belowNameDistance: 10,
      knockbackResistance: 0,
    })
    expect(Object.isFrozen(DEFAULT_ENTITY_ATTRIBUTES)).toBe(true)
    expect(isEntityAttributes(DEFAULT_ENTITY_ATTRIBUTES)).toBe(true)

    const configured = entityAttributes({
      bounciness: 0.5,
      frictionModifier: 1.25,
      airDragModifier: 0.75,
      nameTagDistance: 128,
      belowNameDistance: 20,
      knockbackResistance: -1,
    })
    expect(configured).toStrictEqual({
      bounciness: 0.5,
      frictionModifier: 1.25,
      airDragModifier: 0.75,
      nameTagDistance: 128,
      belowNameDistance: 20,
      knockbackResistance: -1,
    })
    expect(Object.isFrozen(configured)).toBe(true)
    expect(isEntityAttributeOptions(configured)).toBe(true)
    expect(() => entityAttributes({ frictionModifier: -1 })).toThrow()
  })

  it('rejects malformed option and attribute records', () => {
    const malformedOptions: unknown[] = [
      null,
      [],
      1,
      new Date(),
      { unknown: 1 },
      { bounciness: undefined },
      { bounciness: '0' },
      { bounciness: Number.NaN },
      { frictionModifier: -1 },
      { airDragModifier: 2049 },
      { nameTagDistance: 513 },
      { belowNameDistance: Number.POSITIVE_INFINITY },
      { knockbackResistance: -3 },
    ]

    for (const malformedOption of malformedOptions) {
      expect(isEntityAttributeOptions(malformedOption)).toBe(false)
    }

    const valid = entityAttributes()
    const missingBounciness = {
      frictionModifier: valid.frictionModifier,
      airDragModifier: valid.airDragModifier,
      nameTagDistance: valid.nameTagDistance,
      belowNameDistance: valid.belowNameDistance,
      knockbackResistance: valid.knockbackResistance,
    }
    const malformedAttributes: unknown[] = [
      null,
      [],
      new Date(),
      {},
      missingBounciness,
      { ...valid, extra: 1 },
      { ...valid, bounciness: Number.NaN },
      { ...valid, frictionModifier: -1 },
      { ...valid, airDragModifier: 2049 },
      { ...valid, nameTagDistance: 513 },
      { ...valid, belowNameDistance: Number.POSITIVE_INFINITY },
      { ...valid, knockbackResistance: '0' },
    ]

    for (const malformedAttribute of malformedAttributes) {
      expect(isEntityAttributes(malformedAttribute)).toBe(false)
    }
  })

  it('exposes definitions and combines block/entity bounciness safely', () => {
    expect(ENTITY_ATTRIBUTE_NAMES).toStrictEqual([
      'bounciness',
      'frictionModifier',
      'airDragModifier',
      'nameTagDistance',
      'belowNameDistance',
      'knockbackResistance',
    ])

    for (const name of ENTITY_ATTRIBUTE_NAMES) {
      const definition = entityAttributeDefinitionOf(name)
      expect(definition).toBe(ENTITY_ATTRIBUTE_DEFINITIONS[name])
      expect(definition.name).toBe(name)
      expect(definition.id.startsWith('minecraft:')).toBe(true)
    }

    expect(entityAttributeDefinitionOf('knockbackResistance').maximum).toBeUndefined()
    expect(effectiveBounciness(Bounciness(0.25), Bounciness(0.75))).toBe(0.75)
    expect(effectiveBounciness(Bounciness(0.9), Bounciness(0.2))).toBe(0.9)
    expect(() => effectiveBounciness(-1, 0.5)).toThrow()
    expect(() => effectiveBounciness(0.5, 2)).toThrow()
  })
})
