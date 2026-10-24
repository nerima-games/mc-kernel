/** Constructors and guards for Java item defense components. */
import { Effect, Result } from 'effect'
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

const validateObject = (value: unknown, name: string): DefenseResult<void> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? Result.succeed(undefined)
    : Result.fail(failure(name, `${name} must be a non-null object`, value, 'invalid-type'))

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
  value: ResourceLocationProviderInput,
  field: string,
): DefenseResult<ResourceLocationProvider> => {
  if (typeof value === 'string') {
    return value.startsWith('#')
      ? brandValue(TagLocation.result(value), field, value)
      : brandValue(ResourceLocation.result(value), field, value)
  }
  const copiedEntries = Effect.runSync(Effect.result(Effect.try({
    try: () => Array.isArray(value) ? Array.from(value) : undefined,
    catch: () => failure(field, `Unable to inspect ${field}`, value, 'hostile-input'),
  })))
  if (Result.isFailure(copiedEntries)) return Result.fail(copiedEntries.failure)
  if (copiedEntries.success === undefined) {
    return Result.fail(failure(field, `${field} must be a string or an array of resource locations`, value, 'invalid-type'))
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
): DefenseResult<ResourceLocation> => typeof value === 'string'
  ? brandValue(ResourceLocation.result(value), field, value)
  : Result.fail(failure(field, `ResourceLocation has invalid syntax, received ${JSON.stringify(value)}`, value))

const damageReductionRuleOf = (
  options: DamageReductionOptions,
  index: number,
): DefenseResult<DamageReductionRule> => Result.gen(function* () {
  yield* validateObject(options, `damageReductions[${index}]`)
  const baseValue = yield* finiteNumber(options.base, `damageReductions[${index}].base`)
  const factorValue = yield* finiteNumber(options.factor, `damageReductions[${index}].factor`)
  const angleValue = options.horizontalBlockingAngle === undefined
    ? 90
    : yield* positiveFiniteNumber(options.horizontalBlockingAngle, `damageReductions[${index}].horizontalBlockingAngle`)
  const type = options.type === undefined
    ? undefined
    : yield* resourceLocationProviderOf(options.type, `damageReductions[${index}].type`)
  const base = yield* brandValue(DamageReductionBase.result(baseValue), `damageReductions[${index}].base`, baseValue)
  const factor = yield* brandValue(DamageReductionFactor.result(factorValue), `damageReductions[${index}].factor`, factorValue)
  const horizontalBlockingAngle = yield* brandValue(HorizontalBlockingAngle.result(angleValue), `damageReductions[${index}].horizontalBlockingAngle`, angleValue, 'out-of-range')
  return Object.freeze({ type, base, factor, horizontalBlockingAngle })
})

const damageReductionRulesOf = (
  options: ReadonlyArray<DamageReductionOptions>,
): DefenseResult<ReadonlyArray<DamageReductionRule>> => {
  const rules: DamageReductionRule[] = []
  for (const [index, option] of options.entries()) {
    const rule = damageReductionRuleOf(option, index)
    if (Result.isFailure(rule)) return Result.fail(rule.failure)
    rules.push(rule.success)
  }
  return Result.succeed(rules)
}

const itemDamageRuleOf = (options: ItemDamageRuleOptions): DefenseResult<ItemDamageRule> => Result.gen(function* () {
  yield* validateObject(options, 'itemDamage')
  const thresholdValue = yield* nonNegativeFiniteNumber(options.threshold, 'itemDamage.threshold')
  const baseValue = yield* finiteNumber(options.base, 'itemDamage.base')
  const factorValue = yield* finiteNumber(options.factor, 'itemDamage.factor')
  const threshold = yield* brandValue(ItemDamageThreshold.result(thresholdValue), 'itemDamage.threshold', thresholdValue, 'out-of-range')
  const base = yield* brandValue(ItemDamageBase.result(baseValue), 'itemDamage.base', baseValue)
  const factor = yield* brandValue(ItemDamageFactor.result(factorValue), 'itemDamage.factor', factorValue)
  return Object.freeze({ threshold, base, factor })
})

export const damageResistantComponent = (
  types: ResourceLocationProviderInput,
): DefenseResult<DamageResistantComponent> =>
  Result.map(resourceLocationProviderOf(types, 'damage_resistant.types'), (value) => Object.freeze({ types: value }))

const blocksAttacksComponentAfterCooldown = (
  options: BlocksAttacksOptions,
  blockDelayValue: number,
  cooldownScaleValue: number,
): DefenseResult<BlocksAttacksComponent> => {
  const input = options.damageReductions
  const damageReductionOptions: DefenseResult<ReadonlyArray<DamageReductionOptions>> = input === undefined
    ? Result.succeed<ReadonlyArray<DamageReductionOptions>>([])
    : Array.isArray(input)
      ? Result.succeed<ReadonlyArray<DamageReductionOptions>>(input)
      : Result.fail(failure('damageReductions', 'damageReductions must be an array', input, 'invalid-type'))

  return Result.flatMap(damageReductionOptions, (rules) => Result.flatMap(
    damageReductionRulesOf(rules),
    (damageReductions) => Result.gen(function* () {
      const itemDamage = options.itemDamage === undefined ? undefined : yield* itemDamageRuleOf(options.itemDamage)
      const blockSound = options.blockSound === undefined
        ? undefined
        : yield* resourceLocationOf(options.blockSound, 'blockSound')
      const disabledSound = options.disabledSound === undefined
        ? undefined
        : yield* resourceLocationOf(options.disabledSound, 'disabledSound')
      const bypassedBy = options.bypassedBy === undefined
        ? undefined
        : yield* resourceLocationProviderOf(options.bypassedBy, 'bypassedBy')
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
  ))
}

export const blocksAttacksComponent = (
  options: BlocksAttacksOptions = {},
): DefenseResult<BlocksAttacksComponent> => Result.flatMap(
  validateObject(options, 'blocksAttacks options'),
  () => Result.flatMap(
    options.blockDelaySeconds === undefined
      ? Result.succeed(0)
      : nonNegativeFiniteNumber(options.blockDelaySeconds, 'blockDelaySeconds'),
    (blockDelayValue) => Result.flatMap(
      options.disableCooldownScale === undefined
        ? Result.succeed(1)
        : nonNegativeFiniteNumber(options.disableCooldownScale, 'disableCooldownScale'),
      (cooldownScaleValue) => blocksAttacksComponentAfterCooldown(options, blockDelayValue, cooldownScaleValue),
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
