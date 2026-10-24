import { AngleRadians } from '../src/domain/shared-vocabulary/shared-vocabulary'
import type { CameraPoseSnapshot, SnapshotAgeSecs } from '../src/domain/presentation/camera'
import { MonotonicTimeSecs } from '../src/domain/time/quantities'
import { position, PositionAxis } from '../src/domain/coordinates/coordinates'
import { snapshotAgeSecs } from '../src/domain/presentation/camera'

const angle = AngleRadians(0)
const snapshot: CameraPoseSnapshot = {
  capturedAtSecs: MonotonicTimeSecs(0),
  pitchRadians: angle,
  position: position(PositionAxis(0), PositionAxis(0), PositionAxis(0)),
  yawRadians: angle,
}
export const snapshotAge: SnapshotAgeSecs = snapshotAgeSecs(snapshot, MonotonicTimeSecs(1))

// @ts-expect-error Angles require the finite AngleRadians brand.
export const rawYaw: CameraPoseSnapshot['yawRadians'] = 0
// @ts-expect-error Snapshot ages are distinct from other time brands.
export const monotonicAsSnapshotAge: SnapshotAgeSecs = MonotonicTimeSecs(1)
