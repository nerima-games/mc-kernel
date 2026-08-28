import { aabb } from '../src/domain/coordinate-geometry'
import { position } from '../src/domain/coordinate-primitives'
import { segmentAABB } from '../src/domain/projectile-collision'
import { describe, expect, it } from 'vitest'

const BOX = aabb(position(0, 0, 0), position(1, 1, 1))

describe('segmentAABB', () => {
  it('returns the first entry point and face normal', () => {
    const hit = segmentAABB(position(-1, 0.5, 0.5), position(2, 0.5, 0.5), BOX)

    expect(hit).toEqual({
      fraction: 1 / 3,
      point: position(0, 0.5, 0.5),
      normal: position(-1, 0, 0),
    })
  })

  it('handles a segment that starts inside the box', () => {
    expect(segmentAABB(position(0.5, 0.5, 0.5), position(0.5, 0.5, 0.5), BOX)).toEqual({
      fraction: 0,
      point: position(0.5, 0.5, 0.5),
      normal: position(0, 0, 0),
    })
  })

  it('rejects parallel segments outside a slab and disjoint windows', () => {
    expect(segmentAABB(position(2, 0.5, 0.5), position(2, 0.5, 2), BOX)).toBeNull()
    expect(segmentAABB(position(-1, 0.5, 2), position(2, 0.5, -10), BOX)).toBeNull()
  })

  it('rejects malformed positions, boxes, and overflowing deltas', () => {
    expect(segmentAABB(position(Number.NaN, 0, 0), position(0, 0, 0), BOX)).toBeNull()
    expect(
      segmentAABB(position(0, 0, 0), position(1, 1, 1), {
        min: position(Number.NaN, 0, 0),
        max: position(1, 1, 1),
      }),
    ).toBeNull()
    expect(
      segmentAABB(position(-Number.MAX_VALUE, 0, 0), position(Number.MAX_VALUE, 0, 0), BOX),
    ).toBeNull()
  })
})
