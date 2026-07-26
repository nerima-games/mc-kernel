import { describe, expect, it } from '@effect/vitest'
import { Context, Effect, Layer, Ref } from 'effect'
import { snapshotAgeSecs, type CameraPoseSnapshot } from '../domain/camera'
import { ClockPort, FixedClockLayer, monotonicSecs, wallClockEpochMillis } from '../domain/clock'
import { position } from '../domain/coordinates'
import { StageId } from '../domain/identifiers'
import type { FrameServices, GameModule, StageRegistration } from '../domain/frame'
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
        frameStages: Effect.succeed([tick]),
      }

      const stages = yield* module.frameStages
      const [stage] = stages
      expect(stage).toBeDefined()
      expect(stages).toHaveLength(1)

      yield* Effect.forEach(stages, (registration) =>
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

  // REGRESSION — THE reason `frameStages` stopped being an array (see
  // domain/frame.ts). A module must be able to ACQUIRE a service in order to
  // BUILD a stage. With a value there was no context in which to do that, so
  // every service any stage touched had to be reachable from `run`, i.e. had to
  // live in `FrameServices` — which would have forced kernel to name mc-sim's
  // and mc-render's services and broken the tier model.
  it.effect('a module can acquire a service at REGISTRATION time and close over it', () =>
    Effect.gen(function* () {
      // Stands in for mc-sim's PlayerService: acquired once, then called every
      // frame. Note the shape of `cameraPose` — the ClockPort requirement is on
      // the METHOD, which is precisely why FrameServices collapses to ClockPort.
      class PoseSource extends Context.Tag('test/PoseSource')<
        PoseSource,
        { readonly cameraPose: Effect.Effect<number, never, ClockPort> }
      >() {}

      const seen = yield* Ref.make<ReadonlyArray<number>>([])

      const module: GameModule<never, never, never, PoseSource> = {
        layers: Layer.empty,
        frameStages: Effect.gen(function* () {
          const poses = yield* PoseSource
          return [
            {
              id: StageId('camera-mirror'),
              run: () =>
                Effect.flatMap(poses.cameraPose, (pose) =>
                  Ref.update(seen, (previous) => [...previous, pose]),
                ),
            },
          ]
        }),
      }

      const stages = yield* module.frameStages.pipe(
        Effect.provideService(PoseSource, {
          cameraPose: Effect.map(monotonicSecs, (now) => now * 2),
        }),
      )

      yield* Effect.forEach(stages, (registration) => registration.run(DeltaTimeSecs(0))).pipe(
        Effect.provide(FixedClockLayer(FIXED_AT)),
      )

      expect(yield* Ref.get(seen)).toStrictEqual([2_469])
    }),
  )

  // REGRESSION: `RRegister` is a SEPARATE parameter from `RIn`, and defaults to
  // `never`. A module whose stages need nothing to be constructed still reads as
  // three parameters — if the default were removed, every mirror in the roster
  // would have to be edited in the same commit.
  it.effect('RRegister defaults to never, so the common module still writes three parameters', () =>
    Effect.sync(() => {
      const threeParams: GameModule<never, never, never> = {
        layers: Layer.empty,
        frameStages: Effect.succeed([]),
      }
      const fourParams: GameModule<never, never, never, never> = threeParams
      expect(fourParams.layers).toBe(Layer.empty)
    }),
  )

  // REGRESSION: FrameServices is ClockPort and nothing else. The spike's answer,
  // pinned so that widening it — a MAJOR change for every stage PROVIDER — has
  // to be an explicit edit here. `Exclude` in both directions is what makes the
  // assertion an equality rather than a containment.
  it.effect('FrameServices is exactly ClockPort — the frozen answer, not a placeholder', () =>
    Effect.sync(() => {
      type NoWider = Exclude<FrameServices, ClockPort>
      type NoNarrower = Exclude<ClockPort, FrameServices>
      const widerIsEmpty: NoWider extends never ? true : false = true
      const narrowerIsEmpty: NoNarrower extends never ? true : false = true

      expect(widerIsEmpty).toBe(true)
      expect(narrowerIsEmpty).toBe(true)
    }),
  )
})
