/**
 * Runtime validation for the status-effect vocabulary.
 *
 * Keeping this module separate from the table makes the accepted external
 * shape and the resolved domain data independently readable
 * (architecture.md §6).
 */
import { Result } from 'effect'
import {
  STATUS_EFFECT_DEFINITIONS,
  STATUS_EFFECT_NAMES,
  statusEffectId,
  type StatusEffectDefinition,
  type StatusEffectName,
} from './status-effect-data.js'
import type { ResourceLocation } from '../text/identifiers.js'

const STATUS_EFFECT_NAME_SET: ReadonlySet<string> = new Set(STATUS_EFFECT_NAMES)

const STATUS_EFFECT_ID_SET: ReadonlySet<string> = new Set(
  STATUS_EFFECT_NAMES.map((name) => statusEffectId(name)),
)

/**
 * Narrowing guard for values arriving from outside the type system (save
 * files, network frames, developer consoles).
 */
export const isStatusEffectName = (value: unknown): value is StatusEffectName =>
  typeof value === 'string' && STATUS_EFFECT_NAME_SET.has(value)

/**
 * Narrowing guard for a namespaced effect id (e.g. an item component's
 * `PotionEffectInstanceComponent.id`) against the closed vocabulary.
 */
export const isStatusEffectId = (value: unknown): value is ResourceLocation =>
  typeof value === 'string' && STATUS_EFFECT_ID_SET.has(value)

export type StatusEffectDefinitionFailure = Readonly<{
  readonly _tag: 'UnknownStatusEffect'
  readonly value: unknown
}>

/** Validate untrusted input and resolve it to its table row. */
export const resolveStatusEffectDefinition = (
  value: unknown,
): Result.Result<StatusEffectDefinition, StatusEffectDefinitionFailure> => {
  if (!isStatusEffectName(value)) {
    return Result.fail({ _tag: 'UnknownStatusEffect', value })
  }
  return Result.succeed(STATUS_EFFECT_DEFINITIONS[value])
}
