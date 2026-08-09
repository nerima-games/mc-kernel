import {
  DeltaTimeSecs,
  type GameModule,
  StageId,
  type StageRegistration,
  WorldId,
} from '../src/index.js'
import { Effect, Layer } from 'effect'
import { describe, expect, it } from '@effect/vitest'

const ONE = 1
const TICKS_PER_SECOND = 60
const deltaTimeSecs = DeltaTimeSecs
const stageId = StageId
const worldId = WorldId

describe('consumer contracts', () => {
  it.effect('provides the shared vocabulary used by composition and physics', () =>
    Effect.sync(() => {
      const world: ReturnType<typeof WorldId> = worldId('overworld')
      const delta: ReturnType<typeof DeltaTimeSecs> = deltaTimeSecs(ONE / TICKS_PER_SECOND)
      const stage: StageRegistration = {
        id: stageId('physics:integrate'),
        run: () => Effect.void,
      }
      const module: GameModule<never, never, never> = {
        frameStages: Effect.succeed([stage]),
        layers: Layer.empty,
      }

      expect(world).toBe('overworld')
      expect(delta).toBeCloseTo(ONE / TICKS_PER_SECOND)
      expect(Effect.runSync(module.frameStages)).toStrictEqual([stage])
    }),
  )
})
