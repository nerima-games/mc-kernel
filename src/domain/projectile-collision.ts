import type { AABB } from './coordinate-geometry.js'
import { position, type Position } from './coordinate-primitives.js'

export type SegmentHit = Readonly<{
  fraction: number
  point: Position
  normal: Position
}>

type Slab = Readonly<{
  delta: number
  start: number
  min: number
  max: number
  negativeNormal: Position
  positiveNormal: Position
}>

type SlabWindow = Readonly<{
  entry: number
  exit: number
  normal: Position
}>

const ZERO_POSITION = position(0, 0, 0)

const finitePosition = (value: Position): boolean =>
  Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.z)

const validBox = (box: AABB): boolean =>
  finitePosition(box.min) &&
  finitePosition(box.max) &&
  box.min.x <= box.max.x &&
  box.min.y <= box.max.y &&
  box.min.z <= box.max.z

const slabWindow = (slab: Slab): SlabWindow | null => {
  if (slab.delta === 0) {
    if (slab.start < slab.min || slab.start > slab.max) {
      return null
    }

    return {
      entry: Number.NEGATIVE_INFINITY,
      exit: Number.POSITIVE_INFINITY,
      normal: ZERO_POSITION,
    }
  }

  const low = (slab.min - slab.start) / slab.delta
  const high = (slab.max - slab.start) / slab.delta
  const entry = Math.min(low, high)
  const exit = Math.max(low, high)
  let normal = slab.positiveNormal

  if (slab.delta > 0) {
    normal = slab.negativeNormal
  }

  return { entry, exit, normal }
}

export const segmentAABB = (start: Position, end: Position, box: AABB): SegmentHit | null => {
  if (!finitePosition(start) || !finitePosition(end) || !validBox(box)) {
    return null
  }

  const deltaX = end.x - start.x
  const deltaY = end.y - start.y
  const deltaZ = end.z - start.z

  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY) || !Number.isFinite(deltaZ)) {
    return null
  }

  const slabs: readonly Slab[] = [
    {
      delta: deltaX,
      start: start.x,
      min: box.min.x,
      max: box.max.x,
      negativeNormal: position(-1, 0, 0),
      positiveNormal: position(1, 0, 0),
    },
    {
      delta: deltaY,
      start: start.y,
      min: box.min.y,
      max: box.max.y,
      negativeNormal: position(0, -1, 0),
      positiveNormal: position(0, 1, 0),
    },
    {
      delta: deltaZ,
      start: start.z,
      min: box.min.z,
      max: box.max.z,
      negativeNormal: position(0, 0, -1),
      positiveNormal: position(0, 0, 1),
    },
  ]

  let near = 0
  let far = 1
  let normal = ZERO_POSITION

  for (const slab of slabs) {
    const window = slabWindow(slab)
    if (window === null) {
      return null
    }

    if (window.entry > near) {
      near = window.entry
      normal = window.normal
    }

    far = Math.min(far, window.exit)
    if (near > far) {
      return null
    }
  }

  return {
    fraction: near,
    point: position(start.x + deltaX * near, start.y + deltaY * near, start.z + deltaZ * near),
    normal,
  }
}
