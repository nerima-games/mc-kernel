import { Result } from 'effect'

export const MAX_GENERIC_INPUT_ARRAY_LENGTH = 65_536
export const MAX_GENERIC_INPUT_ENTRIES = 65_536

const MAX_INPUT_SNAPSHOT_DEPTH = 128
const MAX_INPUT_SNAPSHOT_NODES = 131_072

export type InputSnapshotFailure = Readonly<{
  readonly _tag: 'InputSnapshotFailure'
  readonly reason:
    | 'invalid-container'
    | 'invalid-limit'
    | 'unsupported-prototype'
    | 'too-large'
    | 'cyclic'
    | 'hostile-input'
    | 'unexpected-field'
  readonly field?: string
  readonly path?: string
  readonly value: unknown
}>

export type InputSnapshotFailureWithPath = InputSnapshotFailure & Readonly<{ readonly path: string }>

const failure = (
  reason: InputSnapshotFailure['reason'],
  value: unknown,
  field?: string,
  path?: string,
): InputSnapshotFailure => ({
  _tag: 'InputSnapshotFailure',
  reason,
  ...(field === undefined ? {} : { field }),
  ...(path === undefined ? {} : { path }),
  value,
})

const safely = <Value>(
  action: () => Result.Result<Value, InputSnapshotFailure>,
  onFailure: () => InputSnapshotFailure,
): Result.Result<Value, InputSnapshotFailure> => {
  const attempted = Result.try({ try: action, catch: onFailure })
  return Result.isFailure(attempted) ? Result.fail(attempted.failure) : attempted.success
}

const propertyPath = (parent: string | undefined, property: string): string =>
  parent === undefined || parent.length === 0 ? property : `${parent}.${property}`

const indexPath = (parent: string | undefined, index: number): string =>
  `${parent ?? ''}[${index}]`

const validLimit = (limit: number): boolean =>
  Number.isSafeInteger(limit) && limit >= 0

const snapshotInputArrayImpl = (
  value: unknown,
  maxLength: number,
  pathPrefix?: string,
): Result.Result<ReadonlyArray<unknown>, InputSnapshotFailure> => {
  if (!validLimit(maxLength)) return Result.fail(failure('invalid-limit', value, undefined, pathPrefix))

  return safely(() => {
    if (!Array.isArray(value)) return Result.fail(failure('invalid-container', value, undefined, pathPrefix))
    const length: unknown = Reflect.get(value, 'length')
    if (typeof length !== 'number' || !Number.isSafeInteger(length) || length < 0) {
      return Result.fail(failure('hostile-input', value, undefined, pathPrefix))
    }
    if (length > maxLength) return Result.fail(failure('too-large', value, undefined, pathPrefix))

    const snapshot: unknown[] = new Array(length)
    for (let index = 0; index < length; index += 1) {
      if (!Object.hasOwn(value, index)) continue
      const entry = safely(
        () => Result.succeed(Reflect.get(value, String(index))),
        () => failure('hostile-input', value, undefined, indexPath(pathPrefix, index)),
      )
      if (Result.isFailure(entry)) return Result.fail(entry.failure)
      snapshot[index] = entry.success
    }
    return Result.succeed(Object.freeze(snapshot))
  }, () => failure('hostile-input', value, undefined, pathPrefix))
}

export function snapshotInputArray(
  value: unknown,
  maxLength: number,
  pathPrefix: string,
): Result.Result<ReadonlyArray<unknown>, InputSnapshotFailureWithPath>
export function snapshotInputArray(
  value: unknown,
  maxLength: number,
  pathPrefix?: string,
): Result.Result<ReadonlyArray<unknown>, InputSnapshotFailure>
export function snapshotInputArray(
  value: unknown,
  maxLength: number,
  pathPrefix?: string,
): Result.Result<ReadonlyArray<unknown>, InputSnapshotFailure> {
  return snapshotInputArrayImpl(value, maxLength, pathPrefix)
}

export const snapshotDenseInputArray = (
  value: unknown,
  maxLength: number,
  pathPrefix?: string,
): Result.Result<ReadonlyArray<unknown>, InputSnapshotFailure> => {
  const snapshot = snapshotInputArray(value, maxLength, pathPrefix)
  if (Result.isFailure(snapshot)) return Result.fail(snapshot.failure)
  for (let index = 0; index < snapshot.success.length; index += 1) {
    if (!Object.hasOwn(snapshot.success, index)) {
      return Result.fail(failure('invalid-container', value, undefined, indexPath(pathPrefix, index)))
    }
  }
  return Result.succeed(snapshot.success)
}

/** Copies a typed array through the shared bounded snapshot path. */
export const snapshotInputArrayOf = <Value>(
  value: ReadonlyArray<Value>,
  maxLength: number,
  pathPrefix?: string,
): Result.Result<ReadonlyArray<Value | undefined>, InputSnapshotFailure> => {
  if (!validLimit(maxLength)) return Result.fail(failure('invalid-limit', value, undefined, pathPrefix))

  return safely(() => {
    if (!Array.isArray(value)) return Result.fail(failure('invalid-container', value, undefined, pathPrefix))
    const length: unknown = Reflect.get(value, 'length')
    if (typeof length !== 'number' || !Number.isSafeInteger(length) || length < 0) {
      return Result.fail(failure('hostile-input', value, undefined, pathPrefix))
    }
    if (length > maxLength) return Result.fail(failure('too-large', value, undefined, pathPrefix))

    const snapshot: Array<Value | undefined> = new Array(length)
    for (let index = 0; index < length; index += 1) {
      if (!Object.hasOwn(value, index)) continue
      const entry = safely(
        () => Result.succeed(value[index]),
        () => failure('hostile-input', value, undefined, indexPath(pathPrefix, index)),
      )
      if (Result.isFailure(entry)) return Result.fail(entry.failure)
      snapshot[index] = entry.success
    }
    return Result.succeed(Object.freeze(snapshot))
  }, () => failure('hostile-input', value, undefined, pathPrefix))
}

const snapshotInputRecordImpl = (
  value: unknown,
  fields?: ReadonlyArray<string>,
  allowedFields?: ReadonlyArray<string>,
  pathPrefix?: string,
): Result.Result<Readonly<Record<string, unknown>>, InputSnapshotFailure> =>
  safely(() => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return Result.fail(failure('invalid-container', value, undefined, pathPrefix))
    }

    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) {
      return Result.fail(failure('unsupported-prototype', value, undefined, pathPrefix))
    }

    if (allowedFields !== undefined) {
      const allowed = new Set(allowedFields)
      const keys = Object.keys(value)
      if (keys.length > MAX_GENERIC_INPUT_ENTRIES) return Result.fail(failure('too-large', value, undefined, pathPrefix))
      for (const key of keys) {
        if (!allowed.has(key)) return Result.fail(failure('unexpected-field', value, key, propertyPath(pathPrefix, key)))
      }
    }

    const snapshot: Record<string, unknown> = Object.create(null)
    if (fields === undefined) {
      const keys = Object.keys(value)
      if (keys.length > MAX_GENERIC_INPUT_ENTRIES) return Result.fail(failure('too-large', value, undefined, pathPrefix))
      for (const key of keys) {
        const entry = safely(
          () => Result.succeed(Reflect.get(value, key)),
          () => failure('hostile-input', value, undefined, propertyPath(pathPrefix, key)),
        )
        if (Result.isFailure(entry)) return Result.fail(entry.failure)
        Object.defineProperty(snapshot, key, {
          value: entry.success,
          enumerable: true,
          configurable: true,
          writable: true,
        })
      }
    } else {
      for (const field of fields) {
        const entry = safely(
          () => Result.succeed(Reflect.get(value, field)),
          () => failure('hostile-input', value, undefined, propertyPath(pathPrefix, field)),
        )
        if (Result.isFailure(entry)) return Result.fail(entry.failure)
        if (entry.success === undefined) continue
        Object.defineProperty(snapshot, field, {
          value: entry.success,
          enumerable: true,
          configurable: true,
          writable: true,
        })
      }
    }
    return Result.succeed(Object.freeze(snapshot))
  }, () => failure('hostile-input', value, undefined, pathPrefix))

export function snapshotInputRecord(
  value: unknown,
  fields: ReadonlyArray<string> | undefined,
  allowedFields: ReadonlyArray<string> | undefined,
  pathPrefix: string,
): Result.Result<Readonly<Record<string, unknown>>, InputSnapshotFailureWithPath>
export function snapshotInputRecord(
  value: unknown,
  fields?: ReadonlyArray<string>,
  allowedFields?: ReadonlyArray<string>,
  pathPrefix?: string,
): Result.Result<Readonly<Record<string, unknown>>, InputSnapshotFailure>
export function snapshotInputRecord(
  value: unknown,
  fields?: ReadonlyArray<string>,
  allowedFields?: ReadonlyArray<string>,
  pathPrefix?: string,
): Result.Result<Readonly<Record<string, unknown>>, InputSnapshotFailure> {
  return snapshotInputRecordImpl(value, fields, allowedFields, pathPrefix)
}

/** Copies selected fields from a typed constructor input; each reader must access each field once. */
export const snapshotInputRecordWith = <Input extends object, Snapshot>(
  value: Input,
  read: (input: Input) => Snapshot,
  pathPrefix?: string,
): Result.Result<Snapshot, InputSnapshotFailure> =>
  safely(() => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return Result.fail(failure('invalid-container', value, undefined, pathPrefix))
    }
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) {
      return Result.fail(failure('unsupported-prototype', value, undefined, pathPrefix))
    }
    return Result.succeed(read(value))
  }, () => failure('hostile-input', value, undefined, pathPrefix))

export const snapshotInputEntries = (
  value: unknown,
  maxEntries: number,
  pathPrefix?: string,
): Result.Result<ReadonlyArray<readonly [string, unknown]>, InputSnapshotFailure> => {
  if (!validLimit(maxEntries)) return Result.fail(failure('invalid-limit', value, undefined, pathPrefix))
  return safely(() => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return Result.fail(failure('invalid-container', value, undefined, pathPrefix))
    }
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) {
      return Result.fail(failure('unsupported-prototype', value, undefined, pathPrefix))
    }
    const keys = Object.keys(value)
    if (keys.length > maxEntries) return Result.fail(failure('too-large', value, undefined, pathPrefix))
    const entries: Array<readonly [string, unknown]> = []
    for (const key of keys) {
      const entry = safely(
        () => Result.succeed(Object.freeze([key, Reflect.get(value, key)] as const)),
        () => failure('hostile-input', value, undefined, propertyPath(pathPrefix, key)),
      )
      if (Result.isFailure(entry)) return Result.fail(entry.failure)
      entries.push(entry.success)
    }
    return Result.succeed(Object.freeze(entries))
  }, () => failure('hostile-input', value, undefined, pathPrefix))
}

const snapshotInputValueImpl = (
  value: unknown,
  maxArrayLength: number,
  pathPrefix?: string,
): Result.Result<unknown, InputSnapshotFailure> => {
  const ancestors = new WeakSet<object>()
  const copies = new WeakMap<object, unknown>()
  let nodes = 0

  const snapshot = (current: unknown, depth: number, path?: string): Result.Result<unknown, InputSnapshotFailure> => {
    nodes += 1
    if (depth > MAX_INPUT_SNAPSHOT_DEPTH || nodes > MAX_INPUT_SNAPSHOT_NODES) {
      return Result.fail(failure('too-large', current, undefined, path))
    }
    if (current === null || typeof current !== 'object') return Result.succeed(current)
    if (ancestors.has(current)) return Result.fail(failure('cyclic', current, undefined, path))
    if (copies.has(current)) return Result.succeed(copies.get(current))

    ancestors.add(current)
    const copied = safely<unknown>(() => {
      if (Array.isArray(current)) {
        const entries = snapshotInputArray(current, maxArrayLength, path)
        if (Result.isFailure(entries)) return Result.fail(entries.failure)
        const result: unknown[] = new Array(entries.success.length)
        for (let index = 0; index < entries.success.length; index += 1) {
          if (!Object.hasOwn(entries.success, index)) continue
          const child = snapshot(entries.success[index], depth + 1, indexPath(path, index))
          if (Result.isFailure(child)) return Result.fail(child.failure)
          result[index] = child.success
        }
        const frozen = Object.freeze(result)
        copies.set(current, frozen)
        return Result.succeed(frozen)
      }

      const record = snapshotInputRecord(current, undefined, undefined, path)
      if (Result.isFailure(record)) return Result.fail(record.failure)
      const result: Record<string, unknown> = Object.create(null)
      for (const [key, entry] of Object.entries(record.success)) {
        const child = snapshot(entry, depth + 1, propertyPath(path, key))
        if (Result.isFailure(child)) return Result.fail(child.failure)
        Object.defineProperty(result, key, {
          value: child.success,
          enumerable: true,
          configurable: true,
          writable: true,
        })
      }
      const frozen = Object.freeze(result)
      copies.set(current, frozen)
      return Result.succeed(frozen)
    }, () => failure('hostile-input', current, undefined, path))
    ancestors.delete(current)
    return copied
  }

  return validLimit(maxArrayLength)
    ? snapshot(value, 0, pathPrefix)
    : Result.fail(failure('invalid-limit', value, undefined, pathPrefix))
}

export function snapshotInputValue(
  value: unknown,
  maxArrayLength: number,
  pathPrefix: string,
): Result.Result<unknown, InputSnapshotFailureWithPath>
export function snapshotInputValue(
  value: unknown,
  maxArrayLength: number,
  pathPrefix?: string,
): Result.Result<unknown, InputSnapshotFailure>
export function snapshotInputValue(
  value: unknown,
  maxArrayLength: number,
  pathPrefix?: string,
): Result.Result<unknown, InputSnapshotFailure> {
  return snapshotInputValueImpl(value, maxArrayLength, pathPrefix)
}
