import { describe, expect, it } from 'vitest'
import { isTextComponent, textComponent } from '../src/domain/text-component'

describe('text components', () => {
  it('accepts JSON text values and deep-freezes a defensive copy', () => {
    const source = { text: 'hello', extra: [{ text: ' world', bold: true }] }
    const value = textComponent(source)

    source.text = 'changed'
    source.extra = []

    expect(value).toEqual({ text: 'hello', extra: [{ text: ' world', bold: true }] })
    expect(Object.isFrozen(value)).toBe(true)
    expect(isTextComponent(value)).toBe(true)
    expect(textComponent('literal')).toBe('literal')
    expect(textComponent([{ text: 'one' }, 'two', null, true, 1])).toEqual([
      { text: 'one' },
      'two',
      null,
      true,
      1,
    ])
  })

  it('validates JSON values including null-prototype objects and cycles', () => {
    const nullPrototype: { text: string } = Object.create(null)
    nullPrototype.text = 'null prototype'

    expect(isTextComponent(nullPrototype)).toBe(true)
    expect(isTextComponent({ score: 1, nested: [null, true, 'x'] })).toBe(true)

    const cycle: { self?: object } = {}
    cycle.self = cycle

    expect(isTextComponent(cycle)).toBe(false)
    expect(isTextComponent({ value: Number.NaN })).toBe(false)
    expect(isTextComponent({ value: Number.POSITIVE_INFINITY })).toBe(false)
    expect(isTextComponent(new Date())).toBe(false)
    expect(isTextComponent(1)).toBe(false)
    expect(isTextComponent(null)).toBe(false)

    const invoke = (value: unknown) => () => Reflect.apply(textComponent, undefined, [value])

    expect(invoke(1)).toThrow(TypeError)
    expect(invoke(null)).toThrow(TypeError)
  })
})
