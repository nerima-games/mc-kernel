import * as itemEnchantmentsResult from '../src/domain/item/item-enchantments'
import {
  isEnchantmentLevelMap,
  isEnchantmentsComponent,
  isStoredEnchantmentsComponent,
} from '../src/domain/item/item-enchantments'
import { expectItemFailure, itemResultValue } from './item-result-assertions'
import { describe, expect, it } from 'vitest'
import { MAX_GENERIC_INPUT_ENTRIES } from '../src/input-snapshot'

const enchantmentsComponent = (...args: Parameters<typeof itemEnchantmentsResult.enchantmentsComponent>) =>
  itemResultValue(itemEnchantmentsResult.enchantmentsComponent(...args))
const storedEnchantmentsComponent = (...args: Parameters<typeof itemEnchantmentsResult.storedEnchantmentsComponent>) =>
  itemResultValue(itemEnchantmentsResult.storedEnchantmentsComponent(...args))

describe('item enchantments', () => {
  it('constructs immutable current component maps', () => {
    const enchantments = enchantmentsComponent({
      'minecraft:sharpness': 5,
      'minecraft:mending': 1,
    })
    const storedEnchantments = storedEnchantmentsComponent({
      'minecraft:fortune': 3,
    })

    expect(enchantments).toEqual({
      'minecraft:sharpness': 5,
      'minecraft:mending': 1,
    })
    expect(storedEnchantments).toEqual({ 'minecraft:fortune': 3 })
    expect(Object.isFrozen(enchantments)).toBe(true)
    expect(Object.isFrozen(storedEnchantments)).toBe(true)
    expect(enchantmentsComponent()).toEqual({})
    expect(storedEnchantmentsComponent()).toEqual({})
  })

  it('guards official maps and rejects malformed values', () => {
    const valid = { 'minecraft:sharpness': 5 }
    const nullPrototype: Record<string, unknown> = Object.create(null)
    nullPrototype['minecraft:mending'] = 1
    const cyclic: Record<string, unknown> = {}
    cyclic['minecraft:cycle'] = cyclic

    expect(isEnchantmentLevelMap(valid)).toBe(true)
    expect(isEnchantmentsComponent(valid)).toBe(true)
    expect(isStoredEnchantmentsComponent(valid)).toBe(true)
    expect(isEnchantmentLevelMap({})).toBe(true)
    expect(isEnchantmentLevelMap(nullPrototype)).toBe(true)
    expect(isEnchantmentLevelMap(null)).toBe(false)
    expect(isEnchantmentLevelMap([])).toBe(false)
    expect(isEnchantmentLevelMap(1)).toBe(false)
    expect(isEnchantmentLevelMap({ 'not valid': 1 })).toBe(false)
    expect(isEnchantmentLevelMap({ 'minecraft:sharpness': 1.5 })).toBe(false)
    expect(isEnchantmentLevelMap({ 'minecraft:sharpness': -1 })).toBe(false)
    expect(isEnchantmentLevelMap({ 'minecraft:sharpness': 256 })).toBe(false)
    expect(isEnchantmentLevelMap({ 'minecraft:sharpness': Number.NaN })).toBe(false)
    expect(isEnchantmentLevelMap({ 'minecraft:sharpness': Number.POSITIVE_INFINITY })).toBe(false)
    expect(isEnchantmentLevelMap({ 'minecraft:sharpness': '5' })).toBe(false)
    expect(isEnchantmentLevelMap(new Date())).toBe(false)
    expect(isEnchantmentLevelMap(cyclic)).toBe(false)
    expect(isEnchantmentsComponent({ 'minecraft:sharpness': 256 })).toBe(false)
    expect(isStoredEnchantmentsComponent({ 'minecraft:sharpness': 256 })).toBe(false)
  })

  it('validates constructor input at the public boundary', () => {
    const validation = (kind: string, reason: string, field: string, message: string, value: unknown) => ({
      _tag: 'ItemValidationFailure', kind, reason, field, message, value,
    })
    for (const options of [null, [], 1]) {
      expectItemFailure(Reflect.apply(itemEnchantmentsResult.enchantmentsComponent, undefined, [options]), validation(
        'TypeError', 'invalid-type', 'options', 'enchantments options must be a non-null object', options,
      ))
    }
    expectItemFailure(itemEnchantmentsResult.enchantmentsComponent({ 'not valid': 1 }), validation(
      'TypeError', 'invalid-value', 'not valid', 'enchantments keys must be valid resource locations: not valid', 'not valid',
    ))
    expectItemFailure(itemEnchantmentsResult.enchantmentsComponent({ 'minecraft:sharpness': Number.NaN }), validation(
      'TypeError', 'invalid-type', 'enchantments[minecraft:sharpness]', 'enchantments[minecraft:sharpness] must be a finite number', Number.NaN,
    ))
    for (const level of [1.5, -1, 256]) {
      expectItemFailure(itemEnchantmentsResult.enchantmentsComponent({ 'minecraft:sharpness': level }), validation(
        'RangeError', 'out-of-range', 'enchantments[minecraft:sharpness]', 'enchantments[minecraft:sharpness] must be a safe integer in [0, 255]', level,
      ))
    }

    expectItemFailure(Reflect.apply(itemEnchantmentsResult.storedEnchantmentsComponent, undefined, [null]), validation(
      'TypeError', 'invalid-type', 'options', 'stored_enchantments options must be a non-null object', null,
    ))
    expectItemFailure(Reflect.apply(itemEnchantmentsResult.storedEnchantmentsComponent, undefined, [{ 'not valid': 1 }]), validation(
      'TypeError', 'invalid-value', 'not valid', 'stored_enchantments keys must be valid resource locations: not valid', 'not valid',
    ))

    const hostileOptions = new Proxy({}, { ownKeys: () => { throw new Error('hostile') } })
    expectItemFailure(Reflect.apply(itemEnchantmentsResult.enchantmentsComponent, undefined, [hostileOptions]), validation(
      'TypeError', 'hostile-input', 'options', 'enchantments options could not be inspected', hostileOptions,
    ))

    const oversizedOptions: Record<string, number> = {}
    for (let index = 0; index <= MAX_GENERIC_INPUT_ENTRIES; index += 1) {
      oversizedOptions[`minecraft:entry_${index}`] = 1
    }
    expectItemFailure(itemEnchantmentsResult.enchantmentsComponent(oversizedOptions), validation(
      'RangeError', 'out-of-range', 'options', 'enchantments options exceed the maximum size', oversizedOptions,
    ))

    expect(storedEnchantmentsComponent({ 'minecraft:protection': 4 })).toEqual({
      'minecraft:protection': 4,
    })
  })
})
