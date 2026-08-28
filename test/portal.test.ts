import { describe, expect, it } from 'vitest'
import { blockIdOf } from '../src/domain/block-registry'
import { blockPositionKeyOf } from '../src/domain/coordinate-keys'
import { blockPosition } from '../src/domain/coordinate-primitives'
import {
  detectNetherPortal,
  generatePortalLayout,
  type BlockAt,
  type PortalLayout,
} from '../src/domain/portal'

const AIR_BLOCK_ID = blockIdOf('air')
const OBSIDIAN_BLOCK_ID = blockIdOf('obsidian')
const STONE_BLOCK_ID = blockIdOf('stone')

const worldFor = (layout: PortalLayout): Map<string, number> => {
  const world = new Map<string, number>()
  for (const block of layout.frame) world.set(blockPositionKeyOf(block), OBSIDIAN_BLOCK_ID)
  return world
}

const blockAtFor = (world: ReadonlyMap<string, number>): BlockAt => (x, y, z) =>
  world.get(blockPositionKeyOf(blockPosition(x, y, z))) ?? AIR_BLOCK_ID

describe('portal', () => {
  it('generates and detects x-axis and z-axis portal frames', () => {
    const xOrigin = blockPosition(10, 64, 5)
    const xLayout = generatePortalLayout(xOrigin, 'x', 2, 3)
    const xWorld = worldFor(xLayout)

    expect(xLayout.interior).toHaveLength(6)
    expect(xLayout.frame).toHaveLength(14)
    expect(detectNetherPortal(blockAtFor(xWorld), xOrigin)).toStrictEqual({
      axis: 'x',
      width: 2,
      height: 3,
      interior: xLayout.interior,
    })

    const zOrigin = blockPosition(-4, 70, 8)
    const zLayout = generatePortalLayout(zOrigin, 'z', 3, 4)
    const zWorld = worldFor(zLayout)

    expect(zLayout.interior).toHaveLength(12)
    expect(zLayout.frame).toHaveLength(18)
    expect(detectNetherPortal(blockAtFor(zWorld), zOrigin)).toStrictEqual({
      axis: 'z',
      width: 3,
      height: 4,
      interior: zLayout.interior,
    })
  })

  it('rejects occupied ignition, missing obsidian, and blocked interiors', () => {
    const origin = blockPosition(0, 64, 0)
    const layout = generatePortalLayout(origin, 'x', 2, 3)

    const occupied = worldFor(layout)
    occupied.set(blockPositionKeyOf(origin), STONE_BLOCK_ID)
    expect(detectNetherPortal(blockAtFor(occupied), origin)).toBeUndefined()

    const invalidBottomFrame = worldFor(layout)
    invalidBottomFrame.set(blockPositionKeyOf(blockPosition(origin.x, origin.y - 1, origin.z)), STONE_BLOCK_ID)
    expect(detectNetherPortal(blockAtFor(invalidBottomFrame), origin)).toBeUndefined()

    const invalidRightFrame = worldFor(layout)
    invalidRightFrame.set(blockPositionKeyOf(blockPosition(origin.x + 2, origin.y, origin.z)), STONE_BLOCK_ID)
    expect(detectNetherPortal(blockAtFor(invalidRightFrame), origin)).toBeUndefined()

    const blockedInterior = worldFor(layout)
    blockedInterior.set(blockPositionKeyOf(blockPosition(origin.x + 1, origin.y + 1, origin.z)), STONE_BLOCK_ID)
    expect(detectNetherPortal(blockAtFor(blockedInterior), origin)).toBeUndefined()
  })

  it('rejects portal dimensions outside vanilla limits', () => {
    const origin = blockPosition(20, 80, 20)
    const invalidDimensions = [
      { width: 1, height: 3 },
      { width: 2, height: 2 },
      { width: 22, height: 3 },
      { width: 2, height: 22 },
    ]

    for (const dimensions of invalidDimensions) {
      const layout = generatePortalLayout(origin, 'x', dimensions.width, dimensions.height)
      const world = worldFor(layout)
      expect(detectNetherPortal(blockAtFor(world), origin)).toBeUndefined()
    }
  })
})
