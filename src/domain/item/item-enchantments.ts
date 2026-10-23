/** Constructors and guards for current Java item enchantment components. */
import { Effect, Result } from 'effect'
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

const validateOptionsObject = (value: unknown, name: string): Result.Result<void, ItemValidationFailure> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return Result.fail(itemValidationFailure('options', `${name} must be a non-null object`, 'invalid-type', value))
  }
  return Result.succeed(undefined)
}

const validateLevel = (value: unknown, name: string): Result.Result<number, ItemValidationFailure> => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return Result.fail(itemValidationFailure(name, `${name} must be a finite number`, 'invalid-type', value))
  }
  if (!EnchantmentLevel.is(value)) {
    return Result.fail(itemValidationFailure(name, `${name} must be a safe integer in [0, 255]`, 'out-of-range', value))
  }
  return Result.succeed(value)
}

const enchantmentLevelMapOf = (
  options: EnchantmentLevelMapOptions,
  name: string,
): Result.Result<EnchantmentLevelMap, ItemValidationFailure> => {
  const validObject = validateOptionsObject(options, `${name} options`)
  if (Result.isFailure(validObject)) return Result.fail(validObject.failure)
  const decodedEntries = Effect.runSync(Effect.result(Effect.try({
    try: () => Object.entries(options),
    catch: () => itemValidationFailure('options', `${name} options could not be inspected`, 'hostile-input', options),
  })))
  if (Result.isFailure(decodedEntries)) return Result.fail(decodedEntries.failure)
  const normalized: Record<string, EnchantmentLevel> = {}
  for (const [id, level] of decodedEntries.success) {
    if (!ResourceLocation.is(id)) {
      return Result.fail(itemValidationFailure(id, `${name} keys must be valid resource locations: ${id}`, 'invalid-value', id))
    }
    const checkedLevel = validateLevel(level, `${name}[${id}]`)
    if (Result.isFailure(checkedLevel)) return Result.fail(checkedLevel.failure)
    const brandedLevel = Result.mapError(
      EnchantmentLevel.result(checkedLevel.success),
      () => itemValidationFailure(`${name}[${id}]`, `${name}[${id}] must be a safe integer in [0, 255]`, 'out-of-range', level),
    )
    if (Result.isFailure(brandedLevel)) return Result.fail(brandedLevel.failure)
    normalized[id] = brandedLevel.success
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
