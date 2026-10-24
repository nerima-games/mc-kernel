/** Portable data contracts for current Java entity attributes. */
import { ResourceLocation } from '../text/identifiers.js'
import { Bounciness, EntityPhysicsModifier, EntityVisibilityDistance, KnockbackResistance } from '../time/quantities.js'
import type {
  Bounciness as BouncinessValue,
  EntityPhysicsModifier as EntityPhysicsModifierValue,
  EntityVisibilityDistance as EntityVisibilityDistanceValue,
  KnockbackResistance as KnockbackResistanceValue,
} from '../time/quantities.js'

export const ENTITY_ATTRIBUTE_NAMES = [
  'bounciness',
  'frictionModifier',
  'airDragModifier',
  'nameTagDistance',
  'belowNameDistance',
  'knockbackResistance',
] as const

export type EntityAttributeName = (typeof ENTITY_ATTRIBUTE_NAMES)[number]

type EntityAttributeValueByName = Readonly<{
  bounciness: BouncinessValue
  frictionModifier: EntityPhysicsModifierValue
  airDragModifier: EntityPhysicsModifierValue
  nameTagDistance: EntityVisibilityDistanceValue
  belowNameDistance: EntityVisibilityDistanceValue
  knockbackResistance: KnockbackResistanceValue
}>

export type EntityAttributeDefinition<Name extends EntityAttributeName = EntityAttributeName> =
  Name extends EntityAttributeName
    ? Readonly<{
        readonly name: Name
        readonly id: ResourceLocation
        readonly defaultValue: EntityAttributeValueByName[Name]
        readonly minimum: EntityAttributeValueByName[Name]
        readonly maximum: EntityAttributeValueByName[Name] | undefined
      }>
    : never

export const ENTITY_ATTRIBUTE_DEFINITIONS: Readonly<{
  [Name in EntityAttributeName]: EntityAttributeDefinition<Name>
}> = Object.freeze({
  bounciness: Object.freeze({
    name: 'bounciness',
    id: ResourceLocation('minecraft:bounciness'),
    defaultValue: Bounciness(0),
    minimum: Bounciness(0),
    maximum: Bounciness(1),
  }),
  frictionModifier: Object.freeze({
    name: 'frictionModifier',
    id: ResourceLocation('minecraft:friction_modifier'),
    defaultValue: EntityPhysicsModifier(1),
    minimum: EntityPhysicsModifier(0),
    maximum: EntityPhysicsModifier(2048),
  }),
  airDragModifier: Object.freeze({
    name: 'airDragModifier',
    id: ResourceLocation('minecraft:air_drag_modifier'),
    defaultValue: EntityPhysicsModifier(1),
    minimum: EntityPhysicsModifier(0),
    maximum: EntityPhysicsModifier(2048),
  }),
  nameTagDistance: Object.freeze({
    name: 'nameTagDistance',
    id: ResourceLocation('minecraft:name_tag_distance'),
    defaultValue: EntityVisibilityDistance(64),
    minimum: EntityVisibilityDistance(0),
    maximum: EntityVisibilityDistance(512),
  }),
  belowNameDistance: Object.freeze({
    name: 'belowNameDistance',
    id: ResourceLocation('minecraft:below_name_distance'),
    defaultValue: EntityVisibilityDistance(10),
    minimum: EntityVisibilityDistance(0),
    maximum: EntityVisibilityDistance(512),
  }),
  knockbackResistance: Object.freeze({
    name: 'knockbackResistance',
    id: ResourceLocation('minecraft:knockback_resistance'),
    defaultValue: KnockbackResistance(0),
    minimum: KnockbackResistance(-2),
    maximum: undefined,
  }),
})

export type EntityAttributes = Readonly<{
  readonly bounciness: BouncinessValue
  readonly frictionModifier: EntityPhysicsModifierValue
  readonly airDragModifier: EntityPhysicsModifierValue
  readonly nameTagDistance: EntityVisibilityDistanceValue
  readonly belowNameDistance: EntityVisibilityDistanceValue
  readonly knockbackResistance: KnockbackResistanceValue
}>

export type EntityAttributeOptions = Readonly<{
  readonly bounciness?: BouncinessValue
  readonly frictionModifier?: EntityPhysicsModifierValue
  readonly airDragModifier?: EntityPhysicsModifierValue
  readonly nameTagDistance?: EntityVisibilityDistanceValue
  readonly belowNameDistance?: EntityVisibilityDistanceValue
  readonly knockbackResistance?: KnockbackResistanceValue
}>

export type EntityAttributeValue = EntityAttributes[EntityAttributeName]
