/** Constructors and pure rules for current Java entity attributes. */
import { Result } from 'effect'
import {
  ENTITY_ATTRIBUTE_DEFINITIONS,
  type EntityAttributeName,
  type EntityAttributeOptions,
  type EntityAttributes,
  type EntityAttributeDefinition,
} from './entity-attributes-data.js'
import { isEntityAttributeOptions, isEntityAttributes } from './entity-attributes-validation.js'
import { Bounciness, EntityPhysicsModifier, EntityVisibilityDistance, KnockbackResistance } from '../time/quantities.js'

const valueOrDefault = (value: number | undefined, defaultValue: number): number =>
  value === undefined ? defaultValue : value

const entityAttributesFromOptions = (options: EntityAttributeOptions): EntityAttributes =>
  Object.freeze({
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

export type EntityAttributesFailure = Readonly<{
  readonly _tag: 'InvalidEntityAttributeOptions'
  readonly value: unknown
}>

export const entityAttributes = (
  options: EntityAttributeOptions = {},
): Result.Result<EntityAttributes, EntityAttributesFailure> =>
  isEntityAttributeOptions(options)
    ? Result.succeed(entityAttributesFromOptions(options))
    : Result.fail({ _tag: 'InvalidEntityAttributeOptions', value: options })

export const DEFAULT_ENTITY_ATTRIBUTES: EntityAttributes = entityAttributesFromOptions({})

export const entityAttributeDefinitionOf = (
  name: EntityAttributeName,
): EntityAttributeDefinition =>
  ENTITY_ATTRIBUTE_DEFINITIONS[name]

export type EffectiveBouncinessFailure = Readonly<{
  readonly _tag: 'InvalidBounciness'
  readonly block: number
  readonly entity: number
}>

export const effectiveBounciness = (
  block: Bounciness,
  entity: Bounciness,
): Result.Result<Bounciness, EffectiveBouncinessFailure> => {
  if (!Bounciness.is(block) || !Bounciness.is(entity)) {
    return Result.fail({ _tag: 'InvalidBounciness', block, entity })
  }
  return Result.succeed(Bounciness(Math.max(block, entity)))
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
