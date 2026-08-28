/** Constructors and guards for Java item defense components. */
import { ResourceLocation, TagLocation } from './identifiers.js'
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
} from './quantities.js'
import type {
  ResourceLocationProvider,
  ResourceLocationProviderInput,
} from './item-component-values-data.js'

export type DamageReductionOptions = Readonly<{
  readonly type?: ResourceLocationProviderInput
  readonly base: number
  readonly factor: number
  readonly horizontalBlockingAngle?: number
}>

export type ItemDamageRuleOptions = Readonly<{
  readonly threshold: number
  readonly base: number
  readonly factor: number
}>

export type BlocksAttacksOptions = Readonly<{
  readonly blockDelaySeconds?: number
  readonly disableCooldownScale?: number
  readonly damageReductions?: ReadonlyArray<DamageReductionOptions>
  readonly itemDamage?: ItemDamageRuleOptions
  readonly blockSound?: string
  readonly disabledSound?: string
  readonly bypassedBy?: ResourceLocationProviderInput
}>

const validateOptionsObject = (value: unknown, name: string): void => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name} must be a non-null object`)
  }
}

const validateFiniteNumber = (value: unknown, name: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`)
  }
  return value
}

const validateNonNegativeFiniteNumber = (value: unknown, name: string): void => {
  if (validateFiniteNumber(value, name) < 0) {
    throw new RangeError(`${name} must be a non-negative finite number`)
  }
}

const validatePositiveFiniteNumber = (value: unknown, name: string): void => {
  if (validateFiniteNumber(value, name) <= 0) {
    throw new RangeError(`${name} must be a positive finite number`)
  }
}

const resourceLocationProviderOf = (
  value: ResourceLocationProviderInput,
  name: string,
): ResourceLocationProvider => {
  if (typeof value === 'string') {
    return value.startsWith('#') ? TagLocation(value) : ResourceLocation(value)
  }
  if (!Array.isArray(value)) {
    throw new TypeError(`${name} must be a resource location, tag, or list of resource locations`)
  }
  const entries = value.map((entry) => {
    if (typeof entry !== 'string' || entry.startsWith('#')) {
      throw new TypeError(`${name} lists must contain resource locations`)
    }
    return ResourceLocation(entry)
  })
  return Object.freeze(entries)
}

const validateDamageReductionOptions = (options: DamageReductionOptions, index: number): void => {
  validateOptionsObject(options, `damageReductions[${index}]`)
  validateFiniteNumber(options.base, `damageReductions[${index}].base`)
  validateFiniteNumber(options.factor, `damageReductions[${index}].factor`)
  if (options.horizontalBlockingAngle !== undefined) {
    validatePositiveFiniteNumber(options.horizontalBlockingAngle, `damageReductions[${index}].horizontalBlockingAngle`)
  }
  if (options.type !== undefined) {
    resourceLocationProviderOf(options.type, `damageReductions[${index}].type`)
  }
}

const validateItemDamageRuleOptions = (options: ItemDamageRuleOptions): void => {
  validateOptionsObject(options, 'itemDamage')
  validateNonNegativeFiniteNumber(options.threshold, 'itemDamage.threshold')
  validateFiniteNumber(options.base, 'itemDamage.base')
  validateFiniteNumber(options.factor, 'itemDamage.factor')
}

const damageReductionRuleOf = (options: DamageReductionOptions): DamageReductionRule =>
  Object.freeze({
    type: options.type === undefined ? undefined : resourceLocationProviderOf(options.type, 'damage reduction type'),
    base: DamageReductionBase(options.base),
    factor: DamageReductionFactor(options.factor),
    horizontalBlockingAngle: HorizontalBlockingAngle(options.horizontalBlockingAngle ?? 90),
  })

const itemDamageRuleOf = (options: ItemDamageRuleOptions): ItemDamageRule =>
  Object.freeze({
    threshold: ItemDamageThreshold(options.threshold),
    base: ItemDamageBase(options.base),
    factor: ItemDamageFactor(options.factor),
  })

export const damageResistantComponent = (types: ResourceLocationProviderInput): DamageResistantComponent =>
  Object.freeze({ types: resourceLocationProviderOf(types, 'damage_resistant.types') })

export const blocksAttacksComponent = (options: BlocksAttacksOptions = {}): BlocksAttacksComponent => {
  validateOptionsObject(options, 'blocksAttacks options')
  if (options.blockDelaySeconds !== undefined) {
    validateNonNegativeFiniteNumber(options.blockDelaySeconds, 'blockDelaySeconds')
  }
  if (options.disableCooldownScale !== undefined) {
    validateNonNegativeFiniteNumber(options.disableCooldownScale, 'disableCooldownScale')
  }
  if (options.damageReductions !== undefined) {
    if (!Array.isArray(options.damageReductions)) {
      throw new TypeError('damageReductions must be an array')
    }
    options.damageReductions.forEach((rule, index) => validateDamageReductionOptions(rule, index))
  }
  if (options.itemDamage !== undefined) {
    validateItemDamageRuleOptions(options.itemDamage)
  }
  if (options.blockSound !== undefined && typeof options.blockSound !== 'string') {
    throw new TypeError('blockSound must be a resource location')
  }
  if (options.disabledSound !== undefined && typeof options.disabledSound !== 'string') {
    throw new TypeError('disabledSound must be a resource location')
  }
  if (options.bypassedBy !== undefined) {
    resourceLocationProviderOf(options.bypassedBy, 'bypassedBy')
  }

  const damageReductions = Object.freeze(
    (options.damageReductions ?? []).map((rule) => damageReductionRuleOf(rule)),
  )
  const itemDamage = options.itemDamage === undefined ? undefined : itemDamageRuleOf(options.itemDamage)
  const blockSound = options.blockSound === undefined ? undefined : ResourceLocation(options.blockSound)
  const disabledSound = options.disabledSound === undefined ? undefined : ResourceLocation(options.disabledSound)
  const bypassedBy = options.bypassedBy === undefined
    ? undefined
    : resourceLocationProviderOf(options.bypassedBy, 'bypassedBy')

  return Object.freeze({
    blockDelaySeconds: BlockingDelaySeconds(options.blockDelaySeconds ?? 0),
    disableCooldownScale: DisableCooldownScale(options.disableCooldownScale ?? 1),
    damageReductions,
    itemDamage,
    blockSound,
    disabledSound,
    bypassedBy,
  })
}

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
