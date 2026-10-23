import { Brand } from 'effect'
import type { Dimension } from '../world/dimension.js'
import type { Position } from '../coordinates/coordinate-primitives.js'
import type { AngleRadians } from '../shared-vocabulary/shared-vocabulary.js'
import type { EntitySerial } from './entity-types.js'

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

export type VehicleVelocityComponent = number & Brand.Brand<'VehicleVelocityComponent'>
export const VehicleVelocityComponent: Brand.Constructor<VehicleVelocityComponent> =
  Brand.make<VehicleVelocityComponent>(
    (value) =>
      Number.isFinite(value)
        ? true
        : `VehicleVelocityComponent must be finite, received ${value}`,
  )

export type VehicleVelocity = Readonly<{
  x: VehicleVelocityComponent
  y: VehicleVelocityComponent
  z: VehicleVelocityComponent
}>

export type Vehicle = Readonly<{
  id: VehicleId
  type: VehicleType
  dimension: Dimension
  position: Position
  velocity: VehicleVelocity
  yawRadians: AngleRadians
  occupant?: OccupantId | undefined
}>

export type VehicleSnapshot = Readonly<{
  vehicles: ReadonlyArray<Vehicle>
  nextSerial: EntitySerial
}>

export type VehicleValidationPath = string & Brand.Brand<'VehicleValidationPath'>
export const VehicleValidationPath: Brand.Constructor<VehicleValidationPath> =
  Brand.make<VehicleValidationPath>(
    (value) => typeof value === 'string' || 'VehicleValidationPath must be a string',
  )

export type VehicleValidationReason = string & Brand.Brand<'VehicleValidationReason'>
export const VehicleValidationReason: Brand.Constructor<VehicleValidationReason> =
  Brand.make<VehicleValidationReason>(
    (value) => typeof value === 'string' || 'VehicleValidationReason must be a string',
  )

export type VehicleValidationError = Readonly<{
  _tag: 'VehicleValidationError'
  path: VehicleValidationPath
  reason: VehicleValidationReason
}>

export type VehicleValidationResult =
  | Readonly<{ _tag: 'Valid'; snapshot: VehicleSnapshot }>
  | Readonly<{ _tag: 'Invalid'; error: VehicleValidationError }>
