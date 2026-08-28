import type {
  TextComponent,
  TextComponentObject,
  TextComponentValue,
} from './text-component-data.js'
import { isTextComponent } from './text-component-validation.js'

const freezeTextComponentValue = (value: TextComponentValue): TextComponentValue => {
  if (Array.isArray(value)) {
    return Object.freeze(value.map(freezeTextComponentValue))
  }

  if (value !== null && typeof value === 'object') {
    const frozen: Record<string, TextComponentValue> = {}
    for (const [key, entry] of Object.entries(value)) {
      frozen[key] = freezeTextComponentValue(entry)
    }
    return Object.freeze(frozen)
  }

  return value
}

const freezeTextComponentArray = (
  value: ReadonlyArray<TextComponentValue>,
): ReadonlyArray<TextComponentValue> => Object.freeze(value.map(freezeTextComponentValue))

const freezeTextComponentObject = (value: TextComponentObject): TextComponentObject => {
  const frozen: Record<string, TextComponentValue> = {}
  for (const [key, entry] of Object.entries(value)) {
    frozen[key] = freezeTextComponentValue(entry)
  }
  return Object.freeze(frozen)
}

const isTextComponentArray = (value: TextComponent): value is ReadonlyArray<TextComponentValue> =>
  Array.isArray(value)

const freezeTextComponent = (value: TextComponent): TextComponent => {
  if (typeof value === 'string') {
    return value
  }

  if (isTextComponentArray(value)) {
    return freezeTextComponentArray(value)
  }

  return freezeTextComponentObject(value)
}

export const textComponent = (value: TextComponent): TextComponent => {
  if (!isTextComponent(value)) {
    throw new TypeError('Text component must be a JSON text component')
  }

  return freezeTextComponent(value)
}

export { isTextComponent }
export type { TextComponent, TextComponentObject, TextComponentValue } from './text-component-data.js'
