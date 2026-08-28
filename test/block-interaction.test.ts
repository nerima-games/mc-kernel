import { describe, expect, it } from 'vitest'

import { breakBlock, canReplaceBlock, placeBlock, placeableBlockFromItem } from '../src/domain/block-interaction'
import { blockIdOf } from '../src/domain/block-registry'

describe('block interaction decisions', () => {
  it('blocks unknown and air breaks', () => {
    expect(breakBlock(-1)).toEqual({ kind: 'blocked', reason: 'unknown' })
    expect(breakBlock(blockIdOf('air'))).toEqual({ kind: 'blocked', reason: 'air' })
  })

  it('blocks canonical unbreakable blocks', () => {
    for (const type of ['bedrock', 'end_portal_frame', 'end_gateway'] as const) {
      expect(breakBlock(blockIdOf(type))).toEqual({ kind: 'blocked', reason: 'unbreakable' })
    }
  })

  it('returns a deterministic break result without a drop when bare-handed', () => {
    const id = blockIdOf('stone')

    expect(breakBlock(id)).toEqual({ kind: 'broken', id, type: 'stone', experience: 0 })
  })

  it('joins harvest resolution into break decisions', () => {
    const id = blockIdOf('stone')

    expect(breakBlock(id, { heldTier: 'wooden' })).toEqual({
      kind: 'broken',
      id,
      type: 'stone',
      drop: { item: 'cobblestone', count: 1, affectedByFortune: false },
      experience: 0,
    })
  })

  it('classifies replaceable target cells from registry capabilities', () => {
    for (const [type, expected] of [
      ['air', true],
      ['water', true],
      ['stone', false],
    ] as const) {
      expect(canReplaceBlock(blockIdOf(type))).toBe(expected)
    }
    expect(canReplaceBlock(-1)).toBe(false)
  })

  it('rejects unknown and air placement', () => {
    expect(placeBlock(-1, blockIdOf('stone'))).toEqual({ kind: 'rejected', reason: 'unknown-block' })
    expect(placeBlock(blockIdOf('air'), blockIdOf('stone'))).toEqual({ kind: 'rejected', reason: 'air' })
  })

  it('places blocks without a support rule on air', () => {
    const id = blockIdOf('stone')

    expect(placeBlock(id, blockIdOf('air'))).toEqual({ kind: 'placed', id, type: 'stone' })
  })

  it('enforces support rules for attachments', () => {
    expect(placeBlock(blockIdOf('torch'), blockIdOf('air'))).toEqual({
      kind: 'rejected',
      reason: 'unsupported',
    })
    expect(placeBlock(blockIdOf('torch'), blockIdOf('stone'))).toEqual({
      kind: 'placed',
      id: blockIdOf('torch'),
      type: 'torch',
    })
  })

  it('enforces explicit support block lists', () => {
    expect(placeBlock(blockIdOf('lily_pad'), blockIdOf('stone'))).toEqual({
      kind: 'rejected',
      reason: 'unsupported',
    })
    expect(placeBlock(blockIdOf('lily_pad'), blockIdOf('water'))).toEqual({
      kind: 'placed',
      id: blockIdOf('lily_pad'),
      type: 'lily_pad',
    })
  })

  it('maps placeable items and rejects non-placeable items', () => {
    expect(placeableBlockFromItem('stone')).toEqual({ id: blockIdOf('stone'), type: 'stone' })
    expect(placeableBlockFromItem('stick')).toBeUndefined()
  })
})
