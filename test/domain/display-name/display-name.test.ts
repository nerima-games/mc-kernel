import * as fc from 'fast-check'
import { Result, Schema } from 'effect'
import { describe, expect, expectTypeOf, it } from 'vitest'
import * as kernel from '../../../src/index.js'

const languages = ['en', 'ja'] as const

describe('display names', () => {
  it('has one English and Japanese name for every item and block ID', () => {
    expect(Object.keys(kernel.ITEM_DISPLAY_NAMES).sort()).toEqual([...kernel.ITEM_TYPES].sort())
    expect(Object.keys(kernel.BLOCK_DISPLAY_NAMES).sort()).toEqual([...kernel.BLOCK_TYPES].sort())

    for (const id of kernel.ITEM_TYPES) {
      for (const language of languages) {
        expect(kernel.getDisplayName({ kind: 'item', id, language })).toEqual(
          Result.succeed(kernel.ITEM_DISPLAY_NAMES[id][language]),
        )
      }
    }
    for (const id of kernel.BLOCK_TYPES) {
      for (const language of languages) {
        expect(kernel.getDisplayName({ kind: 'block', id, language })).toEqual(
          Result.succeed(kernel.BLOCK_DISPLAY_NAMES[id][language]),
        )
      }
    }
  })

  it('returns names without namespace or identifier formatting', () => {
    for (const names of [
      ...Object.values(kernel.ITEM_DISPLAY_NAMES),
      ...Object.values(kernel.BLOCK_DISPLAY_NAMES),
    ]) {
      for (const name of Object.values(names)) {
        expect(name).not.toBe('')
        expect(name).toBe(name.trim())
        expect(name.toLowerCase()).not.toContain('minecraft:')
        expect(name).not.toContain('_')
      }
    }
  })

  it('uses the requested language and rejects unsupported languages', () => {
    expect(kernel.getDisplayName({ kind: 'item', id: 'stone', language: 'en' })).toEqual(
      Result.succeed(kernel.ITEM_DISPLAY_NAMES.stone.en),
    )
    expect(kernel.getDisplayName({ kind: 'item', id: 'stone', language: 'ja' })).toEqual(
      Result.succeed(kernel.ITEM_DISPLAY_NAMES.stone.ja),
    )

    for (const input of [
      { kind: 'item', id: 'stone', language: 'fr' },
      { kind: 'item', id: 'minecraft:stone', language: 'en' },
      { kind: 'block', id: 'not_a_block', language: 'ja' },
      { kind: 'entity', id: 'stone', language: 'en' },
      { kind: 'item', id: 'stone' },
      { kind: 'item', id: 1, language: 'en' },
      { kind: 'item', id: 'stone', language: 'en', extra: true },
      null,
      42,
    ]) {
      expect(kernel.getDisplayName(input)).toEqual(
        Result.fail({ _tag: 'InvalidDisplayNameRequest' }),
      )
    }
  })

  it('exposes a closed language union', () => {
    expectTypeOf<kernel.DisplayLanguage>().toEqualTypeOf<'en' | 'ja'>()
    expect(Result.isSuccess(Schema.decodeUnknownResult(kernel.DisplayLanguageSchema)('en'))).toBe(true)
    expect(Result.isSuccess(Schema.decodeUnknownResult(kernel.DisplayLanguageSchema)('ja'))).toBe(true)
    expect(Result.isSuccess(Schema.decodeUnknownResult(kernel.DisplayLanguageSchema)('fr'))).toBe(false)
  })

  it('returns a typed failure or a value accepted by its output schema for arbitrary input', () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        const result = kernel.getDisplayName(input)
        if (Result.isFailure(result)) {
          return result.failure._tag === 'InvalidDisplayNameRequest'
        }
        return Result.isSuccess(Schema.decodeUnknownResult(kernel.DisplayNameSchema)(result.success))
      }),
    )
  })
})
