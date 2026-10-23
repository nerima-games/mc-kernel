import { describe, expect, it } from 'vitest'
import {
  OccupantId,
  VEHICLE_TYPES,
  VehicleId,
  VehicleValidationPath,
  VehicleValidationReason,
  VehicleVelocityComponent,
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

  it('validates finite velocity components and brands diagnostic strings', () => {
    expect(VehicleVelocityComponent(0)).toBe(0)
    expect(VehicleVelocityComponent(-Number.MAX_VALUE)).toBe(-Number.MAX_VALUE)
    expect(() => VehicleVelocityComponent(Number.NaN)).toThrow()
    expect(() => VehicleVelocityComponent(Number.POSITIVE_INFINITY)).toThrow()
    expect(VehicleValidationPath('')).toBe('')
    expect(VehicleValidationReason('invalid velocity')).toBe('invalid velocity')
    expect(() => Reflect.apply(VehicleValidationPath, undefined, [1])).toThrow()
    expect(() => Reflect.apply(VehicleValidationReason, undefined, [null])).toThrow()
  })
})
