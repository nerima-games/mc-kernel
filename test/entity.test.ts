import { describe, expect, it } from 'vitest'
import { PositionAxis, position as makePosition } from '../src/domain/coordinates/coordinate-primitives'
import {
  ENTITY_ID_PREFIX,
  EntityId,
  EntityHealthPoints,
  EntityKind,
  EntityRosterRepairCount,
  EntitySerial,
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
    expect(mintEntityId(EntitySerial(7))).toBe(EntityId('e:7'))
    expect(serialOfEntityId(EntityId('e:12'))).toBe(12)
    expect(serialOfEntityId(EntityId('e:'))).toBeUndefined()
    expect(serialOfEntityId(EntityId('e:missing'))).toBeUndefined()
    expect(serialOfEntityId(EntityId('entity:12'))).toBeUndefined()
    expect(serialOfEntityId(EntityId('e:9007199254740992'))).toBeUndefined()
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
    expect(EntitySerial(0)).toBe(0)
    expect(EntitySerial(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER)
    expect(() => EntitySerial(-1)).toThrow()
    expect(() => EntitySerial(1.5)).toThrow()
    expect(() => EntitySerial(Number.MAX_SAFE_INTEGER + 1)).toThrow()
    expect(EntityHealthPoints(0)).toBe(0)
    expect(EntityHealthPoints(Number.MAX_VALUE)).toBe(Number.MAX_VALUE)
    expect(() => EntityHealthPoints(-1)).toThrow()
    expect(() => EntityHealthPoints(Number.POSITIVE_INFINITY)).toThrow()
    expect(() => EntityHealthPoints(Number.NaN)).toThrow()
    expect(EntityRosterRepairCount(0)).toBe(0)
    expect(EntityRosterRepairCount(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER)
    expect(() => EntityRosterRepairCount(-1)).toThrow()
    expect(() => EntityRosterRepairCount(1.5)).toThrow()
    expect(() => EntityRosterRepairCount(Number.MAX_SAFE_INTEGER + 1)).toThrow()
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
