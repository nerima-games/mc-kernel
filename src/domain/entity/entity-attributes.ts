/** Constructors and pure rules for current Java entity attributes. */
import { Effect, Result } from 'effect'
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

const entityAttributesFailure = (value: unknown): EntityAttributesFailure => ({
  _tag: 'InvalidEntityAttributeOptions',
  value,
})

const mapBrandFailure = <Value, Error>(
  result: Result.Result<Value, Error>,
  value: unknown,
): Result.Result<Value, EntityAttributesFailure> =>
  Result.mapError(result, () => entityAttributesFailure(value))

const entityAttributesFromValidatedOptions = (
  options: EntityAttributeOptions,
  original: unknown,
): Result.Result<EntityAttributes, EntityAttributesFailure> =>
  Result.gen(function* () {
    const bounciness = yield* mapBrandFailure(
      Bounciness.result(valueOrDefault(options.bounciness, ENTITY_ATTRIBUTE_DEFINITIONS.bounciness.defaultValue)),
      original,
    )
    const frictionModifier = yield* mapBrandFailure(
      EntityPhysicsModifier.result(valueOrDefault(options.frictionModifier, ENTITY_ATTRIBUTE_DEFINITIONS.frictionModifier.defaultValue)),
      original,
    )
    const airDragModifier = yield* mapBrandFailure(
      EntityPhysicsModifier.result(valueOrDefault(options.airDragModifier, ENTITY_ATTRIBUTE_DEFINITIONS.airDragModifier.defaultValue)),
      original,
    )
    const nameTagDistance = yield* mapBrandFailure(
      EntityVisibilityDistance.result(valueOrDefault(options.nameTagDistance, ENTITY_ATTRIBUTE_DEFINITIONS.nameTagDistance.defaultValue)),
      original,
    )
    const belowNameDistance = yield* mapBrandFailure(
      EntityVisibilityDistance.result(valueOrDefault(options.belowNameDistance, ENTITY_ATTRIBUTE_DEFINITIONS.belowNameDistance.defaultValue)),
      original,
    )
    const knockbackResistance = yield* mapBrandFailure(
      KnockbackResistance.result(valueOrDefault(options.knockbackResistance, ENTITY_ATTRIBUTE_DEFINITIONS.knockbackResistance.defaultValue)),
      original,
    )
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
}>

export const entityAttributes = (
  options: EntityAttributeOptions = {},
): Result.Result<EntityAttributes, EntityAttributesFailure> => {
  const snapshot = Effect.runSync(Effect.result(Effect.try({
    try: () => {
      if (typeof options !== 'object' || options === null || Array.isArray(options)) return options
      const prototype = Object.getPrototypeOf(options)
      if (prototype !== Object.prototype && prototype !== null) return options
      return Object.fromEntries(Object.entries(options))
    },
    catch: () => undefined,
  })))
  if (Result.isFailure(snapshot)) return Result.fail(entityAttributesFailure(options))
  const normalized: unknown = snapshot.success
  return isEntityAttributeOptions(normalized)
    ? entityAttributesFromValidatedOptions(normalized, options)
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
