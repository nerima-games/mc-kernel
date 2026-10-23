import { Brand } from 'effect'
import type { BlockAxis, BlockPosition } from '../coordinates/coordinate-primitives.js'
import type { BlockId } from '../block/block-registry-types.js'

export type BlockAt = (x: BlockAxis, y: BlockAxis, z: BlockAxis) => BlockId
export type PortalAxis = 'x' | 'z'

export const MIN_PORTAL_WIDTH = 2
export const MAX_PORTAL_WIDTH = 21
export const MIN_PORTAL_HEIGHT = 3
export const MAX_PORTAL_HEIGHT = 21

export type PortalWidth = number & Brand.Brand<'PortalWidth'>
export const PortalWidth: Brand.Constructor<PortalWidth> = Brand.make<PortalWidth>(
  (value) =>
    Number.isInteger(value) && value >= MIN_PORTAL_WIDTH && value <= MAX_PORTAL_WIDTH
      ? true
      : `PortalWidth must be an integer in [${MIN_PORTAL_WIDTH}, ${MAX_PORTAL_WIDTH}], received ${value}`,
)

export type PortalHeight = number & Brand.Brand<'PortalHeight'>
export const PortalHeight: Brand.Constructor<PortalHeight> = Brand.make<PortalHeight>(
  (value) =>
    Number.isInteger(value) && value >= MIN_PORTAL_HEIGHT && value <= MAX_PORTAL_HEIGHT
      ? true
      : `PortalHeight must be an integer in [${MIN_PORTAL_HEIGHT}, ${MAX_PORTAL_HEIGHT}], received ${value}`,
)

export type PortalFrame = Readonly<{
  axis: PortalAxis
  width: PortalWidth
  height: PortalHeight
  interior: ReadonlyArray<BlockPosition>
}>

export type PortalLayout = Readonly<{
  frame: ReadonlyArray<BlockPosition>
  interior: ReadonlyArray<BlockPosition>
}>
