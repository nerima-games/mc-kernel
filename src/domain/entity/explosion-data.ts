import { Brand } from 'effect'
import type { Position } from '../coordinates/coordinates.js'
import type { BlockBlastResistance } from '../block/block-property-data.js'
import type { EntityId } from './entity-types.js'
import type { DamageAmount } from '../event/domain-event.js'
import type { RandomSeed } from '../world/random-source.js'

export type ExplosionRadius = number & Brand.Brand<'ExplosionRadius'>
export const ExplosionRadius: Brand.Constructor<ExplosionRadius> = Brand.make<ExplosionRadius>(
  (value) =>
    Number.isFinite(value) && value >= 0
      ? true
      : `ExplosionRadius must be finite and non-negative, received ${value}`,
)

export type ExplosionBlockCount = number & Brand.Brand<'ExplosionBlockCount'>
export const ExplosionBlockCount: Brand.Constructor<ExplosionBlockCount> =
  Brand.make<ExplosionBlockCount>(
    (value) =>
      Number.isSafeInteger(value) && value >= 0
        ? true
        : `ExplosionBlockCount must be a non-negative safe integer, received ${value}`,
  )

export type ExplosionRayStepCount = number & Brand.Brand<'ExplosionRayStepCount'>
export const ExplosionRayStepCount: Brand.Constructor<ExplosionRayStepCount> =
  Brand.make<ExplosionRayStepCount>(
    (value) =>
      Number.isSafeInteger(value) && value >= 0
        ? true
        : `ExplosionRayStepCount must be a non-negative safe integer, received ${value}`,
  )

export type ExplosionEntityCount = number & Brand.Brand<'ExplosionEntityCount'>
export const ExplosionEntityCount: Brand.Constructor<ExplosionEntityCount> =
  Brand.make<ExplosionEntityCount>(
    (value) =>
      Number.isSafeInteger(value) && value >= 0
        ? true
        : `ExplosionEntityCount must be a non-negative safe integer, received ${value}`,
  )

export type ExplosionExposure = number & Brand.Brand<'ExplosionExposure'>
export const ExplosionExposure: Brand.Constructor<ExplosionExposure> =
  Brand.make<ExplosionExposure>(
    (value) =>
      Number.isFinite(value) && value >= 0 && value <= 1
        ? true
        : `ExplosionExposure must be finite and in [0, 1], received ${value}`,
  )

export type ExplosionBlockPosition = Position

export type ExplosionBlock = Readonly<{
  readonly resistance: BlockBlastResistance
  readonly destructible: boolean
}>

export type ExplosionBlockReader = (position: ExplosionBlockPosition) => ExplosionBlock | undefined

export type ExplosionEntity = Readonly<{
  readonly id: EntityId
  readonly feetPosition: Position
}>

export type ExplosionEntityEffect = Readonly<{
  readonly id: EntityId
  readonly damage: DamageAmount
  readonly knockback: Position
  readonly exposure: ExplosionExposure
}>

export type ExplosionLimits = Readonly<{
  readonly maxVisitedBlocks: ExplosionBlockCount
  readonly maxRaySteps: ExplosionRayStepCount
  readonly maxAffectedEntities: ExplosionEntityCount
}>

export const DEFAULT_EXPLOSION_LIMITS: ExplosionLimits = {
  maxAffectedEntities: ExplosionEntityCount(1_024),
  maxRaySteps: ExplosionRayStepCount(128),
  maxVisitedBlocks: ExplosionBlockCount(16_384),
}

export type ExplosionRequest = Readonly<{
  readonly center: Position
  readonly radius: ExplosionRadius
  readonly seed: RandomSeed
  readonly blocks: ExplosionBlockReader
  readonly entities: ReadonlyArray<ExplosionEntity>
  readonly limits?: Partial<ExplosionLimits>
}>

export type ExplosionPlan = Readonly<{
  readonly center: Position
  readonly radius: ExplosionRadius
  readonly seed: RandomSeed
  readonly destroyedBlocks: ReadonlyArray<ExplosionBlockPosition>
  readonly entityEffects: ReadonlyArray<ExplosionEntityEffect>
  readonly visitedBlocks: ExplosionBlockCount
  readonly limits: ExplosionLimits
  readonly truncated: boolean
}>

export type ExplosionMutation = Pick<ExplosionPlan, 'destroyedBlocks' | 'entityEffects'>
export type ExplosionCommit = (mutation: ExplosionMutation) => void
