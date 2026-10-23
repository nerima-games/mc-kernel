import { Effect, Result } from 'effect'
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

export type TextComponentFailure = Readonly<{
  readonly _tag: 'TextComponentFailure'
  readonly kind: 'TypeError'
  readonly reason: 'invalid-value' | 'hostile-input'
  readonly message: string
  readonly value?: unknown
}>

const textComponentFailure = (
  reason: TextComponentFailure['reason'],
  message: string,
  value?: unknown,
): TextComponentFailure => ({
  _tag: 'TextComponentFailure',
  kind: 'TypeError',
  reason,
  message,
  ...(value === undefined ? {} : { value }),
})

export const textComponent = (
  value: unknown,
): Result.Result<TextComponent, TextComponentFailure> => {
  const checked = Effect.runSync(Effect.result(Effect.try({
    try: () => isTextComponent(value)
      ? { valid: true as const, value: freezeTextComponent(value) }
      : { valid: false as const },
    catch: () => textComponentFailure('hostile-input', 'Unable to inspect text component', value),
  })))
  if (Result.isFailure(checked)) return Result.fail(checked.failure)
  return checked.success.valid
    ? Result.succeed(checked.success.value)
    : Result.fail(textComponentFailure('invalid-value', 'Text component must be a JSON text component', value))
}

export { isTextComponent }
export type { TextComponent, TextComponentObject, TextComponentValue } from './text-component-data.js'
