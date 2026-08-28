import {
  enchantmentsComponent,
  isEnchantmentLevelMap,
  isEnchantmentsComponent,
  isStoredEnchantmentsComponent,
  storedEnchantmentsComponent,
} from '../src/domain/item-enchantments'
import { describe, expect, it } from 'vitest'

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
    const invoke = (constructor: typeof enchantmentsComponent, options: unknown) =>
      () => Reflect.apply(constructor, undefined, [options])

    expect(invoke(enchantmentsComponent, null)).toThrow(TypeError)
    expect(invoke(enchantmentsComponent, [])).toThrow(TypeError)
    expect(invoke(enchantmentsComponent, 1)).toThrow(TypeError)
    expect(invoke(enchantmentsComponent, { 'not valid': 1 })).toThrow(TypeError)
    expect(invoke(enchantmentsComponent, { 'minecraft:sharpness': Number.NaN })).toThrow(TypeError)
    expect(invoke(enchantmentsComponent, { 'minecraft:sharpness': 1.5 })).toThrow(RangeError)
    expect(invoke(enchantmentsComponent, { 'minecraft:sharpness': -1 })).toThrow(RangeError)
    expect(invoke(enchantmentsComponent, { 'minecraft:sharpness': 256 })).toThrow(RangeError)

    expect(() => Reflect.apply(storedEnchantmentsComponent, undefined, [null])).toThrow(TypeError)
    expect(
      () => Reflect.apply(storedEnchantmentsComponent, undefined, [{ 'not valid': 1 }]),
    ).toThrow(TypeError)
    expect(storedEnchantmentsComponent({ 'minecraft:protection': 4 })).toEqual({
      'minecraft:protection': 4,
    })
  })
})
