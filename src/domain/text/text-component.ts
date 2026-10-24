import { Result } from 'effect'
import { jsonValueFromUnknown } from './json-value.js'
import type { TextComponent } from './text-component-data.js'
import { isTextComponent } from './text-component-validation.js'

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
  const normalized = jsonValueFromUnknown(value)
  if (Result.isFailure(normalized) && normalized.failure.reason === 'hostile-input') {
    return Result.fail(textComponentFailure('hostile-input', 'Unable to inspect text component', value))
  }
  if (Result.isFailure(normalized) || !isTextComponent(normalized.success)) {
    return Result.fail(textComponentFailure('invalid-value', 'Text component must be a JSON text component', value))
  }
  return Result.succeed(normalized.success)
}

export { isTextComponent }
export type { TextComponent, TextComponentObject, TextComponentValue } from './text-component-data.js'
