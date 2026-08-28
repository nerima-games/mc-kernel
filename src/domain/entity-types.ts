import { Brand } from 'effect'
import { position, type Position } from './coordinate-primitives.js'

export type EntityId = string & Brand.Brand<'EntityId'>

const entityId: Brand.Brand.Constructor<EntityId> = Brand.refined<EntityId>(
  (value): value is EntityId => typeof value === 'string' && value.trim().length > 0,
  (value) => Brand.error(`EntityId must be a non-blank string, received ${JSON.stringify(value)}`),
)

export { entityId as EntityId }

export type EntityKind = string & Brand.Brand<'EntityKind'>

const entityKind: Brand.Brand.Constructor<EntityKind> = Brand.refined<EntityKind>(
  (value): value is EntityKind => typeof value === 'string' && value.trim().length > 0,
  (value) => Brand.error(`EntityKind must be a non-blank string, received ${JSON.stringify(value)}`),
)

export { entityKind as EntityKind }

export const isEntityId = (value: unknown): value is EntityId =>
  typeof value === 'string' && value.trim().length > 0

export const isEntityKind = (value: unknown): value is EntityKind =>
  typeof value === 'string' && value.trim().length > 0

export const ENTITY_ID_PREFIX = 'e:'

export const mintEntityId = (serial: number): EntityId => entityId(`${ENTITY_ID_PREFIX}${serial}`)

export const serialOfEntityId = (id: string): number | undefined => {
  if (!id.startsWith(ENTITY_ID_PREFIX)) return undefined
  const digits = id.slice(ENTITY_ID_PREFIX.length)
  if (digits.length === 0 || !/^\d+$/.test(digits)) return undefined
  const serial = Number(digits)
  return Number.isSafeInteger(serial) ? serial : undefined
}

export type EntityState<S> = Readonly<{
  feetPosition: Position
  healthPoints: number
  behaviour: S
}>

export type Entity<S> = EntityState<S> &
  Readonly<{
    id: EntityId
    kind: EntityKind
  }>

export type EntityRoster<S> = Readonly<{
  entities: ReadonlyArray<Entity<S>>
  nextSerial: number
}>

export const NO_ENTITIES: ReadonlyArray<never> = []

const magnitude = (value: number): number => (Number.isFinite(value) ? value : 0)

const repairPosition = (value: Position): Position =>
  typeof value === 'object' && value !== null
    ? position(magnitude(value.x), magnitude(value.y), magnitude(value.z))
    : position(0, 0, 0)

const repairHealth = (value: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0

export const repairState = <S>(state: EntityState<S>): EntityState<S> => ({
  feetPosition: repairPosition(state.feetPosition),
  healthPoints: repairHealth(state.healthPoints),
  behaviour: state.behaviour,
})

export type SpawnRequest<S> = Readonly<{
  kind: EntityKind
  feetPosition: Position
  healthPoints: number
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
  discarded: number
  reidentified: number
}>

export type NormaliseRosterOutcome<S> = RosterRepair &
  Readonly<{
    roster: EntityRoster<S>
  }>
