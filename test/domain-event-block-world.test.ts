import { Result, Schema } from 'effect'
import { describe, expect, it } from 'vitest'
import {
  BlockChangedByWorldEventSchema,
  BlockPlacedEventSchema,
} from '../src/domain/event/block-world-events.js'

describe('BlockPlacedEventSchema', () => {
  const decodeBlockPlaced = Schema.decodeUnknownResult(BlockPlacedEventSchema)
  const event = {
    _tag: 'BlockPlaced',
    tick: 1,
    actor: 'player-1',
    address: {
      dimension: 'overworld',
      position: { x: 1, y: 64, z: -2 },
    },
    block: 1,
  }

  it('accepts a valid block placement', () => {
    expect(Result.isSuccess(decodeBlockPlaced(event))).toBe(true)
  })

  it('rejects an omitted tick and an invalid tick', () => {
    const { tick: _tick, ...withoutTick } = event

    expect(Result.isSuccess(decodeBlockPlaced(withoutTick))).toBe(false)
    expect(Result.isSuccess(decodeBlockPlaced({ ...event, tick: -1 }))).toBe(false)
  })

  it('rejects an omitted actor and an invalid entity ID', () => {
    const { actor: _actor, ...withoutActor } = event

    expect(Result.isSuccess(decodeBlockPlaced(withoutActor))).toBe(false)
    expect(Result.isSuccess(decodeBlockPlaced({ ...event, actor: '' }))).toBe(false)
  })
})

describe('BlockChangedByWorldEventSchema', () => {
  const decodeBlockChangedByWorld = Schema.decodeUnknownResult(BlockChangedByWorldEventSchema)
  const event = {
    _tag: 'BlockChangedByWorld',
    tick: 2,
    address: {
      dimension: 'overworld',
      position: { x: 1, y: 64, z: -2 },
    },
    cause: 'fire',
  }

  it('accepts a valid world-driven block change', () => {
    expect(Result.isSuccess(decodeBlockChangedByWorld(event))).toBe(true)
  })

  it('rejects an omitted tick, an invalid tick, and an unknown cause', () => {
    const { tick: _tick, ...withoutTick } = event

    expect(Result.isSuccess(decodeBlockChangedByWorld(withoutTick))).toBe(false)
    expect(Result.isSuccess(decodeBlockChangedByWorld({ ...event, tick: -1 }))).toBe(false)
    expect(Result.isSuccess(decodeBlockChangedByWorld({ ...event, cause: 'unknown' }))).toBe(false)
  })

  it('rejects an omitted cause and an invalid block address', () => {
    const { cause: _cause, ...withoutCause } = event

    expect(Result.isSuccess(decodeBlockChangedByWorld(withoutCause))).toBe(false)
    expect(
      Result.isSuccess(
        decodeBlockChangedByWorld({
          ...event,
          address: { dimension: 'void', position: { x: 1, y: 64, z: -2 } },
        }),
      ),
    ).toBe(false)
  })
})
