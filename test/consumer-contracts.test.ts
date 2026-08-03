import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import {
  DeltaTimeSecs,
  type GameModule,
  type StageRegistration,
  StageId,
  WorldId,
} from '../src/index.js'

describe('consumer contracts', () => {
  it.effect('provides the shared vocabulary used by composition and physics', () =>
    Effect.sync(() => {
      const world: ReturnType<typeof WorldId> = WorldId('overworld')
      const delta: ReturnType<typeof DeltaTimeSecs> = DeltaTimeSecs(1 / 60)
      const stage: StageRegistration = {
        id: StageId('physics:integrate'),
        run: () => Effect.void,
      }
      const module: GameModule<never, never, never> = {
        layers: Layer.empty,
        frameStages: Effect.succeed([stage]),
      }

      expect(world).toBe('overworld')
      expect(delta).toBeCloseTo(1 / 60)
      expect(module.frameStages).toBeDefined()
    }),
  )
})
