import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Ref } from 'effect'
import { snapshotAgeSecs, type CameraPoseSnapshot } from '../domain/camera'
import { ClockPort, FixedClockLayer, monotonicSecs, wallClockEpochMillis } from '../domain/clock'
import { position } from '../domain/coordinates'
import { StageId } from '../domain/identifiers'
import type { GameModule, StageRegistration } from '../domain/frame'
import { DeltaTimeSecs, EpochMillis, MonotonicTimeSecs } from '../domain/quantities'

const FIXED_AT = {
  monotonicSecs: MonotonicTimeSecs(1_234.5),
  wallClockEpochMillis: EpochMillis(1_700_000_000_000),
}

describe('ClockPort', () => {
  it.effect('monotonicSecs reads the injected Port, which is why Date.now() can be banned outright', () =>
    Effect.gen(function* () {
      const now = yield* monotonicSecs
      expect(now).toBe(1_234.5)
    }).pipe(Effect.provide(FixedClockLayer(FIXED_AT))),
  )

  it.effect('wallClockEpochMillis reads the injected Port', () =>
    Effect.gen(function* () {
      const now = yield* wallClockEpochMillis
      expect(now).toBe(1_700_000_000_000)
    }).pipe(Effect.provide(FixedClockLayer(FIXED_AT))),
  )

  it.effect('a fixed clock is deterministic: repeated reads inside one effect return the same instant', () =>
    Effect.gen(function* () {
      const first = yield* monotonicSecs
      const second = yield* monotonicSecs
      expect(second).toBe(first)
    }).pipe(Effect.provide(FixedClockLayer(FIXED_AT))),
  )

  it.effect('a test can substitute an advancing clock without any production code knowing', () =>
    Effect.gen(function* () {
      const ticks = yield* Ref.make(0)
      const advancing = Layer.effect(
        ClockPort,
        Effect.succeed({
          monotonicSecs: Ref.updateAndGet(ticks, (value) => value + 1).pipe(
            Effect.map((value) => MonotonicTimeSecs(value)),
          ),
          wallClockEpochMillis: Effect.succeed(EpochMillis(0)),
        }),
      )

      const readings = yield* Effect.all([monotonicSecs, monotonicSecs, monotonicSecs]).pipe(
        Effect.provide(advancing),
      )

      expect(readings).toStrictEqual([1, 2, 3])
    }),
  )
})

describe('CameraPoseSnapshot', () => {
  const snapshot: CameraPoseSnapshot = {
    position: position(8, 65, -12),
    yawRadians: 0,
    pitchRadians: 0,
    capturedAtSecs: MonotonicTimeSecs(100),
  }

  it.effect('snapshotAgeSecs tells the renderer how stale the pose it is mirroring has become', () =>
    Effect.sync(() => {
      expect(snapshotAgeSecs(snapshot, MonotonicTimeSecs(100.25))).toBeCloseTo(0.25, 10)
      expect(snapshotAgeSecs(snapshot, MonotonicTimeSecs(100))).toBe(0)
    }),
  )

  it.effect('snapshotAgeSecs goes negative under clock skew rather than clamping the problem away', () =>
    Effect.sync(() => {
      // A worker thread stamping a pose slightly ahead of the reader's clock is
      // a real condition worth surfacing; a DeltaTimeSecs brand would have
      // thrown here and hidden it.
      expect(snapshotAgeSecs(snapshot, MonotonicTimeSecs(99.5))).toBeCloseTo(-0.5, 10)
    }),
  )
})

describe('GameModule / StageRegistration contract', () => {
  it.effect('a module can declare stages, ordering edges and layers, and its stages run against FrameServices', () =>
    Effect.gen(function* () {
      const observed = yield* Ref.make<ReadonlyArray<number>>([])

      const tick: StageRegistration = {
        id: StageId('sim:tick'),
        after: [StageId('input:sample')],
        run: (dt) =>
          Effect.gen(function* () {
            // A stage may read the clock, because ClockPort is in FrameServices.
            const now = yield* monotonicSecs
            yield* Ref.update(observed, (previous) => [...previous, dt + now])
          }),
      }

      const module: GameModule<never, never, never> = {
        layers: Layer.empty,
        frameStages: [tick],
      }

      const [stage] = module.frameStages
      expect(stage).toBeDefined()
      expect(module.frameStages).toHaveLength(1)

      yield* Effect.forEach(module.frameStages, (registration) =>
        registration.run(DeltaTimeSecs(0.5)),
      ).pipe(Effect.provide(FixedClockLayer(FIXED_AT)))

      expect(yield* Ref.get(observed)).toStrictEqual([1_235])
    }),
  )

  it.effect('`after` is optional, so a stage with no ordering constraints needs no ceremony', () =>
    Effect.gen(function* () {
      const standalone: StageRegistration = {
        id: StageId('sim:standalone'),
        run: () => Effect.void,
      }

      expect(standalone.after).toBeUndefined()
      yield* standalone.run(DeltaTimeSecs(0)).pipe(Effect.provide(FixedClockLayer(FIXED_AT)))
    }),
  )
})
