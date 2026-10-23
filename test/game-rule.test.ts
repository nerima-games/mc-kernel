import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GAME_RULES,
  GAME_RULE_BOOLEAN_NAMES,
  GAME_RULE_INTEGER_NAMES,
} from '../src/domain/text/game-rule-data'

describe('game-rule data', () => {
  it('lists the boolean and integer rules', () => {
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
    expect(GAME_RULE_INTEGER_NAMES).toEqual([
      'randomTickSpeed',
      'maxEntityCramming',
      'playersSleepingPercentage',
      'spawnRadius',
    ])
    expect(new Set(GAME_RULE_INTEGER_NAMES).size).toBe(GAME_RULE_INTEGER_NAMES.length)
  })

  it('publishes the vanilla default for every covered rule', () => {
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
  })
})
