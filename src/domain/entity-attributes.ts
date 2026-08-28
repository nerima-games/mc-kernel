/** Constructors and pure rules for current Java entity attributes. */
import {
  ENTITY_ATTRIBUTE_DEFINITIONS,
  type EntityAttributeName,
  type EntityAttributeOptions,
  type EntityAttributes,
  type EntityAttributeDefinition,
} from './entity-attributes-data.js'
import { isEntityAttributeOptions, isEntityAttributes } from './entity-attributes-validation.js'
import { Bounciness, EntityPhysicsModifier, EntityVisibilityDistance, KnockbackResistance } from './quantities.js'

const valueOrDefault = (value: number | undefined, defaultValue: number): number =>
  value === undefined ? defaultValue : value

export const entityAttributes = (options: EntityAttributeOptions = {}): EntityAttributes => {
  if (!isEntityAttributeOptions(options)) {
    throw new TypeError('Entity attribute options must be a plain object with valid values')
  }
  return Object.freeze({
    bounciness: Bounciness(
      valueOrDefault(options.bounciness, ENTITY_ATTRIBUTE_DEFINITIONS.bounciness.defaultValue),
    ),
    frictionModifier: EntityPhysicsModifier(
      valueOrDefault(options.frictionModifier, ENTITY_ATTRIBUTE_DEFINITIONS.frictionModifier.defaultValue),
    ),
    airDragModifier: EntityPhysicsModifier(
      valueOrDefault(options.airDragModifier, ENTITY_ATTRIBUTE_DEFINITIONS.airDragModifier.defaultValue),
    ),
    nameTagDistance: EntityVisibilityDistance(
      valueOrDefault(options.nameTagDistance, ENTITY_ATTRIBUTE_DEFINITIONS.nameTagDistance.defaultValue),
    ),
    belowNameDistance: EntityVisibilityDistance(
      valueOrDefault(options.belowNameDistance, ENTITY_ATTRIBUTE_DEFINITIONS.belowNameDistance.defaultValue),
    ),
    knockbackResistance: KnockbackResistance(
      valueOrDefault(options.knockbackResistance, ENTITY_ATTRIBUTE_DEFINITIONS.knockbackResistance.defaultValue),
    ),
  })
}

export const DEFAULT_ENTITY_ATTRIBUTES: EntityAttributes = entityAttributes()

export const entityAttributeDefinitionOf = (name: EntityAttributeName): EntityAttributeDefinition =>
  ENTITY_ATTRIBUTE_DEFINITIONS[name]

export const effectiveBounciness = (block: number, entity: number): Bounciness => {
  if (!Bounciness.is(block) || !Bounciness.is(entity)) {
    throw new TypeError('Block and entity bounciness must be finite numbers in [0, 1]')
  }
  return Bounciness(Math.max(block, entity))
}

export { isEntityAttributeOptions, isEntityAttributes }
export {
  ENTITY_ATTRIBUTE_DEFINITIONS,
  ENTITY_ATTRIBUTE_NAMES,
  type EntityAttributeDefinition,
  type EntityAttributeName,
  type EntityAttributeOptions,
  type EntityAttributeValue,
  type EntityAttributes,
} from './entity-attributes-data.js'
