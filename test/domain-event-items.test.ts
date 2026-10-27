import { Result, Schema } from 'effect'
import { describe, expect, it } from 'vitest'
import {
  ItemConsumedEventSchema,
  ItemDroppedEventSchema,
  ItemPickedUpEventSchema,
} from '../src/domain/event/item-events.js'

const droppedEvent = {
  _tag: 'ItemDropped',
  tick: 3,
  droppedItem: 'dropped-item-1',
  item: 4,
  count: 2,
  position: { dimension: 'overworld', x: 1.5, y: 64, z: -2 },
}

const pickedUpEvent = {
  _tag: 'ItemPickedUp',
  tick: 4,
  actor: 'player-1',
  source: { _tag: 'DroppedItem', id: 'dropped-item-1' },
  item: 4,
  count: 1,
}

const consumedEvent = {
  _tag: 'ItemConsumed',
  tick: 5,
  actor: 'player-1',
  item: 4,
  count: 1,
  use: 'food',
}

describe('item domain event schemas', () => {
  it('accepts dropped, picked up, and consumed events', () => {
    expect(Result.isSuccess(Schema.decodeUnknownResult(ItemDroppedEventSchema)(droppedEvent))).toBe(true)
    expect(Result.isSuccess(Schema.decodeUnknownResult(ItemPickedUpEventSchema)(pickedUpEvent))).toBe(true)
    expect(Result.isSuccess(Schema.decodeUnknownResult(ItemConsumedEventSchema)(consumedEvent))).toBe(true)
  })

  it('accepts projectile as an item pickup source', () => {
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(ItemPickedUpEventSchema)({
          ...pickedUpEvent,
          source: { _tag: 'Projectile', id: 'projectile-1' },
        }),
      ),
    ).toBe(true)
  })

  it('rejects each event when tick is missing', () => {
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(ItemDroppedEventSchema)({
          _tag: 'ItemDropped',
          droppedItem: 'dropped-item-1',
          item: 4,
          count: 2,
          position: { dimension: 'overworld', x: 1.5, y: 64, z: -2 },
        }),
      ),
    ).toBe(false)
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(ItemPickedUpEventSchema)({
          _tag: 'ItemPickedUp',
          actor: 'player-1',
          source: { _tag: 'DroppedItem', id: 'dropped-item-1' },
          item: 4,
          count: 1,
        }),
      ),
    ).toBe(false)
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(ItemConsumedEventSchema)({
          _tag: 'ItemConsumed',
          actor: 'player-1',
          item: 4,
          count: 1,
          use: 'food',
        }),
      ),
    ).toBe(false)
  })

  it('rejects missing event-specific payload fields', () => {
    const { count: _count, ...droppedWithoutCount } = droppedEvent
    const { source: _source, ...pickedUpWithoutSource } = pickedUpEvent
    const { use: _use, ...consumedWithoutUse } = consumedEvent

    expect(
      Result.isSuccess(Schema.decodeUnknownResult(ItemDroppedEventSchema)(droppedWithoutCount)),
    ).toBe(false)
    expect(
      Result.isSuccess(Schema.decodeUnknownResult(ItemPickedUpEventSchema)(pickedUpWithoutSource)),
    ).toBe(false)
    expect(
      Result.isSuccess(Schema.decodeUnknownResult(ItemConsumedEventSchema)(consumedWithoutUse)),
    ).toBe(false)
  })

  it('rejects invalid simulation ticks in each event', () => {
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(ItemDroppedEventSchema)({ ...droppedEvent, tick: -1 }),
      ),
    ).toBe(false)
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(ItemPickedUpEventSchema)({ ...pickedUpEvent, tick: -1 }),
      ),
    ).toBe(false)
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(ItemConsumedEventSchema)({ ...consumedEvent, tick: -1 }),
      ),
    ).toBe(false)
  })

  it('rejects invalid projectile IDs and stack counts', () => {
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(ItemPickedUpEventSchema)({
          ...pickedUpEvent,
          source: { _tag: 'Projectile', id: '' },
        }),
      ),
    ).toBe(false)
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(ItemDroppedEventSchema)({ ...droppedEvent, count: 0 }),
      ),
    ).toBe(false)
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(ItemPickedUpEventSchema)({ ...pickedUpEvent, count: 0 }),
      ),
    ).toBe(false)
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(ItemConsumedEventSchema)({ ...consumedEvent, count: 0 }),
      ),
    ).toBe(false)
  })
})
