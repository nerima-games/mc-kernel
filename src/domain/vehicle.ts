import { Brand } from 'effect'
import { isDimension, type Dimension } from './dimension.js'
import type { Position } from './coordinate-primitives.js'

export const VEHICLE_TYPES = ['boat', 'minecart'] as const
export type VehicleType = (typeof VEHICLE_TYPES)[number]

const VEHICLE_TYPE_LOOKUP: ReadonlySet<string> = new Set(VEHICLE_TYPES)

export const isVehicleType = (value: unknown): value is VehicleType =>
  typeof value === 'string' && VEHICLE_TYPE_LOOKUP.has(value)

export type VehicleId = string & Brand.Brand<'VehicleId'>
const vehicleId: Brand.Brand.Constructor<VehicleId> = Brand.refined<VehicleId>(
  (value) => typeof value === 'string' && value.trim().length > 0,
  () => Brand.error('VehicleId must be a non-blank string'),
)
export { vehicleId as VehicleId }

export type OccupantId = string & Brand.Brand<'VehicleOccupantId'>
const occupantId: Brand.Brand.Constructor<OccupantId> = Brand.refined<OccupantId>(
  (value) => typeof value === 'string' && value.trim().length > 0,
  () => Brand.error('OccupantId must be a non-blank string'),
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

const invalidError = (path: string, reason: string): VehicleValidationError => ({
  _tag: 'VehicleValidationError',
  path,
  reason,
})

const invalid = (path: string, reason: string): VehicleValidationResult => ({
  _tag: 'Invalid',
  error: invalidError(path, reason),
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isFinitePosition = (value: unknown): value is Position =>
  isRecord(value) &&
  isFiniteNumber(value['x']) &&
  isFiniteNumber(value['y']) &&
  isFiniteNumber(value['z'])

const isNonNegativeSafeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

type VehicleItemValidation =
  | Readonly<{ _tag: 'Invalid'; error: VehicleValidationError }>
  | Readonly<{ _tag: 'Valid'; vehicle: Vehicle; serial: number | undefined }>

const vehicleSerialFor = (
  id: string,
  path: string,
): Readonly<{ _tag: 'Valid'; serial: number | undefined }> | Readonly<{ _tag: 'Invalid'; error: VehicleValidationError }> => {
  const serialMatch = /^v:(\d+)$/.exec(id)
  if (serialMatch === null) return { _tag: 'Valid', serial: undefined }

  const serial = Number(serialMatch[0].slice(2))
  return Number.isSafeInteger(serial)
    ? { _tag: 'Valid', serial }
    : { _tag: 'Invalid', error: invalidError(path, 'has an unsafe serial') }
}

const validateVehicleItem = (
  item: unknown,
  path: string,
  ids: Set<string>,
  occupants: Set<string>,
): VehicleItemValidation => {
  if (!isRecord(item)) return { _tag: 'Invalid', error: invalidError(path, 'must be an object') }

  const id = item['id']
  if (typeof id !== 'string' || id.trim().length === 0) {
    return { _tag: 'Invalid', error: invalidError(`${path}.id`, 'must be non-blank') }
  }
  if (ids.has(id)) return { _tag: 'Invalid', error: invalidError(`${path}.id`, 'must be unique') }
  ids.add(id)

  const serialResult = vehicleSerialFor(id, `${path}.id`)
  if (serialResult._tag === 'Invalid') return serialResult

  const type = item['type']
  if (!isVehicleType(type)) {
    return { _tag: 'Invalid', error: invalidError(`${path}.type`, 'must be boat or minecart') }
  }

  const dimension = item['dimension']
  if (!isDimension(dimension)) {
    return { _tag: 'Invalid', error: invalidError(`${path}.dimension`, 'must be a supported dimension') }
  }

  const position = item['position']
  if (!isFinitePosition(position)) {
    return { _tag: 'Invalid', error: invalidError(`${path}.position`, 'must contain finite coordinates') }
  }

  const velocity = item['velocity']
  if (!isFinitePosition(velocity)) {
    return { _tag: 'Invalid', error: invalidError(`${path}.velocity`, 'must contain finite coordinates') }
  }

  const yawRadians = item['yawRadians']
  if (!isFiniteNumber(yawRadians)) {
    return { _tag: 'Invalid', error: invalidError(`${path}.yawRadians`, 'must be finite') }
  }

  const occupant = item['occupant']
  if (occupant !== undefined) {
    if (typeof occupant !== 'string' || occupant.trim().length === 0) {
      return { _tag: 'Invalid', error: invalidError(`${path}.occupant`, 'must be non-blank') }
    }
    if (occupants.has(occupant)) {
      return { _tag: 'Invalid', error: invalidError(`${path}.occupant`, 'must occupy at most one vehicle') }
    }
    occupants.add(occupant)
  }

  const vehicle: Vehicle = occupant === undefined
    ? { id: vehicleId(id), type, dimension, position, velocity, yawRadians }
    : { id: vehicleId(id), type, dimension, position, velocity, yawRadians, occupant: occupantId(occupant) }

  return { _tag: 'Valid', vehicle, serial: serialResult.serial }
}

export const validateVehicleSnapshot = (value: unknown): VehicleValidationResult => {
  if (!isRecord(value) || !Array.isArray(value['vehicles'])) {
    return invalid('snapshot.vehicles', 'must be an array')
  }

  const nextSerial = value['nextSerial']
  if (!isNonNegativeSafeInteger(nextSerial)) {
    return invalid('snapshot.nextSerial', 'must be a non-negative safe integer')
  }

  const vehicles: Array<Vehicle> = []
  const ids = new Set<string>()
  const occupants = new Set<string>()
  let highestSerial = -1

  for (const [index, item] of value['vehicles'].entries()) {
    const validated = validateVehicleItem(item, `snapshot.vehicles[${String(index)}]`, ids, occupants)
    if (validated._tag === 'Invalid') return validated
    vehicles.push(validated.vehicle)
    if (validated.serial !== undefined) highestSerial = Math.max(highestSerial, validated.serial)
  }

  if (nextSerial <= highestSerial) {
    return invalid('snapshot.nextSerial', 'must be greater than every minted vehicle id')
  }

  return { _tag: 'Valid', snapshot: { vehicles, nextSerial } }
}

export const emptyVehicleSnapshot = (): VehicleSnapshot => ({ vehicles: [], nextSerial: 0 })
