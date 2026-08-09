import { Effect } from 'effect'
import { describe, expect, it } from '@effect/vitest'
import { BLOCK_PROPERTY_DEFAULTS } from '../src/domain/block-properties'
import { BLOCK_IDS, buildIdByType, propertyOfBlockId } from '../src/domain/block-registry-indexes'

describe('block registry indexes', () => {
  it.effect('rejects a registry that omits a required vocabulary row', () =>
    Effect.sync(() => {
      expect(() => buildIdByType([], ['air'])).toThrow('Block registry is missing a row for air')
    }),
  )

  it.effect('reads dense properties and defaults unknown ids', () =>
    Effect.sync(() => {
      expect(BLOCK_IDS).not.toHaveLength(0)
      expect(propertyOfBlockId(BLOCK_IDS[0]!, 'opacity')).toBeDefined()
      expect(propertyOfBlockId(-1, 'opacity')).toBe(BLOCK_PROPERTY_DEFAULTS.opacity)
    }),
  )
})
