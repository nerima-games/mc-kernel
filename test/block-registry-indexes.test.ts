import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'
import { BLOCK_PROPERTY_DEFAULTS } from '../src/domain/block-properties'
import {
  BLOCK_IDS,
  buildIdByType,
  buildSupportBlockIdsById,
  blockIdsWithCapability,
  blockIdsWithOpacity,
  propertyOfBlockId,
  resolvedBlockAt,
} from '../src/domain/block-registry-indexes'

describe('block registry indexes', () => {
  it('rejects a registry that omits a required vocabulary row', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(() => buildIdByType([], ['air'])).toThrow('Block registry is missing a row for air')
    })),
  )

  it('rejects missing derived registry rows', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(() => resolvedBlockAt(-1)).toThrow('Block registry is missing a resolved row for -1')
      expect(() => buildSupportBlockIdsById([])).toThrow('Block registry is missing a support rule')

      const invalidSupportRule = { kind: 'oneOf', blocks: ['invalid'] }
      expect(() => Reflect.apply(buildSupportBlockIdsById, undefined, [[invalidSupportRule]])).toThrow(
        'Block registry is missing a row for invalid',
      )
    })),
  )

  it('reads dense properties and defaults unknown ids', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(BLOCK_IDS).not.toHaveLength(0)
      const firstBlockId = BLOCK_IDS[0]
      if (firstBlockId === undefined) throw new Error('Block registry fixture must not be empty')
      expect(propertyOfBlockId(firstBlockId, 'opacity')).toBeDefined()
      expect(propertyOfBlockId(-1, 'opacity')).toBe(BLOCK_PROPERTY_DEFAULTS.opacity)
    })),
  )

  it('rejects missing capability and opacity indexes', () =>
    Effect.runPromise(Effect.sync(() => {
      expect(() => Reflect.apply(blockIdsWithCapability, undefined, ['invalid'])).toThrow(
        'Block capability index is missing invalid',
      )
      expect(() => Reflect.apply(blockIdsWithOpacity, undefined, ['invalid'])).toThrow(
        'Block opacity index is missing invalid',
      )
    })),
  )
})
