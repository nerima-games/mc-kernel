import { describe, expect, it } from 'vitest'
import {
  OccupantId,
  VEHICLE_TYPES,
  VehicleId,
  isVehicleType,
} from '../src/domain/entity/vehicle'

describe('vehicle vocabulary', () => {
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
})
