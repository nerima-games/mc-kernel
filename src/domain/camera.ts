/**
 * Camera pose, as a snapshot.
 * The simulation publishes this immutable value; renderers only consume it.
 */
import type { Position } from './coordinates.js'
import type { MonotonicTimeSecs } from './quantities.js'

export type CameraPoseSnapshot = {
  /** Eye position in continuous world space. */
  readonly position: Position
  /** Rotation about the Y (up) axis, radians. Not normalised — consumers wrap if they care. */
  readonly yawRadians: number
  /** Rotation about the local right axis, radians. Positive looks up. */
  readonly pitchRadians: number
  /**
   * Monotonic reading taken when the simulation produced this pose.
   * Sourced from `ClockPort` — never from a global clock.
   */
  readonly capturedAtSecs: MonotonicTimeSecs
}

/**
 * Age of a snapshot at a given monotonic instant, in seconds.
 *
 * Returns a plain `number`, not a `DeltaTimeSecs`: the result is negative when
 * the snapshot is stamped in the future relative to `now`, which is a real and
 * diagnostically interesting situation (clock skew between a worker and the
 * main thread) that must not be silently rejected by a brand refinement.
 */
export const snapshotAgeSecs = (snapshot: CameraPoseSnapshot, now: MonotonicTimeSecs): number =>
  now - snapshot.capturedAtSecs
