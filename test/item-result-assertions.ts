import { Result } from 'effect'
import { ok } from 'node:assert/strict'
import { expect } from 'vitest'

export const itemResultValue = <A, E>(result: Result.Result<A, E>): A => {
  ok(Result.isSuccess(result), 'Expected a successful item result')
  return result.success
}

export const unwrapItemResultFn = <Args extends ReadonlyArray<unknown>, A, E>(
  fn: (...args: Args) => Result.Result<A, E>,
): ((...args: Args) => A) => (...args) => itemResultValue(fn(...args))

type ItemFailureExpectation = Readonly<{
  readonly _tag?: string
  readonly kind?: string
  readonly reason?: string
  readonly field?: string
  readonly message?: string | RegExp
  readonly value?: unknown
  readonly componentKey?: string
}>

export const expectItemFailure = <A, E extends object>(
  result: Result.Result<A, E>,
  expected: ItemFailureExpectation,
): E => {
  ok(Result.isFailure(result), 'Expected an item failure')
  const failure = result.failure
  if (expected._tag !== undefined) expect(Reflect.get(failure, '_tag')).toBe(expected._tag)
  if (expected.kind !== undefined) expect(Reflect.get(failure, 'kind')).toBe(expected.kind)
  if (expected.reason !== undefined) expect(Reflect.get(failure, 'reason')).toBe(expected.reason)
  if (expected.field !== undefined) expect(Reflect.get(failure, 'field')).toBe(expected.field)
  if (expected.message !== undefined) {
    const message = Reflect.get(failure, 'message')
    if (expected.message instanceof RegExp) expect(message).toMatch(expected.message)
    else expect(message).toBe(expected.message)
  }
  if (Object.hasOwn(expected, 'value')) {
    if (expected.value === undefined) expect(Object.hasOwn(failure, 'value')).toBe(false)
    else expect(Reflect.get(failure, 'value')).toEqual(expected.value)
  }
  if (expected.componentKey !== undefined) expect(Reflect.get(failure, 'componentKey')).toBe(expected.componentKey)
  if (Reflect.get(failure, '_tag') === 'ItemValidationFailure') {
    expect(['TypeError', 'RangeError', 'InputError']).toContain(Reflect.get(failure, 'kind'))
    expect(['invalid-type', 'out-of-range', 'invalid-value', 'hostile-input']).toContain(Reflect.get(failure, 'reason'))
    expect(typeof Reflect.get(failure, 'field')).toBe('string')
    expect(typeof Reflect.get(failure, 'message')).toBe('string')
    expect(String(Reflect.get(failure, 'message')).length).toBeGreaterThan(0)
  }
  return result.failure
}
