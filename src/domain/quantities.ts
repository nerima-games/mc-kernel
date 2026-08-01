/**
 * Branded scalar quantities.
 *
 * PRE-AUDIT FIRST CUT (叩き台).
 *
 * Every quantity here is a *refined* brand, not a nominal one: the constructor
 * performs the validation, so an invalid value can only enter the system by
 * someone writing an explicit cast. `X(v)` throws, `X.either(v)` / `X.option(v)`
 * do not — prefer the latter at trust boundaries.
 */
import { Brand } from 'effect'

/**
 * Maximum items in one inventory stack.
 *
 * Per-item limits (64 / 16 / 1) live in `item-registry.ts`; this remains the
 * upper bound of the representable range shared by every item stack.
 */
export const MAX_STACK_COUNT = 64

/** Number of items in one inventory stack. Integer in [0, MAX_STACK_COUNT]. */
export type StackCount = number & Brand.Brand<'StackCount'>

export const StackCount = Brand.refined<StackCount>(
  (value) => Number.isInteger(value) && value >= 0 && value <= MAX_STACK_COUNT,
  (value) => Brand.error(`StackCount must be an integer in [0, ${MAX_STACK_COUNT}], received ${value}`),
)

/**
 * Elapsed simulation time for one frame, in seconds.
 *
 * Non-negative and finite. A zero delta is legal (a frame may be scheduled
 * twice within the same clock tick) and must be handled by stages rather than
 * rejected here.
 */
export type DeltaTimeSecs = number & Brand.Brand<'DeltaTimeSecs'>

export const DeltaTimeSecs = Brand.refined<DeltaTimeSecs>(
  (value) => Number.isFinite(value) && value >= 0,
  (value) => Brand.error(`DeltaTimeSecs must be a finite, non-negative number of seconds, received ${value}`),
)

/**
 * A reading from a monotonic clock, in seconds.
 *
 * Monotonic means: never decreases, and is unaffected by wall-clock
 * adjustments. The origin is unspecified — only differences are meaningful.
 * Obtain it from `ClockPort`, never from a global.
 */
export type MonotonicTimeSecs = number & Brand.Brand<'MonotonicTimeSecs'>

export const MonotonicTimeSecs = Brand.refined<MonotonicTimeSecs>(
  (value) => Number.isFinite(value) && value >= 0,
  (value) => Brand.error(`MonotonicTimeSecs must be a finite, non-negative number of seconds, received ${value}`),
)

/**
 * A wall-clock reading: milliseconds since the Unix epoch.
 *
 * Use this only for things a human will read or that must survive a save/load
 * round trip. Never use it to measure durations — it can jump backwards.
 * Obtain it from `ClockPort`, never from a global.
 */
export type EpochMillis = number & Brand.Brand<'EpochMillis'>

export const EpochMillis = Brand.refined<EpochMillis>(
  (value) => Number.isSafeInteger(value),
  (value) => Brand.error(`EpochMillis must be a safe integer number of milliseconds, received ${value}`),
)
