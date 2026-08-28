/** Portable data contracts for current Java entity attributes. */
import { ResourceLocation } from './identifiers.js'
import type {
  Bounciness,
  EntityPhysicsModifier,
  EntityVisibilityDistance,
  KnockbackResistance,
} from './quantities.js'

export const ENTITY_ATTRIBUTE_NAMES = [
  'bounciness',
  'frictionModifier',
  'airDragModifier',
  'nameTagDistance',
  'belowNameDistance',
  'knockbackResistance',
] as const

export type EntityAttributeName = (typeof ENTITY_ATTRIBUTE_NAMES)[number]

export type EntityAttributeDefinition = Readonly<{
  readonly name: EntityAttributeName
  readonly id: ResourceLocation
  readonly defaultValue: number
  readonly minimum: number
  readonly maximum: number | undefined
}>

export const ENTITY_ATTRIBUTE_DEFINITIONS: Readonly<Record<EntityAttributeName, EntityAttributeDefinition>> = Object.freeze({
  bounciness: Object.freeze({
    name: 'bounciness',
    id: ResourceLocation('minecraft:bounciness'),
    defaultValue: 0,
    minimum: 0,
    maximum: 1,
  }),
  frictionModifier: Object.freeze({
    name: 'frictionModifier',
    id: ResourceLocation('minecraft:friction_modifier'),
    defaultValue: 1,
    minimum: 0,
    maximum: 2048,
  }),
  airDragModifier: Object.freeze({
    name: 'airDragModifier',
    id: ResourceLocation('minecraft:air_drag_modifier'),
    defaultValue: 1,
    minimum: 0,
    maximum: 2048,
  }),
  nameTagDistance: Object.freeze({
    name: 'nameTagDistance',
    id: ResourceLocation('minecraft:name_tag_distance'),
    defaultValue: 64,
    minimum: 0,
    maximum: 512,
  }),
  belowNameDistance: Object.freeze({
    name: 'belowNameDistance',
    id: ResourceLocation('minecraft:below_name_distance'),
    defaultValue: 10,
    minimum: 0,
    maximum: 512,
  }),
  knockbackResistance: Object.freeze({
    name: 'knockbackResistance',
    id: ResourceLocation('minecraft:knockback_resistance'),
    defaultValue: 0,
    minimum: -2,
    maximum: undefined,
  }),
})

export type EntityAttributes = Readonly<{
  readonly bounciness: Bounciness
  readonly frictionModifier: EntityPhysicsModifier
  readonly airDragModifier: EntityPhysicsModifier
  readonly nameTagDistance: EntityVisibilityDistance
  readonly belowNameDistance: EntityVisibilityDistance
  readonly knockbackResistance: KnockbackResistance
}>

export type EntityAttributeOptions = Readonly<{
  readonly bounciness?: number
  readonly frictionModifier?: number
  readonly airDragModifier?: number
  readonly nameTagDistance?: number
  readonly belowNameDistance?: number
  readonly knockbackResistance?: number
}>

export type EntityAttributeValue = EntityAttributes[EntityAttributeName]
