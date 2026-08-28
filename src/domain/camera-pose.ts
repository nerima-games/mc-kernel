import type { CameraPoseSnapshot } from './camera.js'
import { position, type Position } from './coordinates.js'
import type { MonotonicTimeSecs } from './quantities.js'

export const PITCH_EPSILON = 0.01
export const PITCH_MAX_RADIANS: number = Math.PI / 2 - PITCH_EPSILON
export const PITCH_MIN_RADIANS: number = -PITCH_MAX_RADIANS
export const EYE_LEVEL_OFFSET = 1.62

export type PlayerPose = {
  readonly feetPosition: Position
  readonly yawRadians: number
  readonly pitchRadians: number
}

export const INITIAL_PLAYER_POSE: PlayerPose = {
  feetPosition: position(0, 0, 0),
  yawRadians: 0,
  pitchRadians: 0,
}

export const clampPitch = (pitchRadians: number): number =>
  Math.max(PITCH_MIN_RADIANS, Math.min(PITCH_MAX_RADIANS, pitchRadians))

export const applyLook = (
  pose: PlayerPose,
  deltaYawRadians: number,
  deltaPitchRadians: number,
): PlayerPose => ({
  ...pose,
  yawRadians: pose.yawRadians + deltaYawRadians,
  pitchRadians: clampPitch(pose.pitchRadians + deltaPitchRadians),
})

export const withFeetPosition = (pose: PlayerPose, feetPosition: Position): PlayerPose => ({
  ...pose,
  feetPosition,
})

export const cameraPoseOf = (pose: PlayerPose, capturedAtSecs: MonotonicTimeSecs): CameraPoseSnapshot => ({
  position: position(pose.feetPosition.x, pose.feetPosition.y + EYE_LEVEL_OFFSET, pose.feetPosition.z),
  yawRadians: pose.yawRadians,
  pitchRadians: pose.pitchRadians,
  capturedAtSecs,
})

export type CameraOrientation = Pick<CameraPoseSnapshot, 'yawRadians' | 'pitchRadians'>

const canonicalZero = (value: number): number => (value === 0 ? 0 : value)

export const forwardVector = (orientation: CameraOrientation): Position => {
  const cosPitch = Math.cos(orientation.pitchRadians)
  return position(
    canonicalZero(-Math.sin(orientation.yawRadians) * cosPitch),
    canonicalZero(Math.sin(orientation.pitchRadians)),
    canonicalZero(-Math.cos(orientation.yawRadians) * cosPitch),
  )
}
