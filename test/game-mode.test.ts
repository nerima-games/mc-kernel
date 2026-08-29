import { describe, expect, it } from 'vitest'
import {
  DIFFICULTIES,
  DIFFICULTY_PROPERTIES,
  GAME_MODES,
  GAME_MODE_PROPERTIES,
  isDifficulty,
  isGameMode,
  resolveDifficultyProperties,
  resolveGameModeProperties,
} from '../src/domain/game-mode'

const UNKNOWN_MODE_NAME = 'hardcore'
const UNKNOWN_DIFFICULTY_NAME = 'nightmare'
const NON_STRING_VALUE = 42

describe('GAME_MODES', () => {
  it('is exactly the four Java Edition game modes, each unique', () => {
    expect(GAME_MODES).toEqual(['survival', 'creative', 'adventure', 'spectator'])
    expect(new Set(GAME_MODES).size).toBe(GAME_MODES.length)
  })
})

describe('DIFFICULTIES', () => {
  it('is exactly the four Java Edition difficulties, each unique', () => {
    expect(DIFFICULTIES).toEqual(['peaceful', 'easy', 'normal', 'hard'])
    expect(new Set(DIFFICULTIES).size).toBe(DIFFICULTIES.length)
  })
})

describe('GAME_MODE_PROPERTIES', () => {
  it('has exactly one row per mode, so a missing row cannot ship silently', () => {
    expect(Object.keys(GAME_MODE_PROPERTIES).sort()).toStrictEqual([...GAME_MODES].sort())
  })

  it('gives every mode a row whose own mode field matches the key', () => {
    for (const mode of GAME_MODES) {
      expect(GAME_MODE_PROPERTIES[mode].mode).toBe(mode)
    }
  })

  it('grants survival the ordinary in-world rules of engagement', () => {
    const survival = GAME_MODE_PROPERTIES.survival
    expect(survival.mayBreakBlocks).toBe(true)
    expect(survival.mayPlaceBlocks).toBe(true)
    expect(survival.mayFly).toBe(false)
    expect(survival.hasBlockCollision).toBe(true)
    expect(survival.takesDamage).toBe(true)
    expect(survival.consumesHunger).toBe(true)
  })

  it('grants creative unconditional flight and immunity from harm', () => {
    const creative = GAME_MODE_PROPERTIES.creative
    expect(creative.mayBreakBlocks).toBe(true)
    expect(creative.mayPlaceBlocks).toBe(true)
    expect(creative.mayFly).toBe(true)
    expect(creative.hasBlockCollision).toBe(false)
    expect(creative.takesDamage).toBe(false)
    expect(creative.consumesHunger).toBe(false)
  })

  it('denies adventure the ability to break or place blocks by default', () => {
    const adventure = GAME_MODE_PROPERTIES.adventure
    expect(adventure.mayBreakBlocks).toBe(false)
    expect(adventure.mayPlaceBlocks).toBe(false)
    expect(adventure.mayFly).toBe(false)
    expect(adventure.hasBlockCollision).toBe(true)
    expect(adventure.takesDamage).toBe(true)
    expect(adventure.consumesHunger).toBe(true)
  })

  it('gives spectator unconditional flight and no interaction or collision', () => {
    const spectator = GAME_MODE_PROPERTIES.spectator
    expect(spectator.mayBreakBlocks).toBe(false)
    expect(spectator.mayPlaceBlocks).toBe(false)
    expect(spectator.mayFly).toBe(true)
    expect(spectator.hasBlockCollision).toBe(false)
    expect(spectator.takesDamage).toBe(false)
    expect(spectator.consumesHunger).toBe(false)
  })

  it('carries no behaviour — a mode row is only flags and a name, never a callable', () => {
    for (const mode of GAME_MODES) {
      const definition = GAME_MODE_PROPERTIES[mode]
      for (const [key, value] of Object.entries(definition)) {
        expect(typeof value).not.toBe('function')
        if (key !== 'mode') {
          expect(typeof value).toBe('boolean')
        }
      }
    }
  })
})

describe('DIFFICULTY_PROPERTIES', () => {
  it('has exactly one row per difficulty, so a missing row cannot ship silently', () => {
    expect(Object.keys(DIFFICULTY_PROPERTIES).sort()).toStrictEqual([...DIFFICULTIES].sort())
  })

  it('gives every difficulty a row whose own difficulty field matches the key', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(DIFFICULTY_PROPERTIES[difficulty].difficulty).toBe(difficulty)
    }
  })

  it('bars hostile spawns and all damage/hunger loss on peaceful', () => {
    const peaceful = DIFFICULTY_PROPERTIES.peaceful
    expect(peaceful.hostileMobsMaySpawn).toBe(false)
    expect(peaceful.damageMultiplier).toBe(0)
    expect(peaceful.hungerMultiplier).toBe(0)
  })

  it('halves mob damage on easy relative to normal', () => {
    expect(DIFFICULTY_PROPERTIES.easy.hostileMobsMaySpawn).toBe(true)
    expect(DIFFICULTY_PROPERTIES.easy.damageMultiplier).toBe(0.5)
    expect(DIFFICULTY_PROPERTIES.easy.hungerMultiplier).toBe(1)
  })

  it('applies the unscaled baseline on normal', () => {
    expect(DIFFICULTY_PROPERTIES.normal.hostileMobsMaySpawn).toBe(true)
    expect(DIFFICULTY_PROPERTIES.normal.damageMultiplier).toBe(1)
    expect(DIFFICULTY_PROPERTIES.normal.hungerMultiplier).toBe(1)
  })

  it('multiplies mob damage 1.5x on hard relative to normal', () => {
    expect(DIFFICULTY_PROPERTIES.hard.hostileMobsMaySpawn).toBe(true)
    expect(DIFFICULTY_PROPERTIES.hard.damageMultiplier).toBe(1.5)
    expect(DIFFICULTY_PROPERTIES.hard.hungerMultiplier).toBe(1)
  })

  it('carries no behaviour — a difficulty row is only flags, numbers and a name, never a callable', () => {
    for (const difficulty of DIFFICULTIES) {
      const definition = DIFFICULTY_PROPERTIES[difficulty]
      for (const [key, value] of Object.entries(definition)) {
        expect(typeof value).not.toBe('function')
        if (key === 'hostileMobsMaySpawn') {
          expect(typeof value).toBe('boolean')
        } else if (key !== 'difficulty') {
          expect(typeof value).toBe('number')
        }
      }
    }
  })
})

describe('isGameMode', () => {
  it('accepts every vocabulary member', () => {
    for (const mode of GAME_MODES) {
      expect(isGameMode(mode)).toBe(true)
    }
  })

  it('rejects unknown strings and non-strings', () => {
    expect(isGameMode(UNKNOWN_MODE_NAME)).toBe(false)
    expect(isGameMode('')).toBe(false)
    expect(isGameMode(NON_STRING_VALUE)).toBe(false)
    expect(isGameMode(undefined)).toBe(false)
    expect(isGameMode(null)).toBe(false)
  })
})

describe('isDifficulty', () => {
  it('accepts every vocabulary member', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(isDifficulty(difficulty)).toBe(true)
    }
  })

  it('rejects unknown strings and non-strings', () => {
    expect(isDifficulty(UNKNOWN_DIFFICULTY_NAME)).toBe(false)
    expect(isDifficulty('')).toBe(false)
    expect(isDifficulty(NON_STRING_VALUE)).toBe(false)
    expect(isDifficulty(undefined)).toBe(false)
    expect(isDifficulty(null)).toBe(false)
  })
})

describe('resolveGameModeProperties', () => {
  it('resolves a valid mode to its table row', () => {
    expect(resolveGameModeProperties('creative')).toBe(GAME_MODE_PROPERTIES.creative)
  })

  it('throws on an unrecognised value', () => {
    expect(() => resolveGameModeProperties(UNKNOWN_MODE_NAME)).toThrow(TypeError)
    expect(() => resolveGameModeProperties(NON_STRING_VALUE)).toThrow(TypeError)
  })
})

describe('resolveDifficultyProperties', () => {
  it('resolves a valid difficulty to its table row', () => {
    expect(resolveDifficultyProperties('hard')).toBe(DIFFICULTY_PROPERTIES.hard)
  })

  it('throws on an unrecognised value', () => {
    expect(() => resolveDifficultyProperties(UNKNOWN_DIFFICULTY_NAME)).toThrow(TypeError)
    expect(() => resolveDifficultyProperties(NON_STRING_VALUE)).toThrow(TypeError)
  })
})
