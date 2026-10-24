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
    ]

    for (const event of events) {
      expect(Result.isSuccess(decodeDomainEvent(event))).toBe(true)
    }
  })
})
