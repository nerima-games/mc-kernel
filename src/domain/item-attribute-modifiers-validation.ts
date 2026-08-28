import { ResourceLocation } from './identifiers.js'
import {
  ATTRIBUTE_MODIFIER_OPERATIONS,
  ATTRIBUTE_MODIFIER_SLOTS,
  type AttributeModifier,
  type AttributeModifierDisplay,
  type AttributeModifiersComponent,
} from './item-attribute-modifiers-data.js'
import { AttributeModifierAmount } from './quantities.js'
import { isTextComponent } from './text-component-validation.js'

type RecordValue = Record<string, unknown>

const isRecord = (value: unknown): value is RecordValue => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

const hasExactKeys = (value: RecordValue, keys: ReadonlyArray<string>): boolean => {
  const actualKeys = Object.keys(value)
  return actualKeys.length === keys.length && keys.every((key) => Object.hasOwn(value, key))
}

const ATTRIBUTE_MODIFIER_OPERATION_SET: ReadonlySet<string> = new Set(ATTRIBUTE_MODIFIER_OPERATIONS)
const ATTRIBUTE_MODIFIER_SLOT_SET: ReadonlySet<string> = new Set(ATTRIBUTE_MODIFIER_SLOTS)

export const isAttributeModifierDisplay = (value: unknown): value is AttributeModifierDisplay => {
  if (!isRecord(value)) {
    return false
  }
  const type = value['type']
  if (type === 'default' || type === 'hidden') {
    return hasExactKeys(value, ['type'])
  }
  if (type !== 'override' || !hasExactKeys(value, ['type', 'value'])) {
    return false
  }
  return isTextComponent(value['value'])
}

export const isAttributeModifier = (value: unknown): value is AttributeModifier => {
  if (
    !isRecord(value) ||
    (!hasExactKeys(value, ['type', 'id', 'amount', 'operation', 'slot']) &&
      !hasExactKeys(value, ['type', 'id', 'amount', 'operation', 'slot', 'display']))
  ) {
    return false
  }
  return (
    typeof value['type'] === 'string' &&
    ResourceLocation.is(value['type']) &&
    typeof value['id'] === 'string' &&
    ResourceLocation.is(value['id']) &&
    typeof value['amount'] === 'number' &&
    AttributeModifierAmount.is(value['amount']) &&
    typeof value['operation'] === 'string' &&
    ATTRIBUTE_MODIFIER_OPERATION_SET.has(value['operation']) &&
    typeof value['slot'] === 'string' &&
    ATTRIBUTE_MODIFIER_SLOT_SET.has(value['slot']) &&
    (value['display'] === undefined || isAttributeModifierDisplay(value['display']))
  )
}

export const isAttributeModifiersComponent = (
  value: unknown,
): value is AttributeModifiersComponent =>
  Array.isArray(value) && Array.from(value).every((modifier) => isAttributeModifier(modifier))
