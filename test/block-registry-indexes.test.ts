import { Effect } from 'effect'
import { describe, expect, it } from '@effect/vitest'
import { buildIdByType } from '../src/domain/block-registry-indexes'

describe('block registry indexes', () => {
  it.effect('rejects a registry that omits a required vocabulary row', () =>
    Effect.sync(() => {
      expect(() => buildIdByType([], ['air'])).toThrow('Block registry is missing a row for air')
    }),
  )
})
