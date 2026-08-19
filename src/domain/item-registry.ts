/* eslint-disable sort-imports -- Keep domain imports adjacent and external Brand last. */
/** Stable item ids, stack metadata, and their two-byte storage encoding. */
import { ITEM_TYPES, type ItemType } from './item-type.js'
import { MAX_STACK_COUNT } from './quantities.js'
import { Brand } from 'effect'

export type ItemId = number & Brand.Brand<'ItemId'>
export type ItemIdBytes = Uint8Array & Brand.Brand<'ItemIdBytes'>

/** Item ids use an unsigned 16-bit wire representation. */
export const ITEM_ID_MAX = 0xffff
export const ITEM_ID_BYTES = 2
const ITEM_ID_MIN = 0
const ITEM_ID_BYTE_OFFSET = 0
const SINGLE_STACK_LIMIT = 1
const SIXTEEN_STACK_LIMIT = 16

export const ItemId = Brand.refined<ItemId>(
  (value) => Number.isInteger(value) && value >= ITEM_ID_MIN && value <= ITEM_ID_MAX,
  (value) => Brand.error(`ItemId must be an integer in [${ITEM_ID_MIN}, ${ITEM_ID_MAX}], received ${value}`),
)

export type ItemStackLimit = typeof MAX_STACK_COUNT | typeof SINGLE_STACK_LIMIT | typeof SIXTEEN_STACK_LIMIT

export type ItemDefinition = {
  readonly id: ItemId
  readonly type: ItemType
  readonly maxStackCount: ItemStackLimit
}

const SINGLE_STACK_ITEMS: ReadonlySet<ItemType> = new Set<ItemType>([
  'bow',
  'wooden_pickaxe',
  'stone_pickaxe',
  'iron_pickaxe',
  'diamond_pickaxe',
  'gold_pickaxe',
  'wooden_shovel',
  'stone_shovel',
  'iron_shovel',
  'diamond_shovel',
  'gold_shovel',
  'wooden_axe',
  'stone_axe',
  'iron_axe',
  'diamond_axe',
  'gold_axe',
  'wooden_hoe',
  'stone_hoe',
  'iron_hoe',
  'diamond_hoe',
  'gold_hoe',
  'wooden_sword',
  'stone_sword',
  'iron_sword',
  'diamond_sword',
  'gold_sword',
  'shears',
  'flint_and_steel',
  'iron_helmet',
  'iron_chestplate',
  'iron_leggings',
  'iron_boots',
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
])

const SIXTEEN_STACK_ITEMS: ReadonlySet<ItemType> = new Set<ItemType>(['ender_pearl', 'snowball', 'bucket'])

const stackLimitOf = (type: ItemType): ItemStackLimit => {
  if (SINGLE_STACK_ITEMS.has(type)) {
    return SINGLE_STACK_LIMIT
  }
  if (SIXTEEN_STACK_ITEMS.has(type)) {
    return SIXTEEN_STACK_LIMIT
  }
  return MAX_STACK_COUNT
}

/**
 * Dense and append-only. The array index is the permanent item id, so new
 * items must be appended to `ITEM_TYPES`, never inserted or reordered.
 */
export const ITEM_REGISTRY: ReadonlyArray<ItemDefinition> = ITEM_TYPES.map((type, id) => ({
  // Effect Brand constructors are callable validation functions, not classes.
  // eslint-disable-next-line new-cap
  id: ItemId(id),
  maxStackCount: stackLimitOf(type),
  type,
}))

export const ITEM_IDS: ReadonlyArray<ItemId> = ITEM_REGISTRY.map(({ id }) => id)

const DEFINITION_BY_TYPE: Readonly<Record<ItemType, ItemDefinition>> = Object.fromEntries(
  ITEM_REGISTRY.map((definition) => [definition.type, definition]),
) as Readonly<Record<ItemType, ItemDefinition>>

export const isKnownItemId = (id: number): id is ItemId =>
  Number.isInteger(id) && id >= ITEM_ID_MIN && id < ITEM_REGISTRY.length

export const itemDefinitionOf = (type: ItemType): ItemDefinition => DEFINITION_BY_TYPE[type]

export const maxStackCountOfItem = (type: ItemType): ItemStackLimit => itemDefinitionOf(type).maxStackCount

export const itemIdOf = (type: ItemType): ItemId => itemDefinitionOf(type).id

export function itemTypeOfId(id: ItemId): ItemType
export function itemTypeOfId(id: number): ItemType | undefined
export function itemTypeOfId(id: number): ItemType | undefined {
  return ITEM_REGISTRY[id]?.type
}

export const ItemIdBytes = (bytes: Uint8Array): ItemIdBytes => {
  if (bytes.byteLength !== ITEM_ID_BYTES) {
    throw new RangeError(`ItemIdBytes must be exactly ${ITEM_ID_BYTES} bytes, received ${bytes.byteLength}`)
  }

  const id = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(ITEM_ID_BYTE_OFFSET, false)
  if (!isKnownItemId(id)) {
    throw new RangeError(`ItemIdBytes must encode a registered item id, received ${id}`)
  }

  return bytes as ItemIdBytes
}

/** Encode an item's permanent id in network byte order. */
export const encodeItemId = (type: ItemType): ItemIdBytes => {
  const bytes = new Uint8Array(ITEM_ID_BYTES)
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint16(ITEM_ID_BYTE_OFFSET, itemIdOf(type), false)
  return ItemIdBytes(bytes)
}

/** Decode a validated item-id field from its two-byte wire representation. */
export const decodeItemId = (bytes: ItemIdBytes): ItemType => {
  const id = ItemId(new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(ITEM_ID_BYTE_OFFSET, false))
  return itemTypeOfId(id)
}
