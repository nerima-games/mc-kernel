/** Constructors and guards for current Java item attribute modifiers. */
import { Effect, Result } from 'effect'
import { ResourceLocation, type ResourceLocation as ResourceLocationType } from '../text/identifiers.js'
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
import { AttributeModifierAmount } from '../time/quantities.js'
import { textComponent, type TextComponentFailure } from '../text/text-component.js'
import { itemValidationFailure, type ItemValidationFailure } from './item-failure.js'

export type AttributeModifierOptions = Readonly<{
  readonly type: AttributeModifier['type']
  readonly id: AttributeModifier['id']
  readonly amount: AttributeModifier['amount']
  readonly operation: AttributeModifierOperation
  readonly slot?: AttributeModifierSlot
  readonly display?: AttributeModifierDisplay
}>

type AttributeModifierResult<A> = Result.Result<A, ItemValidationFailure | TextComponentFailure>

const ATTRIBUTE_MODIFIER_OPERATION_SET: ReadonlySet<string> = new Set(ATTRIBUTE_MODIFIER_OPERATIONS)
const ATTRIBUTE_MODIFIER_SLOT_SET: ReadonlySet<string> = new Set(ATTRIBUTE_MODIFIER_SLOTS)

const failure = (
  field: string,
  message: string,
  value?: unknown,
  reason: ItemValidationFailure['reason'] = 'invalid-value',
  kind: ItemValidationFailure['kind'] = 'TypeError',
): ItemValidationFailure => itemValidationFailure(field, message, reason, value, kind)

const resourceLocationOf = (value: unknown, name: string): AttributeModifierResult<ResourceLocationType> => {
  if (typeof value !== 'string') {
    return Result.fail(failure(name, `${name} must be a valid resource location`, value, 'invalid-value', 'TypeError'))
  }
  return Result.mapError(ResourceLocation.result(value), () =>
    failure(name, `${name} must be a valid resource location`, value, 'invalid-value', 'TypeError'))
}

const snapshotOptions = (
  value: unknown,
): AttributeModifierResult<AttributeModifierOptions> => {
  if (typeof value !== 'object' || value === null) {
    return Result.fail(failure('options', 'Attribute modifier options must be a non-null object', value, 'invalid-type'))
  }
  const snapshot = Effect.runSync(Effect.result(Effect.try({
    try: () => Object.freeze({
      type: Reflect.get(value, 'type'),
      id: Reflect.get(value, 'id'),
      amount: Reflect.get(value, 'amount'),
      operation: Reflect.get(value, 'operation'),
      slot: Reflect.get(value, 'slot'),
      display: Reflect.get(value, 'display'),
    }),
    catch: () => failure('options', 'Unable to inspect attribute modifier options', value, 'hostile-input'),
  })))
  return snapshot
}

export const attributeModifierDisplay = (
  display: AttributeModifierDisplay,
): AttributeModifierResult<AttributeModifierDisplay> => {
  if (!isAttributeModifierDisplay(display)) {
    return Result.fail(failure('display', 'Attribute modifier display must be valid', display, 'invalid-value'))
  }
  if (display.type === 'override') {
    return Result.map(textComponent(display.value), (value) => Object.freeze({
      type: 'override',
      value,
    }))
  }
  return Result.succeed(Object.freeze({ type: display.type }))
}

export const attributeModifier = (
  options: AttributeModifierOptions,
): AttributeModifierResult<AttributeModifier> => {
  const parsed = snapshotOptions(options)
  if (Result.isFailure(parsed)) return Result.fail(parsed.failure)
  const input = parsed.success
  const type = resourceLocationOf(input.type, 'type')
  if (Result.isFailure(type)) return Result.fail(type.failure)
  const id = resourceLocationOf(input.id, 'id')
  if (Result.isFailure(id)) return Result.fail(id.failure)
  if (!ATTRIBUTE_MODIFIER_OPERATION_SET.has(input.operation)) {
    return Result.fail(failure('operation', `Unknown attribute modifier operation: ${String(input.operation)}`, input.operation))
  }
  if (input.slot !== undefined && !ATTRIBUTE_MODIFIER_SLOT_SET.has(input.slot)) {
    return Result.fail(failure('slot', `Unknown attribute modifier slot: ${String(input.slot)}`, input.slot))
  }
  if (input.display !== undefined && !isAttributeModifierDisplay(input.display)) {
    return Result.fail(failure('display', 'display must be a valid attribute modifier display', input.display))
  }
  const display = input.display === undefined ? Result.succeed(undefined) : attributeModifierDisplay(input.display)
  return Result.gen(function* () {
    const displayValue = yield* display
    const resourceType = yield* type
    const resourceId = yield* id
    const amount = yield* Result.mapError(AttributeModifierAmount.result(input.amount), () =>
      failure('amount', 'amount must be a finite number', input.amount, 'invalid-type'))
    const modifier = {
      type: resourceType,
      id: resourceId,
      amount,
      operation: input.operation,
      slot: input.slot ?? 'any',
    }
    return Object.freeze(displayValue === undefined ? modifier : { ...modifier, display: displayValue })
  })
}

export const attributeModifiersComponent = (
  options: ReadonlyArray<AttributeModifierOptions> = [],
): AttributeModifierResult<AttributeModifiersComponent> => {
  if (!Array.isArray(options)) {
    return Result.fail(failure('options', 'Attribute modifiers must be an array', options, 'invalid-type'))
  }
  return Result.gen(function* () {
    const modifiers: AttributeModifier[] = []
    for (const modifier of options) modifiers.push(yield* attributeModifier(modifier))
    return Object.freeze(modifiers)
  })
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
