/**
 * The clock Port.
 *
 * PRE-AUDIT FIRST CUT (叩き台).
 *
 * ---------------------------------------------------------------------------
 * This is the reason `Date.now()` is banned repository-wide
 * ---------------------------------------------------------------------------
 *
 * A direct global time read makes the calling code untestable (its behaviour
 * depends on when the test happens to run), unreproducible (a replayed input
 * log produces a different simulation), and impossible to run at anything other
 * than wall-clock speed. Every reading of time therefore comes from this Port,
 * which is injected as a Layer.
 *
 * The ban is enforced by `pnpm check:deps`
 * (`scripts/check-dependency-whitelist.ts`), not by oxlint — oxlint 0.12 does
 * not implement the rules that could express it. See .oxlintrc.json for detail.
 *
 * The one legitimate place to read a global clock is the adapter that
 * *implements* this Port, in whichever repository owns the platform layer. That
 * single line opts out with the escape-hatch comment the check script defines.
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
import type { EpochMillis, MonotonicTimeSecs } from './quantities'

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
