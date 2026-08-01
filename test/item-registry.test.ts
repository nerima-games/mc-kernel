/* eslint-disable no-magic-numbers -- Permanent ids and encoded bytes are the contract under test. */
/* eslint-disable sort-imports -- Keep the registry imports together above test runtime imports. */
import { describe, expect, it } from '@effect/vitest'
import {
  ITEM_IDS,
  ITEM_REGISTRY,
  decodeItemId,
  encodeItemId,
  isKnownItemId,
  itemDefinitionOf,
  itemIdOf,
  itemTypeOfId,
  maxStackCountOfItem,
} from '../src/domain/item-registry'
import { ITEM_TYPES, type ItemType } from '../src/domain/item-type'
import { Effect } from 'effect'

const BREWING_ITEM_IDS = {
  awkward_potion: 128,
  ghast_tear: 134,
  potion_of_poison: 130,
  potion_of_regeneration: 131,
  potion_of_swiftness: 129,
  spider_eye: 133,
  sugar: 132,
  water_bottle: 127,
} as const satisfies Readonly<Partial<Record<ItemType, number>>>

describe('item registry', () => {
  it.effect('covers the ItemType roster exactly once with dense permanent ids', () =>
    Effect.sync(() => {
      expect(ITEM_REGISTRY.map(({ type }) => type)).toStrictEqual(ITEM_TYPES)
      expect(ITEM_IDS).toStrictEqual(ITEM_TYPES.map((_type, id) => id))
      expect(new Set(ITEM_REGISTRY.map(({ type }) => type)).size).toBe(ITEM_TYPES.length)
      expect(itemIdOf(ITEM_TYPES[0])).toBe(0)
      expect(itemIdOf('stick')).toBe(13)
      expect(itemIdOf('lily_pad')).toBe(126)
      expect(itemTypeOfId(126)).toBe('lily_pad')
    }),
  )

  it.effect('appends each brewing item after every pre-existing item', () =>
    Effect.sync(() => {
      for (const [type, id] of Object.entries(BREWING_ITEM_IDS)) {
        expect(itemIdOf(type as ItemType)).toBe(id)
        expect(itemTypeOfId(id)).toBe(type)
        expect(itemDefinitionOf(type as ItemType).id).toBe(id)
      }
    }),
  )

  it.effect('round-trips every registered item through its two-byte save and wire field', () =>
    Effect.sync(() => {
      for (const type of ITEM_TYPES) {
        expect(decodeItemId(encodeItemId(type))).toBe(type)
      }
      expect([...encodeItemId('water_bottle')]).toStrictEqual([0, 127])
      expect([...encodeItemId('ghast_tear')]).toStrictEqual([0, 134])
    }),
  )

  it.effect('rejects malformed fields and unregistered uint16 ids', () =>
    Effect.sync(() => {
      expect(decodeItemId(new Uint8Array())).toBeUndefined()
      expect(decodeItemId(new Uint8Array([0]))).toBeUndefined()
      expect(decodeItemId(new Uint8Array([0, 127, 0]))).toBeUndefined()
      expect(decodeItemId(new Uint8Array([0, 135]))).toBeUndefined()
      expect(decodeItemId(new Uint8Array([0xff, 0xff]))).toBeUndefined()
      expect(isKnownItemId(134)).toBe(true)
      expect(isKnownItemId(135)).toBe(false)
      expect(isKnownItemId(-1)).toBe(false)
      expect(isKnownItemId(1.5)).toBe(false)
    }),
  )

  it.effect('assigns the canonical 1, 16, and 64 stack limits', () =>
    Effect.sync(() => {
      for (const type of [
        'water_bottle',
        'awkward_potion',
        'potion_of_swiftness',
        'potion_of_poison',
        'potion_of_regeneration',
      ] as const) {
        expect(maxStackCountOfItem(type)).toBe(1)
      }
      expect(maxStackCountOfItem('ender_pearl')).toBe(16)
      expect(maxStackCountOfItem('snowball')).toBe(16)
      for (const type of ['sugar', 'spider_eye', 'ghast_tear', 'nether_wart', 'blaze_powder'] as const) {
        expect(maxStackCountOfItem(type)).toBe(64)
      }
    }),
  )
})
