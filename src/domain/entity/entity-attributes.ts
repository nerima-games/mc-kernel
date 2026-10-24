/** Constructors and pure rules for current Java entity attributes. */
import { Brand, Result } from 'effect'
import {
  ENTITY_ATTRIBUTE_DEFINITIONS,
  type EntityAttributeName,
  type EntityAttributeOptions,
  type EntityAttributes,
  type EntityAttributeDefinition,
} from './entity-attributes-data.js'
import { isEntityAttributeOptions, isEntityAttributes } from './entity-attributes-validation.js'
import { Bounciness, EntityPhysicsModifier, EntityVisibilityDistance, KnockbackResistance } from '../time/quantities.js'
import { snapshotInputRecord } from '../../input-snapshot.js'

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

const entityAttributesFailure = (value: unknown): EntityAttributesFailure => ({
  _tag: 'InvalidEntityAttributeOptions',
  value,
})

const entityAttributesFromValidatedOptions = (
  options: EntityAttributeOptions,
): Result.Result<EntityAttributes, EntityAttributesFailure> =>
  Result.gen(function* () {
    const bounciness = yield* Bounciness.result(valueOrDefault(options.bounciness, ENTITY_ATTRIBUTE_DEFINITIONS.bounciness.defaultValue))
    const frictionModifier = yield* EntityPhysicsModifier.result(valueOrDefault(options.frictionModifier, ENTITY_ATTRIBUTE_DEFINITIONS.frictionModifier.defaultValue))
    const airDragModifier = yield* EntityPhysicsModifier.result(valueOrDefault(options.airDragModifier, ENTITY_ATTRIBUTE_DEFINITIONS.airDragModifier.defaultValue))
    const nameTagDistance = yield* EntityVisibilityDistance.result(valueOrDefault(options.nameTagDistance, ENTITY_ATTRIBUTE_DEFINITIONS.nameTagDistance.defaultValue))
    const belowNameDistance = yield* EntityVisibilityDistance.result(valueOrDefault(options.belowNameDistance, ENTITY_ATTRIBUTE_DEFINITIONS.belowNameDistance.defaultValue))
    const knockbackResistance = yield* KnockbackResistance.result(valueOrDefault(options.knockbackResistance, ENTITY_ATTRIBUTE_DEFINITIONS.knockbackResistance.defaultValue))
    return Object.freeze({
      bounciness,
      frictionModifier,
      airDragModifier,
      nameTagDistance,
      belowNameDistance,
      knockbackResistance,
    })
  })

export type EntityAttributesFailure = Readonly<{
  readonly _tag: 'InvalidEntityAttributeOptions'
  readonly value: unknown
}> | Brand.BrandError

export const entityAttributes = (
  options: EntityAttributeOptions = {},
): Result.Result<EntityAttributes, EntityAttributesFailure> => {
  const snapshot = snapshotInputRecord(options)
  if (Result.isFailure(snapshot)) return Result.fail(entityAttributesFailure(options))
  const normalized: unknown = snapshot.success
  return isEntityAttributeOptions(normalized)
    ? entityAttributesFromValidatedOptions(normalized)
    : Result.fail(entityAttributesFailure(options))
}

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
