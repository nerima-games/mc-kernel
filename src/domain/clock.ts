/**
 * The clock Port.
 *
 * Simulation code must not read a process-global clock directly.
 *
 * A direct read makes replay and fast-forward nondeterministic, so time is
 * obtained through this Port and supplied as a Layer.
 *
 * The one legitimate place for a global clock read is the platform adapter that
 * implements this Port. That adapter belongs to the consuming platform; the
 * kernel exports only the domain vocabulary and deterministic fixed clock.
 *
 * ---------------------------------------------------------------------------
 * Two clocks, deliberately
 * ---------------------------------------------------------------------------
 *
 * `monotonicSecs` never goes backwards and is what all simulation, animation
 * and profiling must use. `wallClockEpochMillis` can jump in either direction
 * (NTP, DST, the user changing the system clock) and exists only for values a
 * human reads or that must survive a save/load round trip.
 *
 * NOTE on the relationship to Effect's own `Clock`: Effect provides
 * `Effect.Clock`, and the eventual adapter will almost certainly be built on
 * it. This Port is kept separate because it is the *domain's* vocabulary for
 * time — seconds, branded, two explicitly distinguished clocks — rather than
 * the runtime's. Whether the two should be merged is a question for the
 * vertical-slice spike.
 */
import { Context, Effect, Layer } from 'effect'
import type { EpochMillis, MonotonicTimeSecs } from './quantities.js'

const createContextTag = Context.Tag

export type ClockService = {
  /** Monotonic reading. Only differences between readings are meaningful. */
  readonly monotonicSecs: Effect.Effect<MonotonicTimeSecs>
  /** Wall-clock reading. Never use for durations. */
  readonly wallClockEpochMillis: Effect.Effect<EpochMillis>
}

export class ClockPort extends createContextTag('@nerima-games/mc-kernel/ClockPort')<ClockPort, ClockService>() {}

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
