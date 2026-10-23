import type { BlockPosition } from '../coordinates/coordinate-primitives.js'

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
