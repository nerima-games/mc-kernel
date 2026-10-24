/**
 * Runtime validation for the damage-type vocabulary.
 *
 * Keeping this module separate from the table makes the accepted external
 * shape and the resolved domain data independently readable
 * (architecture.md §6).
 */
import { Result } from 'effect'
import {
  DAMAGE_TYPE_DEFINITIONS,
  DAMAGE_TYPE_NAMES,
  damageTypeId,
  type DamageTypeDefinition,
  type DamageTypeName,
} from './damage-type-data.js'
import type { ResourceLocation } from '../text/identifiers.js'

const DAMAGE_TYPE_NAME_SET: ReadonlySet<string> = new Set(DAMAGE_TYPE_NAMES)

const DAMAGE_TYPE_ID_SET: ReadonlySet<string> = new Set(
  DAMAGE_TYPE_NAMES.map((name) => damageTypeId(name)),
)

/**
 * Narrowing guard for values arriving from outside the type system (save
 * files, network frames, developer consoles).
 */
export const isDamageTypeName = (value: unknown): value is DamageTypeName =>
  typeof value === 'string' && DAMAGE_TYPE_NAME_SET.has(value)

/**
 * Narrowing guard for a namespaced damage type id (e.g. an item component's
 * `DamageTypeComponent`) against the closed vocabulary.
 */
export const isDamageTypeId = (value: unknown): value is ResourceLocation =>
  typeof value === 'string' && DAMAGE_TYPE_ID_SET.has(value)

export type DamageTypeDefinitionFailure = Readonly<{
  readonly _tag: 'UnknownDamageType'
  readonly value: unknown
}>

/** Validate untrusted input and resolve it to its table row. */
export const resolveDamageTypeDefinition = (
  value: unknown,
): Result.Result<DamageTypeDefinition, DamageTypeDefinitionFailure> => {
  if (!isDamageTypeName(value)) {
    return Result.fail({ _tag: 'UnknownDamageType', value })
  }
  return Result.succeed(DAMAGE_TYPE_DEFINITIONS[value])
}
