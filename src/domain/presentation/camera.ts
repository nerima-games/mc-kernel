/** Simulation code publishes this snapshot with readonly TypeScript fields; renderers consume it. */
import { Brand } from 'effect'
import type { MonotonicTimeSecs } from '../time/quantities.js'
import type { Position } from '../coordinates/coordinates.js'
import { AngleRadians } from '../shared-vocabulary/shared-vocabulary.js'

export type SnapshotAgeSecs = number & Brand.Brand<'SnapshotAgeSecs'>
export const SnapshotAgeSecs: Brand.Constructor<SnapshotAgeSecs> = Brand.make<SnapshotAgeSecs>(
  (value) => Number.isFinite(value) || 'SnapshotAgeSecs must be finite',
)

export type CameraPoseSnapshot = {
  /** Eye position in continuous world space. */
  readonly position: Position
  /** Rotation about the Y (up) axis, radians. Not normalised — consumers wrap if they care. */
  readonly yawRadians: AngleRadians
  /** Rotation about the local right axis, radians. Positive looks up. */
  readonly pitchRadians: AngleRadians
  /**
   * Monotonic reading taken when the simulation produced this pose.
   * Sourced from `ClockPort` — never from a global clock.
   */
  readonly capturedAtSecs: MonotonicTimeSecs
}

/**
 * Age of a snapshot at a given monotonic instant, in seconds.
 *
 * Returns a `SnapshotAgeSecs`, not a `DeltaTimeSecs`: the result is negative when
 * the snapshot is stamped in the future relative to `now`, which is a real and
 * diagnostically interesting situation (clock skew between a worker and the
 * main thread) that must not be silently rejected by a brand refinement.
 */
export const snapshotAgeSecs = (snapshot: CameraPoseSnapshot, now: MonotonicTimeSecs): SnapshotAgeSecs =>
  SnapshotAgeSecs(now - snapshot.capturedAtSecs)
