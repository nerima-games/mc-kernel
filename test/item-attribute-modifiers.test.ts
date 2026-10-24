import * as itemAttributeModifiersResult from '../src/domain/item/item-attribute-modifiers'
import {
  ATTRIBUTE_MODIFIER_OPERATIONS,
  ATTRIBUTE_MODIFIER_SLOTS,
  isAttributeModifier,
  isAttributeModifierDisplay,
  isAttributeModifiersComponent,
} from '../src/domain/item/item-attribute-modifiers'
import { expectItemFailure, itemResultValue } from './item-result-assertions'
import { describe, expect, it } from 'vitest'
import { ResourceLocation } from '../src/domain/text/identifiers'
import { AttributeModifierAmount } from '../src/domain/time/quantities'

const attributeModifier = (...args: Parameters<typeof itemAttributeModifiersResult.attributeModifier>) =>
  itemResultValue(itemAttributeModifiersResult.attributeModifier(...args))
const attributeModifierDisplay = (...args: Parameters<typeof itemAttributeModifiersResult.attributeModifierDisplay>) =>
  itemResultValue(itemAttributeModifiersResult.attributeModifierDisplay(...args))
const attributeModifiersComponent = (...args: Parameters<typeof itemAttributeModifiersResult.attributeModifiersComponent>) =>
  itemResultValue(itemAttributeModifiersResult.attributeModifiersComponent(...args))

const baseModifier = {
  type: ResourceLocation('minecraft:generic.attack_damage'),
  id: ResourceLocation('minecraft:test_damage'),
  amount: AttributeModifierAmount(3),
  operation: 'add_value' as const,
  slot: 'mainhand' as const,
}

const isObjectRecord = (value: object): value is Readonly<Record<string, unknown>> =>
  !Array.isArray(value)

const objectOverrideValueOf = (
  display: ReturnType<typeof attributeModifierDisplay>,
): Readonly<Record<string, unknown>> => {
  if (
    display.type !== 'override' ||
    typeof display.value !== 'object' ||
    display.value === null ||
    !isObjectRecord(display.value)
  ) {
    throw new Error('Expected an object override value')
  }
  return display.value
}

describe('item attribute modifiers', () => {
  it('publishes current operations and equipment slots', () => {
    expect(ATTRIBUTE_MODIFIER_OPERATIONS).toEqual([
      'add_value',
      'add_multiplied_base',
      'add_multiplied_total',
    ])
    expect(ATTRIBUTE_MODIFIER_SLOTS).toEqual([
      'any',
      'hand',
      'mainhand',
      'offhand',
      'feet',
      'legs',
      'chest',
      'head',
      'armor',
      'body',
    ])
  })

  it('constructs immutable modifiers and display values', () => {
    const override = attributeModifierDisplay({
      type: 'override',
      value: { text: 'Attack', extra: [' damage', { text: '!' }, 1, null] },
    })
    const arrayOverride = attributeModifierDisplay({
      type: 'override',
      value: ['Attack', { text: '!' }],
    })
    const stringOverride = attributeModifierDisplay({ type: 'override', value: 'Attack' })
    const defaultDisplay = attributeModifierDisplay({ type: 'default' })
    const hiddenDisplay = attributeModifierDisplay({ type: 'hidden' })
    const modifier = attributeModifier({ ...baseModifier, display: override })
    const defaultSlotModifier = attributeModifier({
      type: baseModifier.type,
      amount: baseModifier.amount,
      id: ResourceLocation('minecraft:test_any'),
      operation: 'add_multiplied_base',
    })
    const component = attributeModifiersComponent([
      baseModifier,
      { ...baseModifier, display: override },
    ])
    const overrideValue = objectOverrideValueOf(override)

    expect(override).toEqual({
      type: 'override',
      value: { text: 'Attack', extra: [' damage', { text: '!' }, 1, null] },
    })
    expect(arrayOverride).toEqual({ type: 'override', value: ['Attack', { text: '!' }] })
    expect(stringOverride).toEqual({ type: 'override', value: 'Attack' })
    expect(defaultDisplay).toEqual({ type: 'default' })
    expect(hiddenDisplay).toEqual({ type: 'hidden' })
    expect(modifier).toEqual({
      ...baseModifier,
      type: 'minecraft:generic.attack_damage',
      id: 'minecraft:test_damage',
      display: override,
    })
    expect(defaultSlotModifier).toEqual({
      type: baseModifier.type,
      amount: baseModifier.amount,
      id: 'minecraft:test_any',
      operation: 'add_multiplied_base',
      slot: 'any',
    })
    expect(component).toEqual([
      baseModifier,
      { ...baseModifier, slot: 'mainhand', display: override },
    ])
    expect(Object.isFrozen(override)).toBe(true)
    expect(Object.isFrozen(overrideValue)).toBe(true)
    expect(Object.isFrozen(overrideValue['extra'])).toBe(true)
    expect(Object.isFrozen(modifier)).toBe(true)
    expect(Object.isFrozen(component)).toBe(true)
    expect(Object.isFrozen(component[0])).toBe(true)
    expect(isAttributeModifier(modifier)).toBe(true)
    expect(isAttributeModifiersComponent(component)).toBe(true)
  })

  it('accepts official display variants and rejects malformed displays', () => {
    expect(isAttributeModifierDisplay({ type: 'default' })).toBe(true)
    expect(isAttributeModifierDisplay({ type: 'hidden' })).toBe(true)
    expect(isAttributeModifierDisplay({ type: 'override', value: 'Attack' })).toBe(true)
    expect(isAttributeModifierDisplay({ type: 'override', value: ['Attack', { text: '!' }] })).toBe(true)
    expect(isAttributeModifierDisplay({ type: 'override', value: { bold: true, color: 'red' } })).toBe(true)
    expect(isAttributeModifierDisplay(Object.create(null))).toBe(false)
    expect(isAttributeModifierDisplay(null)).toBe(false)
    expect(isAttributeModifierDisplay([])).toBe(false)
    expect(isAttributeModifierDisplay({})).toBe(false)
    expect(isAttributeModifierDisplay({ type: 'default', extra: true })).toBe(false)
    expect(isAttributeModifierDisplay({ type: 'hidden', extra: true })).toBe(false)
    expect(isAttributeModifierDisplay({ type: 'override' })).toBe(false)
    expect(isAttributeModifierDisplay({ type: 'override', value: null })).toBe(false)
    expect(isAttributeModifierDisplay({ type: 'override', value: 1 })).toBe(false)
    expect(isAttributeModifierDisplay({ type: 'unknown' })).toBe(false)
    const cyclic: Record<string, unknown> = {}
    cyclic['self'] = cyclic
    expect(isAttributeModifierDisplay({ type: 'override', value: cyclic })).toBe(false)
    expect(isAttributeModifierDisplay({ type: 'override', value: new Date() })).toBe(false)
  })

  it('guards official modifier shapes including omitted display', () => {
    expect(isAttributeModifier({ ...baseModifier })).toBe(true)
    expect(isAttributeModifier({ ...baseModifier, display: undefined })).toBe(true)
    expect(isAttributeModifier({ ...baseModifier, display: { type: 'hidden' } })).toBe(true)
    expect(isAttributeModifier(null)).toBe(false)
    expect(isAttributeModifier([])).toBe(false)
    expect(isAttributeModifier({ ...baseModifier, type: 'INVALID!' })).toBe(false)
    expect(isAttributeModifier({ ...baseModifier, id: 'INVALID!' })).toBe(false)
    expect(isAttributeModifier({ ...baseModifier, amount: Number.NaN })).toBe(false)
    expect(isAttributeModifier({ ...baseModifier, amount: Number.POSITIVE_INFINITY })).toBe(false)
    expect(isAttributeModifier({ ...baseModifier, amount: '3' })).toBe(false)
    expect(isAttributeModifier({ ...baseModifier, operation: 'multiply' })).toBe(false)
    expect(isAttributeModifier({ ...baseModifier, slot: 'finger' })).toBe(false)
    expect(isAttributeModifier({ ...baseModifier, display: { type: 'override', value: null } })).toBe(false)
    expect(isAttributeModifier({ ...baseModifier, extra: true })).toBe(false)
    expect(isAttributeModifiersComponent([])).toBe(true)
    expect(isAttributeModifiersComponent([{ ...baseModifier }])).toBe(true)
    expect(isAttributeModifiersComponent([{}])).toBe(false)
    expect(isAttributeModifiersComponent(null)).toBe(false)
    expect(isAttributeModifiersComponent({})).toBe(false)
  })

  it('validates constructor input at the public boundary', () => {
    const failure = (field: string, message: string, value: unknown, reason = 'invalid-value') => ({
      _tag: 'ItemValidationFailure',
      kind: reason === 'out-of-range' ? 'RangeError' : 'TypeError',
      reason,
      field,
      message,
      value,
    })
    for (const display of [null, { type: 'override', value: null }, { type: 'default', extra: true }]) {
      expectItemFailure(Reflect.apply(itemAttributeModifiersResult.attributeModifierDisplay, undefined, [display]), failure(
        'display', 'Attribute modifier display must be valid', display,
      ))
    }

    expectItemFailure(Reflect.apply(itemAttributeModifiersResult.attributeModifier, undefined, [null]), failure(
      'options', 'Attribute modifier options must be a non-null object', null, 'invalid-type',
    ))
    expectItemFailure(Reflect.apply(itemAttributeModifiersResult.attributeModifier, undefined, [[]]), {
      _tag: 'ItemValidationFailure', kind: 'TypeError', reason: 'invalid-value', field: 'type',
      message: 'type must be a valid resource location', value: undefined,
    })
    expectItemFailure(Reflect.apply(itemAttributeModifiersResult.attributeModifier, undefined, [{ ...baseModifier, type: 'INVALID!' }]), failure(
      'type', 'type must be a valid resource location', 'INVALID!',
    ))
    expectItemFailure(Reflect.apply(itemAttributeModifiersResult.attributeModifier, undefined, [{ ...baseModifier, id: 'INVALID!' }]), failure(
      'id', 'id must be a valid resource location', 'INVALID!',
    ))
    expectItemFailure(Reflect.apply(itemAttributeModifiersResult.attributeModifier, undefined, [{ ...baseModifier, amount: Number.NaN }]), failure(
      'amount', 'amount must be a finite number', Number.NaN, 'invalid-type',
    ))
    expectItemFailure(Reflect.apply(itemAttributeModifiersResult.attributeModifier, undefined, [{ ...baseModifier, amount: Infinity }]), failure(
      'amount', 'amount must be a finite number', Infinity, 'invalid-type',
    ))
    expectItemFailure(Reflect.apply(itemAttributeModifiersResult.attributeModifier, undefined, [{ ...baseModifier, amount: '1' }]), failure(
      'amount', 'amount must be a finite number', '1', 'invalid-type',
    ))
    expectItemFailure(Reflect.apply(itemAttributeModifiersResult.attributeModifier, undefined, [{ ...baseModifier, operation: 'multiply' }]), failure(
      'operation', 'Unknown attribute modifier operation: multiply', 'multiply',
    ))
    expectItemFailure(Reflect.apply(itemAttributeModifiersResult.attributeModifier, undefined, [{ ...baseModifier, slot: 'finger' }]), failure(
      'slot', 'Unknown attribute modifier slot: finger', 'finger',
    ))
    const invalidDisplay = { type: 'default', extra: true }
    expectItemFailure(Reflect.apply(itemAttributeModifiersResult.attributeModifier, undefined, [{ ...baseModifier, display: invalidDisplay }]), failure(
      'display', 'display must be a valid attribute modifier display', invalidDisplay,
    ))

    expectItemFailure(Reflect.apply(itemAttributeModifiersResult.attributeModifiersComponent, undefined, [null]), failure(
      'options', 'Attribute modifiers must be an array', null, 'invalid-type',
    ))
    expectItemFailure(Reflect.apply(itemAttributeModifiersResult.attributeModifiersComponent, undefined, [[{}]]), {
      _tag: 'ItemValidationFailure', kind: 'TypeError', reason: 'invalid-value', field: 'type',
      message: 'type must be a valid resource location', value: undefined,
    })

    const hostileOptions = new Proxy(baseModifier, {
      get: () => { throw new Error('hostile') },
    })
    expectItemFailure(Reflect.apply(itemAttributeModifiersResult.attributeModifier, undefined, [hostileOptions]), {
      _tag: 'ItemValidationFailure', kind: 'TypeError', reason: 'hostile-input', field: 'options',
      message: 'Unable to inspect attribute modifier options',
    })
  })
})
