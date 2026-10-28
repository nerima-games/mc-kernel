/** Constructors and guards for Java item defense components. */
import { Result } from 'effect'
import { ResourceLocation, TagLocation } from '../text/identifiers.js'
import type {
  BlocksAttacksComponent,
  DamageReductionRule,
  DamageResistantComponent,
  ItemDamageRule,
} from './item-defense-data.js'
import {
  BlockingDelaySeconds,
  DamageReductionBase,
  DamageReductionFactor,
  DisableCooldownScale,
  HorizontalBlockingAngle,
  ItemDamageBase,
  ItemDamageFactor,
  ItemDamageThreshold,
} from '../time/quantities.js'
import type {
  ResourceLocationProvider,
  ResourceLocationProviderInput,
} from './item-component-values-data.js'
import { itemValidationFailure, type ItemValidationFailure } from './item-failure.js'
import {
  MAX_GENERIC_INPUT_ARRAY_LENGTH,
  snapshotInputArray,
  snapshotInputRecord,
} from '../../input-snapshot.js'

export type DamageReductionOptions = Readonly<{
  readonly type?: ResourceLocationProviderInput
  readonly base: DamageReductionRule['base']
  readonly factor: DamageReductionRule['factor']
  readonly horizontalBlockingAngle?: DamageReductionRule['horizontalBlockingAngle']
}>

export type ItemDamageRuleOptions = Readonly<{
  readonly threshold: ItemDamageRule['threshold']
  readonly base: ItemDamageRule['base']
  readonly factor: ItemDamageRule['factor']
}>

export type BlocksAttacksOptions = Readonly<{
  readonly blockDelaySeconds?: BlocksAttacksComponent['blockDelaySeconds']
  readonly disableCooldownScale?: BlocksAttacksComponent['disableCooldownScale']
  readonly damageReductions?: ReadonlyArray<DamageReductionOptions>
  readonly itemDamage?: ItemDamageRuleOptions
  readonly blockSound?: NonNullable<BlocksAttacksComponent['blockSound']>
  readonly disabledSound?: NonNullable<BlocksAttacksComponent['disabledSound']>
  readonly bypassedBy?: ResourceLocationProviderInput
}>

type DefenseResult<A> = Result.Result<A, ItemValidationFailure>

const failure = (
  field: string,
  message: string,
  value?: unknown,
  reason: ItemValidationFailure['reason'] = 'invalid-value',
  kind: ItemValidationFailure['kind'] = 'TypeError',
): ItemValidationFailure => itemValidationFailure(field, message, reason, value, kind)

const brandValue = <A, E extends Readonly<{ readonly message: string }>>(
  result: Result.Result<A, E>,
  field: string,
  value: unknown,
  reason: ItemValidationFailure['reason'] = 'invalid-value',
): DefenseResult<A> => Result.mapError(
  result,
  (error) => failure(field, error.message, value, reason),
)

const recordFromInput = (
  value: unknown,
  fieldPrefix: string,
  fields: ReadonlyArray<string>,
): DefenseResult<Readonly<Record<string, unknown>>> => {
  const name = fieldPrefix || 'blocksAttacks options'
  const snapshot = snapshotInputRecord(value, fields, undefined, fieldPrefix || undefined)
  if (Result.isSuccess(snapshot)) return Result.succeed(snapshot.success)
  const invalidType = snapshot.failure.reason === 'invalid-container' || snapshot.failure.reason === 'unsupported-prototype'
  const field = snapshot.failure.path ?? name
  return Result.fail(failure(
    invalidType ? name : field,
    invalidType ? `${name} must be a non-null object` : `Unable to inspect ${field}`,
    value,
    invalidType ? 'invalid-type' : 'hostile-input',
  ))
}

const arrayFromInput = (
  value: unknown,
  field: string,
): DefenseResult<ReadonlyArray<unknown>> => {
  const snapshot = snapshotInputArray(value, MAX_GENERIC_INPUT_ARRAY_LENGTH, field)
  if (Result.isSuccess(snapshot)) return Result.succeed(snapshot.success)
  const invalidArray = snapshot.failure.reason === 'invalid-container'
  const tooLarge = snapshot.failure.reason === 'too-large'
  // This snapshot call always receives the field as its path prefix.
  const errorField = snapshot.failure.path
  return Result.fail(failure(
    errorField,
    invalidArray ? `${field} must be an array` : tooLarge ? `${field} exceeds the maximum length` : `Unable to inspect ${errorField}`,
    value,
    invalidArray ? 'invalid-type' : tooLarge ? 'out-of-range' : 'hostile-input',
  ))
}

const finiteNumber = (value: unknown, name: string): DefenseResult<number> =>
  typeof value === 'number' && Number.isFinite(value)
    ? Result.succeed(value)
    : Result.fail(failure(name, `${name} must be a finite number`, value, 'invalid-type'))

const nonNegativeFiniteNumber = (value: unknown, name: string): DefenseResult<number> =>
  Result.flatMap(finiteNumber(value, name), (number) => number < 0
    ? Result.fail(failure(name, `${name} must be a non-negative finite number`, value, 'out-of-range', 'RangeError'))
    : Result.succeed(number))

const positiveFiniteNumber = (value: unknown, name: string): DefenseResult<number> =>
  Result.flatMap(finiteNumber(value, name), (number) => number <= 0
    ? Result.fail(failure(name, `${name} must be a positive finite number`, value, 'out-of-range', 'RangeError'))
    : Result.succeed(number))

const resourceLocationProviderOf = (
  value: unknown,
  field: string,
): DefenseResult<ResourceLocationProvider> => {
  if (typeof value === 'string') {
    return value.startsWith('#')
      ? brandValue(TagLocation.result(value), field, value)
      : brandValue(ResourceLocation.result(value), field, value)
  }
  const copiedEntries = snapshotInputArray(value, MAX_GENERIC_INPUT_ARRAY_LENGTH, field)
  if (Result.isFailure(copiedEntries) && copiedEntries.failure.reason === 'invalid-container') {
    return Result.fail(failure(field, `${field} must be a string or an array of resource locations`, value, 'invalid-type'))
  }
  if (Result.isFailure(copiedEntries)) {
    // This snapshot call always receives the field as its path prefix.
    const errorField = copiedEntries.failure.path
    return Result.fail(failure(errorField, `Unable to inspect ${errorField}`, value, 'hostile-input'))
  }
  const entries = copiedEntries.success
  return Result.gen(function* () {
    const locations: ResourceLocation[] = []
    for (const entry of entries) {
      if (typeof entry !== 'string' || entry.startsWith('#')) {
        return yield* Result.fail(failure(field, `${field} lists must contain resource locations`, entry, 'invalid-type'))
      }
      locations.push(yield* brandValue(ResourceLocation.result(entry), field, entry))
    }
    return Object.freeze(locations)
  })
}

const resourceLocationOf = (
  value: unknown,
  field: string,
): DefenseResult<ResourceLocation> => {
  if (typeof value === 'string') return brandValue(ResourceLocation.result(value), field, value)
  const rendered = Result.try({
    try: () => JSON.stringify(value) ?? String(value),
    catch: () => failure(field, `Unable to inspect ${field}`, value, 'hostile-input'),
  })
  if (Result.isFailure(rendered)) return Result.fail(rendered.failure)
  return Result.fail(failure(field, `ResourceLocation has invalid syntax, received ${rendered.success}`, value))
}

const damageReductionRuleOf = (
  options: unknown,
  index: number,
): DefenseResult<DamageReductionRule> => Result.flatMap(
  recordFromInput(options, `damageReductions[${index}]`, ['base', 'factor', 'horizontalBlockingAngle', 'type']),
  (input) => Result.gen(function* () {
  const baseValue = yield* finiteNumber(input['base'], `damageReductions[${index}].base`)
  const factorValue = yield* finiteNumber(input['factor'], `damageReductions[${index}].factor`)
  const angle = input['horizontalBlockingAngle']
  const angleValue = angle === undefined
    ? 90
    : yield* positiveFiniteNumber(angle, `damageReductions[${index}].horizontalBlockingAngle`)
  const rawType = input['type']
  const type = rawType === undefined
    ? undefined
    : yield* resourceLocationProviderOf(rawType, `damageReductions[${index}].type`)
  const base = yield* brandValue(DamageReductionBase.result(baseValue), `damageReductions[${index}].base`, baseValue)
  const factor = yield* brandValue(DamageReductionFactor.result(factorValue), `damageReductions[${index}].factor`, factorValue)
  const horizontalBlockingAngle = yield* brandValue(HorizontalBlockingAngle.result(angleValue), `damageReductions[${index}].horizontalBlockingAngle`, angleValue, 'out-of-range')
  return Object.freeze({ type, base, factor, horizontalBlockingAngle })
  }),
)

const damageReductionRulesOf = (
  options: unknown,
): DefenseResult<ReadonlyArray<DamageReductionRule>> => Result.flatMap(
  arrayFromInput(options, 'damageReductions'),
  (values) => {
  const rules: DamageReductionRule[] = []
  for (const [index, option] of values.entries()) {
    const rule = damageReductionRuleOf(option, index)
    if (Result.isFailure(rule)) return Result.fail(rule.failure)
    rules.push(rule.success)
  }
  return Result.succeed(rules)
  },
)

const itemDamageRuleOf = (options: unknown): DefenseResult<ItemDamageRule> => Result.flatMap(
  recordFromInput(options, 'itemDamage', ['threshold', 'base', 'factor']),
  (input) => Result.gen(function* () {
  const thresholdValue = yield* nonNegativeFiniteNumber(input['threshold'], 'itemDamage.threshold')
  const baseValue = yield* finiteNumber(input['base'], 'itemDamage.base')
  const factorValue = yield* finiteNumber(input['factor'], 'itemDamage.factor')
  const threshold = yield* brandValue(ItemDamageThreshold.result(thresholdValue), 'itemDamage.threshold', thresholdValue, 'out-of-range')
  const base = yield* brandValue(ItemDamageBase.result(baseValue), 'itemDamage.base', baseValue)
  const factor = yield* brandValue(ItemDamageFactor.result(factorValue), 'itemDamage.factor', factorValue)
  return Object.freeze({ threshold, base, factor })
  }),
)

export const damageResistantComponent = (
  types: ResourceLocationProviderInput,
): DefenseResult<DamageResistantComponent> =>
  Result.map(resourceLocationProviderOf(types, 'damage_resistant.types'), (value) => Object.freeze({ types: value }))

const blocksAttacksComponentAfterCooldown = (
  options: Readonly<Record<string, unknown>>,
  blockDelayValue: number,
  cooldownScaleValue: number,
): DefenseResult<BlocksAttacksComponent> => {
  const input = options['damageReductions']
  const damageReductionResult = input === undefined
    ? Result.succeed<ReadonlyArray<DamageReductionRule>>([])
    : damageReductionRulesOf(input)

  return Result.flatMap(damageReductionResult,
    (damageReductions) => Result.gen(function* () {
      const rawItemDamage = options['itemDamage']
      const itemDamage = rawItemDamage === undefined ? undefined : yield* itemDamageRuleOf(rawItemDamage)
      const rawBlockSound = options['blockSound']
      const blockSound = rawBlockSound === undefined
        ? undefined
        : yield* resourceLocationOf(rawBlockSound, 'blockSound')
      const rawDisabledSound = options['disabledSound']
      const disabledSound = rawDisabledSound === undefined
        ? undefined
        : yield* resourceLocationOf(rawDisabledSound, 'disabledSound')
      const rawBypassedBy = options['bypassedBy']
      const bypassedBy = rawBypassedBy === undefined
        ? undefined
        : yield* resourceLocationProviderOf(rawBypassedBy, 'bypassedBy')
      const blockDelaySeconds = yield* brandValue(BlockingDelaySeconds.result(blockDelayValue), 'blockDelaySeconds', blockDelayValue, 'out-of-range')
      const disableCooldownScale = yield* brandValue(DisableCooldownScale.result(cooldownScaleValue), 'disableCooldownScale', cooldownScaleValue, 'out-of-range')
      return Object.freeze({
        blockDelaySeconds,
        disableCooldownScale,
        damageReductions: Object.freeze(damageReductions),
        itemDamage,
        blockSound,
        disabledSound,
        bypassedBy,
      })
    }),
  )
}

export const blocksAttacksComponent = (
  options: BlocksAttacksOptions = {},
): DefenseResult<BlocksAttacksComponent> => Result.flatMap(
  recordFromInput(options, '', [
    'blockDelaySeconds', 'disableCooldownScale', 'damageReductions', 'itemDamage',
    'blockSound', 'disabledSound', 'bypassedBy',
  ]),
  (snapshot) => Result.flatMap(
      snapshot['blockDelaySeconds'] === undefined
        ? Result.succeed(0)
        : nonNegativeFiniteNumber(snapshot['blockDelaySeconds'], 'blockDelaySeconds'),
      (blockDelayValue) => Result.flatMap(
        snapshot['disableCooldownScale'] === undefined
          ? Result.succeed(1)
          : nonNegativeFiniteNumber(snapshot['disableCooldownScale'], 'disableCooldownScale'),
        (cooldownScaleValue) => blocksAttacksComponentAfterCooldown(snapshot, blockDelayValue, cooldownScaleValue),
      ),
  ),
)

export type {
  BlocksAttacksComponent,
  DamageReductionRule,
  DamageResistantComponent,
  ItemDamageRule,
} from './item-defense-data.js'
export {
  isBlocksAttacksComponent,
  isDamageReductionRule,
  isDamageResistantComponent,
  isItemDamageRule,
} from './item-defense-validation.js'
