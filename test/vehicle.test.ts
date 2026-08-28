import { describe, expect, it } from 'vitest'
import {
  OccupantId,
  VEHICLE_TYPES,
  VehicleId,
  emptyVehicleSnapshot,
  isVehicleType,
  validateVehicleSnapshot,
} from '../src/domain/vehicle'

type RawVehicle = Record<string, unknown>

const rawVehicle = (overrides: RawVehicle = {}): RawVehicle => ({
  id: 'v:4',
  type: 'boat',
  dimension: 'overworld',
  position: { x: 1, y: 2, z: 3 },
  velocity: { x: 0, y: 0, z: 0 },
  yawRadians: 0.25,
  ...overrides,
})

const rawSnapshot = (vehicles: ReadonlyArray<unknown>, nextSerial: unknown = 0): RawVehicle => ({
  vehicles,
  nextSerial,
})

const expectInvalid = (value: unknown, path: string): void => {
  const result = validateVehicleSnapshot(value)
  expect(result._tag).toBe('Invalid')
  if (result._tag !== 'Invalid') throw new Error('expected invalid vehicle snapshot')
  expect(result.error.path).toBe(path)
}

describe('vehicle contracts', () => {
  it('publishes the closed vehicle vocabulary and branded identifiers', () => {
    expect(VEHICLE_TYPES).toEqual(['boat', 'minecart'])
    expect(isVehicleType('boat')).toBe(true)
    expect(isVehicleType('minecart')).toBe(true)
    expect(isVehicleType('camel')).toBe(false)
    expect(isVehicleType(null)).toBe(false)
    expect(VehicleId('v:1')).toBe('v:1')
    expect(OccupantId('player-1')).toBe('player-1')
    expect(() => VehicleId('')).toThrow()
    expect(() => OccupantId(' ')).toThrow()
  })

  it('creates an empty snapshot', () => {
    expect(emptyVehicleSnapshot()).toEqual({ vehicles: [], nextSerial: 0 })
  })

  it('canonicalizes valid external snapshots', () => {
    const result = validateVehicleSnapshot(
      rawSnapshot([
        rawVehicle({ id: 'v:4' }),
        rawVehicle({
          id: 'cargo',
          type: 'minecart',
          dimension: 'nether',
          position: { x: -1, y: 0, z: 5 },
          velocity: { x: 0.5, y: -0.25, z: 1 },
          yawRadians: -1,
          occupant: 'player-1',
          ignored: true,
        }),
      ], 5),
    )

    expect(result._tag).toBe('Valid')
    if (result._tag !== 'Valid') throw new Error('expected valid vehicle snapshot')
    expect(result.snapshot).toEqual({
      vehicles: [
        {
          id: 'v:4',
          type: 'boat',
          dimension: 'overworld',
          position: { x: 1, y: 2, z: 3 },
          velocity: { x: 0, y: 0, z: 0 },
          yawRadians: 0.25,
        },
        {
          id: 'cargo',
          type: 'minecart',
          dimension: 'nether',
          position: { x: -1, y: 0, z: 5 },
          velocity: { x: 0.5, y: -0.25, z: 1 },
          yawRadians: -1,
          occupant: 'player-1',
        },
      ],
      nextSerial: 5,
    })
  })

  it('rejects malformed snapshot envelopes and serial counters', () => {
    expectInvalid(null, 'snapshot.vehicles')
    expectInvalid([], 'snapshot.vehicles')
    expectInvalid({ vehicles: {} }, 'snapshot.vehicles')
    expectInvalid(rawSnapshot([], '0'), 'snapshot.nextSerial')
    expectInvalid(rawSnapshot([], 1.5), 'snapshot.nextSerial')
    expectInvalid(rawSnapshot([], Number.POSITIVE_INFINITY), 'snapshot.nextSerial')
    expectInvalid(rawSnapshot([], -1), 'snapshot.nextSerial')
  })

  it('rejects malformed vehicle records', () => {
    expectInvalid(rawSnapshot([null]), 'snapshot.vehicles[0]')
    expectInvalid(rawSnapshot([rawVehicle({ id: 1 })]), 'snapshot.vehicles[0].id')
    expectInvalid(rawSnapshot([rawVehicle({ id: '' })]), 'snapshot.vehicles[0].id')
    expectInvalid(
      rawSnapshot([rawVehicle({ id: 'cargo' }), rawVehicle({ id: 'cargo' })], 0),
      'snapshot.vehicles[1].id',
    )
    expectInvalid(rawSnapshot([rawVehicle({ id: 'v:9007199254740992' })]), 'snapshot.vehicles[0].id')
    expectInvalid(rawSnapshot([rawVehicle({ type: 'camel' })]), 'snapshot.vehicles[0].type')
    expectInvalid(rawSnapshot([rawVehicle({ type: 1 })]), 'snapshot.vehicles[0].type')
    expectInvalid(rawSnapshot([rawVehicle({ dimension: 'moon' })]), 'snapshot.vehicles[0].dimension')
    expectInvalid(rawSnapshot([rawVehicle({ dimension: null })]), 'snapshot.vehicles[0].dimension')
    expectInvalid(rawSnapshot([rawVehicle({ position: null })]), 'snapshot.vehicles[0].position')
    expectInvalid(rawSnapshot([rawVehicle({ position: { x: Number.NaN, y: 2, z: 3 } })]), 'snapshot.vehicles[0].position')
    expectInvalid(rawSnapshot([rawVehicle({ position: { x: 1, y: Number.NaN, z: 3 } })]), 'snapshot.vehicles[0].position')
    expectInvalid(rawSnapshot([rawVehicle({ position: { x: 1, y: 2, z: Number.NaN } })]), 'snapshot.vehicles[0].position')
    expectInvalid(rawSnapshot([rawVehicle({ velocity: [] })]), 'snapshot.vehicles[0].velocity')
    expectInvalid(rawSnapshot([rawVehicle({ velocity: { x: Number.POSITIVE_INFINITY, y: 0, z: 0 } })]), 'snapshot.vehicles[0].velocity')
    expectInvalid(rawSnapshot([rawVehicle({ velocity: { x: 0, y: Number.NEGATIVE_INFINITY, z: 0 } })]), 'snapshot.vehicles[0].velocity')
    expectInvalid(rawSnapshot([rawVehicle({ velocity: { x: 0, y: 0, z: Number.NaN } })]), 'snapshot.vehicles[0].velocity')
    expectInvalid(rawSnapshot([rawVehicle({ yawRadians: Number.NaN })]), 'snapshot.vehicles[0].yawRadians')
    expectInvalid(rawSnapshot([rawVehicle({ yawRadians: '0' })]), 'snapshot.vehicles[0].yawRadians')
    expectInvalid(rawSnapshot([rawVehicle({ occupant: 1 })]), 'snapshot.vehicles[0].occupant')
    expectInvalid(rawSnapshot([rawVehicle({ occupant: ' ' })]), 'snapshot.vehicles[0].occupant')
    expectInvalid(
      rawSnapshot([rawVehicle({ id: 'v:1', occupant: 'player-1' }), rawVehicle({ id: 'v:2', occupant: 'player-1' })], 3),
      'snapshot.vehicles[1].occupant',
    )
  })

  it('requires the next serial to stay ahead of minted vehicle ids', () => {
    expectInvalid(rawSnapshot([rawVehicle({ id: 'v:4' })], 4), 'snapshot.nextSerial')
    expectInvalid(rawSnapshot([rawVehicle({ id: 'v:4' })], 3), 'snapshot.nextSerial')
  })
})
