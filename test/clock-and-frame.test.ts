import { type CameraPoseSnapshot, snapshotAgeSecs } from '../src/domain/camera'
import { ClockPort, FixedClockLayer, monotonicSecs, wallClockEpochMillis } from '../src/domain/clock'
import { Context, Effect, Layer, Ref } from 'effect'
import { DeltaTimeSecs, EpochMillis, MonotonicTimeSecs } from '../src/domain/quantities'
import type { FrameServices, GameModule, StageRegistration } from '../src/domain/frame'
import { describe, expect, it } from '@effect/vitest'
import { StageId } from '../src/domain/identifiers'
import { position } from '../src/domain/coordinates'

const ZERO = 0
const ONE = 1
const TWO = 2
const THREE = 3
const TEN = 10
const HALF_SECOND = 0.5
const SNAPSHOT_POSITION_X = 8
const SNAPSHOT_POSITION_Y = 65
const SNAPSHOT_POSITION_Z = -12
const CAPTURED_AT_SECS = 100
const SLIGHTLY_LATER_SECS = 100.25
const CLOCK_SKEW_SECS = 99.5
const EXPECTED_SNAPSHOT_AGE_SECS = 0.25
const EXPECTED_CLOCK_SKEW_AGE_SECS = -0.5
const FIXED_MONOTONIC_SECS = 1_234.5
const FIXED_WALL_CLOCK_EPOCH_MILLIS = 1_700_000_000_000
const EXPECTED_STAGE_READING = 1_235
const EXPECTED_POSE_READING = 2_469
const epochMillis = EpochMillis
const deltaTimeSecs = DeltaTimeSecs
const contextTag = Context.Tag
const fixedClockLayer = FixedClockLayer
const monotonicTimeSecs = MonotonicTimeSecs
const stageId = StageId

const FIXED_AT = {
  monotonicSecs: monotonicTimeSecs(FIXED_MONOTONIC_SECS),
  wallClockEpochMillis: epochMillis(FIXED_WALL_CLOCK_EPOCH_MILLIS),
}

describe('ClockPort', () => {
  it.effect('monotonicSecs reads the injected Port, which is why Date.now() can be banned outright', () =>
    Effect.gen(function* readsInjectedMonotonicSeconds() {
      const now = yield* monotonicSecs
      expect(now).toBe(FIXED_MONOTONIC_SECS)
    }).pipe(Effect.provide(fixedClockLayer(FIXED_AT))),
  )

  it.effect('wallClockEpochMillis reads the injected Port', () =>
    Effect.gen(function* readsInjectedWallClockEpochMillis() {
      const now = yield* wallClockEpochMillis
      expect(now).toBe(FIXED_WALL_CLOCK_EPOCH_MILLIS)
    }).pipe(Effect.provide(fixedClockLayer(FIXED_AT))),
  )

  it.effect('a fixed clock is deterministic: repeated reads inside one effect return the same instant', () =>
    Effect.gen(function* comparesRepeatedClockReads() {
      const first = yield* monotonicSecs
      const second = yield* monotonicSecs
      expect(second).toBe(first)
    }).pipe(Effect.provide(fixedClockLayer(FIXED_AT))),
  )

  it.effect('a test can substitute an advancing clock without any production code knowing', () =>
    Effect.gen(function* substitutesAdvancingClock() {
      const ticks = yield* Ref.make(ZERO)
      const advancing = Layer.effect(
        ClockPort,
        Effect.succeed({
          monotonicSecs: Ref.updateAndGet(ticks, (value) => value + ONE).pipe(
            Effect.map((value) => monotonicTimeSecs(value)),
          ),
          wallClockEpochMillis: Effect.succeed(epochMillis(ZERO)),
        }),
      )

      const readings = yield* Effect.all([monotonicSecs, monotonicSecs, monotonicSecs]).pipe(
        Effect.provide(advancing),
      )

      expect(readings).toStrictEqual([ONE, TWO, THREE])
    }),
  )
})

describe('CameraPoseSnapshot', () => {
  const snapshot: CameraPoseSnapshot = {
    capturedAtSecs: monotonicTimeSecs(CAPTURED_AT_SECS),
    pitchRadians: ZERO,
    position: position(SNAPSHOT_POSITION_X, SNAPSHOT_POSITION_Y, SNAPSHOT_POSITION_Z),
    yawRadians: ZERO,
  }

  it.effect('snapshotAgeSecs tells the renderer how stale the pose it is mirroring has become', () =>
    Effect.sync(() => {
      expect(snapshotAgeSecs(snapshot, monotonicTimeSecs(SLIGHTLY_LATER_SECS))).toBeCloseTo(EXPECTED_SNAPSHOT_AGE_SECS, TEN)
      expect(snapshotAgeSecs(snapshot, monotonicTimeSecs(CAPTURED_AT_SECS))).toBe(ZERO)
    }),
  )

  it.effect('snapshotAgeSecs goes negative under clock skew rather than clamping the problem away', () =>
    Effect.sync(() => {
        /*
         * A worker thread stamping a pose slightly ahead of the reader's clock is
         * a real condition worth surfacing; a DeltaTimeSecs brand would have
         * thrown here and hidden it.
         */
      expect(snapshotAgeSecs(snapshot, monotonicTimeSecs(CLOCK_SKEW_SECS))).toBeCloseTo(EXPECTED_CLOCK_SKEW_AGE_SECS, TEN)
    }),
  )
})

describe('GameModule / StageRegistration contract', () => {
  it.effect('a module can declare stages, ordering edges and layers, and its stages run against FrameServices', () =>
    Effect.gen(function* runsRegisteredStages() {
      const observed = yield* Ref.make<ReadonlyArray<number>>([])

      const tick: StageRegistration = {
        after: [stageId('input:sample')],
        id: stageId('sim:tick'),
        run: (dt) =>
          Effect.gen(function* readsClockInsideStage() {
            // A stage may read the clock, because ClockPort is in FrameServices.
            const now = yield* monotonicSecs
            yield* Ref.update(observed, (previous) => [...previous, dt + now])
          }),
      }

      const module: GameModule<never, never, never> = {
        frameStages: Effect.succeed([tick]),
        layers: Layer.empty,
      }

      const stages = yield* module.frameStages
      const [stage] = stages
      expect(stage).toBeDefined()
      expect(stages).toHaveLength(ONE)

      yield* Effect.forEach(stages, (registration) =>
        registration.run(deltaTimeSecs(HALF_SECOND)),
      ).pipe(Effect.provide(fixedClockLayer(FIXED_AT)))

      expect(yield* Ref.get(observed)).toStrictEqual([EXPECTED_STAGE_READING])
    }),
  )

  it.effect('`after` is optional, so a stage with no ordering constraints needs no ceremony', () =>
    Effect.gen(function* runsUnorderedStage() {
      const standalone: StageRegistration = {
        id: stageId('sim:standalone'),
        run: () => Effect.void,
      }

      expect(standalone.after).toBeUndefined()
      yield* standalone.run(deltaTimeSecs(ZERO)).pipe(Effect.provide(fixedClockLayer(FIXED_AT)))
    }),
  )

    /*
     * Regression: `frameStages` stopped being an array (see domain/frame.ts). A
     * module must be able to acquire a service in order to build a stage. With a
     * value there was no context in which to do that, so every service any stage
     * touched had to be reachable from `run`, i.e. had to live in `FrameServices`
     * which would have forced kernel to name mc-sim's and mc-render's services and
     * broken the tier model.
     */
  it.effect('a module can acquire a service at REGISTRATION time and close over it', () =>
    Effect.gen(function* acquiresServiceAtRegistrationTime() {
        /*
         * Stands in for mc-sim's PlayerService: acquired once, then called every
         * frame. Note the shape of `cameraPose`: the ClockPort requirement is on
         * the method, which is precisely why FrameServices collapses to ClockPort.
         */
        class PoseSource extends contextTag('test/PoseSource')<
        PoseSource,
        { readonly cameraPose: Effect.Effect<number, never, ClockPort> }
      >() {}
      const poseSource = PoseSource

      const seen = yield* Ref.make<ReadonlyArray<number>>([])

      const module: GameModule<never, never, never, PoseSource> = {
        frameStages: Effect.gen(function* acquiresPoseSource() {
          const poses = yield* poseSource
          return [
            {
              id: stageId('camera-mirror'),
              run: () =>
                Effect.flatMap(poses.cameraPose, (pose) =>
                  Ref.update(seen, (previous) => [...previous, pose]),
                ),
            },
          ]
        }),
        layers: Layer.empty,
      }

      const stages = yield* module.frameStages.pipe(
        Effect.provideService(poseSource, {
          cameraPose: Effect.map(monotonicSecs, (now) => now * TWO),
        }),
      )

      yield* Effect.forEach(stages, (registration) => registration.run(deltaTimeSecs(ZERO))).pipe(
        Effect.provide(fixedClockLayer(FIXED_AT)),
      )

      expect(yield* Ref.get(seen)).toStrictEqual([EXPECTED_POSE_READING])
    }),
  )

    /*
     * Regression: `RRegister` is a separate parameter from `RIn`, and defaults to
     * `never`. A module whose stages need nothing to be constructed still reads as
     * three parameters; if the default were removed, every mirror in the roster
     * would have to be edited in the same commit.
     */
  it.effect('RRegister defaults to never, so the common module still writes three parameters', () =>
    Effect.sync(() => {
      const threeParams: GameModule<never, never, never> = {
        frameStages: Effect.succeed([]),
        layers: Layer.empty,
      }
      const fourParams: GameModule<never, never, never, never> = threeParams
      expect(fourParams.layers).toBe(Layer.empty)
    }),
  )

    /*
     * Regression: FrameServices is ClockPort and nothing else. The spike's answer
     * is pinned so that widening it, a major change for every stage provider, has
     * to be an explicit edit here. `Exclude` in both directions is what makes the
     * assertion an equality rather than a containment.
     */
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
