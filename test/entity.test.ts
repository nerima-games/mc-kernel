import { describe, expect, it } from 'vitest'
import { PositionAxis, position as makePosition } from '../src/domain/coordinates/coordinate-primitives'
import {
  ENTITY_ID_PREFIX,
  EntityId,
  EntityKind,
  isEntityId,
  isEntityKind,
  mintEntityId,
  NO_ENTITIES,
  repairState,
  serialOfEntityId,
} from '../src/domain/entity/entity'

const position = (x: number, y: number, z: number) =>
  makePosition(PositionAxis(x), PositionAxis(y), PositionAxis(z))

describe('entity vocabulary', () => {
  it('validates identifiers and mints serial identifiers', () => {
    const zombie = EntityKind('zombie')

    expect(ENTITY_ID_PREFIX).toBe('e:')
    expect(mintEntityId(7)).toBe(EntityId('e:7'))
    expect(serialOfEntityId('e:12')).toBe(12)
    expect(serialOfEntityId('e:')).toBeUndefined()
    expect(serialOfEntityId('e:missing')).toBeUndefined()
    expect(serialOfEntityId('entity:12')).toBeUndefined()
    expect(serialOfEntityId('e:9007199254740992')).toBeUndefined()
    expect(isEntityId('e:1')).toBe(true)
    expect(isEntityId('')).toBe(false)
    expect(isEntityId(' ')).toBe(false)
    expect(isEntityId(1)).toBe(false)
    expect(isEntityId(null)).toBe(false)
    expect(isEntityKind(zombie)).toBe(true)
    expect(isEntityKind('')).toBe(false)
    expect(isEntityKind(null)).toBe(false)
    expect(() => EntityId('')).toThrow()
    expect(() => EntityKind(' ')).toThrow()
    expect(NO_ENTITIES).toStrictEqual([])
  })

  it('repairs unsafe state values at entity boundaries', () => {
    const state = {
      feetPosition: { x: Number.NaN, y: Number.POSITIVE_INFINITY, z: -3 },
      healthPoints: -5,
      behaviour: 'idle',
    }

    expect(Reflect.apply(makePosition, undefined, [Number.NaN, Number.POSITIVE_INFINITY, -3])).toStrictEqual({
      x: Number.NaN,
      y: Number.POSITIVE_INFINITY,
      z: -3,
    })
    expect(Reflect.apply(repairState, undefined, [state])).toStrictEqual({
      feetPosition: position(0, 0, -3),
      healthPoints: 0,
      behaviour: 'idle',
    })
  })

  it('defaults malformed state positions and health values', () => {
    const state = {
      feetPosition: null,
      healthPoints: Number.NaN,
      behaviour: 'idle',
    }

    expect(Reflect.apply(repairState, undefined, [state])).toStrictEqual({
      feetPosition: position(0, 0, 0),
      healthPoints: 0,
      behaviour: 'idle',
    })
  })
})
