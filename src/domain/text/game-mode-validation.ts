/**
 * Runtime validation for the game-mode and difficulty vocabularies.
 *
 * Keeping this module separate from the tables makes the accepted external
 * shape and the resolved domain data independently readable
 * (architecture.md §6).
 */
import {
  DIFFICULTIES,
  DIFFICULTY_PROPERTIES,
  GAME_MODES,
  GAME_MODE_PROPERTIES,
  type Difficulty,
  type DifficultyProperties,
  type GameMode,
  type GameModeProperties,
} from './game-mode-data.js'

const GAME_MODE_SET: ReadonlySet<string> = new Set(GAME_MODES)

const DIFFICULTY_SET: ReadonlySet<string> = new Set(DIFFICULTIES)

/**
 * Narrowing guard for values arriving from outside the type system (save
 * files, network frames, developer consoles).
 */
export const isGameMode = (value: unknown): value is GameMode =>
  typeof value === 'string' && GAME_MODE_SET.has(value)

/** Narrowing guard for a world's difficulty setting against the closed vocabulary. */
export const isDifficulty = (value: unknown): value is Difficulty =>
  typeof value === 'string' && DIFFICULTY_SET.has(value)

/** Validate untrusted input and resolve it to its game-mode table row, or throw. */
export const resolveGameModeProperties = (value: unknown): GameModeProperties => {
  if (!isGameMode(value)) {
    throw new TypeError(`unknown game mode ${String(value)}`)
  }
  return GAME_MODE_PROPERTIES[value]
}

/** Validate untrusted input and resolve it to its difficulty table row, or throw. */
export const resolveDifficultyProperties = (value: unknown): DifficultyProperties => {
  if (!isDifficulty(value)) {
    throw new TypeError(`unknown difficulty ${String(value)}`)
  }
  return DIFFICULTY_PROPERTIES[value]
}
