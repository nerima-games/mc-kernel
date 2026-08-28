import { describe, expect, it } from 'vitest'
import { position } from '../src/domain/coordinate-primitives'
import {
  DESPAWNED,
  ENTITY_ID_PREFIX,
  EntityId,
  EntityKind,
  isEntityId,
  isEntityKind,
  mintEntityId,
  NO_ENTITIES,
  normaliseRoster,
  repairState,
  serialOfEntityId,
  UNCHANGED,
  changed,
  countOfKind,
  despawnEntity,
  emptyRoster,
  findEntity,
  spawnEntity,
  sweepRoster,
} from '../src/domain/entity'
import type { EntityState } from '../src/domain/entity'

describe('entity', () => {
  it('validates identifiers and mints serial identifiers', () => {
    const zombie = EntityKind('zombie')

    expect(ENTITY_ID_PREFIX).toBe('e:')
    expect(mintEntityId(7)).toBe(EntityId('e:7'))
    expect(serialOfEntityId('e:12')).toBe(12)
    expect(serialOfEntityId('e:')).toBeUndefined()
    expect(serialOfEntityId('e:missing')).toBeUndefined()
    expect(serialOfEntityId('entity:12')).toBeUndefined()
    expect(serialOfEntityId('e:9007199254740992')).toBeUndefined()
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
  })

  it('repairs unsafe state values at entity boundaries', () => {
    const state: EntityState<string> = {
      feetPosition: position(Number.NaN, Number.POSITIVE_INFINITY, -3),
      healthPoints: -5,
      behaviour: 'idle',
    }

    expect(repairState(state)).toStrictEqual({
      feetPosition: position(0, 0, -3),
      healthPoints: 0,
      behaviour: 'idle',
    })
  })

  it('spawns, finds, counts, and despawns entities immutably', () => {
    const zombie = EntityKind('zombie')
    const skeleton = EntityKind('skeleton')
    const empty = emptyRoster<string>()
    const first = spawnEntity(empty, {
      kind: zombie,
      feetPosition: position(1, 2, 3),
      healthPoints: 20,
      behaviour: 'idle',
    })
    const second = spawnEntity(first.roster, {
      kind: skeleton,
      feetPosition: position(4, 5, 6),
      healthPoints: 10,
      behaviour: 'patrol',
    })

    expect(empty.entities).toBe(NO_ENTITIES)
    expect(first.entity.id).toBe(EntityId('e:0'))
    expect(second.entity.id).toBe(EntityId('e:1'))
    expect(second.roster.nextSerial).toBe(2)
    expect(findEntity(second.roster, first.entity.id)).toBe(first.entity)
    expect(findEntity(second.roster, EntityId('e:99'))).toBeUndefined()
    expect(countOfKind(second.roster, zombie)).toBe(1)
    expect(countOfKind(second.roster, EntityKind('creeper'))).toBe(0)

    const missing = despawnEntity(second.roster, EntityId('e:99'))
    expect(missing).toStrictEqual({ roster: second.roster, despawned: false })

    const removed = despawnEntity(second.roster, first.entity.id)
    expect(removed.despawned).toBe(true)
    expect(removed.roster.entities).toStrictEqual([second.entity])
    expect(removed.roster.nextSerial).toBe(2)
  })

  it('sweeps unchanged, changed, and despawned transitions with emissions', () => {
    const kind = EntityKind('slime')
    const first = spawnEntity(emptyRoster<string>(), {
      kind,
      feetPosition: position(0, 0, 0),
      healthPoints: 4,
      behaviour: 'idle',
    })
    const second = spawnEntity(first.roster, {
      kind,
      feetPosition: position(1, 0, 0),
      healthPoints: 4,
      behaviour: 'idle',
    })
    const third = spawnEntity(second.roster, {
      kind,
      feetPosition: position(2, 0, 0),
      healthPoints: 4,
      behaviour: 'idle',
    })

    const unchanged = sweepRoster(third.roster, () => ({ transition: UNCHANGED, emit: undefined }))
    expect(unchanged.roster).toBe(third.roster)
    expect(unchanged.emitted).toStrictEqual([])

    const swept = sweepRoster(third.roster, (entity) => {
      if (entity.id === first.entity.id) {
        return {
          transition: changed({
            feetPosition: position(3, 0, 0),
            healthPoints: -1,
            behaviour: 'moving',
          }),
          emit: 'changed',
        }
      }
      if (entity.id === second.entity.id) return { transition: UNCHANGED, emit: undefined }
      return { transition: DESPAWNED, emit: 'removed' }
    })

    expect(swept.roster.entities).toHaveLength(2)
    expect(swept.roster.entities[0]).toStrictEqual({
      id: first.entity.id,
      kind,
      feetPosition: position(3, 0, 0),
      healthPoints: 0,
      behaviour: 'moving',
    })
    expect(swept.roster.entities[1]).toBe(second.entity)
    expect(swept.emitted).toStrictEqual(['changed', 'removed'])
  })

  it('normalises duplicate, malformed, and invalid roster entries', () => {
    const normalized = normaliseRoster<string>(
      JSON.parse(
        '{"entities":[{"id":"e:5","kind":"zombie","feetPosition":{"x":1,"y":2,"z":3},"healthPoints":4,"behaviour":"idle"},{"id":"e:5","kind":"skeleton","feetPosition":null,"healthPoints":"bad","behaviour":"walk"},null,{"id":"e:no","kind":"","feetPosition":{"x":0,"y":0,"z":0},"healthPoints":1,"behaviour":"idle"}],"nextSerial":-1}',
      ),
      (kind, behaviour) => `${kind}:${behaviour}`,
    )

    expect(normalized).toStrictEqual({
      roster: {
        entities: [
          {
            id: EntityId('e:5'),
            kind: EntityKind('zombie'),
            feetPosition: position(1, 2, 3),
            healthPoints: 4,
            behaviour: 'zombie:idle',
          },
          {
            id: EntityId('e:6'),
            kind: EntityKind('skeleton'),
            feetPosition: position(0, 0, 0),
            healthPoints: 0,
            behaviour: 'skeleton:walk',
          },
        ],
        nextSerial: 7,
      },
      discarded: 2,
      reidentified: 1,
    })
    expect(normaliseRoster(normalized.roster).roster).toStrictEqual(normalized.roster)

    const invalidEnvelope = normaliseRoster<string>(JSON.parse('null'))
    expect(invalidEnvelope).toStrictEqual({
      roster: { entities: NO_ENTITIES, nextSerial: 0 },
      discarded: 0,
      reidentified: 0,
    })
    const invalidSerial = normaliseRoster<string>(JSON.parse('{"entities":[],"nextSerial":"bad"}'))
    expect(invalidSerial.roster.nextSerial).toBe(0)
  })
})
