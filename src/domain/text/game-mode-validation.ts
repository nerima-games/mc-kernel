/**
 * Runtime validation for the game-mode and difficulty vocabularies.
 *
 * Keeping this module separate from the tables makes the accepted external
 * shape and the resolved domain data independently readable
 * (architecture.md §6).
 */
import { Result } from 'effect'
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

export type GameModeValidationFailure = Readonly<{
  readonly _tag: 'GameModeValidationFailure'
  readonly kind: 'TypeError'
  readonly reason: 'unknown-game-mode' | 'unknown-difficulty'
  readonly field: 'gameMode' | 'difficulty'
  readonly message: string
  readonly value?: unknown
}>

const failure = (
  reason: GameModeValidationFailure['reason'],
  field: GameModeValidationFailure['field'],
  message: string,
  value: unknown,
): GameModeValidationFailure => ({
  _tag: 'GameModeValidationFailure',
  kind: 'TypeError',
  reason,
  field,
  message,
  ...(value === undefined ? {} : { value }),
})

/** Validate untrusted input and resolve it to its game-mode table row. */
export const resolveGameModeProperties = (
  value: unknown,
): Result.Result<GameModeProperties, GameModeValidationFailure> => {
  if (!isGameMode(value)) {
    return Result.fail(failure('unknown-game-mode', 'gameMode', `unknown game mode ${String(value)}`, value))
  }
  return Result.succeed(GAME_MODE_PROPERTIES[value])
}

/** Validate untrusted input and resolve it to its difficulty table row. */
export const resolveDifficultyProperties = (
  value: unknown,
): Result.Result<DifficultyProperties, GameModeValidationFailure> => {
  if (!isDifficulty(value)) {
    return Result.fail(failure('unknown-difficulty', 'difficulty', `unknown difficulty ${String(value)}`, value))
  }
  return Result.succeed(DIFFICULTY_PROPERTIES[value])
}
