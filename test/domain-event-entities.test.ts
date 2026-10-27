import { Result, Schema } from 'effect'
import { describe, expect, it } from 'vitest'
import {
  EntityDiedEventSchema,
  EntityHealedEventSchema,
  EntitySpawnedEventSchema,
  EntityTeleportedEventSchema,
} from '../src/domain/event/entity-events.js'

const decodeEntityDiedEvent = Schema.decodeUnknownResult(EntityDiedEventSchema)
const decodeEntityHealedEvent = Schema.decodeUnknownResult(EntityHealedEventSchema)
const decodeEntitySpawnedEvent = Schema.decodeUnknownResult(EntitySpawnedEventSchema)
const decodeEntityTeleportedEvent = Schema.decodeUnknownResult(EntityTeleportedEventSchema)

const position = { dimension: 'overworld', x: 1.5, y: 64, z: -2 }

const entityDiedEvent = {
  _tag: 'EntityDied',
  tick: 4,
  entity: 'zombie-1',
  kind: 'zombie',
  position,
  cause: 'fire',
}

const entityHealedEvent = {
  _tag: 'EntityHealed',
  tick: 5,
  entity: 'player-1',
  amount: 2.5,
  cause: 'regeneration',
}

const entitySpawnedEvent = {
  _tag: 'EntitySpawned',
  tick: 6,
  entity: 'cow-1',
  kind: 'cow',
  position,
}

const entityTeleportedEvent = {
  _tag: 'EntityTeleported',
  tick: 7,
  entity: 'player-1',
  from: position,
  to: { dimension: 'nether', x: 12, y: 64, z: 8 },
  cause: 'nether-portal',
}

type EntityEventCase = Readonly<{
  tag: string
  payload: Readonly<Record<string, unknown>>
  decode: (input: unknown) => Result.Result<unknown, unknown>
}>

const entityEventCases: ReadonlyArray<EntityEventCase> = [
  { tag: 'EntityDied', payload: entityDiedEvent, decode: decodeEntityDiedEvent },
  { tag: 'EntityHealed', payload: entityHealedEvent, decode: decodeEntityHealedEvent },
  { tag: 'EntitySpawned', payload: entitySpawnedEvent, decode: decodeEntitySpawnedEvent },
  { tag: 'EntityTeleported', payload: entityTeleportedEvent, decode: decodeEntityTeleportedEvent },
]

describe('entity domain event schemas', () => {
  it('decodes each declared event payload', () => {
    for (const { decode, payload } of entityEventCases) {
      expect(Result.isSuccess(decode(payload))).toBe(true)
    }
  })

  it('rejects every event payload without its required tick', () => {
    for (const { decode, payload } of entityEventCases) {
      const { tick: _tick, ...payloadWithoutTick } = payload

      expect(Result.isSuccess(decode(payloadWithoutTick))).toBe(false)
    }
  })

  it('rejects missing event-specific fields', () => {
    const { cause: _deathCause, ...deathWithoutCause } = entityDiedEvent
    const { amount: _amount, ...healingWithoutAmount } = entityHealedEvent
    const { kind: _spawnedKind, ...spawnWithoutKind } = entitySpawnedEvent
    const { to: _to, ...teleportWithoutDestination } = entityTeleportedEvent

    expect(Result.isSuccess(decodeEntityDiedEvent(deathWithoutCause))).toBe(false)
    expect(Result.isSuccess(decodeEntityHealedEvent(healingWithoutAmount))).toBe(false)
    expect(Result.isSuccess(decodeEntitySpawnedEvent(spawnWithoutKind))).toBe(false)
    expect(Result.isSuccess(decodeEntityTeleportedEvent(teleportWithoutDestination))).toBe(false)
  })

  it('rejects invalid simulation tick values for every event', () => {
    for (const { decode, payload } of entityEventCases) {
      expect(Result.isSuccess(decode({ ...payload, tick: -1 }))).toBe(false)
    }
  })

  it('rejects invalid death cause and entity kind brands', () => {
    expect(Result.isSuccess(decodeEntityDiedEvent({ ...entityDiedEvent, cause: '' }))).toBe(false)
    expect(Result.isSuccess(decodeEntityDiedEvent({ ...entityDiedEvent, kind: '' }))).toBe(false)
    expect(Result.isSuccess(decodeEntityDiedEvent({ ...entityDiedEvent, kind: '  ' }))).toBe(false)
  })

  it('rejects invalid healing amounts and cause literals', () => {
    for (const amount of [0, -0.5]) {
      expect(Result.isSuccess(decodeEntityHealedEvent({ ...entityHealedEvent, amount }))).toBe(false)
    }
    expect(Result.isSuccess(decodeEntityHealedEvent({ ...entityHealedEvent, cause: 'potion' }))).toBe(false)
  })

  it('rejects an empty spawned entity kind', () => {
    expect(Result.isSuccess(decodeEntitySpawnedEvent({ ...entitySpawnedEvent, kind: '' }))).toBe(false)
  })

  it('rejects a teleport cause outside the declared vocabulary', () => {
    expect(Result.isSuccess(decodeEntityTeleportedEvent({ ...entityTeleportedEvent, cause: 'unknown' }))).toBe(false)
    expect(Result.isSuccess(decodeEntityTeleportedEvent({ ...entityTeleportedEvent, entity: '' }))).toBe(false)
  })
})
