import { Brand } from 'effect'
import type { Dimension } from '../world/dimension.js'
import type { Position } from '../coordinates/coordinate-primitives.js'

export const VEHICLE_TYPES = ['boat', 'minecart'] as const
export type VehicleType = (typeof VEHICLE_TYPES)[number]

const VEHICLE_TYPE_LOOKUP: ReadonlySet<string> = new Set(VEHICLE_TYPES)

export const isVehicleType = (value: unknown): value is VehicleType =>
  typeof value === 'string' && VEHICLE_TYPE_LOOKUP.has(value)

export type VehicleId = string & Brand.Brand<'VehicleId'>
const vehicleId: Brand.Constructor<VehicleId> = Brand.make<VehicleId>(
  (value) =>
    typeof value === 'string' && value.trim().length > 0
      ? true
      : 'VehicleId must be a non-blank string',
)
export { vehicleId as VehicleId }

export type OccupantId = string & Brand.Brand<'VehicleOccupantId'>
const occupantId: Brand.Constructor<OccupantId> = Brand.make<OccupantId>(
  (value) =>
    typeof value === 'string' && value.trim().length > 0
      ? true
      : 'OccupantId must be a non-blank string',
)
export { occupantId as OccupantId }

export type VehicleVelocity = Readonly<{ x: number; y: number; z: number }>

export type Vehicle = Readonly<{
  id: VehicleId
  type: VehicleType
  dimension: Dimension
  position: Position
  velocity: VehicleVelocity
  yawRadians: number
  occupant?: OccupantId | undefined
}>

export type VehicleSnapshot = Readonly<{
  vehicles: ReadonlyArray<Vehicle>
  nextSerial: number
}>

export type VehicleValidationError = Readonly<{
  _tag: 'VehicleValidationError'
  path: string
  reason: string
}>

export type VehicleValidationResult =
  | Readonly<{ _tag: 'Valid'; snapshot: VehicleSnapshot }>
  | Readonly<{ _tag: 'Invalid'; error: VehicleValidationError }>
