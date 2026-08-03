/* eslint-disable max-statements, no-magic-numbers -- Permanent ids and encoded bytes are the contract under test. */
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

const EYE_OF_ENDER_ITEM_ID = 135
const ENCHANTED_BOOK_ITEM_ID = 136
const FLUID_AND_VEHICLE_ITEM_IDS = {
  bucket: 137,
  lava_bucket: 139,
  minecart: 141,
  oak_boat: 140,
  water_bucket: 138,
} as const satisfies Readonly<Partial<Record<ItemType, number>>>
const FISHING_ITEM_IDS = {
  bone: 149,
  bowl: 147,
  cod: 143,
  fishing_rod: 142,
  leather: 148,
  name_tag: 150,
  pufferfish: 146,
  saddle: 151,
  salmon: 144,
  tropical_fish: 145,
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

  it.effect('appends the Eye of Ender without changing any existing permanent id', () =>
    Effect.sync(() => {
      expect(itemIdOf('ghast_tear')).toBe(134)
      expect(itemIdOf('eye_of_ender')).toBe(EYE_OF_ENDER_ITEM_ID)
      expect(itemTypeOfId(EYE_OF_ENDER_ITEM_ID)).toBe('eye_of_ender')
      expect(itemDefinitionOf('eye_of_ender').id).toBe(EYE_OF_ENDER_ITEM_ID)
    }),
  )

  it.effect('appends the enchanted book after every pre-existing permanent id', () =>
    Effect.sync(() => {
      expect(itemIdOf('eye_of_ender')).toBe(EYE_OF_ENDER_ITEM_ID)
      expect(itemIdOf('enchanted_book')).toBe(ENCHANTED_BOOK_ITEM_ID)
      expect(itemTypeOfId(ENCHANTED_BOOK_ITEM_ID)).toBe('enchanted_book')
      expect(itemDefinitionOf('enchanted_book').id).toBe(ENCHANTED_BOOK_ITEM_ID)
    }),
  )

  it.effect('appends fluid and vehicle items without changing existing permanent ids', () =>
    Effect.sync(() => {
      expect(itemIdOf('enchanted_book')).toBe(ENCHANTED_BOOK_ITEM_ID)
      for (const [type, id] of Object.entries(FLUID_AND_VEHICLE_ITEM_IDS)) {
        expect(itemIdOf(type as ItemType)).toBe(id)
        expect(itemTypeOfId(id)).toBe(type)
        expect(itemDefinitionOf(type as ItemType).id).toBe(id)
      }
    }),
  )

  it.effect('appends fishing items without changing existing permanent ids', () =>
    Effect.sync(() => {
      expect(itemIdOf('minecart')).toBe(FLUID_AND_VEHICLE_ITEM_IDS.minecart)
      for (const [type, id] of Object.entries(FISHING_ITEM_IDS)) {
        expect(itemIdOf(type as ItemType)).toBe(id)
        expect(itemTypeOfId(id)).toBe(type)
        expect(itemDefinitionOf(type as ItemType).id).toBe(id)
      }
    }),
  )

  it.effect('appends animal-interaction items without changing existing permanent ids', () =>
    Effect.sync(() => {
      expect(itemIdOf('deepslate_emerald_ore')).toBe(169)
      expect(itemIdOf('shears')).toBe(170)
      expect(itemIdOf('wool')).toBe(171)
      expect(itemTypeOfId(170)).toBe('shears')
      expect(itemTypeOfId(171)).toBe('wool')
      expect(maxStackCountOfItem('shears')).toBe(1)
      expect(maxStackCountOfItem('wool')).toBe(64)
    }),
  )

  it.effect('round-trips every registered item through its two-byte save and wire field', () =>
    Effect.sync(() => {
      for (const type of ITEM_TYPES) {
        expect(decodeItemId(encodeItemId(type))).toBe(type)
      }
      expect([...encodeItemId('water_bottle')]).toStrictEqual([0, 127])
      expect([...encodeItemId('ghast_tear')]).toStrictEqual([0, 134])
      expect([...encodeItemId('eye_of_ender')]).toStrictEqual([0, EYE_OF_ENDER_ITEM_ID])
      expect([...encodeItemId('enchanted_book')]).toStrictEqual([0, ENCHANTED_BOOK_ITEM_ID])
      expect([...encodeItemId('bucket')]).toStrictEqual([0, 137])
      expect([...encodeItemId('water_bucket')]).toStrictEqual([0, 138])
      expect([...encodeItemId('lava_bucket')]).toStrictEqual([0, 139])
      expect([...encodeItemId('oak_boat')]).toStrictEqual([0, 140])
      expect([...encodeItemId('minecart')]).toStrictEqual([0, 141])
      expect([...encodeItemId('fishing_rod')]).toStrictEqual([0, 142])
      expect([...encodeItemId('saddle')]).toStrictEqual([0, 151])
      expect([...encodeItemId('soul_soil')]).toStrictEqual([0, 152])
      expect([...encodeItemId('wither_skeleton_skull')]).toStrictEqual([0, 153])
      expect([...encodeItemId('nether_star')]).toStrictEqual([0, 154])
      expect([...encodeItemId('bone_meal')]).toStrictEqual([0, 155])
      expect([...encodeItemId('shears')]).toStrictEqual([0, 170])
      expect([...encodeItemId('wool')]).toStrictEqual([0, 171])
    }),
  )

  it.effect('rejects malformed fields and unregistered uint16 ids', () =>
    Effect.sync(() => {
      expect(decodeItemId(new Uint8Array())).toBeUndefined()
      expect(decodeItemId(new Uint8Array([0]))).toBeUndefined()
      expect(decodeItemId(new Uint8Array([0, 127, 0]))).toBeUndefined()
      expect(decodeItemId(new Uint8Array([0, 172]))).toBeUndefined()
      expect(decodeItemId(new Uint8Array([0xff, 0xff]))).toBeUndefined()
      expect(isKnownItemId(134)).toBe(true)
      expect(isKnownItemId(EYE_OF_ENDER_ITEM_ID)).toBe(true)
      expect(isKnownItemId(ENCHANTED_BOOK_ITEM_ID)).toBe(true)
      expect(isKnownItemId(141)).toBe(true)
      expect(isKnownItemId(151)).toBe(true)
      expect(isKnownItemId(154)).toBe(true)
      expect(isKnownItemId(155)).toBe(true)
      expect(isKnownItemId(169)).toBe(true)
      expect(isKnownItemId(170)).toBe(true)
      expect(isKnownItemId(171)).toBe(true)
      expect(isKnownItemId(172)).toBe(false)
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
        'enchanted_book',
        'water_bucket',
        'lava_bucket',
        'oak_boat',
        'minecart',
        'fishing_rod',
        'saddle',
      ] as const) {
        expect(maxStackCountOfItem(type)).toBe(1)
      }
      expect(maxStackCountOfItem('ender_pearl')).toBe(16)
      expect(maxStackCountOfItem('snowball')).toBe(16)
      expect(maxStackCountOfItem('bucket')).toBe(16)
      for (const type of [
        'sugar',
        'spider_eye',
        'ghast_tear',
        'nether_wart',
        'blaze_powder',
        'eye_of_ender',
        'cod',
        'salmon',
        'tropical_fish',
        'pufferfish',
        'bowl',
        'leather',
        'bone',
        'name_tag',
        'soul_soil',
        'wither_skeleton_skull',
        'nether_star',
      ] as const) {
        expect(maxStackCountOfItem(type)).toBe(64)
      }
    }),
  )
})
