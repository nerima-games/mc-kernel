import { Brand } from 'effect'
import { PositionAxis, position, type Position } from '../coordinates/coordinate-primitives.js'

export type EntitySerial = number & Brand.Brand<'EntitySerial'>

export const EntitySerial: Brand.Constructor<EntitySerial> = Brand.make<EntitySerial>(
  (value) =>
    Number.isSafeInteger(value) && value >= 0
      ? true
      : `EntitySerial must be a non-negative safe integer, received ${value}`,
)

export type EntityHealthPoints = number & Brand.Brand<'EntityHealthPoints'>

export const EntityHealthPoints: Brand.Constructor<EntityHealthPoints> =
  Brand.make<EntityHealthPoints>(
    (value) =>
      Number.isFinite(value) && value >= 0
        ? true
        : `EntityHealthPoints must be finite and non-negative, received ${value}`,
  )

export type EntityRosterRepairCount = number & Brand.Brand<'EntityRosterRepairCount'>

export const EntityRosterRepairCount: Brand.Constructor<EntityRosterRepairCount> =
  Brand.make<EntityRosterRepairCount>(
    (value) =>
      Number.isSafeInteger(value) && value >= 0
        ? true
        : `EntityRosterRepairCount must be a non-negative safe integer, received ${value}`,
  )

export type EntityId = string & Brand.Brand<'EntityId'>

const entityId: Brand.Constructor<EntityId> = Brand.make<EntityId>(
  (value) =>
    typeof value === 'string' && value.trim().length > 0
      ? true
      : `EntityId must be a non-blank string, received ${JSON.stringify(value)}`,
)

export { entityId as EntityId }

export type EntityKind = string & Brand.Brand<'EntityKind'>

const entityKind: Brand.Constructor<EntityKind> = Brand.make<EntityKind>(
  (value) =>
    typeof value === 'string' && value.trim().length > 0
      ? true
      : `EntityKind must be a non-blank string, received ${JSON.stringify(value)}`,
)

export { entityKind as EntityKind }

export const isEntityId = (value: unknown): value is EntityId =>
  typeof value === 'string' && value.trim().length > 0

export const isEntityKind = (value: unknown): value is EntityKind =>
  typeof value === 'string' && value.trim().length > 0

export const ENTITY_ID_PREFIX = 'e:'

export const mintEntityId = (serial: EntitySerial): EntityId => entityId(`${ENTITY_ID_PREFIX}${serial}`)

export const serialOfEntityId = (id: EntityId): EntitySerial | undefined => {
  if (!id.startsWith(ENTITY_ID_PREFIX)) return undefined
  const digits = id.slice(ENTITY_ID_PREFIX.length)
  if (digits.length === 0 || !/^\d+$/.test(digits)) return undefined
  const serial = Number(digits)
  return Number.isSafeInteger(serial) ? EntitySerial(serial) : undefined
}

export type EntityState<S> = Readonly<{
  feetPosition: Position
  healthPoints: EntityHealthPoints
  behaviour: S
}>

export type Entity<S> = EntityState<S> &
  Readonly<{
    id: EntityId
    kind: EntityKind
  }>

export type EntityRoster<S> = Readonly<{
  entities: ReadonlyArray<Entity<S>>
  nextSerial: EntitySerial
}>

export const NO_ENTITIES: ReadonlyArray<never> = []

const magnitude = (value: number): number => (Number.isFinite(value) ? value : 0)

const repairPosition = (value: Position): Position =>
  typeof value === 'object' && value !== null
    ? position(
        PositionAxis(magnitude(value.x)),
        PositionAxis(magnitude(value.y)),
        PositionAxis(magnitude(value.z)),
      )
    : position(PositionAxis(0), PositionAxis(0), PositionAxis(0))

const repairHealth = (value: EntityHealthPoints): EntityHealthPoints =>
  EntityHealthPoints(typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0)

export const repairState = <S>(state: EntityState<S>): EntityState<S> => ({
  feetPosition: repairPosition(state.feetPosition),
  healthPoints: repairHealth(state.healthPoints),
  behaviour: state.behaviour,
})

export type SpawnRequest<S> = Readonly<{
  kind: EntityKind
  feetPosition: Position
  healthPoints: EntityHealthPoints
  behaviour: S
}>

export type SpawnOutcome<S> = Readonly<{
  roster: EntityRoster<S>
  entity: Entity<S>
}>

export type DespawnOutcome<S> = Readonly<{
  roster: EntityRoster<S>
  despawned: boolean
}>

export type EntityTransition<S> =
  | Readonly<{ _tag: 'Unchanged' }>
  | Readonly<{ _tag: 'Changed'; state: EntityState<S> }>
  | Readonly<{ _tag: 'Despawned' }>

export type EntityStep<S, A> = Readonly<{
  transition: EntityTransition<S>
  emit: A | undefined
}>

export type SweepOutcome<S, A> = Readonly<{
  roster: EntityRoster<S>
  emitted: ReadonlyArray<A>
}>

export type BehaviourRepair<S> = (kind: EntityKind, behaviour: S) => S

export type RosterRepair = Readonly<{
  discarded: EntityRosterRepairCount
  reidentified: EntityRosterRepairCount
}>

export type NormaliseRosterOutcome<S> = RosterRepair &
  Readonly<{
    roster: EntityRoster<S>
  }>
