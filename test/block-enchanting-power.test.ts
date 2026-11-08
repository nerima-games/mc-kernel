import * as fc from 'fast-check'
import { Result, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import { describeUnknown } from '../src/domain/describe-unknown.js'
import {
  BLOCK_IDS,
  BLOCK_ID_MAX,
  BlockEnchantingPowerSchema,
  BlockId,
  enchantingPowerOfBlockId,
} from '../src/domain/block/block-registry'

const BOOKSHELF_BLOCK_ID = 125
const LAST_REGISTERED_BLOCK_ID = 125
const decodePower = Schema.decodeUnknownResult(BlockEnchantingPowerSchema)

describe('block enchanting power', () => {
  it('assigns the expected power to every registered block id', () => {
    for (const id of BLOCK_IDS) {
      const result = enchantingPowerOfBlockId(id)
      expect(Result.isSuccess(result), String(id)).toBe(true)
      if (Result.isSuccess(result)) {
        expect(result.success, String(id)).toBe(id === BOOKSHELF_BLOCK_ID ? 1 : 0)
        expect(Result.isSuccess(decodePower(result.success)), String(id)).toBe(true)
      }
    }
  })

  it('returns schema-valid power or a typed failure for arbitrary inputs without throwing', () => {
    const assertResultForInput = (input: unknown): void => {
      const result = Reflect.apply(enchantingPowerOfBlockId, undefined, [input])
      expect(Result.isResult(result), describeUnknown(input)).toBe(true)
      if (!Result.isResult(result)) return

      if (
        typeof input === 'number' &&
        Number.isInteger(input) &&
        input >= 0 &&
        input <= LAST_REGISTERED_BLOCK_ID &&
        input <= BLOCK_ID_MAX
      ) {
        expect(Result.isSuccess(result), describeUnknown(input)).toBe(true)
        if (Result.isSuccess(result)) {
          const expected = input === BOOKSHELF_BLOCK_ID ? 1 : 0
          expect(result.success, describeUnknown(input)).toBe(expected)
          expect(Result.isSuccess(decodePower(result.success)), describeUnknown(input)).toBe(true)
        }
      } else {
        expect(Result.isFailure(result), describeUnknown(input)).toBe(true)
      }
    }

    fc.assert(fc.property(fc.anything(), assertResultForInput))
    assertResultForInput({ toString: false })
  })

  it('keeps the id boundaries explicit', () => {
    expect(enchantingPowerOfBlockId(BlockId(0))).toEqual(Result.succeed(0))
    expect(enchantingPowerOfBlockId(BlockId(BOOKSHELF_BLOCK_ID))).toEqual(Result.succeed(1))

    for (const id of [BlockId(126), BlockId(BLOCK_ID_MAX)]) {
      const result = enchantingPowerOfBlockId(id)
      expect(Result.isFailure(result)).toBe(true)
      if (Result.isFailure(result)) {
        expect(result.failure).toMatchObject({ _tag: 'BlockRegistryFailure', reason: 'unknown-block-id' })
      }
    }

    for (const invalid of [-1, BLOCK_ID_MAX + 1, 1.5, Number.NaN]) {
      const result = Reflect.apply(enchantingPowerOfBlockId, undefined, [invalid])
      expect(Result.isFailure(result)).toBe(true)
    }
  })
})
