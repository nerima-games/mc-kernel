import type { TextComponent, TextComponentValue } from './text-component-data.js'

type RecordValue = Record<string, unknown>

const isPlainObject = (value: object): value is RecordValue => {
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

const isTextComponentValueInternal = (
  value: unknown,
  ancestors: WeakSet<object>,
): value is TextComponentValue => {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return true
  }

  if (typeof value === 'number') {
    return Number.isFinite(value)
  }

  if (typeof value !== 'object' || ancestors.has(value) || (!Array.isArray(value) && !isPlainObject(value))) {
    return false
  }

  ancestors.add(value)
  const valid = Array.isArray(value)
    ? value.every((entry) => isTextComponentValueInternal(entry, ancestors))
    : Object.values(value).every((entry) => isTextComponentValueInternal(entry, ancestors))
  ancestors.delete(value)
  return valid
}

export const isTextComponent = (value: unknown): value is TextComponent => {
  if (typeof value === 'string') {
    return true
  }

  if (value === null || typeof value !== 'object') {
    return false
  }

  return isTextComponentValueInternal(value, new WeakSet<object>())
}
