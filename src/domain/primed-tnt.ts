import { planExplosion } from './explosion.js'
import {
  DEFAULT_TNT_FUSE_SECS,
  MAX_TNT_FUSE_ADVANCE_SECS,
} from './primed-tnt-data.js'
import type {
  PrimedTntCommit,
  PrimedTntMutation,
  PrimedTntPlan,
  PrimedTntRequest,
  PrimedTntState,
} from './primed-tnt-data.js'

export { DEFAULT_TNT_FUSE_SECS, MAX_TNT_FUSE_ADVANCE_SECS }
export type {
  PrimedTntCommit,
  PrimedTntMutation,
  PrimedTntPlan,
  PrimedTntRequest,
  PrimedTntState,
} from './primed-tnt-data.js'

const finiteNonNegative = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.max(0, value)
}

export const primeTnt = (fuseSecs: number = DEFAULT_TNT_FUSE_SECS): PrimedTntState => ({
  kind: 'primed',
  remainingFuseSecs: finiteNonNegative(fuseSecs),
})

export const planPrimedTnt = (request: PrimedTntRequest): PrimedTntPlan => {
  const requestedSecs = finiteNonNegative(request.deltaTimeSecs)
  const advancedSecs = Math.min(requestedSecs, MAX_TNT_FUSE_ADVANCE_SECS)
  const deferredSecs = requestedSecs - advancedSecs

  if (request.state.kind === 'detonated') {
    return {
      advancedSecs: 0,
      after: request.state,
      before: request.state,
      deferredSecs: 0,
    }
  }

  const remainingFuseSecs = finiteNonNegative(request.state.remainingFuseSecs)
  if (advancedSecs < remainingFuseSecs) {
    return {
      advancedSecs,
      after: {
        kind: 'primed',
        remainingFuseSecs: remainingFuseSecs - advancedSecs,
      },
      before: request.state,
      deferredSecs,
    }
  }

  return {
    advancedSecs: remainingFuseSecs,
    after: { kind: 'detonated' },
    before: request.state,
    deferredSecs,
    explosion: planExplosion(request),
  }
}

export const applyPrimedTntPlan = (plan: PrimedTntPlan, commit: PrimedTntCommit): void => {
  const mutation: PrimedTntMutation = plan.explosion
    ? {
        expected: plan.before,
        explosion: {
          destroyedBlocks: plan.explosion.destroyedBlocks,
          entityEffects: plan.explosion.entityEffects,
        },
        next: plan.after,
      }
    : {
        expected: plan.before,
        next: plan.after,
      }
  commit(mutation)
}
