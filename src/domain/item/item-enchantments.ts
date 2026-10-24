/** Constructors and guards for current Java item enchantment components. */
import { Result } from 'effect'
import { MAX_GENERIC_INPUT_ENTRIES, snapshotInputEntries } from '../../input-snapshot.js'
import { ResourceLocation } from '../text/identifiers.js'
import {
  isEnchantmentLevelMap,
  isEnchantmentsComponent,
  isStoredEnchantmentsComponent,
} from './item-enchantments-validation.js'
import type {
  EnchantmentLevelMap,
  EnchantmentsComponent,
  StoredEnchantmentsComponent,
} from './item-enchantments-data.js'
import { EnchantmentLevel } from '../time/quantities.js'
import { itemValidationFailure, type ItemValidationFailure } from './item-failure.js'

export type EnchantmentLevelMapOptions = Readonly<Record<string, number>>

const validateLevel = (value: unknown, name: string): Result.Result<EnchantmentLevel, ItemValidationFailure> => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return Result.fail(itemValidationFailure(name, `${name} must be a finite number`, 'invalid-type', value))
  }
  return Result.mapError(
    EnchantmentLevel.result(value),
    () => itemValidationFailure(name, `${name} must be a safe integer in [0, 255]`, 'out-of-range', value),
  )
}

const enchantmentLevelMapOf = (
  options: EnchantmentLevelMapOptions,
  name: string,
): Result.Result<EnchantmentLevelMap, ItemValidationFailure> => {
  const decodedEntries = snapshotInputEntries(options, MAX_GENERIC_INPUT_ENTRIES)
  if (Result.isFailure(decodedEntries)) {
    const invalidType = decodedEntries.failure.reason === 'invalid-container' || decodedEntries.failure.reason === 'unsupported-prototype'
    const tooLarge = decodedEntries.failure.reason === 'too-large'
    return Result.fail(itemValidationFailure(
      'options',
      invalidType ? `${name} options must be a non-null object` : tooLarge ? `${name} options exceed the maximum size` : `${name} options could not be inspected`,
      invalidType ? 'invalid-type' : tooLarge ? 'out-of-range' : 'hostile-input',
      options,
    ))
  }
  const normalized: Record<string, EnchantmentLevel> = {}
  for (const [id, level] of decodedEntries.success) {
    if (!ResourceLocation.is(id)) {
      return Result.fail(itemValidationFailure(id, `${name} keys must be valid resource locations: ${id}`, 'invalid-value', id))
    }
    const checkedLevel = validateLevel(level, `${name}[${id}]`)
    if (Result.isFailure(checkedLevel)) return Result.fail(checkedLevel.failure)
    normalized[id] = checkedLevel.success
  }
  return Result.succeed(Object.freeze(normalized))
}

export const enchantmentsComponent = (
  options: EnchantmentLevelMapOptions = {},
): Result.Result<EnchantmentsComponent, ItemValidationFailure> => enchantmentLevelMapOf(options, 'enchantments')

export const storedEnchantmentsComponent = (
  options: EnchantmentLevelMapOptions = {},
): Result.Result<StoredEnchantmentsComponent, ItemValidationFailure> => enchantmentLevelMapOf(options, 'stored_enchantments')

export {
  isEnchantmentLevelMap,
  isEnchantmentsComponent,
  isStoredEnchantmentsComponent,
}
export type {
  EnchantmentLevelMap,
  EnchantmentsComponent,
  StoredEnchantmentsComponent,
} from './item-enchantments-data.js'
