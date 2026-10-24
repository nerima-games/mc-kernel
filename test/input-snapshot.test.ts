import { Result } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  snapshotInputArray,
  snapshotInputArrayOf,
  snapshotDenseInputArray,
  snapshotInputRecord,
  snapshotInputRecordWith,
  snapshotInputValue,
} from '../src/input-snapshot'

describe('input snapshots', () => {
  it('accepts only plain records and reads their prototype and requested getters once', () => {
    let prototypeReads = 0
    let fieldReads = 0
    const input = new Proxy({
      get value() {
        fieldReads += 1
        return 1
      },
    }, {
      getPrototypeOf: () => {
        prototypeReads += 1
        return Object.prototype
      },
    })

    const snapshot = snapshotInputRecord(input, ['value'])

    expect(Result.isSuccess(snapshot)).toBe(true)
    expect(prototypeReads).toBe(1)
    expect(fieldReads).toBe(1)
    if (Result.isSuccess(snapshot)) {
      expect(snapshot.success['value']).toBe(1)
      expect(Object.getPrototypeOf(snapshot.success)).toBe(null)
    }
  })

  it('rejects custom prototypes after a single prototype read', () => {
    let prototypeReads = 0
    const input = new Proxy(Object.create({ inherited: true }), {
      getPrototypeOf: () => {
        prototypeReads += 1
        return { custom: true }
      },
    })

    const snapshot = snapshotInputRecord(input)

    expect(Result.isFailure(snapshot)).toBe(true)
    expect(prototypeReads).toBe(1)
  })

  it('reads array length once and rejects an oversized array before reading elements', () => {
    let lengthReads = 0
    let elementReads = 0
    const target: unknown[] = []
    const input = new Proxy(target, {
      get(array, key, receiver) {
        if (key === 'length') {
          lengthReads += 1
          return 1_000_000_000
        }
        if (typeof key === 'string' && /^\d+$/.test(key)) elementReads += 1
        return Reflect.get(array, key, receiver)
      },
      getPrototypeOf: () => {
        throw new Error('array prototype must not be inspected')
      },
    })

    const snapshot = snapshotInputArray(input, 9)

    expect(Result.isFailure(snapshot)).toBe(true)
    expect(lengthReads).toBe(1)
    expect(elementReads).toBe(0)
  })

  it('does not read inherited array elements', () => {
    let inheritedReads = 0
    const prototype = Object.create(Array.prototype, {
      0: {
        configurable: true,
        get() {
          inheritedReads += 1
          return 'inherited'
        },
      },
    })
    const target: unknown[] = []
    target.length = 1
    Object.setPrototypeOf(target, prototype)

    const snapshot = snapshotInputArray(target, 9)

    expect(Result.isSuccess(snapshot)).toBe(true)
    expect(inheritedReads).toBe(0)
    if (Result.isSuccess(snapshot)) expect(snapshot.success).toEqual([undefined])
  })

  it('rejects sparse input arrays when a dense sequence is required', () => {
    const sparse: unknown[] = []
    sparse.length = 1
    const snapshot = snapshotDenseInputArray(sparse, 4)

    expect(Result.isFailure(snapshot)).toBe(true)
  })

  it('turns throwing getters and cycles into failures', () => {
    const throwing = snapshotInputRecord({
      get value() {
        throw new Error('untrusted getter')
      },
    })
    const cyclic: Record<string, unknown> = {}
    cyclic['self'] = cyclic
    let deep: unknown = true
    for (let depth = 0; depth < 130; depth += 1) deep = { child: deep }

    expect(Result.isFailure(throwing)).toBe(true)
    expect(Result.isFailure(snapshotInputValue(cyclic, 16))).toBe(true)
    expect(Result.isFailure(snapshotInputValue(deep, 16))).toBe(true)
  })

  it('reads shared object properties once and reuses the frozen snapshot', () => {
    let reads = 0
    const shared = Object.defineProperty({}, 'value', {
      enumerable: true,
      get() {
        reads += 1
        return 'snapshot'
      },
    })

    const snapshot = snapshotInputValue({ left: shared, right: shared }, 8)

    expect(Result.isSuccess(snapshot)).toBe(true)
    expect(reads).toBe(1)
    if (Result.isSuccess(snapshot) && typeof snapshot.success === 'object' && snapshot.success !== null) {
      expect(snapshot.success).toMatchObject({ left: { value: 'snapshot' }, right: { value: 'snapshot' } })
      expect(Reflect.get(snapshot.success, 'left')).toBe(Reflect.get(snapshot.success, 'right'))
    }
  })

  it('converts typed record getter failures and preserves one-read snapshots', () => {
    let prototypeReads = 0
    let idReads = 0
    const input = new Proxy({
      get id() {
        idReads += 1
        return 'minecraft:test'
      },
      value: 42,
    }, {
      getPrototypeOf: () => {
        prototypeReads += 1
        return Object.prototype
      },
    })

    const snapshot = snapshotInputRecordWith(input, (record) => ({ id: record.id, value: record.value }))

    expect(Result.isSuccess(snapshot)).toBe(true)
    expect(prototypeReads).toBe(1)
    expect(idReads).toBe(1)
    expect(Result.isFailure(snapshotInputRecordWith(new Proxy(input, {
      get: () => { throw new Error('untrusted getter') },
    }), (record) => ({ id: record.id }))))
      .toBe(true)
  })

  it('bounds typed arrays before element reads', () => {
    let lengthReads = 0
    let elementReads = 0
    const numericArray: number[] = []
    const input = new Proxy(numericArray, {
      get(target, key, receiver) {
        if (key === 'length') {
          lengthReads += 1
          return 1_000_000_000
        }
        if (typeof key === 'string' && /^\d+$/u.test(key)) elementReads += 1
        return Reflect.get(target, key, receiver)
      },
    })

    expect(Result.isFailure(snapshotInputArrayOf(input, 9))).toBe(true)
    expect(lengthReads).toBe(1)
    expect(elementReads).toBe(0)
  })
})
