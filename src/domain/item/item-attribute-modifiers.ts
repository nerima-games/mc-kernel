/** Constructors and guards for current Java item attribute modifiers. */
import { Effect, Result } from 'effect'
import { ResourceLocation } from '../text/identifiers.js'
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
import { textComponent } from '../text/text-component.js'
import { itemValidationFailure, type ItemValidationFailure } from './item-failure.js'

export type AttributeModifierOptions = Readonly<{
  readonly type: AttributeModifier['type']
  readonly id: AttributeModifier['id']
  readonly amount: AttributeModifier['amount']
  readonly operation: AttributeModifierOperation
  readonly slot?: AttributeModifierSlot
  readonly display?: AttributeModifierDisplay
}>

type AttributeModifierResult<A> = Result.Result<A, ItemValidationFailure>

const failure = (
  field: string,
  message: string,
  value?: unknown,
  reason: ItemValidationFailure['reason'] = 'invalid-value',
  kind: ItemValidationFailure['kind'] = reason === 'out-of-range' ? 'RangeError' : 'TypeError',
): ItemValidationFailure => itemValidationFailure(field, message, reason, value, kind)

const brandValue = <A, E extends Readonly<{ readonly message: string }>>(
  result: Result.Result<A, E>,
  field: string,
  value: unknown,
  reason: ItemValidationFailure['reason'] = 'invalid-value',
): AttributeModifierResult<A> => Result.mapError(result, (error) => failure(field, error.message, value, reason))

const validResourceLocation = (value: unknown, name: string): AttributeModifierResult<string> =>
  typeof value === 'string' && ResourceLocation.is(value)
    ? Result.succeed(value)
    : Result.fail(failure(name, `${name} must be a valid resource location`, value, 'invalid-value', 'TypeError'))

const snapshotOptions = (
  value: unknown,
): AttributeModifierResult<AttributeModifierOptions> => {
  if (typeof value !== 'object' || value === null) {
    return Result.fail(failure('options', 'Attribute modifier options must be a non-null object', value, 'invalid-type'))
  }
  const snapshot = Effect.runSync(Effect.result(Effect.try({
    try: () => Object.freeze({
      type: value.type,
      id: value.id,
      amount: value.amount,
      operation: value.operation,
      slot: value.slot,
      display: value.display,
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
    return Result.succeed(Object.freeze({
      type: 'override',
      value: textComponent(display.value),
    }))
  }
  return Result.succeed(Object.freeze({ type: display.type }))
}

export const attributeModifier = (
  options: AttributeModifierOptions,
): AttributeModifierResult<AttributeModifier> => {
  const parsed = snapshotOptions(options)
  if (Result.isFailure(parsed)) return parsed
  const input = parsed.success
  const type = validResourceLocation(input.type, 'type')
  if (Result.isFailure(type)) return type
  const id = validResourceLocation(input.id, 'id')
  if (Result.isFailure(id)) return id
  if (typeof input.amount !== 'number' || !Number.isFinite(input.amount)) {
    return Result.fail(failure('amount', 'amount must be a finite number', input.amount, 'invalid-type'))
  }
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
    const resourceType = yield* brandValue(ResourceLocation.result(type.success), 'type', type.success)
    const resourceId = yield* brandValue(ResourceLocation.result(id.success), 'id', id.success)
    const amount = yield* brandValue(AttributeModifierAmount.result(input.amount), 'amount', input.amount, 'out-of-range')
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

const ATTRIBUTE_MODIFIER_OPERATION_SET: ReadonlySet<string> = new Set(ATTRIBUTE_MODIFIER_OPERATIONS)
const ATTRIBUTE_MODIFIER_SLOT_SET: ReadonlySet<string> = new Set(ATTRIBUTE_MODIFIER_SLOTS)

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
