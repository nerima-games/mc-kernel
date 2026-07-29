/** Injectable monotonic and wall-clock time source. */
import { Context, Effect, Layer } from 'effect'
import type { EpochMillis, MonotonicTimeSecs } from './quantities.js'

export type ClockService = {
  /** Monotonic reading. Only differences between readings are meaningful. */
  readonly monotonicSecs: Effect.Effect<MonotonicTimeSecs>
  /** Wall-clock reading. Never use for durations. */
  readonly wallClockEpochMillis: Effect.Effect<EpochMillis>
}

export class ClockPort extends Context.Tag('@nerima-games/mc-kernel/ClockPort')<ClockPort, ClockService>() {}

/**
 * A clock frozen at a given instant.
 *
 * Kernel ships this rather than a real implementation on purpose: a fixed clock
 * is platform-independent, whereas every real one is not. Deterministic tests
 * in any repository can therefore depend on kernel alone.
 */
export const fixedClock = (at: {
  readonly monotonicSecs: MonotonicTimeSecs
  readonly wallClockEpochMillis: EpochMillis
}): ClockService => ({
  monotonicSecs: Effect.succeed(at.monotonicSecs),
  wallClockEpochMillis: Effect.succeed(at.wallClockEpochMillis),
})

/** `fixedClock` as a Layer, for use in tests and deterministic replays. */
export const FixedClockLayer = (at: {
  readonly monotonicSecs: MonotonicTimeSecs
  readonly wallClockEpochMillis: EpochMillis
}): Layer.Layer<ClockPort> => Layer.succeed(ClockPort, fixedClock(at))

/** Read the monotonic clock. The idiomatic way to ask "what time is it now?". */
export const monotonicSecs: Effect.Effect<MonotonicTimeSecs, never, ClockPort> = Effect.flatMap(
  ClockPort,
  (clock) => clock.monotonicSecs,
)

/** Read the wall clock. Only for human-facing or persisted values. */
export const wallClockEpochMillis: Effect.Effect<EpochMillis, never, ClockPort> = Effect.flatMap(
  ClockPort,
  (clock) => clock.wallClockEpochMillis,
)
