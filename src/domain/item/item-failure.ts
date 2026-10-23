export type ItemValidationFailure = Readonly<{
  readonly _tag: 'ItemValidationFailure'
  readonly kind: 'TypeError' | 'RangeError' | 'InputError'
  readonly reason: 'invalid-type' | 'out-of-range' | 'invalid-value' | 'hostile-input'
  readonly field: string
  readonly message: string
  readonly value?: unknown
}>

export const itemValidationFailure = (
  field: string,
  message: string,
  reason: ItemValidationFailure['reason'] = 'invalid-value',
  value?: unknown,
  kind: ItemValidationFailure['kind'] = reason === 'out-of-range' ? 'RangeError' : 'TypeError',
): ItemValidationFailure => ({
  _tag: 'ItemValidationFailure',
  kind,
  reason,
  field,
  message,
  ...(value === undefined ? {} : { value }),
})
