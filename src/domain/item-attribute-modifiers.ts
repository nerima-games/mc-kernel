/** Constructors and guards for current Java item attribute modifiers. */
import { ResourceLocation } from './identifiers.js'
import {
  ATTRIBUTE_MODIFIER_OPERATIONS,
  ATTRIBUTE_MODIFIER_SLOTS,
  type AttributeModifier,
  type AttributeModifierDisplay,
  type AttributeModifierOperation,
  type AttributeModifierSlot,
  type AttributeModifiersComponent,
} from './item-attribute-modifiers-data.js'
import {
  isAttributeModifier,
  isAttributeModifierDisplay,
  isAttributeModifiersComponent,
} from './item-attribute-modifiers-validation.js'
import { AttributeModifierAmount } from './quantities.js'
import { textComponent } from './text-component.js'

export type AttributeModifierOptions = Readonly<{
  readonly type: string
  readonly id: string
  readonly amount: number
  readonly operation: AttributeModifierOperation
  readonly slot?: AttributeModifierSlot
  readonly display?: AttributeModifierDisplay
}>

const ATTRIBUTE_MODIFIER_OPERATION_SET: ReadonlySet<string> = new Set(ATTRIBUTE_MODIFIER_OPERATIONS)
const ATTRIBUTE_MODIFIER_SLOT_SET: ReadonlySet<string> = new Set(ATTRIBUTE_MODIFIER_SLOTS)

const validateOptionsObject = (value: unknown, name: string): void => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name} must be a non-null object`)
  }
}

const validateResourceLocation = (value: unknown, name: string): string => {
  if (typeof value !== 'string' || !ResourceLocation.is(value)) {
    throw new TypeError(`${name} must be a valid resource location`)
  }
  return value
}

const validateAmount = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError('amount must be a finite number')
  }
  return value
}

const validateAttributeModifierOptions = (options: AttributeModifierOptions): void => {
  validateOptionsObject(options, 'Attribute modifier options')
  validateResourceLocation(options.type, 'type')
  validateResourceLocation(options.id, 'id')
  validateAmount(options.amount)
  if (!ATTRIBUTE_MODIFIER_OPERATION_SET.has(options.operation)) {
    throw new TypeError(`Unknown attribute modifier operation: ${String(options.operation)}`)
  }
  if (options.slot !== undefined && !ATTRIBUTE_MODIFIER_SLOT_SET.has(options.slot)) {
    throw new TypeError(`Unknown attribute modifier slot: ${String(options.slot)}`)
  }
  if (options.display !== undefined && !isAttributeModifierDisplay(options.display)) {
    throw new TypeError('display must be a valid attribute modifier display')
  }
}

export const attributeModifierDisplay = (
  display: AttributeModifierDisplay,
): AttributeModifierDisplay => {
  if (!isAttributeModifierDisplay(display)) {
    throw new TypeError('Attribute modifier display must be valid')
  }
  if (display.type === 'override') {
    return Object.freeze({
      type: 'override',
      value: textComponent(display.value),
    })
  }
  return Object.freeze({ type: display.type })
}

export const attributeModifier = (options: AttributeModifierOptions): AttributeModifier => {
  validateAttributeModifierOptions(options)
  const display = options.display === undefined ? undefined : attributeModifierDisplay(options.display)
  const modifier = {
    type: ResourceLocation(options.type),
    id: ResourceLocation(options.id),
    amount: AttributeModifierAmount(validateAmount(options.amount)),
    operation: options.operation,
    slot: options.slot ?? 'any',
  }
  return Object.freeze(display === undefined ? modifier : { ...modifier, display })
}

export const attributeModifiersComponent = (
  options: ReadonlyArray<AttributeModifierOptions> = [],
): AttributeModifiersComponent => {
  if (!Array.isArray(options)) {
    throw new TypeError('Attribute modifiers must be an array')
  }
  return Object.freeze(options.map((modifier) => attributeModifier(modifier)))
}

export {
  ATTRIBUTE_MODIFIER_OPERATIONS,
  ATTRIBUTE_MODIFIER_SLOTS,
  isAttributeModifier,
  isAttributeModifierDisplay,
  isAttributeModifiersComponent,
}
export type {
  AttributeModifier,
  AttributeModifierDisplay,
  AttributeModifierOperation,
  AttributeModifierSlot,
  AttributeModifiersComponent,
  TextComponent,
  TextComponentValue,
} from './item-attribute-modifiers-data.js'
