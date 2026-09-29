import { position, type BlockPosition, type Position } from './coordinate-primitives.js'

const UNIT_STEP = 1

/**
 * An axis-aligned bounding box in continuous world space.
 *
 * Construct through `aabb`, which normalises the corners, so `min <= max` holds
 * componentwise for every AABB in circulation.
 */
export type AABB = {
  readonly min: Position
  readonly max: Position
}

export const aabb = (firstCorner: Position, secondCorner: Position): AABB => ({
  min: position(Math.min(firstCorner.x, secondCorner.x), Math.min(firstCorner.y, secondCorner.y), Math.min(firstCorner.z, secondCorner.z)),
  max: position(Math.max(firstCorner.x, secondCorner.x), Math.max(firstCorner.y, secondCorner.y), Math.max(firstCorner.z, secondCorner.z)),
})

/** The unit cube occupied by a block cell. */
export const aabbOfBlock = (value: BlockPosition): AABB =>
  aabb(position(value.x, value.y, value.z), position(value.x + UNIT_STEP, value.y + UNIT_STEP, value.z + UNIT_STEP))

/**
 * Overlap test. Touching faces do NOT count as an intersection: a box ending at
 * x=1 and a box starting at x=1 are adjacent, not overlapping. Physics repos
 * rely on this so that standing exactly on a block surface is not a collision.
 */
export const aabbIntersects = (firstBox: AABB, secondBox: AABB): boolean =>
  firstBox.min.x < secondBox.max.x &&
  firstBox.max.x > secondBox.min.x &&
  firstBox.min.y < secondBox.max.y &&
  firstBox.max.y > secondBox.min.y &&
  firstBox.min.z < secondBox.max.z &&
  firstBox.max.z > secondBox.min.z

/** Containment test. The boundary counts as inside. */
export const aabbContainsPoint = (box: AABB, point: Position): boolean =>
  point.x >= box.min.x &&
  point.x <= box.max.x &&
  point.y >= box.min.y &&
  point.y <= box.max.y &&
  point.z >= box.min.z &&
  point.z <= box.max.z
