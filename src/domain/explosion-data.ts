import type { Position } from './coordinates.js'

export type ExplosionBlockPosition = Position

export type ExplosionBlock = Readonly<{
  readonly resistance: number
  readonly destructible: boolean
}>

export type ExplosionBlockReader = (position: ExplosionBlockPosition) => ExplosionBlock | undefined

export type ExplosionEntity = Readonly<{
  readonly id: string
  readonly feetPosition: Position
}>

export type ExplosionEntityEffect = Readonly<{
  readonly id: string
  readonly damage: number
  readonly knockback: Position
  readonly exposure: number
}>

export type ExplosionLimits = Readonly<{
  readonly maxVisitedBlocks: number
  readonly maxRaySteps: number
  readonly maxAffectedEntities: number
}>

export const DEFAULT_EXPLOSION_LIMITS: ExplosionLimits = {
  maxAffectedEntities: 1_024,
  maxRaySteps: 128,
  maxVisitedBlocks: 16_384,
}

export type ExplosionRequest = Readonly<{
  readonly center: Position
  readonly radius: number
  readonly seed: number
  readonly blocks: ExplosionBlockReader
  readonly entities: ReadonlyArray<ExplosionEntity>
  readonly limits?: Partial<ExplosionLimits>
}>

export type ExplosionPlan = Readonly<{
  readonly center: Position
  readonly radius: number
  readonly seed: number
  readonly destroyedBlocks: ReadonlyArray<ExplosionBlockPosition>
  readonly entityEffects: ReadonlyArray<ExplosionEntityEffect>
  readonly visitedBlocks: number
  readonly limits: ExplosionLimits
  readonly truncated: boolean
}>

export type ExplosionMutation = Pick<ExplosionPlan, 'destroyedBlocks' | 'entityEffects'>
export type ExplosionCommit = (mutation: ExplosionMutation) => void
