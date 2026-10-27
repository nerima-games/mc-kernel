import { Result, Schema } from 'effect'
import { describe, expect, it } from 'vitest'
import { DomainEventSchema } from '../src/domain/event/domain-event.js'

const decodeDomainEvent = Schema.decodeUnknownResult(DomainEventSchema)
const position = { dimension: 'overworld', x: 1, y: 64, z: -2 } as const

describe('projectile and gameplay domain events', () => {
  it('accepts all WeatherGameplayEffect variants and rejects an unknown variant', () => {
    const events: ReadonlyArray<unknown> = [
      {
        _tag: 'WeatherGameplayEffect',
        tick: 1,
        effect: { _tag: 'LightningStrike', position },
      },
      {
        _tag: 'WeatherGameplayEffect',
        tick: 1,
        effect: { _tag: 'CreeperCharged', entity: 'creeper-1' },
      },
      {
        _tag: 'WeatherGameplayEffect',
        tick: 1,
        effect: { _tag: 'EntityTransformed', entity: 'mob-1', kind: 'creeper' },
      },
    ]

    for (const event of events) {
      expect(Result.isSuccess(decodeDomainEvent(event))).toBe(true)
    }
    expect(
      Result.isSuccess(
        decodeDomainEvent({
          _tag: 'WeatherGameplayEffect',
          tick: 1,
          effect: { _tag: 'Blizzard', entity: 'mob-1' },
        }),
      ),
    ).toBe(false)
  })

  it('rejects WeatherGameplayEffect without its required effect', () => {
    expect(
      Result.isSuccess(decodeDomainEvent({ _tag: 'WeatherGameplayEffect', tick: 1 })),
    ).toBe(false)
  })

  it('rejects WeatherGameplayEffect with an empty EntityId', () => {
    expect(
      Result.isSuccess(
        decodeDomainEvent({
          _tag: 'WeatherGameplayEffect',
          tick: 1,
          effect: { _tag: 'CreeperCharged', entity: '' },
        }),
      ),
    ).toBe(false)
  })

  it('accepts ProjectileLaunched with a world position and finite initial velocity', () => {
    expect(
      Result.isSuccess(
        decodeDomainEvent({
          _tag: 'ProjectileLaunched',
          tick: 2,
          projectile: 'arrow-1',
          shooter: 'player-1',
          origin: position,
          initialVelocity: { x: 0, y: 1.5, z: -0.5 },
        }),
      ),
    ).toBe(true)
  })

  it('rejects ProjectileLaunched without its required shooter', () => {
    expect(
      Result.isSuccess(
        decodeDomainEvent({
          _tag: 'ProjectileLaunched',
          tick: 2,
          projectile: 'arrow-1',
          origin: position,
          initialVelocity: { x: 0, y: 1, z: 0 },
        }),
      ),
    ).toBe(false)
  })

  it('rejects ProjectileLaunched with an empty ProjectileId', () => {
    expect(
      Result.isSuccess(
        decodeDomainEvent({
          _tag: 'ProjectileLaunched',
          tick: 2,
          projectile: '',
          shooter: 'player-1',
          origin: position,
          initialVelocity: { x: 0, y: 1, z: 0 },
        }),
      ),
    ).toBe(false)
  })

  it('accepts ProjectileImpacted with block and entity hit variants', () => {
    const common = {
      _tag: 'ProjectileImpacted',
      tick: 3,
      projectile: 'arrow-1',
      position,
    }
    expect(
      Result.isSuccess(
        decodeDomainEvent({
          ...common,
          hit: {
            _tag: 'Block',
            address: {
              dimension: 'overworld',
              position: { x: 1, y: 64, z: -2 },
            },
          },
        }),
      ),
    ).toBe(true)
    expect(
      Result.isSuccess(
        decodeDomainEvent({ ...common, hit: { _tag: 'Entity', entity: 'skeleton-1' } }),
      ),
    ).toBe(true)
  })

  it('rejects ProjectileImpacted without its required hit', () => {
    expect(
      Result.isSuccess(
        decodeDomainEvent({
          _tag: 'ProjectileImpacted',
          tick: 3,
          projectile: 'arrow-1',
          position,
        }),
      ),
    ).toBe(false)
  })

  it('rejects ProjectileImpacted with an empty ProjectileId', () => {
    expect(
      Result.isSuccess(
        decodeDomainEvent({
          _tag: 'ProjectileImpacted',
          tick: 3,
          projectile: '',
          position,
          hit: { _tag: 'Entity', entity: 'skeleton-1' },
        }),
      ),
    ).toBe(false)
  })

  it('accepts ShieldBlocked with attacker omitted or supplied', () => {
    const withoutAttacker = {
      _tag: 'ShieldBlocked',
      tick: 4,
      defender: 'player-1',
      position,
      blockedAmount: 2,
    }
    expect(Result.isSuccess(decodeDomainEvent(withoutAttacker))).toBe(true)
    expect(
      Result.isSuccess(decodeDomainEvent({ ...withoutAttacker, attacker: 'zombie-1' })),
    ).toBe(true)
  })

  it('rejects ShieldBlocked without its required defender', () => {
    expect(
      Result.isSuccess(
        decodeDomainEvent({
          _tag: 'ShieldBlocked',
          tick: 4,
          position,
          blockedAmount: 2,
        }),
      ),
    ).toBe(false)
  })

  it('rejects ShieldBlocked with an invalid DamageAmount', () => {
    expect(
      Result.isSuccess(
        decodeDomainEvent({
          _tag: 'ShieldBlocked',
          tick: 4,
          defender: 'player-1',
          position,
          blockedAmount: 0,
        }),
      ),
    ).toBe(false)
  })

  it('accepts ExperienceCollected with an integer amount', () => {
    expect(
      Result.isSuccess(
        decodeDomainEvent({
          _tag: 'ExperienceCollected',
          tick: 5,
          player: 'player-1',
          orb: 'orb-1',
          amount: 7,
        }),
      ),
    ).toBe(true)
  })

  it('rejects ExperienceCollected without its required amount', () => {
    expect(
      Result.isSuccess(
        decodeDomainEvent({
          _tag: 'ExperienceCollected',
          tick: 5,
          player: 'player-1',
          orb: 'orb-1',
        }),
      ),
    ).toBe(false)
  })

  it('rejects ExperienceCollected with a non-integer ExperienceAmount', () => {
    expect(
      Result.isSuccess(
        decodeDomainEvent({
          _tag: 'ExperienceCollected',
          tick: 5,
          player: 'player-1',
          orb: 'orb-1',
          amount: 1.5,
        }),
      ),
    ).toBe(false)
  })

  it('accepts VehicleTransition with exitReason omitted or a declared reason', () => {
    const mounted = {
      _tag: 'VehicleTransition',
      tick: 6,
      actor: 'player-1',
      vehicle: 'boat-1',
      transition: 'mounted',
    }
    expect(Result.isSuccess(decodeDomainEvent(mounted))).toBe(true)

    for (const exitReason of ['requested', 'collision', 'destroyed']) {
      expect(
        Result.isSuccess(
          decodeDomainEvent({
            ...mounted,
            transition: 'exited',
            exitReason,
          }),
        ),
      ).toBe(true)
    }
    expect(
      Result.isSuccess(
        decodeDomainEvent({ ...mounted, transition: 'exited' }),
      ),
    ).toBe(true)
  })

  it('rejects exitReason when a vehicle transition is mounted', () => {
    expect(
      Result.isSuccess(
        decodeDomainEvent({
          _tag: 'VehicleTransition',
          tick: 6,
          actor: 'player-1',
          vehicle: 'boat-1',
          transition: 'mounted',
          exitReason: 'requested',
        }),
      ),
    ).toBe(false)
  })

  it('rejects VehicleTransition without its required vehicle', () => {
    expect(
      Result.isSuccess(
        decodeDomainEvent({
          _tag: 'VehicleTransition',
          tick: 6,
          actor: 'player-1',
          transition: 'mounted',
        }),
      ),
    ).toBe(false)
  })

  it('rejects VehicleTransition with an empty VehicleId', () => {
    expect(
      Result.isSuccess(
        decodeDomainEvent({
          _tag: 'VehicleTransition',
          tick: 6,
          actor: 'player-1',
          vehicle: '',
          transition: 'mounted',
        }),
      ),
    ).toBe(false)
  })
})
