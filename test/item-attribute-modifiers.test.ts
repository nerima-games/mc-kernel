import {
  ATTRIBUTE_MODIFIER_OPERATIONS,
  ATTRIBUTE_MODIFIER_SLOTS,
  attributeModifier,
  attributeModifierDisplay,
  attributeModifiersComponent,
  isAttributeModifier,
  isAttributeModifierDisplay,
  isAttributeModifiersComponent,
} from '../src/domain/item-attribute-modifiers'
import { describe, expect, it } from 'vitest'

const baseModifier = {
  type: 'minecraft:generic.attack_damage',
  id: 'minecraft:test_damage',
  amount: 3,
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
      id: 'minecraft:test_any',
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
    const invokeDisplay = (display: unknown) =>
      () => Reflect.apply(attributeModifierDisplay, undefined, [display])
    const invokeModifier = (options: unknown) =>
      () => Reflect.apply(attributeModifier, undefined, [options])

    expect(invokeDisplay(null)).toThrow(TypeError)
    expect(invokeDisplay({ type: 'override', value: null })).toThrow(TypeError)
    expect(invokeDisplay({ type: 'default', extra: true })).toThrow(TypeError)

    expect(invokeModifier(null)).toThrow(TypeError)
    expect(invokeModifier([])).toThrow(TypeError)
    expect(invokeModifier({ ...baseModifier, type: 'INVALID!' })).toThrow(TypeError)
    expect(invokeModifier({ ...baseModifier, id: 'INVALID!' })).toThrow(TypeError)
    expect(invokeModifier({ ...baseModifier, amount: Number.NaN })).toThrow(TypeError)
    expect(invokeModifier({ ...baseModifier, operation: 'multiply' })).toThrow(TypeError)
    expect(invokeModifier({ ...baseModifier, slot: 'finger' })).toThrow(TypeError)
    expect(invokeModifier({ ...baseModifier, display: { type: 'default', extra: true } })).toThrow(TypeError)

    expect(() => Reflect.apply(attributeModifiersComponent, undefined, [null])).toThrow(TypeError)
    expect(() => Reflect.apply(attributeModifiersComponent, undefined, [{}])).toThrow(TypeError)
  })
})
