import { blockIdOf } from './block-registry.js'
import { blockPosition, type BlockPosition } from './coordinate-primitives.js'

export type BlockAt = (x: number, y: number, z: number) => number
export type PortalAxis = 'x' | 'z'

export type PortalFrame = Readonly<{
  axis: PortalAxis
  width: number
  height: number
  interior: ReadonlyArray<BlockPosition>
}>

export const MIN_PORTAL_WIDTH = 2
export const MAX_PORTAL_WIDTH = 21
export const MIN_PORTAL_HEIGHT = 3
export const MAX_PORTAL_HEIGHT = 21

export type PortalLayout = Readonly<{
  frame: ReadonlyArray<BlockPosition>
  interior: ReadonlyArray<BlockPosition>
}>

type PlanePoint = Readonly<{ h: number; y: number }>
type PortalExtent = Readonly<{ height: number; width: number }>
type PlaneContext = Readonly<{ axis: PortalAxis; blockAt: BlockAt; fixed: number }>

const AIR_BLOCK_ID = blockIdOf('air')
const OBSIDIAN_BLOCK_ID = blockIdOf('obsidian')
const RING_MARGIN = 1
const OVER_SIZED_MARGIN = 1

const probe = (context: PlaneContext, h: number, y: number): number =>
  context.axis === 'x'
    ? context.blockAt(h, y, context.fixed)
    : context.blockAt(context.fixed, y, h)

const positionAt = (axis: PortalAxis, fixed: number, h: number, y: number): BlockPosition =>
  axis === 'x' ? blockPosition(h, y, fixed) : blockPosition(fixed, y, h)

const countAir = (context: PlaneContext, start: PlanePoint, step: PlanePoint, max: number): number => {
  let count = 0
  while (count < max && probe(context, start.h + step.h * count, start.y + step.y * count) === AIR_BLOCK_ID) {
    count += 1
  }
  return count
}

const findBottomLeftCorner = (context: PlaneContext, h0: number, y0: number): PlanePoint => {
  const bottomY =
    y0 -
    (countAir(context, { h: h0, y: y0 }, { h: 0, y: -1 }, MAX_PORTAL_HEIGHT + OVER_SIZED_MARGIN) - 1)
  const leftH =
    h0 -
    (countAir(context, { h: h0, y: bottomY }, { h: -1, y: 0 }, MAX_PORTAL_WIDTH + OVER_SIZED_MARGIN) - 1)
  return { h: leftH, y: bottomY }
}

const measureInterior = (context: PlaneContext, corner: PlanePoint): PortalExtent => ({
  height: countAir(context, corner, { h: 0, y: 1 }, MAX_PORTAL_HEIGHT + OVER_SIZED_MARGIN),
  width: countAir(context, corner, { h: 1, y: 0 }, MAX_PORTAL_WIDTH + OVER_SIZED_MARGIN),
})

const isValidPortalSize = (width: number, height: number): boolean =>
  width >= MIN_PORTAL_WIDTH &&
  width <= MAX_PORTAL_WIDTH &&
  height >= MIN_PORTAL_HEIGHT &&
  height <= MAX_PORTAL_HEIGHT

const collectRectangle = (
  axis: PortalAxis,
  fixed: number,
  corner: PlanePoint,
  extent: PortalExtent,
): BlockPosition[] => {
  const cells: BlockPosition[] = []
  for (let h = corner.h; h < corner.h + extent.width; h += 1) {
    for (let y = corner.y; y < corner.y + extent.height; y += 1) {
      cells.push(positionAt(axis, fixed, h, y))
    }
  }
  return cells
}

const collectRing = (
  axis: PortalAxis,
  fixed: number,
  corner: PlanePoint,
  extent: PortalExtent,
): BlockPosition[] => {
  const cells: BlockPosition[] = []
  for (let h = corner.h - RING_MARGIN; h <= corner.h + extent.width; h += 1) {
    for (let y = corner.y - RING_MARGIN; y <= corner.y + extent.height; y += 1) {
      if (
        h === corner.h - RING_MARGIN ||
        h === corner.h + extent.width ||
        y === corner.y - RING_MARGIN ||
        y === corner.y + extent.height
      ) {
        cells.push(positionAt(axis, fixed, h, y))
      }
    }
  }
  return cells
}

const interiorIsClear = (context: PlaneContext, corner: PlanePoint, extent: PortalExtent): boolean => {
  for (let h = corner.h; h < corner.h + extent.width; h += 1) {
    for (let y = corner.y; y < corner.y + extent.height; y += 1) {
      if (probe(context, h, y) !== AIR_BLOCK_ID) return false
    }
  }
  return true
}

const ringIsObsidian = (context: PlaneContext, corner: PlanePoint, extent: PortalExtent): boolean => {
  for (let h = corner.h; h < corner.h + extent.width; h += 1) {
    if (
      probe(context, h, corner.y - RING_MARGIN) !== OBSIDIAN_BLOCK_ID ||
      probe(context, h, corner.y + extent.height) !== OBSIDIAN_BLOCK_ID
    ) {
      return false
    }
  }
  for (let y = corner.y; y < corner.y + extent.height; y += 1) {
    if (
      probe(context, corner.h - RING_MARGIN, y) !== OBSIDIAN_BLOCK_ID ||
      probe(context, corner.h + extent.width, y) !== OBSIDIAN_BLOCK_ID
    ) {
      return false
    }
  }
  return true
}

const detectInPlane = (
  context: PlaneContext,
  h0: number,
  y0: number,
): PortalFrame | undefined => {
  const corner = findBottomLeftCorner(context, h0, y0)
  const extent = measureInterior(context, corner)
  if (!isValidPortalSize(extent.width, extent.height)) return undefined
  if (!interiorIsClear(context, corner, extent)) return undefined
  if (!ringIsObsidian(context, corner, extent)) return undefined
  return {
    axis: context.axis,
    width: extent.width,
    height: extent.height,
    interior: collectRectangle(context.axis, context.fixed, corner, extent),
  }
}

export const detectNetherPortal = (
  blockAt: BlockAt,
  ignition: BlockPosition,
): PortalFrame | undefined => {
  if (blockAt(ignition.x, ignition.y, ignition.z) !== AIR_BLOCK_ID) return undefined
  return (
    detectInPlane({ axis: 'x', blockAt, fixed: ignition.z }, ignition.x, ignition.y) ??
    detectInPlane({ axis: 'z', blockAt, fixed: ignition.x }, ignition.z, ignition.y)
  )
}

const resolveOrigin = (
  axis: PortalAxis,
  origin: BlockPosition,
): Readonly<{ corner: PlanePoint; fixed: number }> =>
  axis === 'x'
    ? { corner: { h: origin.x, y: origin.y }, fixed: origin.z }
    : { corner: { h: origin.z, y: origin.y }, fixed: origin.x }

export const generatePortalLayout = (
  origin: BlockPosition,
  axis: PortalAxis,
  width: number,
  height: number,
): PortalLayout => {
  const { corner, fixed } = resolveOrigin(axis, origin)
  const extent = { height, width }
  return {
    frame: collectRing(axis, fixed, corner, extent),
    interior: collectRectangle(axis, fixed, corner, extent),
  }
}
