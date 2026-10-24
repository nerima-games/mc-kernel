/** Constructors and guards for current Java item attribute modifiers. */
import { Result } from 'effect'
import { snapshotInputRecord } from '../../input-snapshot.js'
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

const isAttributeModifierOperation = (value: unknown): value is AttributeModifierOperation =>
  typeof value === 'string' && ATTRIBUTE_MODIFIER_OPERATION_SET.has(value)

const isAttributeModifierSlot = (value: unknown): value is AttributeModifierSlot =>
  typeof value === 'string' && ATTRIBUTE_MODIFIER_SLOT_SET.has(value)

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
): AttributeModifierResult<Readonly<Record<string, unknown>>> => {
  const snapshot = snapshotInputRecord(value, ['type', 'id', 'amount', 'operation', 'slot', 'display'])
  if (Result.isFailure(snapshot)) {
    const invalidType = snapshot.failure.reason === 'invalid-container' || snapshot.failure.reason === 'unsupported-prototype'
    return Result.fail(failure(
      'options',
      invalidType ? 'Attribute modifier options must be a non-null object' : 'Unable to inspect attribute modifier options',
      value,
      invalidType ? 'invalid-type' : 'hostile-input',
    ))
  }
  return Result.succeed(snapshot.success)
}

export const attributeModifierDisplay = (
  display: unknown,
): AttributeModifierResult<AttributeModifierDisplay> => {
  const snapshot = snapshotInputRecord(display)
  if (Result.isFailure(snapshot)) {
    const hostile = snapshot.failure.reason === 'hostile-input'
    return Result.fail(failure(
      'display',
      hostile ? 'Unable to inspect attribute modifier display' : 'Attribute modifier display must be valid',
      display,
      hostile ? 'hostile-input' : 'invalid-value',
    ))
  }
  const input = snapshot.success
  const keys = Object.keys(input)
  if (input['type'] === 'default' && keys.length === 1 && keys[0] === 'type') {
    return Result.succeed(Object.freeze({ type: 'default' }))
  }
  if (input['type'] === 'hidden' && keys.length === 1 && keys[0] === 'type') {
    return Result.succeed(Object.freeze({ type: 'hidden' }))
  }
  if (
    input['type'] !== 'override' ||
    keys.length !== 2 ||
    !Object.hasOwn(input, 'type') ||
    !Object.hasOwn(input, 'value')
  ) {
    return Result.fail(failure('display', 'Attribute modifier display must be valid', display, 'invalid-value'))
  }
  const value = textComponent(input['value'])
  if (Result.isFailure(value)) {
    return Result.fail(failure(
      'display',
      'Attribute modifier display must be valid',
      display,
      value.failure.reason === 'hostile-input' ? 'hostile-input' : 'invalid-value',
    ))
  }
  return Result.succeed(Object.freeze({ type: 'override', value: value.success }))
}

export const attributeModifier = (
  options: AttributeModifierOptions,
): AttributeModifierResult<AttributeModifier> => {
  const parsed = snapshotOptions(options)
  if (Result.isFailure(parsed)) return Result.fail(parsed.failure)
  const input = parsed.success
  const type = resourceLocationOf(input['type'], 'type')
  if (Result.isFailure(type)) return Result.fail(type.failure)
  const id = resourceLocationOf(input['id'], 'id')
  if (Result.isFailure(id)) return Result.fail(id.failure)
  const operation = input['operation']
  if (!isAttributeModifierOperation(operation)) {
    return Result.fail(failure('operation', `Unknown attribute modifier operation: ${String(operation)}`, operation))
  }
  const slot = input['slot']
  if (slot !== undefined && !isAttributeModifierSlot(slot)) {
    return Result.fail(failure('slot', `Unknown attribute modifier slot: ${String(slot)}`, slot))
  }
  const displayValue = input['display'] === undefined
    ? Result.succeed(undefined)
    : Result.mapError(attributeModifierDisplay(input['display']), (error) => error.reason === 'hostile-input'
      ? error
      : failure('display', 'display must be a valid attribute modifier display', input['display']))
  return Result.gen(function* () {
    const checkedDisplay = yield* displayValue
    const resourceType = yield* type
    const resourceId = yield* id
    const amountValue = input['amount']
    if (typeof amountValue !== 'number') {
      return yield* Result.fail(failure('amount', 'amount must be a finite number', amountValue, 'invalid-type'))
    }
    const amount = yield* Result.mapError(AttributeModifierAmount.result(amountValue), () =>
      failure('amount', 'amount must be a finite number', amountValue, 'invalid-type'))
    const modifier = {
      type: resourceType,
      id: resourceId,
      amount,
      operation,
      slot: slot ?? 'any',
    }
    return Object.freeze(checkedDisplay === undefined ? modifier : { ...modifier, display: checkedDisplay })
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
