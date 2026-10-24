import { describe, expect, it } from 'vitest'
import { BlockAxis } from '../src/domain/coordinates/coordinate-primitives'
import { BlockId } from '../src/domain/block/block-registry-types'
import {
  MAX_PORTAL_HEIGHT,
  MAX_PORTAL_WIDTH,
  MIN_PORTAL_HEIGHT,
  MIN_PORTAL_WIDTH,
  PortalHeight,
  PortalWidth,
  type BlockAt,
  type PortalFrame,
} from '../src/domain/entity/portal'

describe('portal dimensions and block lookup', () => {
  it('brands the documented inclusive width and height ranges', () => {
    expect(PortalWidth(MIN_PORTAL_WIDTH)).toBe(MIN_PORTAL_WIDTH)
    expect(PortalWidth(MAX_PORTAL_WIDTH)).toBe(MAX_PORTAL_WIDTH)
    expect(PortalHeight(MIN_PORTAL_HEIGHT)).toBe(MIN_PORTAL_HEIGHT)
    expect(PortalHeight(MAX_PORTAL_HEIGHT)).toBe(MAX_PORTAL_HEIGHT)
    expect(() => PortalWidth(MIN_PORTAL_WIDTH - 1)).toThrow()
    expect(() => PortalWidth(MAX_PORTAL_WIDTH + 1)).toThrow()
    expect(() => PortalWidth(2.5)).toThrow()
    expect(() => PortalHeight(MIN_PORTAL_HEIGHT - 1)).toThrow()
    expect(() => PortalHeight(MAX_PORTAL_HEIGHT + 1)).toThrow()
    expect(() => PortalHeight(3.5)).toThrow()
  })

  it('uses block-coordinate and block-id brands in the lookup contract', () => {
    const blockAt: BlockAt = (x, y, z) => {
      expect([x, y, z]).toEqual([0, 1, 2])
      return BlockId(0)
    }
    const frame: PortalFrame = {
      axis: 'x',
      width: PortalWidth(MIN_PORTAL_WIDTH),
      height: PortalHeight(MIN_PORTAL_HEIGHT),
      interior: [],
    }

    expect(blockAt(BlockAxis(0), BlockAxis(1), BlockAxis(2))).toBe(BlockId(0))
    expect(frame.width).toBe(MIN_PORTAL_WIDTH)
  })
})
