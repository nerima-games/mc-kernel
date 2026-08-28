import { describe, expect, it } from 'vitest'
import { MonotonicTimeSecs } from '../src/domain/quantities'
import { position } from '../src/domain/coordinates'
import {
  applyLook,
  cameraPoseOf,
  clampPitch,
  EYE_LEVEL_OFFSET,
  forwardVector,
  INITIAL_PLAYER_POSE,
  PITCH_EPSILON,
  PITCH_MAX_RADIANS,
  PITCH_MIN_RADIANS,
  withFeetPosition,
  type CameraOrientation,
  type PlayerPose,
} from '../src/domain/camera-pose'

const poseAt = (pitchRadians = 0): PlayerPose => ({
  feetPosition: position(4, 64, -3),
  yawRadians: 0.5,
  pitchRadians,
})

describe('camera pose', () => {
  it('defines the vanilla pitch and eye-level constants', () => {
    expect(PITCH_EPSILON).toBe(0.01)
    expect(PITCH_MAX_RADIANS).toBe(Math.PI / 2 - PITCH_EPSILON)
    expect(PITCH_MIN_RADIANS).toBe(-PITCH_MAX_RADIANS)
    expect(EYE_LEVEL_OFFSET).toBe(1.62)
    expect(INITIAL_PLAYER_POSE).toEqual({ feetPosition: position(0, 0, 0), yawRadians: 0, pitchRadians: 0 })
  })

  it('clamps pitch at both limits while preserving values in range', () => {
    expect(clampPitch(PITCH_MIN_RADIANS - 1)).toBe(PITCH_MIN_RADIANS)
    expect(clampPitch(0.25)).toBe(0.25)
    expect(clampPitch(PITCH_MAX_RADIANS + 1)).toBe(PITCH_MAX_RADIANS)
  })

  it('applies look deltas immutably and leaves yaw unwrapped', () => {
    const original = poseAt()
    const lookedUp = applyLook(original, 3, PITCH_MAX_RADIANS + 1)
    const lookedDown = applyLook(original, -2, PITCH_MIN_RADIANS - 1)

    expect(lookedUp).toEqual({ ...original, yawRadians: 3.5, pitchRadians: PITCH_MAX_RADIANS })
    expect(lookedDown).toEqual({ ...original, yawRadians: -1.5, pitchRadians: PITCH_MIN_RADIANS })
    expect(original).toEqual(poseAt())
  })

  it('updates only the feet position immutably', () => {
    const original = poseAt()
    const moved = withFeetPosition(original, position(-8, 70, 12))

    expect(moved).toEqual({ ...original, feetPosition: position(-8, 70, 12) })
    expect(original).toEqual(poseAt())
  })

  it('produces an eye-level snapshot with its capture timestamp', () => {
    const original = poseAt(0.25)
    const capturedAtSecs = MonotonicTimeSecs(12)
    const snapshot = cameraPoseOf(original, capturedAtSecs)

    expect(snapshot).toEqual({
      position: position(4, 64 + EYE_LEVEL_OFFSET, -3),
      yawRadians: 0.5,
      pitchRadians: 0.25,
      capturedAtSecs,
    })
    expect(original).toEqual(poseAt(0.25))
  })

  it('calculates a unit forward vector from yaw and pitch', () => {
    const level: CameraOrientation = { yawRadians: 0, pitchRadians: 0 }
    const north = forwardVector(level)
    const west = forwardVector({ yawRadians: Math.PI / 2, pitchRadians: 0 })
    const upward = forwardVector({ yawRadians: 0, pitchRadians: Math.PI / 4 })

    expect(north).toEqual(position(0, 0, -1))
    expect(west.x).toBeCloseTo(-1)
    expect(west.y).toBeCloseTo(0)
    expect(west.z).toBeCloseTo(0)
    expect(upward.y).toBeCloseTo(Math.sin(Math.PI / 4))
    expect(Math.hypot(upward.x, upward.y, upward.z)).toBeCloseTo(1)
  })
})
