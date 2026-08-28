import type {
  ExplosionLimits,
  ExplosionMutation,
  ExplosionPlan,
  ExplosionRequest,
} from './explosion-data.js'

export const DEFAULT_TNT_FUSE_SECS = 4
export const MAX_TNT_FUSE_ADVANCE_SECS = 10

export type PrimedTntState =
  | Readonly<{ kind: 'primed'; remainingFuseSecs: number }>
  | Readonly<{ kind: 'detonated' }>

export type PrimedTntRequest = Omit<ExplosionRequest, 'limits'> & {
  readonly state: PrimedTntState
  readonly deltaTimeSecs: number
  readonly limits?: Partial<ExplosionLimits>
}

export type PrimedTntPlan = Readonly<{
  readonly before: PrimedTntState
  readonly after: PrimedTntState
  readonly advancedSecs: number
  readonly deferredSecs: number
  readonly explosion?: ExplosionPlan
}>

export type PrimedTntMutation = Readonly<{
  readonly expected: PrimedTntState
  readonly next: PrimedTntState
  readonly explosion?: ExplosionMutation
}>

export type PrimedTntCommit = (mutation: PrimedTntMutation) => void
