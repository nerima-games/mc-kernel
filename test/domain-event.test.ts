import { Result, Schema } from 'effect'
import { describe, expect, it } from 'vitest'
import {
  AchievementIdSchema,
  DamageAmountSchema,
  DomainEventSchema,
  ExplosionPowerSchema,
  ExperienceLevelSchema,
  LevelUpLevelSchema,
} from '../src/domain/event/domain-event.js'

describe('DamageAmountSchema', () => {
  const decodeDamageAmount = Schema.decodeUnknownResult(DamageAmountSchema)

  it('accepts positive fractional and large finite damage', () => {
    for (const amount of [0.25, Number.MAX_VALUE]) {
      expect(Result.isSuccess(decodeDamageAmount(amount))).toBe(true)
    }
  })

  it('rejects non-positive and non-finite damage', () => {
    for (const amount of [0, -0.25, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, Number.NaN]) {
      expect(Result.isSuccess(decodeDamageAmount(amount))).toBe(false)
    }
  })
})

describe('ExplosionPowerSchema', () => {
  const decodeExplosionPower = Schema.decodeUnknownResult(ExplosionPowerSchema)

  it('accepts both endpoints of the current scale', () => {
    for (const power of [1, 6]) {
      expect(Result.isSuccess(decodeExplosionPower(power))).toBe(true)
    }
  })

  it('rejects values outside the scale and fractional power', () => {
    for (const power of [0, 7, 1.5]) {
      expect(Result.isSuccess(decodeExplosionPower(power))).toBe(false)
    }
  })
})

describe('ExperienceLevelSchema', () => {
  const decodeExperienceLevel = Schema.decodeUnknownResult(ExperienceLevelSchema)

  it('accepts zero and the maximum safe integer', () => {
    for (const level of [0, Number.MAX_SAFE_INTEGER]) {
      expect(Result.isSuccess(decodeExperienceLevel(level))).toBe(true)
    }
  })

  it('rejects negative, unsafe, and fractional levels', () => {
    for (const level of [-1, Number.MAX_SAFE_INTEGER + 1, 0.5]) {
      expect(Result.isSuccess(decodeExperienceLevel(level))).toBe(false)
    }
  })
})

describe('LevelUpLevelSchema', () => {
  const decodeLevelUpLevel = Schema.decodeUnknownResult(LevelUpLevelSchema)

  it('accepts one and the maximum safe integer', () => {
    for (const level of [1, Number.MAX_SAFE_INTEGER]) {
      expect(Result.isSuccess(decodeLevelUpLevel(level))).toBe(true)
    }
  })

  it('rejects zero, negative, unsafe, and fractional levels', () => {
    for (const level of [0, -1, Number.MAX_SAFE_INTEGER + 1, 1.5]) {
      expect(Result.isSuccess(decodeLevelUpLevel(level))).toBe(false)
    }
  })
})

describe('AchievementIdSchema', () => {
  const decodeAchievementId = Schema.decodeUnknownResult(AchievementIdSchema)

  it('accepts non-empty IDs and rejects an empty ID', () => {
    expect(Result.isSuccess(decodeAchievementId('first_steps'))).toBe(true)
    expect(Result.isSuccess(decodeAchievementId(''))).toBe(false)
  })
})

describe('DomainEventSchema', () => {
  const decodeDomainEvent = Schema.decodeUnknownResult(DomainEventSchema)

  it('accepts every declared event variant with its captured payload', () => {
    const events: ReadonlyArray<unknown> = [
      {
        _tag: 'EntityDamaged',
        tick: 0,
        entity: 'zombie',
        position: { dimension: 'overworld', x: 1.5, y: 64, z: -2 },
        amount: 0.5,
        cause: 'fall',
      },
      {
        _tag: 'BlockBroken',
        tick: 1,
        actor: 'player-1',
        address: {
          dimension: 'overworld',
          position: { x: 1, y: 64, z: -2 },
        },
        block: 1,
      },
      {
        _tag: 'Explosion',
        tick: 2,
        position: { dimension: 'nether', x: 0, y: 32, z: 0 },
        power: 6,
        source: 'creeper',
      },
      {
        _tag: 'LevelUp',
        tick: 3,
        entity: 'player-1',
        position: { dimension: 'overworld', x: 1, y: 64, z: -2 },
        level: 1,
      },
      {
        _tag: 'AchievementUnlocked',
        tick: 4,
        player: 'player-1',
        achievement: 'first_steps',
      },
      {
        _tag: 'BlockPlaced',
        tick: 5,
        actor: 'player-1',
        address: { dimension: 'overworld', position: { x: 1, y: 64, z: -2 } },
        block: 1,
      },
      {
        _tag: 'BlockChangedByWorld',
        tick: 6,
        address: { dimension: 'overworld', position: { x: 1, y: 64, z: -2 } },
        cause: 'weather',
      },
      {
        _tag: 'EntityDied',
        tick: 7,
        entity: 'zombie-1',
        kind: 'zombie',
        position: { dimension: 'overworld', x: 1.5, y: 64, z: -2 },
        cause: 'lightning',
      },
      {
        _tag: 'EntityHealed',
        tick: 8,
        entity: 'player-1',
        amount: 2.5,
        cause: 'regeneration',
      },
      {
        _tag: 'EntitySpawned',
        tick: 9,
        entity: 'cow-1',
        kind: 'cow',
        position: { dimension: 'overworld', x: 1.5, y: 64, z: -2 },
      },
      {
        _tag: 'EntityTeleported',
        tick: 10,
        entity: 'player-1',
        from: { dimension: 'overworld', x: 1.5, y: 64, z: -2 },
        to: { dimension: 'nether', x: 12, y: 64, z: 8 },
        cause: 'nether-portal',
      },
      {
        _tag: 'ItemDropped',
        tick: 11,
        droppedItem: 'dropped-item-1',
        item: 4,
        count: 2,
        position: { dimension: 'overworld', x: 1.5, y: 64, z: -2 },
      },
      {
        _tag: 'ItemPickedUp',
        tick: 12,
        actor: 'player-1',
        source: { _tag: 'DroppedItem', id: 'dropped-item-1' },
        item: 4,
        count: 1,
      },
      {
        _tag: 'ItemConsumed',
        tick: 13,
        actor: 'player-1',
        item: 4,
        count: 1,
        use: 'food',
      },
      {
        _tag: 'WeatherGameplayEffect',
        tick: 14,
        effect: {
          _tag: 'LightningStrike',
          position: { dimension: 'overworld', x: 1.5, y: 64, z: -2 },
        },
      },
      {
        _tag: 'ProjectileLaunched',
        tick: 15,
        projectile: 'arrow-1',
        shooter: 'player-1',
        origin: { dimension: 'overworld', x: 1.5, y: 64, z: -2 },
        initialVelocity: { x: 1, y: 0.5, z: 0 },
      },
      {
        _tag: 'ProjectileImpacted',
        tick: 16,
        projectile: 'arrow-1',
        position: { dimension: 'overworld', x: 2.5, y: 64, z: -2 },
        hit: {
          _tag: 'Block',
          address: { dimension: 'overworld', position: { x: 2, y: 64, z: -2 } },
        },
      },
      {
        _tag: 'ShieldBlocked',
        tick: 17,
        attacker: 'zombie-1',
        defender: 'player-1',
        position: { dimension: 'overworld', x: 1.5, y: 64, z: -2 },
        blockedAmount: 1.5,
      },
      {
        _tag: 'ExperienceCollected',
        tick: 18,
        player: 'player-1',
        orb: 'xp-orb-1',
        amount: 3,
      },
      {
        _tag: 'VehicleTransition',
        tick: 19,
        actor: 'player-1',
        vehicle: 'minecart-1',
        transition: 'mounted',
      },
    ]

    for (const event of events) {
      expect(Result.isSuccess(decodeDomainEvent(event))).toBe(true)
    }
  })

  it('rejects undeclared properties at the event and nested payload levels', () => {
    const blockPlaced = {
      _tag: 'BlockPlaced',
      tick: 5,
      actor: 'player-1',
      address: { dimension: 'overworld', position: { x: 1, y: 64, z: -2 } },
      block: 1,
    }

    expect(Result.isSuccess(decodeDomainEvent({ ...blockPlaced, extra: true }))).toBe(false)
    expect(
      Result.isSuccess(
        decodeDomainEvent({
          ...blockPlaced,
          address: { ...blockPlaced.address, extra: true },
        }),
      ),
    ).toBe(false)
  })

  it('requires the block field on BlockBroken', () => {
    expect(
      Result.isSuccess(
        decodeDomainEvent({
          _tag: 'BlockBroken',
          tick: 1,
          actor: 'player-1',
          address: { dimension: 'overworld', position: { x: 1, y: 64, z: -2 } },
        }),
      ),
    ).toBe(false)
  })

  it('requires the level field on LevelUp', () => {
    expect(
      Result.isSuccess(
        decodeDomainEvent({
          _tag: 'LevelUp',
          tick: 1,
          entity: 'player-1',
          position: { dimension: 'overworld', x: 1, y: 64, z: -2 },
        }),
      ),
    ).toBe(false)
  })

  it('requires the achievement field on AchievementUnlocked', () => {
    expect(
      Result.isSuccess(
        decodeDomainEvent({
          _tag: 'AchievementUnlocked',
          tick: 1,
          player: 'player-1',
        }),
      ),
    ).toBe(false)
  })

  it('rejects out-of-range block and item IDs in event payloads', () => {
    expect(
      Result.isSuccess(
        decodeDomainEvent({
          _tag: 'BlockPlaced',
          tick: 1,
          actor: 'player-1',
          address: { dimension: 'overworld', position: { x: 1, y: 64, z: -2 } },
          block: 65536,
        }),
      ),
    ).toBe(false)
    expect(
      Result.isSuccess(
        decodeDomainEvent({
          _tag: 'ItemDropped',
          tick: 1,
          droppedItem: 'dropped-item-1',
          item: 65536,
          count: 1,
          position: { dimension: 'overworld', x: 1, y: 64, z: -2 },
        }),
      ),
    ).toBe(false)
  })

  it('rejects NaN in an event world position', () => {
    expect(
      Result.isSuccess(
        decodeDomainEvent({
          _tag: 'EntityDied',
          tick: 1,
          entity: 'zombie-1',
          kind: 'zombie',
          position: { dimension: 'overworld', x: Number.NaN, y: 64, z: -2 },
          cause: 'fall',
        }),
      ),
    ).toBe(false)
  })

  it('requires damage causes and explosion sources', () => {
    expect(
      Result.isSuccess(
        decodeDomainEvent({
          _tag: 'EntityDamaged',
          tick: 0,
          entity: 'zombie',
          position: { dimension: 'overworld', x: 1.5, y: 64, z: -2 },
          amount: 0.5,
        }),
      ),
    ).toBe(false)
    expect(
      Result.isSuccess(
        decodeDomainEvent({
          _tag: 'Explosion',
          tick: 0,
          position: { dimension: 'nether', x: 0, y: 32, z: 0 },
          power: 6,
        }),
      ),
    ).toBe(false)
  })
})
