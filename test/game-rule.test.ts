import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GAME_RULES,
  GAME_RULE_BOOLEAN_NAMES,
  GAME_RULE_INTEGER_NAMES,
  MAX_ENTITY_CRAMMING_MIN,
  PLAYERS_SLEEPING_PERCENTAGE_MAX,
  RANDOM_TICK_SPEED_MAX,
  SPAWN_RADIUS_MAX,
  SPAWN_RADIUS_MIN,
  applyGameRules,
  isValidGameRules,
  normaliseGameRules,
  type GameRules,
} from '../src/domain/game-rule'

describe('GAME_RULE_BOOLEAN_NAMES', () => {
  it('lists exactly the boolean gamerules a simulation branches on, each unique', () => {
    expect(GAME_RULE_BOOLEAN_NAMES).toEqual([
      'doDaylightCycle',
      'doWeatherCycle',
      'doMobSpawning',
      'mobGriefing',
      'keepInventory',
      'doFireTick',
      'doInsomnia',
      'naturalRegeneration',
      'doImmediateRespawn',
      'fallDamage',
      'fireDamage',
      'drowningDamage',
      'freezeDamage',
    ])
    expect(new Set(GAME_RULE_BOOLEAN_NAMES).size).toBe(GAME_RULE_BOOLEAN_NAMES.length)
  })
})

describe('GAME_RULE_INTEGER_NAMES', () => {
  it('lists exactly the integer gamerules a simulation branches on, each unique', () => {
    expect(GAME_RULE_INTEGER_NAMES).toEqual([
      'randomTickSpeed',
      'maxEntityCramming',
      'playersSleepingPercentage',
      'spawnRadius',
    ])
    expect(new Set(GAME_RULE_INTEGER_NAMES).size).toBe(GAME_RULE_INTEGER_NAMES.length)
  })
})

describe('DEFAULT_GAME_RULES', () => {
  it('matches the vanilla default for every covered rule', () => {
    expect(DEFAULT_GAME_RULES).toEqual({
      doDaylightCycle: true,
      doWeatherCycle: true,
      doMobSpawning: true,
      mobGriefing: true,
      keepInventory: false,
      doFireTick: true,
      doInsomnia: true,
      naturalRegeneration: true,
      doImmediateRespawn: false,
      fallDamage: true,
      fireDamage: true,
      drowningDamage: true,
      freezeDamage: true,
      randomTickSpeed: 3,
      maxEntityCramming: 24,
      playersSleepingPercentage: 100,
      spawnRadius: 10,
    })
    expect(isValidGameRules(DEFAULT_GAME_RULES)).toBe(true)
  })
})

describe('normaliseGameRules', () => {
  it('falls back to defaults for null, an array, and an empty object', () => {
    expect(normaliseGameRules(null)).toEqual(DEFAULT_GAME_RULES)
    expect(normaliseGameRules([])).toEqual(DEFAULT_GAME_RULES)
    expect(normaliseGameRules({})).toEqual(DEFAULT_GAME_RULES)
  })

  it('falls back to defaults field-by-field for wrong-typed values', () => {
    expect(
      normaliseGameRules({
        doDaylightCycle: 'true',
        keepInventory: 1,
        randomTickSpeed: '3',
        maxEntityCramming: Number.NaN,
        playersSleepingPercentage: Number.NEGATIVE_INFINITY,
        spawnRadius: undefined,
      }),
    ).toEqual(DEFAULT_GAME_RULES)
  })

  it('defaults an integer rule on positive infinity instead of clamping to its maximum', () => {
    // playersSleepingPercentage's default (100) equals its maximum, so it cannot
    // distinguish "defaulted" from "clamped-to-max" here; randomTickSpeed's
    // default (3) and maximum (4096) differ, so this assertion actually fails
    // if normaliseInteger ever starts clamping non-finite input like settings.ts does.
    expect(normaliseGameRules({ randomTickSpeed: Number.POSITIVE_INFINITY }).randomTickSpeed).toBe(
      DEFAULT_GAME_RULES.randomTickSpeed,
    )
  })

  it('defaults an integer rule on negative infinity instead of clamping to its minimum', () => {
    // playersSleepingPercentage's default (100) differs from its minimum (0),
    // so this distinguishes "defaulted" from "clamped-to-min".
    expect(normaliseGameRules({ playersSleepingPercentage: Number.NEGATIVE_INFINITY }).playersSleepingPercentage).toBe(
      DEFAULT_GAME_RULES.playersSleepingPercentage,
    )
  })

  it('clamps out-of-range integers to the kernel-chosen bounds', () => {
    const normalised = normaliseGameRules({
      randomTickSpeed: RANDOM_TICK_SPEED_MAX + 1000,
      maxEntityCramming: MAX_ENTITY_CRAMMING_MIN - 1,
      playersSleepingPercentage: PLAYERS_SLEEPING_PERCENTAGE_MAX + 50,
      spawnRadius: SPAWN_RADIUS_MIN - 5,
    })
    expect(normalised.randomTickSpeed).toBe(RANDOM_TICK_SPEED_MAX)
    expect(normalised.maxEntityCramming).toBe(MAX_ENTITY_CRAMMING_MIN)
    expect(normalised.playersSleepingPercentage).toBe(PLAYERS_SLEEPING_PERCENTAGE_MAX)
    expect(normalised.spawnRadius).toBe(SPAWN_RADIUS_MIN)
  })

  it('truncates a fractional in-range integer rather than rounding', () => {
    expect(normaliseGameRules({ randomTickSpeed: 3.9 }).randomTickSpeed).toBe(3)
  })

  it('preserves every field of a fully valid, in-range input', () => {
    const custom: GameRules = {
      doDaylightCycle: false,
      doWeatherCycle: false,
      doMobSpawning: false,
      mobGriefing: false,
      keepInventory: true,
      doFireTick: false,
      doInsomnia: false,
      naturalRegeneration: false,
      doImmediateRespawn: true,
      fallDamage: false,
      fireDamage: false,
      drowningDamage: false,
      freezeDamage: false,
      randomTickSpeed: 10,
      maxEntityCramming: 1,
      playersSleepingPercentage: 50,
      spawnRadius: 4,
    }
    expect(normaliseGameRules(custom)).toEqual(custom)
  })
})

describe('applyGameRules', () => {
  it('merges a partial patch onto the current rules immutably', () => {
    const current = DEFAULT_GAME_RULES
    const patched = applyGameRules(current, { keepInventory: true, randomTickSpeed: 20 })

    expect(patched).not.toBe(current)
    expect(patched.keepInventory).toBe(true)
    expect(patched.randomTickSpeed).toBe(20)
    expect(patched.doDaylightCycle).toBe(current.doDaylightCycle)
    expect(current.keepInventory).toBe(false)
  })

  it('normalises an out-of-range value introduced by the patch', () => {
    const patched = applyGameRules(DEFAULT_GAME_RULES, { spawnRadius: SPAWN_RADIUS_MAX + 100 })
    expect(patched.spawnRadius).toBe(SPAWN_RADIUS_MAX)
  })
})

describe('prototype-pollution safety', () => {
  // Written as an object literal, `{ __proto__: { polluted: true } }` would itself
  // trigger the prototype setter at construction time. JSON.parse instead defines
  // `__proto__` as a plain own data property, so this delivers the attack input
  // these regressions need without the test fixture polluting anything itself.
  const maliciousInput = () => JSON.parse('{"__proto__":{"polluted":true}}')

  it('normaliseGameRules ignores a malicious own __proto__ key: no polluted own property, no hijacked prototype', () => {
    const result = normaliseGameRules(maliciousInput())

    expect(Object.prototype.hasOwnProperty.call(result, 'polluted')).toBe(false)
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype)

    const empty: Record<string, unknown> = {}
    expect(empty['polluted']).toBeUndefined()
  })

  it('applyGameRules ignores a malicious own __proto__ key in the patch argument: no polluted own property, no hijacked prototype', () => {
    const patch = maliciousInput()
    const result = applyGameRules(DEFAULT_GAME_RULES, patch)

    expect(Object.prototype.hasOwnProperty.call(result, 'polluted')).toBe(false)
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype)

    const empty: Record<string, unknown> = {}
    expect(empty['polluted']).toBeUndefined()
  })
})

describe('isValidGameRules', () => {
  it('accepts the defaults', () => {
    expect(isValidGameRules(DEFAULT_GAME_RULES)).toBe(true)
  })

  it('rejects non-record input', () => {
    expect(isValidGameRules(null)).toBe(false)
    expect(isValidGameRules([])).toBe(false)
    expect(isValidGameRules(undefined)).toBe(false)
    expect(isValidGameRules('rules')).toBe(false)
  })

  it('rejects a wrong-typed boolean rule', () => {
    expect(isValidGameRules({ ...DEFAULT_GAME_RULES, mobGriefing: 'true' })).toBe(false)
  })

  it('rejects a non-numeric integer rule', () => {
    expect(isValidGameRules({ ...DEFAULT_GAME_RULES, randomTickSpeed: '3' })).toBe(false)
  })

  it('rejects a non-integer numeric rule', () => {
    expect(isValidGameRules({ ...DEFAULT_GAME_RULES, randomTickSpeed: 3.5 })).toBe(false)
  })

  it('rejects an integer rule below its minimum', () => {
    expect(isValidGameRules({ ...DEFAULT_GAME_RULES, maxEntityCramming: MAX_ENTITY_CRAMMING_MIN - 1 })).toBe(false)
  })

  it('rejects an integer rule above its maximum', () => {
    expect(
      isValidGameRules({ ...DEFAULT_GAME_RULES, playersSleepingPercentage: PLAYERS_SLEEPING_PERCENTAGE_MAX + 1 }),
    ).toBe(false)
  })
})
