import { strict as assert } from 'node:assert'
import { Option, Result } from 'effect'

export const resultValue = <A, E>(result: Result.Result<A, E>): A => {
  assert.ok(Result.isSuccess(result), 'expected a successful result')
  return result.success
}

export const resultFailure = <A, E>(result: Result.Result<A, E>): E => {
  assert.ok(Result.isFailure(result), 'expected a failed result')
  return result.failure
}

export const optionValue = <A>(option: Option.Option<A>): A => {
  assert.ok(Option.isSome(option), 'expected a present option')
  return option.value
}
