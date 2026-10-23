/**
 * Closed vocabularies for a player's rules of engagement: which `GameMode`
 * a player is in, and which `Difficulty` the world is running at.
 *
 * This module is deliberately data-only. Runtime validation lives in
 * `./game-mode-validation` so the table can be read without mixing it with
 * external-input handling (architecture.md §6, the same split as
 * `status-effect-data.ts` / `status-effect-validation.ts`).
 *
 * Per-mode and per-difficulty facts are verified against minecraft.wiki's
 * "Game mode" and "Difficulty" articles (Java Edition mechanics). Two
 * mechanics are deliberately excluded because they are not mode- or
 * difficulty-level facts: Adventure-mode block interaction gated by a
 * placed/held item's `can_break`/`can_place_on` data tags (an item-state
 * check, not a mode fact), and Elytra-granted flight in Survival/Adventure
 * (an equipment fact, not a mode fact) — `mayFly` here means unconditional,
 * mode-granted flight (Creative's double-jump toggle, Spectator's always-on
 * flight).
 */
import { Brand } from 'effect'

export const GAME_MODES = ['survival', 'creative', 'adventure', 'spectator'] as const

export type GameMode = (typeof GAME_MODES)[number]

export type GameModeProperties = Readonly<{
  readonly mode: GameMode
  readonly mayBreakBlocks: boolean
  readonly mayPlaceBlocks: boolean
  readonly mayFly: boolean
  readonly hasBlockCollision: boolean
  readonly takesDamage: boolean
  readonly consumesHunger: boolean
}>

export const GAME_MODE_PROPERTIES: Readonly<Record<GameMode, GameModeProperties>> = Object.freeze({
  survival: Object.freeze({
    mode: 'survival',
    mayBreakBlocks: true,
    mayPlaceBlocks: true,
    mayFly: false,
    hasBlockCollision: true,
    takesDamage: true,
    consumesHunger: true,
  }),
  creative: Object.freeze({
    mode: 'creative',
    mayBreakBlocks: true,
    mayPlaceBlocks: true,
    mayFly: true,
    hasBlockCollision: false,
    takesDamage: false,
    consumesHunger: false,
  }),
  adventure: Object.freeze({
    mode: 'adventure',
    mayBreakBlocks: false,
    mayPlaceBlocks: false,
    mayFly: false,
    hasBlockCollision: true,
    takesDamage: true,
    consumesHunger: true,
  }),
  spectator: Object.freeze({
    mode: 'spectator',
    mayBreakBlocks: false,
    mayPlaceBlocks: false,
    mayFly: true,
    hasBlockCollision: false,
    takesDamage: false,
    consumesHunger: false,
  }),
})

export const DIFFICULTIES = ['peaceful', 'easy', 'normal', 'hard'] as const

export type Difficulty = (typeof DIFFICULTIES)[number]

export type DifficultyDamageMultiplier = number & Brand.Brand<'DifficultyDamageMultiplier'>
export const DifficultyDamageMultiplier: Brand.Constructor<DifficultyDamageMultiplier> =
  Brand.make<DifficultyDamageMultiplier>((value) =>
    Number.isFinite(value) && value >= 0 && value <= 1.5
      ? true
      : `DifficultyDamageMultiplier must be between 0 and 1.5, received ${value}`,
  )

export type DifficultyHungerMultiplier = number & Brand.Brand<'DifficultyHungerMultiplier'>
export const DifficultyHungerMultiplier: Brand.Constructor<DifficultyHungerMultiplier> =
  Brand.make<DifficultyHungerMultiplier>((value) =>
    Number.isFinite(value) && value >= 0 && value <= 1
      ? true
      : `DifficultyHungerMultiplier must be between 0 and 1, received ${value}`,
  )

export type DifficultyProperties = Readonly<{
  readonly difficulty: Difficulty
  readonly hostileMobsMaySpawn: boolean
  /** Multiplier on Normal-difficulty mob damage (minecraft.wiki "Difficulty"). */
  readonly damageMultiplier: DifficultyDamageMultiplier
  /**
   * Whether the hunger bar depletes at all. Vanilla's exhaustion mechanic
   * runs at the same rate on Easy/Normal/Hard — only the consequence of an
   * empty bar differs (capped damage vs. lethal) — so every non-Peaceful
   * difficulty shares the same multiplier; Peaceful's bar never depletes.
   */
  readonly hungerMultiplier: DifficultyHungerMultiplier
}>

export const DIFFICULTY_PROPERTIES: Readonly<Record<Difficulty, DifficultyProperties>> = Object.freeze({
  peaceful: Object.freeze({
    difficulty: 'peaceful',
    hostileMobsMaySpawn: false,
    damageMultiplier: DifficultyDamageMultiplier(0),
    hungerMultiplier: DifficultyHungerMultiplier(0),
  }),
  easy: Object.freeze({
    difficulty: 'easy',
    hostileMobsMaySpawn: true,
    damageMultiplier: DifficultyDamageMultiplier(0.5),
    hungerMultiplier: DifficultyHungerMultiplier(1),
  }),
  normal: Object.freeze({
    difficulty: 'normal',
    hostileMobsMaySpawn: true,
    damageMultiplier: DifficultyDamageMultiplier(1),
    hungerMultiplier: DifficultyHungerMultiplier(1),
  }),
  hard: Object.freeze({
    difficulty: 'hard',
    hostileMobsMaySpawn: true,
    damageMultiplier: DifficultyDamageMultiplier(1.5),
    hungerMultiplier: DifficultyHungerMultiplier(1),
  }),
})
