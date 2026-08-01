/**
 * Camera pose, as a snapshot.
 *
 * PRE-AUDIT FIRST CUT (叩き台).
 *
 * plan.md §4.3: the simulation owns the truth, the renderer mirrors it. The
 * renderer must never be the authority on where the camera is — if it were,
 * raycasting, block placement and frustum culling could each disagree about
 * where the player is looking.
 *
 * Hence a *snapshot*: a plain immutable value the simulation publishes once per
 * frame and the renderer reads. There is no setter here and there must never be
 * one; a renderer that wants to move the camera sends input to the simulation
 * and waits for the next snapshot.
 *
 * `capturedAtSecs` is what makes the mirroring auditable. A renderer running
 * ahead of, or behind, the simulation can tell by how much, and decide whether
 * to interpolate or to stall — rather than silently drawing a stale pose.
 */
import type { Position } from './coordinates'
import type { MonotonicTimeSecs } from './quantities'

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
